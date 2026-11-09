from flask import Blueprint, request, jsonify, session
import sqlite3
import json
import logging
from database import get_db_connection
from utils import normalize_turno

logger = logging.getLogger(__name__)
turmas_bp = Blueprint('turmas', __name__)

@turmas_bp.route('/turmas', methods=['POST'])
def create_turma():
    data = request.get_json() or {}
    logger.info(f"Dados recebidos na requisição POST /turmas: {data}")
    try:
        nome = data['nome'].strip()
        turnos = data['turnos']
        normalized_turnos = [normalize_turno(turno) for turno in turnos if turno]
        ano_semestre = data.get('ano_semestre', '2026.1').strip()
        tipo_turma = data.get('tipo_turma', 'tradicional')
        professor_usuario = data.get('professor_usuario') or session.get('usuario')
    except KeyError as e:
        logger.error(f"Erro ao criar turma: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM turmas WHERE nome = ?', (nome,))
        if cursor.fetchone():
            return jsonify({'error': 'Turma com esse nome já existe'}), 400

        cursor.execute(
            '''INSERT INTO turmas (nome, turnos, ano_semestre, status, tipo_turma, professor_usuario)
               VALUES (?, ?, ?, 'ativa', ?, ?)''',
            (nome, json.dumps(normalized_turnos), ano_semestre, tipo_turma, professor_usuario)
        )
        conn.commit()
        turma_id = cursor.lastrowid
        conn.close()
        return jsonify({
            'id': turma_id,
            'nome': nome,
            'turnos': normalized_turnos,
            'ano_semestre': ano_semestre,
            'status': 'ativa',
            'tipo_turma': tipo_turma
        }), 201
    except Exception as e:
        logger.error(f"Erro ao criar turma: {e}")
        return jsonify({'error': str(e)}), 500

@turmas_bp.route('/turmas/<int:id>', methods=['PUT'])
def update_turma(id):
    data = request.get_json() or {}
    try:
        nome = data['nome'].strip()
        turnos = data['turnos']
        normalized_turnos = [normalize_turno(turno) for turno in turnos if turno]
        ano_semestre = data.get('ano_semestre', '2026.1')
        status = data.get('status', 'ativa')
        tipo_turma = data.get('tipo_turma', 'tradicional')
        professor_usuario = data.get('professor_usuario')
    except KeyError as e:
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM turmas WHERE id = ?', (id,))
        turma = cursor.fetchone()
        if not turma:
            conn.close()
            return jsonify({'error': 'Turma não encontrada'}), 404

        cursor.execute('SELECT id FROM turmas WHERE nome = ? AND id != ?', (nome, id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Turma com esse nome já existe'}), 400

        cursor.execute('''
            UPDATE turmas
            SET nome = ?, turnos = ?, ano_semestre = ?, status = ?, tipo_turma = ?, professor_usuario = ?
            WHERE id = ?
        ''', (nome, json.dumps(normalized_turnos), ano_semestre, status, tipo_turma, professor_usuario, id))
        conn.commit()
        conn.close()
        return jsonify({'id': id, 'nome': nome, 'turnos': normalized_turnos, 'ano_semestre': ano_semestre, 'status': status}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@turmas_bp.route('/turmas/<int:id>/status', methods=['PUT'])
def update_turma_status(id):
    """Arquiva ou reativa uma turma (ex: ao final do semestre)."""
    data = request.get_json() or {}
    novo_status = data.get('status', 'arquivada') # 'ativa' ou 'arquivada'
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE turmas SET status = ? WHERE id = ?', (novo_status, id))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Status da turma atualizado para {novo_status}', 'id': id, 'status': novo_status}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@turmas_bp.route('/turmas/<int:id>/duplicar', methods=['POST'])
def duplicar_turma(id):
    """Duplica uma turma para o próximo semestre."""
    data = request.get_json() or {}
    novo_ano_semestre = data.get('novo_ano_semestre', '2026.2')
    copiar_alunos = data.get('copiar_alunos', True)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM turmas WHERE id = ?', (id,))
        turma = cur.fetchone()
        if not turma:
            conn.close()
            return jsonify({'error': 'Turma original não encontrada'}), 404

        novo_nome = f"{turma['nome']} ({novo_ano_semestre})"
        cur.execute(
            '''INSERT INTO turmas (nome, turnos, ano_semestre, status, tipo_turma, professor_usuario)
               VALUES (?, ?, ?, 'ativa', ?, ?)''',
            (novo_nome, turma['turnos'], novo_ano_semestre, turma['tipo_turma'], turma['professor_usuario'])
        )
        nova_turma_id = cur.lastrowid

        if copiar_alunos:
            cur.execute("SELECT * FROM alunos WHERE turma = ? AND status_matricula = 'ativo'", (turma['nome'],))
            alunos_ativos = cur.fetchall()
            for al in alunos_ativos:
                cur.execute(
                    '''INSERT INTO alunos (nome, email, turma, turno, status_matricula)
                       VALUES (?, ?, ?, ?, 'ativo')''',
                    (al['nome'], al['email'], novo_nome, al['turno'])
                )

        conn.commit()
        conn.close()
        return jsonify({
            'message': f'Turma duplicada com sucesso para {novo_ano_semestre}!',
            'id': nova_turma_id,
            'nome': novo_nome
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@turmas_bp.route('/turmas/<int:id>', methods=['DELETE'])
def delete_turma(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM turmas WHERE id = ?', (id,))
        turma = cursor.fetchone()
        if not turma:
            conn.close()
            return jsonify({'error': 'Turma não encontrada'}), 404

        cursor.execute('UPDATE alunos SET turma = ?, turno = ? WHERE turma = ?', (None, None, turma['nome']))
        cursor.execute('DELETE FROM presencas WHERE turma = ?', (turma['nome'],))
        cursor.execute('DELETE FROM notas WHERE turma = ?', (turma['nome'],))
        cursor.execute('DELETE FROM advertencias WHERE turma = ?', (turma['nome'],))
        cursor.execute('DELETE FROM turmas WHERE id = ?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Turma excluída com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@turmas_bp.route('/turmas', methods=['GET'])
def get_turmas():
    turno_filter = request.args.get('turno')
    status_filter = request.args.get('status', 'ativa') # padrão: só ativas. Se passar 'todos' ou 'arquivada', filtra de acordo.
    ano_semestre = request.args.get('ano_semestre')

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = 'SELECT * FROM turmas WHERE 1=1'
        params = []

        if status_filter != 'todos':
            query += ' AND status = ?'
            params.append(status_filter)

        if ano_semestre:
            query += ' AND ano_semestre = ?'
            params.append(ano_semestre)

        cursor.execute(query, tuple(params) if params else None)
        turmas = cursor.fetchall()
        conn.close()

        result = []
        for turma in turmas:
            try:
                turnos = json.loads(turma['turnos'])
                if not isinstance(turnos, list):
                    turnos = []
            except Exception:
                turnos = []

            if turno_filter:
                turno_filter_normalized = normalize_turno(turno_filter)
                if turno_filter_normalized not in turnos:
                    continue

            result.append({
                'id': turma['id'],
                'nome': turma['nome'],
                'turnos': turnos,
                'ano_semestre': turma.get('ano_semestre', '2026.1'),
                'status': turma.get('status', 'ativa'),
                'tipo_turma': turma.get('tipo_turma', 'tradicional'),
                'classroom_course_id': turma.get('classroom_course_id')
            })

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Erro ao buscar turmas: {e}")
        return jsonify({'error': str(e)}), 500
