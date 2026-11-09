from flask import Blueprint, request, jsonify, session, redirect, url_for
import json
import logging
from database import get_db_connection
from services.classroom_service import (
    create_flow,
    credentials_from_token_dict,
    list_teacher_courses,
    list_course_students,
    list_course_works,
    list_student_submissions
)

logger = logging.getLogger(__name__)
classroom_bp = Blueprint('classroom', __name__, url_prefix='/classroom')

def get_current_user_creds():
    """Recupera credenciais do usuário atual logado (via sessão ou banco)."""
    user_token = session.get('google_token')
    if not user_token and session.get('usuario_id'):
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT google_token FROM usuarios WHERE id = ?", (session.get('usuario_id'),))
        row = cur.fetchone()
        conn.close()
        if row and row['google_token']:
            user_token = json.loads(row['google_token'])
            session['google_token'] = user_token

    if not user_token:
        return None
    return credentials_from_token_dict(user_token)

@classroom_bp.route('/status', methods=['GET'])
def classroom_status():
    creds = get_current_user_creds()
    is_connected = bool(creds and creds.valid)
    google_email = session.get('google_email', '')
    return jsonify({
        'connected': is_connected,
        'email': google_email
    }), 200

@classroom_bp.route('/auth', methods=['GET'])
def classroom_auth():
    """Inicia o fluxo OAuth com o Google."""
    redirect_uri = url_for('classroom.oauth2callback', _external=True)
    try:
        flow = create_flow(redirect_uri)
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        session['oauth_state'] = state
        return redirect(auth_url)
    except Exception as e:
        logger.error(f"Erro ao iniciar fluxo OAuth: {e}")
        return jsonify({'error': str(e)}), 400

@classroom_bp.route('/oauth2callback', methods=['GET'])
def oauth2callback():
    """Callback do Google OAuth."""
    state = session.get('oauth_state')
    redirect_uri = url_for('classroom.oauth2callback', _external=True)
    try:
        flow = create_flow(redirect_uri)
        flow.fetch_token(authorization_response=request.url)

        creds = flow.credentials
        token_data = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }

        session['google_token'] = token_data

        # Salva no banco se houver usuário logado
        usuario_id = session.get('usuario_id')
        if usuario_id:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("UPDATE usuarios SET google_token = ? WHERE id = ?", (json.dumps(token_data), usuario_id))
            conn.commit()
            conn.close()

        logger.info("Conta Google Classroom conectada com sucesso!")
        return redirect('/professor?classroom=success')
    except Exception as e:
        logger.error(f"Erro no callback do OAuth: {e}")
        return redirect(f'/professor?classroom=error&msg={str(e)}')

@classroom_bp.route('/courses', methods=['GET'])
def get_courses():
    """Lista as turmas do professor no Google Classroom."""
    creds = get_current_user_creds()
    if not creds:
        return jsonify({'error': 'Não autenticado no Google Classroom'}), 401

    try:
        courses = list_teacher_courses(creds)
        formatted = [{
            'id': c.get('id'),
            'nome': c.get('name'),
            'secao': c.get('section', ''),
            'descricao': c.get('descriptionHeading', ''),
            'link': c.get('alternateLink', '')
        } for c in courses]
        return jsonify(formatted), 200
    except Exception as e:
        logger.error(f"Erro ao listar turmas do Classroom: {e}")
        return jsonify({'error': str(e)}), 500

