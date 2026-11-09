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
    list_student_submissions,
    get_client_config
)

logger = logging.getLogger(__name__)
classroom_bp = Blueprint('classroom', __name__, url_prefix='/classroom')

def get_turma_creds(turma_id=None):
    """
    Recupera credenciais Google válidas:
    1. Do token salvo especificamente na turma (turmas.google_token)
    2. Do token institucional global (configuracoes.instituicao_google_token)
    3. Do usuário logado (usuarios.google_token)
    4. Da sessão ativa
    Renova o token silenciosamente caso esteja expirado usando o refresh_token e atualiza o banco.
    """
    token_data = None
    target_turma_id = turma_id

    conn = get_db_connection()
    cur = conn.cursor()

    if turma_id:
        cur.execute("SELECT google_token FROM turmas WHERE id = ?", (turma_id,))
        row = cur.fetchone()
        if row and row['google_token']:
            try:
                token_data = json.loads(row['google_token'])
            except Exception:
                token_data = None

    if not token_data:
        # Tenta token institucional global configurado pela gestão
        cur.execute("SELECT valor FROM configuracoes WHERE chave = 'instituicao_google_token'")
        row = cur.fetchone()
        if row and row['valor']:
            try:
                token_data = json.loads(row['valor'])
            except Exception:
                token_data = None

    if not token_data and session.get('usuario_id'):
        cur.execute("SELECT google_token FROM usuarios WHERE id = ?", (session.get('usuario_id'),))
        row = cur.fetchone()
        if row and row['google_token']:
            try:
                token_data = json.loads(row['google_token'])
            except Exception:
                token_data = None

    if not token_data and session.get('google_token'):
        token_data = session.get('google_token')

    conn.close()

    if not token_data:
        return None

    try:
        creds, was_refreshed = credentials_from_token_dict(token_data)
        if was_refreshed and creds:
            # Salva token renovado para evitar ter que pedir login novamente
            new_token_data = {
                'token': creds.token,
                'refresh_token': creds.refresh_token or token_data.get('refresh_token'),
                'token_uri': creds.token_uri,
                'client_id': creds.client_id,
                'client_secret': creds.client_secret,
                'scopes': creds.scopes
            }
            conn = get_db_connection()
            cur = conn.cursor()
            if target_turma_id:
                cur.execute("UPDATE turmas SET google_token = ? WHERE id = ?", (json.dumps(new_token_data), target_turma_id))
            cur.execute("INSERT INTO configuracoes (chave, valor) VALUES ('instituicao_google_token', ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor", (json.dumps(new_token_data),))
            conn.commit()
            conn.close()
            session['google_token'] = new_token_data

        return creds if creds and creds.valid else None
    except Exception as e:
        logger.error(f"Erro ao processar credenciais Google: {e}")
        return None

