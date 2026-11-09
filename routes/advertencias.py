from flask import Blueprint, request, jsonify
import sqlite3
import logging
from database import get_db_connection
from utils import normalize_turno

logger = logging.getLogger(__name__)
advertencias_bp = Blueprint('advertencias', __name__)

@advertencias_bp.route('/advertencias', methods=['GET'])
def get_advertencias():
    aluno_nome = request.args.get('aluno')
    turma = request.args.get('turma')
    turno = request.args.get('turno')
    if not aluno_nome or not turma or not turno:
        logger.error(f"Parâmetros obrigatórios ausentes em /advertencias: aluno={aluno_nome}, turma={turma}, turno={turno}")
        return jsonify({'error': 'Parâmetros aluno, turma e turno são obrigatórios'}), 400

    turno_normalized = normalize_turno(turno)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM advertencias WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ?', (aluno_nome, turma, turno_normalized))
        advertencias = cursor.fetchall()
        conn.close()
        logger.info(f"Advertências retornadas para {aluno_nome} ({turma}, {turno_normalized}): {len(advertencias)} registros")
        return jsonify([{
            'id': adv['id'],
            'aluno_nome': adv['aluno_nome'],
            'turma': adv['turma'],
            'turno': adv['turno'],
            'motivo': adv['motivo'],
            'gravidade': adv['gravidade'],
            'pontos': adv['pontos'],
            'data': adv['data'],
            'descricao': adv['descricao']
        } for adv in advertencias]), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao buscar advertências: {e}")
        return jsonify({'error': f'Erro ao acessar o banco de dados: {str(e)}'}), 500

@advertencias_bp.route('/advertencias', methods=['POST'])
def create_advertencia():
    data = request.get_json()
    logger.info(f"Dados recebidos na requisição POST /advertencias: {data}")
    try:
        aluno_nome = data['aluno_nome']
        turma = data['turma']
        turno = data['turno']
        motivo = data['motivo']
        gravidade = data.get('gravidade', 'Leve')
        pontos = data.get('pontos', 3)
        data_adv = data.get('data')
        descricao = data.get('descricao', '')
    except KeyError as e:
        logger.error(f"Erro ao criar advertência: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    required_fields = ['aluno_nome', 'turma', 'turno', 'motivo', 'data']
    for field in required_fields:
        if data.get(field) is None:
            logger.error(f"Erro ao criar advertência: Campo {field} é obrigatório.")
            return jsonify({'error': f'Campo {field} é obrigatório'}), 400

    turno_normalized = normalize_turno(turno)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO advertencias (aluno_nome, turma, turno, motivo, gravidade, pontos, data, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (aluno_nome, turma, turno_normalized, motivo, gravidade, pontos, data_adv, descricao if descricao else None)
        )
        conn.commit()
        advertencia_id = cursor.lastrowid
        logger.info(f"Advertência criada com ID {advertencia_id} e salva no banco de dados.")
        conn.close()
        return jsonify({
            'id': advertencia_id,
            'aluno_nome': aluno_nome,
            'turma': turma,
            'turno': turno_normalized,
            'motivo': motivo,
            'gravidade': gravidade,
            'pontos': pontos,
            'data': data_adv,
            'descricao': descricao
        }), 201
    except sqlite3.Error as e:
        logger.error(f"Erro ao criar advertência no banco de dados: {e}")
        return jsonify({'error': f'Erro ao inserir no banco de dados: {str(e)}'}), 500

@advertencias_bp.route('/advertencias/<int:advertencia_id>', methods=['PUT'])
def update_advertencia(advertencia_id):
    data = request.get_json()
    if not data:
        logger.error("Dados não fornecidos para atualização de advertência")
        return jsonify({'error': 'Dados não fornecidos'}), 400

    aluno_nome = data.get('aluno_nome')
    turma = data.get('turma')
    turno = data.get('turno')
    motivo = data.get('motivo')
    gravidade = data.get('gravidade', 'Leve')
    pontos = data.get('pontos', 3)
    data_adv = data.get('data')
    descricao = data.get('descricao', '')

    if not all([aluno_nome, turma, turno, motivo, data_adv]):
        logger.error("Campos obrigatórios ausentes para atualização de advertência")
        return jsonify({'error': 'Campos obrigatórios ausentes'}), 400

    turno_normalized = normalize_turno(turno)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM advertencias WHERE id = ?', (advertencia_id,))
        existing_adv = cursor.fetchone()
        if not existing_adv:
            conn.close()
            logger.warning(f"Advertência com ID {advertencia_id} não encontrada.")
            return jsonify({'error': 'Advertência não encontrada'}), 404

        cursor.execute('''
            UPDATE advertencias
            SET aluno_nome = ?, turma = ?, turno = ?, motivo = ?, gravidade = ?, pontos = ?, data = ?, descricao = ?
            WHERE id = ?
        ''', (aluno_nome, turma, turno_normalized, motivo, gravidade, pontos, data_adv, descricao if descricao else None, advertencia_id))

        conn.commit()
        logger.info(f"Advertência com ID {advertencia_id} atualizada com sucesso.")
        conn.close()
        return jsonify({
            'message': 'Advertência atualizada com sucesso',
            'id': advertencia_id,
            'aluno_nome': aluno_nome,
            'turma': turma,
            'turno': turno_normalized,
            'motivo': motivo,
            'gravidade': gravidade,
            'pontos': pontos,
            'data': data_adv,
            'descricao': descricao
        }), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao atualizar advertência: {e}")
        return jsonify({'error': f'Erro ao atualizar advertência: {str(e)}'}), 500

@advertencias_bp.route('/advertencias/<int:advertencia_id>', methods=['DELETE'])
def delete_advertencia(advertencia_id):
    logger.info(f"Recebida requisição DELETE para advertência com ID {advertencia_id}")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM advertencias WHERE id = ?', (advertencia_id,))
        existing_adv = cursor.fetchone()
        if not existing_adv:
            conn.close()
            logger.warning(f"Advertência com ID {advertencia_id} não encontrada.")
            return jsonify({'error': 'Advertência não encontrada'}), 404

        cursor.execute('DELETE FROM advertencias WHERE id = ?', (advertencia_id,))
        conn.commit()
        logger.info(f"Advertência com ID {advertencia_id} excluída com sucesso.")
        conn.close()
        return jsonify({'message': 'Advertência excluída com sucesso', 'id': advertencia_id}), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao excluir advertência: {e}")
        return jsonify({'error': f'Erro ao excluir advertência: {str(e)}'}), 500