@classroom_bp.route('/import_course', methods=['POST'])
def import_course():
    """Importa uma turma do Classroom e seus alunos para o RCDiario."""
    creds = get_current_user_creds()
    if not creds:
        return jsonify({'error': 'Não autenticado no Google Classroom'}), 401

    data = request.get_json() or {}
    course_id = data.get('course_id')
    turnos = data.get('turnos', ['Manhã'])
    ano_semestre = data.get('ano_semestre', '2026.1')

    if not course_id:
        return jsonify({'error': 'course_id é obrigatório'}), 400

    try:
        service_courses = list_teacher_courses(creds)
        course_meta = next((c for c in service_courses if c['id'] == course_id), None)
        if not course_meta:
            return jsonify({'error': 'Turma não encontrada no Google Classroom'}), 404

        nome_turma = course_meta.get('name')
        conn = get_db_connection()
        cur = conn.cursor()

        # Verifica se turma já existe
        cur.execute("SELECT id FROM turmas WHERE nome = ? OR classroom_course_id = ?", (nome_turma, course_id))
        turma_existente = cur.fetchone()

        if turma_existente:
            turma_id = turma_existente['id']
            cur.execute(
                "UPDATE turmas SET classroom_course_id = ?, tipo_turma = 'classroom', ano_semestre = ? WHERE id = ?",
                (course_id, ano_semestre, turma_id)
            )
        else:
            cur.execute(
                "INSERT INTO turmas (nome, turnos, ano_semestre, status, tipo_turma, classroom_course_id) VALUES (?, ?, ?, 'ativa', 'classroom', ?)",
                (nome_turma, json.dumps(turnos), ano_semestre, course_id)
            )
            turma_id = cur.lastrowid

        # Puxa alunos da turma
        students = list_course_students(creds, course_id)
        novos_alunos = 0
        turno_padrao = turnos[0] if turnos else 'Manhã'

        for st in students:
            profile = st.get('profile', {})
            student_id = st.get('userId')
            nome_aluno = profile.get('name', {}).get('fullName', 'Aluno Sem Nome')
            email_aluno = profile.get('emailAddress', '')

            # Verifica se aluno já existe nessa turma
            cur.execute("SELECT id FROM alunos WHERE turma = ? AND (classroom_user_id = ? OR email = ? OR nome = ?)", (nome_turma, student_id, email_aluno, nome_aluno))
            aluno_row = cur.fetchone()

            if aluno_row:
                cur.execute(
                    "UPDATE alunos SET status_matricula = 'ativo', classroom_user_id = ?, email = COALESCE(email, ?) WHERE id = ?",
                    (student_id, email_aluno, aluno_row['id'])
                )
            else:
                cur.execute(
                    "INSERT INTO alunos (nome, email, turma, turno, status_matricula, classroom_user_id) VALUES (?, ?, ?, ?, 'ativo', ?)",
                    (nome_aluno, email_aluno, nome_turma, turno_padrao, student_id)
                )
                novos_alunos += 1

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Turma e alunos importados com sucesso!',
            'turma_id': turma_id,
            'turma_nome': nome_turma,
            'total_alunos': len(students),
            'novos_alunos': novos_alunos
        }), 201

    except Exception as e:
        logger.error(f"Erro ao importar turma: {e}")
        return jsonify({'error': str(e)}), 500

@classroom_bp.route('/sync_roster/<int:turma_id>', methods=['POST'])
def sync_roster(turma_id):
    """Sincroniza a lista de alunos (adiciona novos, inativa quem saiu sem apagar histórico)."""
    creds = get_current_user_creds()
    if not creds:
        return jsonify({'error': 'Não autenticado no Google Classroom'}), 401

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM turmas WHERE id = ?", (turma_id,))
        turma = cur.fetchone()
        if not turma or not turma['classroom_course_id']:
            conn.close()
            return jsonify({'error': 'Turma não está vinculada ao Google Classroom'}), 400

        course_id = turma['classroom_course_id']
        turma_nome = turma['nome']
        students = list_course_students(creds, course_id)
        google_user_ids = {st.get('userId') for st in students if st.get('userId')}

        # Inativa alunos que não estão mais no Classroom
        cur.execute("SELECT id, classroom_user_id FROM alunos WHERE turma = ? AND classroom_user_id IS NOT NULL", (turma_nome,))
        alunos_locais = cur.fetchall()

        inativados = 0
        for al in alunos_locais:
            if al['classroom_user_id'] not in google_user_ids:
                cur.execute("UPDATE alunos SET status_matricula = 'transferido' WHERE id = ?", (al['id'],))
                inativados += 1

        # Insere ou reativa quem está no Classroom
        adicionados = 0
        turno_padrao = json.loads(turma['turnos'])[0] if turma['turnos'] else 'Manhã'
        for st in students:
            user_id = st.get('userId')
            profile = st.get('profile', {})
            nome = profile.get('name', {}).get('fullName', 'Aluno Sem Nome')
            email = profile.get('emailAddress', '')

            cur.execute("SELECT id FROM alunos WHERE turma = ? AND (classroom_user_id = ? OR email = ?)", (turma_nome, user_id, email))
            al = cur.fetchone()
            if al:
                cur.execute("UPDATE alunos SET status_matricula = 'ativo' WHERE id = ?", (al['id'],))
            else:
                cur.execute(
                    "INSERT INTO alunos (nome, email, turma, turno, status_matricula, classroom_user_id) VALUES (?, ?, ?, ?, 'ativo', ?)",
                    (nome, email, turma_nome, turno_padrao, user_id)
                )
                adicionados += 1

        conn.commit()
        conn.close()
        return jsonify({
            'message': 'Lista de alunos sincronizada com sucesso!',
            'total_classroom': len(students),
            'novos_adicionados': adicionados,
            'inativados': inativados
        }), 200

    except Exception as e:
        logger.error(f"Erro ao sincronizar alunos: {e}")
        return jsonify({'error': str(e)}), 500