@classroom_bp.route('/config', methods=['GET', 'POST'])
def classroom_config():
    """Consulta ou salva as credenciais Google OAuth (Client ID / Secret)."""
    conn = get_db_connection()
    cur = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        client_id = data.get('client_id', '').strip()
        client_secret = data.get('client_secret', '').strip()

        if not client_id or not client_secret:
            conn.close()
            return jsonify({'error': 'client_id e client_secret são obrigatórios'}), 400

        cur.execute("INSERT INTO configuracoes (chave, valor) VALUES ('GOOGLE_CLIENT_ID', ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor", (client_id,))
        cur.execute("INSERT INTO configuracoes (chave, valor) VALUES ('GOOGLE_CLIENT_SECRET', ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor", (client_secret,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Credenciais do Google salvas com sucesso!'}), 200

    # GET
    cur.execute("SELECT chave, valor FROM configuracoes WHERE chave IN ('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET')")
    configs = {row['chave']: row['valor'] for row in cur.fetchall()}
    conn.close()

    has_config = bool(configs.get('GOOGLE_CLIENT_ID') and configs.get('GOOGLE_CLIENT_SECRET')) or bool(get_client_config())
    client_id = configs.get('GOOGLE_CLIENT_ID', '')

    return jsonify({
        'configured': has_config,
        'client_id': client_id
    }), 200

@classroom_bp.route('/status', methods=['GET'])
def classroom_status():
    turma_id = request.args.get('turma_id', type=int)
    creds = get_turma_creds(turma_id)
    is_connected = bool(creds and creds.valid)
    google_email = session.get('google_email', '')

    if turma_id and is_connected and not google_email:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT google_email FROM turmas WHERE id = ?", (turma_id,))
        row = cur.fetchone()
        conn.close()
        if row and row['google_email']:
            google_email = row['google_email']

    return jsonify({
        'connected': is_connected,
        'email': google_email
    }), 200

@classroom_bp.route('/auth', methods=['GET'])
def classroom_auth():
    """Inicia o fluxo OAuth com o Google."""
    turma_id = request.args.get('turma_id')
    return_to = request.args.get('return_to')

    if turma_id:
        session['oauth_turma_id'] = turma_id
    if return_to:
        session['oauth_return_to'] = return_to

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
        error_msg = str(e)
        target = return_to or '/painel'
        separator = '&' if '?' in target else '?'
        return redirect(f"{target}{separator}classroom=error&msg={error_msg}")

@classroom_bp.route('/oauth2callback', methods=['GET'])
def oauth2callback():
    """Callback do Google OAuth."""
    state = session.get('oauth_state')
    redirect_uri = url_for('classroom.oauth2callback', _external=True)
    turma_id = session.pop('oauth_turma_id', None)
    return_to = session.pop('oauth_return_to', None)

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

        conn = get_db_connection()
        cur = conn.cursor()

        # Salva para a turma específica se veio de uma turma
        if turma_id:
            cur.execute("UPDATE turmas SET google_token = ? WHERE id = ?", (json.dumps(token_data), turma_id))

        # Salva como token padrão institucional
        cur.execute("INSERT INTO configuracoes (chave, valor) VALUES ('instituicao_google_token', ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor", (json.dumps(token_data),))

        # Salva no usuário se logado
        usuario_id = session.get('usuario_id')
        if usuario_id:
            cur.execute("UPDATE usuarios SET google_token = ? WHERE id = ?", (json.dumps(token_data), usuario_id))

        conn.commit()
        conn.close()

        logger.info("Conta Google Classroom conectada com sucesso!")

        # Se veio de uma turma, já roda a sincronização inicial imediatamente!
        if turma_id:
            try:
                sync_internal(int(turma_id), creds)
            except Exception as e:
                logger.warning(f"Sincronização imediata pós-auth: {e}")

        target = return_to or '/professor'
        separator = '&' if '?' in target else '?'
        return redirect(f"{target}{separator}classroom=success")

    except Exception as e:
        logger.error(f"Erro no callback do OAuth: {e}")
        target = return_to or '/professor'
        separator = '&' if '?' in target else '?'
        return redirect(f"{target}{separator}classroom=error&msg={str(e)}")

@classroom_bp.route('/courses', methods=['GET'])
def get_courses():
    """Lista as turmas do Google Classroom para a Coordenação importar."""
    creds = get_turma_creds()
    if not creds:
        return jsonify({'error': 'Não autenticado no Google Classroom. A Gestão precisa conectar a conta Google primeiro.'}), 401

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
    """Importa uma turma do Classroom e seus alunos para o CDiario (Apenas Gestão)."""
    creds = get_turma_creds()
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

        # Token atual para salvar direto na turma
        token_str = None
        if session.get('google_token'):
            token_str = json.dumps(session['google_token'])

        cur.execute("SELECT id FROM turmas WHERE nome = ? OR classroom_course_id = ?", (nome_turma, course_id))
        turma_existente = cur.fetchone()

        if turma_existente:
            turma_id = turma_existente['id']
            cur.execute(
                '''UPDATE turmas
                   SET classroom_course_id = ?, tipo_turma = 'classroom', ano_semestre = ?,
                       google_token = COALESCE(google_token, ?)
                   WHERE id = ?''',
                (course_id, ano_semestre, token_str, turma_id)
            )
        else:
            cur.execute(
                '''INSERT INTO turmas (nome, turnos, ano_semestre, status, tipo_turma, classroom_course_id, google_token)
                   VALUES (?, ?, ?, 'ativa', 'classroom', ?, ?)''',
                (nome_turma, json.dumps(turnos), ano_semestre, course_id, token_str)
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
            'message': 'Turma importada com sucesso!',
            'turma_id': turma_id,
            'turma_nome': nome_turma,
            'total_alunos': len(students),
            'novos_alunos': novos_alunos
        }), 201

    except Exception as e:
        logger.error(f"Erro ao importar turma: {e}")
        return jsonify({'error': str(e)}), 500

def sync_internal(turma_id, creds):
    """Executa a sincronização completa de alunos e notas de uma turma."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM turmas WHERE id = ?", (turma_id,))
    turma = cur.fetchone()
    if not turma or not turma['classroom_course_id']:
        conn.close()
        raise ValueError("Turma não está vinculada ao Google Classroom")

    course_id = turma['classroom_course_id']
    turma_nome = turma['nome']
    turnos_list = json.loads(turma['turnos']) if turma['turnos'] else ['Manhã']
    turno_padrao = turnos_list[0] if turnos_list else 'Manhã'

    # 1. Sincroniza Alunos (Roster)
    students = list_course_students(creds, course_id)
    google_user_ids = {st.get('userId') for st in students if st.get('userId')}

    # Inativa quem saiu da turma no Classroom (status='transferido', mantendo histórico)
    cur.execute("SELECT id, classroom_user_id FROM alunos WHERE turma = ? AND classroom_user_id IS NOT NULL", (turma_nome,))
    alunos_locais = cur.fetchall()
    inativados = 0
    for al in alunos_locais:
        if al['classroom_user_id'] not in google_user_ids:
            cur.execute("UPDATE alunos SET status_matricula = 'transferido' WHERE id = ?", (al['id'],))
            inativados += 1

    # Insere ou reativa alunos do Classroom
    adicionados = 0
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

    # 2. Sincroniza Notas e Atividades
    works = list_course_works(creds, course_id)
    cur.execute("SELECT classroom_user_id, nome FROM alunos WHERE turma = ? AND classroom_user_id IS NOT NULL", (turma_nome,))
    alunos_map = {row['classroom_user_id']: row['nome'] for row in cur.fetchall()}
    notas_atualizadas = 0

    for work in works:
        work_id = work.get('id')
        titulo = work.get('title', 'Atividade Sem Título')
        max_points = float(work.get('maxPoints', 10.0))
        due_date = work.get('dueDate', {})
        data_formatada = None
        if due_date:
            data_formatada = f"{due_date.get('year')}-{due_date.get('month', 1):02d}-{due_date.get('day', 1):02d}"

        cur.execute('''
            INSERT INTO classroom_atividades (turma_id, classroom_course_id, classroom_work_id, titulo, max_pontos, data_entrega, sincronizado_em)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (classroom_work_id) DO UPDATE SET titulo = excluded.titulo, max_pontos = excluded.max_pontos, sincronizado_em = CURRENT_TIMESTAMP
        ''', (turma_id, course_id, work_id, titulo, max_points, data_formatada))

        submissions = list_student_submissions(creds, course_id, work_id)
        for sub in submissions:
            student_id = sub.get('userId')
            sub_id = sub.get('id')
            aluno_nome = alunos_map.get(student_id)
            if not aluno_nome:
                continue

            assigned_grade = sub.get('assignedGrade')
            if assigned_grade is None:
                assigned_grade = sub.get('draftGrade')

            if assigned_grade is not None:
                nota_valor = float(assigned_grade)
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
                    ''', (aluno_nome, turma_nome, turno_padrao, 'Geral', nota_valor, max_points, data_formatada, f"Classroom: {titulo}", work_id, sub_id))

                notas_atualizadas += 1

    conn.commit()
    conn.close()

    return {
        'total_alunos': len(students),
        'novos_alunos': adicionados,
        'alunos_inativados': inativados,
        'atividades_processadas': len(works),
        'notas_atualizadas': notas_atualizadas
    }

@classroom_bp.route('/sync/<int:turma_id>', methods=['POST'])
def sync_turma(turma_id):
    """
    Endpoint único de sincronização:
    - Se autenticado: executa sync de alunos e notas automaticamente.
    - Se não autenticado: retorna requires_auth com URL direta para o professor logar no Google.
    """
    creds = get_turma_creds(turma_id)
    return_to = request.args.get('return_to', f'/turma/{turma_id}')

    if not creds:
        auth_url = f"/classroom/auth?turma_id={turma_id}&return_to={return_to}"
        return jsonify({
            'requires_auth': True,
            'auth_url': auth_url,
            'message': 'Autenticação necessária com a conta Google para sincronizar.'
        }), 200

    try:
        resultado = sync_internal(turma_id, creds)
        return jsonify({
            'success': True,
            'message': f"Classroom sincronizado! {resultado['novos_alunos']} novo(s) aluno(s), {resultado['notas_atualizadas']} nota(s) espelhada(s).",
            'resultado': resultado
        }), 200
    except Exception as e:
        logger.error(f"Erro ao sincronizar turma {turma_id}: {e}")
        return jsonify({'error': str(e)}), 500

@classroom_bp.route('/sync_roster/<int:turma_id>', methods=['POST'])
def sync_roster(turma_id):
    creds = get_turma_creds(turma_id)
    if not creds:
        return jsonify({'requires_auth': True, 'auth_url': f'/classroom/auth?turma_id={turma_id}'}), 200
    try:
        res = sync_internal(turma_id, creds)
        return jsonify({'message': f"Alunos sincronizados! {res['novos_alunos']} adicionados.", 'resultado': res}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@classroom_bp.route('/sync_grades/<int:turma_id>', methods=['POST'])
def sync_grades(turma_id):
    creds = get_turma_creds(turma_id)
    if not creds:
        return jsonify({'requires_auth': True, 'auth_url': f'/classroom/auth?turma_id={turma_id}'}), 200
    try:
        res = sync_internal(turma_id, creds)
        return jsonify({'message': f"Notas sincronizadas! {res['notas_atualizadas']} notas atualizadas.", 'resultado': res}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
