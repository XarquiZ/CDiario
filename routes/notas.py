from flask import Blueprint, request, jsonify
import sqlite3
import logging
from database import get_db_connection
from utils import normalize_turno, normalize_string, TIPOS_PERMITIDOS

logger = logging.getLogger(__name__)
notas_bp = Blueprint('notas', __name__)

@notas_bp.route('/notas', methods=['GET'])
def get_notas():
    aluno_nome = request.args.get('aluno')
    turma = request.args.get('turma')
    turno = request.args.get('turno')
    if not aluno_nome or not turma or not turno:
        logger.error(f"Parâmetros obrigatórios ausentes em /notas: aluno={aluno_nome}, turma={turma}, turno={turno}")
        return jsonify({'error': 'Parâmetros aluno, turma e turno são obrigatórios'}), 400

    turno_normalized = normalize_turno(turno)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM notas WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ?', (aluno_nome, turma, turno_normalized))
        notas = cursor.fetchall()
        conn.close()
        logger.info(f"Notas retornadas para {aluno_nome} ({turma}, {turno_normalized}): {len(notas)} registros")
        normalized_notas = []
        for nota in notas:
            tipo = nota['tipo']
            if tipo:
                tipo = normalize_string(tipo)
            else:
                tipo = 'teorica'
            normalized_notas.append({
                'id': nota['id'],
                'aluno_nome': nota['aluno_nome'],
                'turma': nota['turma'],
                'turno': nota['turno'],
                'materia': nota['materia'],
                'nota': nota['nota'],
                'max_nota': nota['max_nota'],
                'tipo': tipo,
                'data': nota['data'],
                'descricao': nota['descricao']
            })
        return jsonify(normalized_notas), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao buscar notas: {e}")
        return jsonify({'error': f'Erro ao acessar o banco de dados: {str(e)}'}), 500