@classroom_bp.route('/sync_grades/<int:turma_id>', methods=['POST'])
def sync_grades(turma_id):
    """Espelha as atividades e notas do Google Classroom na tabela notas do RCDiario."""
    creds = get_current_user_creds()
    if not creds:
        return jsonify({'error': 'Não autenticado no Google Classroom'}), 401

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM turmas WHERE id = ?", (turma_id,))
        turma = cur.fetchone()
        if not turma or not turma['classroom_course_id']:
            conn.close()
            return jsonify({'error': 'Turma não está vinculada ao Google Classroom'}), 400

        course_id = turma['classroom_course_id']
        turma_nome = turma['nome']
        turno = json.loads(turma['turnos'])[0] if turma['turnos'] else 'Manhã'

        works = list_course_works(creds, course_id)
        total_notas_sincronizadas = 0

        # Mapeamento de classroom_user_id -> nome do aluno local
        cur.execute("SELECT classroom_user_id, nome FROM alunos WHERE turma = ? AND classroom_user_id IS NOT NULL", (turma_nome,))
        alunos_map = {row['classroom_user_id']: row['nome'] for row in cur.fetchall()}

        for work in works:
            work_id = work.get('id')
            titulo = work.get('title', 'Atividade Sem Título')
            max_points = float(work.get('maxPoints', 10.0))
            due_date = work.get('dueDate', {})
            data_formatada = None
            if due_date:
                data_formatada = f"{due_date.get('year')}-{due_date.get('month', 1):02d}-{due_date.get('day', 1):02d}"

            # Registra atividade
            cur.execute('''
                INSERT INTO classroom_atividades (turma_id, classroom_course_id, classroom_work_id, titulo, max_pontos, data_entrega, sincronizado_em)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (classroom_work_id) DO UPDATE SET titulo = excluded.titulo, max_pontos = excluded.max_pontos, sincronizado_em = CURRENT_TIMESTAMP
            ''', (turma_id, course_id, work_id, titulo, max_points, data_formatada))

            # Puxa entregas e notas dos alunos
            submissions = list_student_submissions(creds, course_id, work_id)
            for sub in submissions:
                student_id = sub.get('userId')
                sub_id = sub.get('id')
                aluno_nome = alunos_map.get(student_id)
                if not aluno_nome:
                    continue

                # assignedGrade ou draftGrade
                assigned_grade = sub.get('assignedGrade')
                if assigned_grade is None:
                    assigned_grade = sub.get('draftGrade')

                if assigned_grade is not None:
                    nota_valor = float(assigned_grade)

                    # Verifica se nota já existe vinculada a essa submissão
                    cur.execute(
                        "SELECT id FROM notas WHERE classroom_work_id = ? AND aluno_nome = ? AND turma = ?",
                        (work_id, aluno_nome, turma_nome)
                    )
                    existing_nota = cur.fetchone()

                    if existing_nota:
                        cur.execute('''
                            UPDATE notas
                            SET nota = ?, max_nota = ?, descricao = ?
                            WHERE id = ?
                        ''', (nota_valor, max_points, f"Classroom: {titulo}", existing_nota['id']))
                    else:
                        cur.execute('''
                            INSERT INTO notas (aluno_nome, turma, turno, materia, nota, max_nota, tipo, data, descricao, classroom_work_id, classroom_submission_id)
                            VALUES (?, ?, ?, ?, ?, ?, 'pratica', ?, ?, ?, ?)
                        ''', (aluno_nome, turma_nome, turno, 'Geral', nota_valor, max_points, data_formatada, f"Classroom: {titulo}", work_id, sub_id))

                    total_notas_sincronizadas += 1

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Atividades e notas espelhadas com sucesso!',
            'atividades_processadas': len(works),
            'notas_atualizadas': total_notas_sincronizadas
        }), 200

    except Exception as e:
        logger.error(f"Erro ao espelhar notas: {e}")
        return jsonify({'error': str(e)}), 500
