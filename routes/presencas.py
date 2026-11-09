from flask import Blueprint, request, jsonify
import sqlite3
import logging
from datetime import datetime
from database import get_db_connection
from utils import normalize_turno, convert_date_format, validate_date_format

logger = logging.getLogger(__name__)
presencas_bp = Blueprint('presencas', __name__)

@presencas_bp.route('/presenca', methods=['GET'])
def get_presenca():
    turma = request.args.get('turma')
    turno = request.args.get('turno')
    data = request.args.get('data')
    if not turma or not turno or not data:
        logger.error(f"Parâmetros obrigatórios ausentes em /presenca: turma={turma}, turno={turno}, data={data}")
        return jsonify({'error': 'Parâmetros turma, turno e data são obrigatórios'}), 400

    try:
        data = convert_date_format(data)
        if not validate_date_format(data):
            logger.error("Data inválida fornecida")
            return jsonify({'error': 'Data inválida (deve ser uma data válida no formato AAAA-MM-DD ou DD/MM/AAAA)'}), 400

        data_banco = datetime.strptime(data, '%d/%m/%Y').strftime('%d/%m/%Y')
        turno_normalized = normalize_turno(turno)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, nome FROM alunos WHERE turma = ? AND lower(turno) = ?', (turma, turno_normalized))
        alunos = cursor.fetchall()

        cursor.execute('SELECT * FROM presencas WHERE turma = ? AND lower(turno) = ? AND data = ?', (turma, turno_normalized, data_banco))
        presencas = cursor.fetchall()

        presenca_map = {presenca['aluno_nome']: presenca for presenca in presencas}
        result = []
        for aluno in alunos:
            aluno_nome = aluno['nome']
            presenca = presenca_map.get(aluno_nome, {})
            status = 'presente' if presenca.get('presente', False) else \
                     ('justificado' if presenca.get('justificado', False) else \
                      ('falta' if presenca.get('falta', False) else ''))
            result.append({
                'aluno_id': aluno['id'],
                'nome': aluno_nome,
                'status': status
            })

        conn.close()
        logger.info(f"Presenças retornadas para turma {turma} e turno {turno_normalized} em {data}: {len(result)} registros")
        return jsonify(result), 200
    except ValueError as e:
        logger.error(f"Erro ao buscar presenças: Data inválida - {e}")
        return jsonify({'error': str(e)}), 400
    except sqlite3.Error as e:
        logger.error(f"Erro ao buscar presenças: {e}")
        return jsonify({'error': f'Erro ao acessar o banco de dados: {str(e)}'}), 500