@notas_bp.route('/notas', methods=['POST'])
def create_nota():
    data = request.get_json()
    logger.info(f"Dados recebidos na requisição POST /notas: {data}")
    try:
        aluno_nome = data['aluno_nome']
        turma = data['turma']
        turno = data['turno']
        materia = data['materia']
        nota = float(data['nota'])
        max_nota = float(data['max_nota'])
        tipo = data.get('tipo', 'teorica')
        data_nota = data.get('data')
        descricao = data.get('descricao', '')
    except KeyError as e:
        logger.error(f"Erro ao criar nota: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400
    except ValueError as e:
        logger.error(f"Erro ao criar nota: Valor inválido para nota ou max_nota - {e}")
        return jsonify({'error': 'Nota e max_nota devem ser números válidos'}), 400

    required_fields = ['aluno_nome', 'turma', 'turno', 'materia', 'nota', 'max_nota']
    for field in required_fields:
        if data.get(field) is None:
            logger.error(f"Erro ao criar nota: Campo {field} é obrigatório.")
            return jsonify({'error': f'Campo {field} é obrigatório'}), 400

    if tipo not in TIPOS_PERMITIDOS:
        logger.error(f"Erro ao criar nota: Tipo inválido - {tipo}")
        return jsonify({'error': f"Tipo deve ser um dos seguintes: {', '.join(TIPOS_PERMITIDOS)}"}), 400

    turno_normalized = normalize_turno(turno)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO notas (aluno_nome, turma, turno, materia, nota, max_nota, tipo, data, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (aluno_nome, turma, turno_normalized, materia, nota, max_nota, tipo, data_nota if data_nota else None, descricao if descricao else None)
        )
        conn.commit()
        nota_id = cursor.lastrowid
        logger.info(f"Nota criada com ID {nota_id} e salva no banco de dados.")
        conn.close()
        return jsonify({
            'id': nota_id,
            'aluno_nome': aluno_nome,
            'turma': turma,
            'turno': turno_normalized,
            'materia': materia,
            'nota': nota,
            'max_nota': max_nota,
            'tipo': tipo,
            'data': data_nota,
            'descricao': descricao
        }), 201
    except sqlite3.Error as e:
        logger.error(f"Erro ao criar nota no banco de dados: {e}")
        return jsonify({'error': f'Erro ao inserir no banco de dados: {str(e)}'}), 500

@notas_bp.route('/notas/<int:nota_id>', methods=['PUT'])
def update_nota(nota_id):
    data = request.get_json()
    if not data:
        logger.error("Dados não fornecidos para atualização de nota")
        return jsonify({'error': 'Dados não fornecidos'}), 400

    try:
        aluno_nome = data.get('aluno_nome')
        turma = data.get('turma')
        turno = data.get('turno')
        materia = data.get('materia')
        nota = float(data.get('nota'))
        max_nota = float(data.get('max_nota', 10.0))
        tipo = data.get('tipo', 'teorica')
        data_nota = data.get('data')
        descricao = data.get('descricao', '')
    except ValueError as e:
        logger.error(f"Erro ao atualizar nota: Valor inválido para nota ou max_nota - {e}")
        return jsonify({'error': 'Nota e max_nota devem ser números válidos'}), 400

    if not all([aluno_nome, turma, turno, materia, nota is not None]):
        logger.error("Campos obrigatórios ausentes para atualização de nota")
        return jsonify({'error': 'Campos obrigatórios ausentes'}), 400

    if tipo not in TIPOS_PERMITIDOS:
        logger.error(f"Erro ao atualizar nota: Tipo inválido - {tipo}")
        return jsonify({'error': f"Tipo deve ser um dos seguintes: {', '.join(TIPOS_PERMITIDOS)}"}), 400

    turno_normalized = normalize_turno(turno)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM notas WHERE id = ?', (nota_id,))
        existing_nota = cursor.fetchone()
        if not existing_nota:
            conn.close()
            logger.warning(f"Nota com ID {nota_id} não encontrada.")
            return jsonify({'error': 'Nota não encontrada'}), 404

        cursor.execute('''
            UPDATE notas
            SET aluno_nome = ?, turma = ?, turno = ?, materia = ?, nota = ?, max_nota = ?, tipo = ?, data = ?, descricao = ?
            WHERE id = ?
        ''', (aluno_nome, turma, turno_normalized, materia, nota, max_nota, tipo, data_nota if data_nota else None, descricao if descricao else None, nota_id))

        conn.commit()
        logger.info(f"Nota com ID {nota_id} atualizada com sucesso.")
        conn.close()
        return jsonify({
            'message': 'Nota atualizada com sucesso',
            'id': nota_id,
            'aluno_nome': aluno_nome,
            'turma': turma,
            'turno': turno_normalized,
            'materia': materia,
            'nota': nota,
            'max_nota': max_nota,
            'tipo': tipo,
            'data': data_nota,
            'descricao': descricao
        }), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao atualizar nota: {e}")
        return jsonify({'error': f'Erro ao atualizar nota: {str(e)}'}), 500

@notas_bp.route('/notas/<int:nota_id>', methods=['DELETE'])
def delete_nota(nota_id):
    logger.info(f"Recebida requisição DELETE para nota com ID {nota_id}")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM notas WHERE id = ?', (nota_id,))
        existing_nota = cursor.fetchone()
        if not existing_nota:
            conn.close()
            logger.warning(f"Nota com ID {nota_id} não encontrada.")
            return jsonify({'error': 'Nota não encontrada'}), 404

        cursor.execute('DELETE FROM notas WHERE id = ?', (nota_id,))
        conn.commit()
        logger.info(f"Nota com ID {nota_id} excluída com sucesso.")
        conn.close()
        return jsonify({'message': 'Nota excluída com sucesso', 'id': nota_id}), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao excluir nota: {e}")
        return jsonify({'error': f'Erro ao excluir nota: {str(e)}'}), 500