@presencas_bp.route('/presenca', methods=['POST'])
def update_presenca():
    data = request.get_json()
    logger.info(f"Dados recebidos na requisição POST /presenca: {data}")

    try:
        aluno_id = data['aluno_id']
        turma = data['turma']
        turno = data['turno']
        data_presenca = data['data']
        status = data['status']
    except KeyError as e:
        logger.error(f"Erro ao atualizar presença: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    if status not in ['presente', 'falta', 'justificado']:
        logger.error(f"Erro ao atualizar presença: Status inválido - {status}")
        return jsonify({'error': 'Status deve ser "presente", "falta" ou "justificado"'}), 400

    try:
        data_presenca = convert_date_format(data_presenca)
        if not validate_date_format(data_presenca):
            logger.error("Data inválida fornecida")
            return jsonify({'error': 'Data inválida (deve ser uma data válida no formato AAAA-MM-DD ou DD/MM/AAAA)'}), 400

        data_banco = datetime.strptime(data_presenca, '%d/%m/%Y').strftime('%d/%m/%Y')
        turno_normalized = normalize_turno(turno)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT nome FROM alunos WHERE id = ?', (aluno_id,))
        aluno = cursor.fetchone()
        if not aluno:
            conn.close()
            logger.warning(f"Aluno com ID {aluno_id} não encontrado.")
            return jsonify({'error': 'Aluno não encontrado'}), 404
        aluno_nome = aluno['nome']

        presente = status == 'presente'
        falta = status == 'falta'
        justificado = status == 'justificado'

        if falta and not justificado:
            justificado = False
        elif justificado:
            falta = True

        cursor.execute('SELECT * FROM presencas WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND data = ?', (aluno_nome, turma, turno_normalized, data_banco))
        existing_presenca = cursor.fetchone()

        if existing_presenca:
            try:
                cursor.execute(
                    'UPDATE presencas SET presente = ?, falta = ?, justificado = ? WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND data = ?',
                    (presente, falta, justificado, aluno_nome, turma, turno_normalized, data_banco)
                )
                conn.commit()
                logger.info(f"Presença atualizada para {aluno_nome} ({turma}, {turno_normalized}) em {data_presenca}: presente={presente}, falta={falta}, justificado={justificado}")
            except sqlite3.IntegrityError as e:
                logger.error(f"Conflito de chave única ao atualizar presença: {e}")
                return jsonify({'error': 'Conflito de dados. Tente novamente ou verifique a integridade do banco.'}), 409
        else:
            try:
                cursor.execute(
                    'INSERT INTO presencas (aluno_nome, turma, turno, data, presente, falta, justificado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    (aluno_nome, turma, turno_normalized, data_banco, presente, falta, justificado)
                )
                conn.commit()
                logger.info(f"Presença criada para {aluno_nome} ({turma}, {turno_normalized}) em {data_presenca}: presente={presente}, falta={falta}, justificado={justificado}")
            except sqlite3.IntegrityError as e:
                logger.error(f"Conflito de chave única ao inserir presença: {e}")
                return jsonify({'error': 'Conflito de dados. Tente novamente ou verifique a integridade do banco.'}), 409

        conn.close()
        return jsonify({
            'message': 'Presença atualizada com sucesso',
            'aluno_id': aluno_id,
            'turma': turma,
            'turno': turno_normalized,
            'data': data_presenca,
            'status': status
        }), 200

    except ValueError as e:
        logger.error(f"Erro ao atualizar presença: Data inválida - {e}")
        return jsonify({'error': str(e)}), 400
    except sqlite3.Error as e:
        logger.error(f"Erro ao atualizar presença no banco de dados: {e}")
        return jsonify({'error': f'Erro ao inserir no banco de dados: {str(e)}'}), 500

@presencas_bp.route('/presenca', methods=['DELETE'])
def delete_presenca():
    data = request.get_json()
    logger.info(f"Dados recebidos na requisição DELETE /presenca: {data}")

    try:
        aluno_id = data['aluno_id']
        turma = data['turma']
        turno = data['turno']
        data_presenca = data['data']
    except KeyError as e:
        logger.error(f"Erro ao remover presença: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    try:
        data_presenca = convert_date_format(data_presenca)
        if not validate_date_format(data_presenca):
            logger.error("Data inválida fornecida")
            return jsonify({'error': 'Data inválida (deve ser uma data válida no formato AAAA-MM-DD ou DD/MM/AAAA)'}), 400

        data_banco = datetime.strptime(data_presenca, '%d/%m/%Y').strftime('%d/%m/%Y')
        turno_normalized = normalize_turno(turno)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT nome FROM alunos WHERE id = ?', (aluno_id,))
        aluno = cursor.fetchone()
        if not aluno:
            conn.close()
            logger.warning(f"Aluno com ID {aluno_id} não encontrado.")
            return jsonify({'error': 'Aluno não encontrado'}), 404
        aluno_nome = aluno['nome']

        cursor.execute('SELECT * FROM presencas WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND data = ?', (aluno_nome, turma, turno_normalized, data_banco))
        existing_presenca = cursor.fetchone()
        if not existing_presenca:
            conn.close()
            logger.info("Nenhum registro de presença encontrado para remover")
            return jsonify({'message': 'Nenhum registro de presença encontrado para remover'}), 200

        cursor.execute('DELETE FROM presencas WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND data = ?', (aluno_nome, turma, turno_normalized, data_banco))
        conn.commit()
        logger.info(f"Presença removida para {aluno_nome} ({turma}, {turno_normalized}) em {data_presenca}")
        conn.close()
        return jsonify({'message': 'Presença removida com sucesso'}), 200

    except ValueError as e:
        logger.error(f"Erro ao remover presença: Data inválida - {e}")
        return jsonify({'error': str(e)}), 400
    except sqlite3.Error as e:
        logger.error(f"Erro ao remover presença no banco de dados: {e}")
        return jsonify({'error': f'Erro ao remover do banco de dados: {str(e)}'}), 500

@presencas_bp.route('/presencas', methods=['GET'])
def get_presencas():
    try:
        turma = request.args.get('turma')
        turno = request.args.get('turno')
        date = request.args.get('date')

        if not turma or not turno or not date:
            logger.error(f"Parâmetros obrigatórios ausentes em /presencas: turma={turma}, turno={turno}, date={date}")
            return jsonify({'error': 'Parâmetros turma, turno e date são obrigatórios'}), 400

        date = convert_date_format(date)
        if not validate_date_format(date):
            logger.error("Data inválida fornecida")
            return jsonify({'error': 'Data inválida (deve ser uma data válida no formato AAAA-MM-DD ou DD/MM/AAAA)'}), 400

        data_banco = date
        turno_normalized = normalize_turno(turno)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id, nome FROM alunos WHERE turma = ? AND lower(turno) = ?', (turma, turno_normalized))
        alunos = cursor.fetchall()

        cursor.execute('''
            SELECT aluno_nome, presente, falta, justificado 
            FROM presencas 
            WHERE turma = ? AND lower(turno) = ? AND data = ?
        ''', (turma, turno_normalized, data_banco))
        presencas_db = cursor.fetchall()
        conn.close()

        presencas_map = {}
        for presenca in presencas_db:
            aluno_id = None
            aluno_nome = presenca['aluno_nome']
            for aluno in alunos:
                if aluno['nome'] == aluno_nome:
                    aluno_id = str(aluno['id'])
                    break
            if aluno_id:
                presencas_map[aluno_id] = {
                    'presente': bool(presenca['presente']),
                    'falta': bool(presenca['falta']),
                    'justificado': bool(presenca['justificado']),
                    'nome': aluno_nome
                }

        result = {}
        for aluno in alunos:
            aluno_id = str(aluno['id'])
            presenca = presencas_map.get(aluno_id, {
                'presente': False,
                'falta': False,
                'justificado': False,
                'nome': aluno['nome']
            })
            result[aluno_id] = presenca

        logger.info(f"Presenças retornadas para turma {turma} e turno {turno_normalized} em {data_banco}: {len(result)} registros")
        return jsonify(result), 200

    except ValueError as e:
        logger.error(f"Erro ao buscar presenças: Data inválida - {e}")
        return jsonify({'error': str(e)}), 400
    except sqlite3.Error as e:
        logger.error(f"Erro ao buscar presenças no banco de dados: {e}")
        return jsonify({'error': f'Erro ao buscar no banco de dados: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Erro inesperado ao buscar presenças: {e}")
        return jsonify({'error': f'Erro inesperado: {str(e)}'}), 500

@presencas_bp.route('/presencas', methods=['POST'])
def create_or_update_presencas():
    data = request.get_json()
    logger.info(f"Dados recebidos na requisição POST /presencas: {data}")

    try:
        turma = data['turma']
        turno = data['turno']
        date = data['date']
        presencas = data['presencas']
    except KeyError as e:
        logger.error(f"Erro ao criar/atualizar presenças: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    if not isinstance(presencas, dict):
        logger.error("O campo presencas deve ser um objeto com chaves de IDs de alunos")
        return jsonify({'error': 'O campo presencas deve ser um objeto com chaves de IDs de alunos'}), 400

    try:
        date = convert_date_format(date)
        if not validate_date_format(date):
            logger.error("Data inválida fornecida")
            return jsonify({'error': 'Data inválida (deve ser uma data válida no formato AAAA-MM-DD ou DD/MM/AAAA)'}), 400

        data_banco = datetime.strptime(date, '%d/%m/%Y').strftime('%d/%m/%Y')
        turno_normalized = normalize_turno(turno)

        conn = get_db_connection()
        cursor = conn.cursor()

        for aluno_id, estado in presencas.items():
            cursor.execute('SELECT nome FROM alunos WHERE id = ?', (aluno_id,))
            aluno = cursor.fetchone()
            if not aluno:
                continue
            aluno_nome = aluno['nome']

            presente = bool(estado.get('presente', False))
            falta = bool(estado.get('falta', False))
            justificado = bool(estado.get('justificado', False))

            if falta and not justificado:
                justificado = False
            elif justificado:
                falta = True

            cursor.execute('SELECT * FROM presencas WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND data = ?', (aluno_nome, turma, turno_normalized, data_banco))
            existing_presenca = cursor.fetchone()

            if existing_presenca:
                try:
                    cursor.execute(
                        'UPDATE presencas SET presente = ?, falta = ?, justificado = ? WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND data = ?',
                        (presente, falta, justificado, aluno_nome, turma, turno_normalized, data_banco)
                    )
                except sqlite3.IntegrityError as e:
                    logger.error(f"Conflito de chave única ao atualizar presença: {e}")
                    conn.rollback()
                    continue
            else:
                try:
                    cursor.execute(
                        'INSERT INTO presencas (aluno_nome, turma, turno, data, presente, falta, justificado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        (aluno_nome, turma, turno_normalized, data_banco, presente, falta, justificado)
                    )
                except sqlite3.IntegrityError as e:
                    logger.error(f"Conflito de chave única ao inserir presença: {e}")
                    conn.rollback()
                    continue

        conn.commit()
        conn.close()
        return jsonify({'message': 'Presenças atualizadas com sucesso', 'turma': turma, 'turno': turno_normalized, 'date': date}), 200

    except ValueError as e:
        logger.error(f"Erro ao criar/atualizar presenças: Data inválida - {e}")
        return jsonify({'error': str(e)}), 400
    except sqlite3.Error as e:
        logger.error(f"Erro ao criar/atualizar presenças no banco de dados: {e}")
        return jsonify({'error': f'Erro ao inserir no banco de dados: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Erro inesperado ao criar/atualizar presenças: {e}")
        return jsonify({'error': f'Erro inesperado: {str(e)}'}), 500

@presencas_bp.route('/faltas', methods=['GET'])
def get_faltas():
    try:
        aluno = request.args.get('aluno')
        turma = request.args.get('turma')
        turno = request.args.get('turno')

        if not aluno or not turma or not turno:
            return jsonify({'error': 'Parâmetros aluno, turma e turno são obrigatórios'}), 400
            
        turno_normalized = normalize_turno(turno)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT count(*) as total_faltas
            FROM presencas
            WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND falta = 1
        ''', (aluno, turma, turno_normalized))
        
        row = cursor.fetchone()
        conn.close()
        
        total = row['total_faltas'] if row else 0
        return jsonify({'faltas': total}), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao buscar faltas no banco de dados: {e}")
        return jsonify({'error': str(e)}), 500

@presencas_bp.route('/faltas-detalhes', methods=['GET'])
def get_faltas_detalhes():
    try:
        aluno = request.args.get('aluno')
        turma = request.args.get('turma')
        turno = request.args.get('turno')

        if not aluno or not turma or not turno:
            return jsonify({'error': 'Parâmetros aluno, turma e turno são obrigatórios'}), 400

        turno_normalized = normalize_turno(turno)
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, data, presente, falta, justificado
            FROM presencas
            WHERE aluno_nome = ? AND turma = ? AND lower(turno) = ? AND falta = 1
            ORDER BY data ASC
        ''', (aluno, turma, turno_normalized))
        faltas = cursor.fetchall()
        conn.close()

        result = [{
            'id': f['id'],
            'data': f['data'],
            'falta': bool(f['falta']),
            'justificado': bool(f['justificado'])
        } for f in faltas]

        return jsonify(result), 200
    except sqlite3.Error as e:
        logger.error(f"Erro ao buscar detalhes de faltas: {e}")
        return jsonify({'error': str(e)}), 500
