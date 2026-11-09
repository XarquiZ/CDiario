from flask import Blueprint, request, jsonify
import sqlite3
import logging
from database import get_db_connection
from utils import normalize_turno, convert_date_format, validate_date_format

logger = logging.getLogger(__name__)
alunos_bp = Blueprint('alunos', __name__)

@alunos_bp.route('/alunos', methods=['GET'])
def get_alunos():
    turma_filter = request.args.get('turma')
    turno_filter = request.args.get('turno')
    status_matricula_filter = request.args.get('status', 'ativo')

    logger.info(f"Recebida requisição GET /alunos com filtros: turma={turma_filter}, turno={turno_filter}, status={status_matricula_filter}")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = 'SELECT * FROM alunos'
        params = []
        conditions = []

        if turma_filter:
            conditions.append('turma = ?')
            params.append(turma_filter)
        if turno_filter:
            turno_filter_normalized = normalize_turno(turno_filter)
            conditions.append('lower(turno) = ?')
            params.append(turno_filter_normalized)
        if status_matricula_filter != 'todos':
            conditions.append('status_matricula = ?')
            params.append(status_matricula_filter)

        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)

        query += ' ORDER BY nome ASC'

        cursor.execute(query, tuple(params) if params else None)
        alunos = cursor.fetchall()
        conn.close()

        return jsonify([{
            'id': aluno['id'],
            'nome': aluno['nome'],
            'data_nascimento': aluno['data_nascimento'],
            'nis': aluno['nis'],
            'rg': aluno['rg'],
            'orgao': aluno['orgao'],
            'uf_rg': aluno['uf_rg'],
            'cpf': aluno['cpf'],
            'sexo': aluno['sexo'],
            'nacionalidade': aluno['nacionalidade'],
            'naturalidade': aluno['naturalidade'],
            'uf_naturalidade': aluno['uf_naturalidade'],
            'nome_pai': aluno['nome_pai'],
            'nome_mae': aluno['nome_mae'],
            'etnia': aluno['etnia'],
            'deficiencia': aluno['deficiencia'],
            'situacao_ocupacional': aluno['situacao_ocupacional'],
            'cep': aluno['cep'],
            'rua': aluno['rua'],
            'numero': aluno['numero'],
            'bairro': aluno['bairro'],
            'municipio': aluno['municipio'],
            'estado': aluno['estado'],
            'telefone': aluno['telefone'],
            'celular': aluno['celular'],
            'email': aluno['email'],
            'escolaridade': aluno['escolaridade'],
            'situacao_escolar': aluno['situacao_escolar'],
            'matricula': aluno['matricula'],
            'turma': aluno['turma'],
            'turno': aluno['turno'],
            'status_matricula': aluno.get('status_matricula', 'ativo'),
            'classroom_user_id': aluno.get('classroom_user_id')
        } for aluno in alunos]), 200
    except Exception as e:
        logger.error(f"Erro ao buscar alunos: {e}")
        return jsonify({'error': f'Erro ao acessar o banco de dados: {str(e)}'}), 500

@alunos_bp.route('/alunos/<int:id>/status', methods=['PUT'])
def update_aluno_status(id):
    """Muda o status do aluno (ex: 'ativo', 'transferido', 'desistente')."""
    data = request.get_json() or {}
    novo_status = data.get('status_matricula', 'transferido')
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE alunos SET status_matricula = ? WHERE id = ?", (novo_status, id))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Status do aluno atualizado para {novo_status}', 'id': id, 'status_matricula': novo_status}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alunos_bp.route('/alunos', methods=['POST'])
def create_aluno():
    data = request.get_json() or {}
    try:
        nome = data['nome']
        data_nascimento = data.get('data_nascimento')
        telefone = data.get('telefone')
        nis = data.get('nis')
        rg = data.get('rg')
        orgao = data.get('orgao')
        uf_rg = data.get('uf_rg')
        cpf = data.get('cpf')
        sexo = data.get('sexo')
        nacionalidade = data.get('nacionalidade')
        naturalidade = data.get('naturalidade')
        uf_naturalidade = data.get('uf_naturalidade')
        nome_pai = data.get('nome_pai')
        nome_mae = data.get('nome_mae')
        etnia = data.get('etnia')
        deficiencia = data.get('deficiencia')
        situacao_ocupacional = data.get('situacao_ocupacional')
        cep = data.get('cep')
        rua = data.get('rua')
        numero = data.get('numero')
        bairro = data.get('bairro')
        municipio = data.get('municipio')
        estado = data.get('estado')
        celular = data.get('celular')
        email = data.get('email')
        escolaridade = data.get('escolaridade')
        situacao_escolar = data.get('situacao_escolar')
        matricula = data.get('matricula')
        turma = data.get('turma')
        turno = data.get('turno')
        status_matricula = data.get('status_matricula', 'ativo')
    except KeyError as e:
        logger.error(f"Erro ao criar aluno: Campo faltando - {e}")
        return jsonify({'error': f'Campo obrigatório faltando: {e}'}), 400

    if not nome:
        return jsonify({'error': 'Nome é obrigatório'}), 400

    if data_nascimento and not validate_date_format(data_nascimento):
        return jsonify({'error': 'Data de Nascimento inválida'}), 400

    try:
        if data_nascimento:
            data_nascimento = convert_date_format(data_nascimento)
        if turno:
            turno = normalize_turno(turno)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO alunos (nome, data_nascimento, nis, rg, orgao, uf_rg, cpf, sexo, nacionalidade, naturalidade, uf_naturalidade, nome_pai, nome_mae, etnia, deficiencia, situacao_ocupacional, cep, rua, numero, bairro, municipio, estado, telefone, celular, email, escolaridade, situacao_escolar, matricula, turma, turno, status_matricula)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (nome, data_nascimento if data_nascimento else None, nis if nis else None, rg if rg else None, orgao if orgao else None, uf_rg if uf_rg else None, cpf if cpf else None, sexo if sexo else None, nacionalidade if nacionalidade else None, naturalidade if naturalidade else None, uf_naturalidade if uf_naturalidade else None, nome_pai if nome_pai else None, nome_mae if nome_mae else None, etnia if etnia else None, deficiencia if deficiencia else None, situacao_ocupacional if situacao_ocupacional else None, cep if cep else None, rua if rua else None, numero if numero else None, bairro if bairro else None, municipio if municipio else None, estado if estado else None, telefone if telefone else None, celular if celular else None, email if email else None, escolaridade if escolaridade else None, situacao_escolar if situacao_escolar else None, matricula if matricula else None, turma if turma else None, turno if turno else None, status_matricula)
        )
        conn.commit()
        aluno_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': aluno_id, 'nome': nome, 'turma': turma, 'status_matricula': status_matricula}), 201
    except Exception as e:
        logger.error(f"Erro ao criar aluno no banco de dados: {e}")
        return jsonify({'error': f'Erro ao inserir no banco de dados: {str(e)}'}), 500

@alunos_bp.route('/alunos/<int:id>', methods=['PUT'])
def update_aluno(id):
    data = request.get_json() or {}
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM alunos WHERE id = ?', (id,))
        aluno = cursor.fetchone()
        if not aluno:
            conn.close()
            return jsonify({'error': 'Aluno não encontrado'}), 404

        aluno_atual = dict(aluno)
        nome = data.get('nome', aluno_atual['nome'])
        data_nascimento = data.get('data_nascimento', aluno_atual['data_nascimento'])
        telefone = data.get('telefone', aluno_atual['telefone'])
        nis = data.get('nis', aluno_atual['nis'])
        rg = data.get('rg', aluno_atual['rg'])
        orgao = data.get('orgao', aluno_atual['orgao'])
        uf_rg = data.get('uf_rg', aluno_atual['uf_rg'])
        cpf = data.get('cpf', aluno_atual['cpf'])
        sexo = data.get('sexo', aluno_atual['sexo'])
        nacionalidade = data.get('nacionalidade', aluno_atual['nacionalidade'])
        naturalidade = data.get('naturalidade', aluno_atual['naturalidade'])
        uf_naturalidade = data.get('uf_naturalidade', aluno_atual['uf_naturalidade'])
        nome_pai = data.get('nome_pai', aluno_atual['nome_pai'])
        nome_mae = data.get('nome_mae', aluno_atual['nome_mae'])
        etnia = data.get('etnia', aluno_atual['etnia'])
        deficiencia = data.get('deficiencia', aluno_atual['deficiencia'])
        situacao_ocupacional = data.get('situacao_ocupacional', aluno_atual['situacao_ocupacional'])
        cep = data.get('cep', aluno_atual['cep'])
        rua = data.get('rua', aluno_atual['rua'])
        numero = data.get('numero', aluno_atual['numero'])
        bairro = data.get('bairro', aluno_atual['bairro'])
        municipio = data.get('municipio', aluno_atual['municipio'])
        estado = data.get('estado', aluno_atual['estado'])
        celular = data.get('celular', aluno_atual['celular'])
        email = data.get('email', aluno_atual['email'])
        escolaridade = data.get('escolaridade', aluno_atual['escolaridade'])
        situacao_escolar = data.get('situacao_escolar', aluno_atual['situacao_escolar'])
        matricula = data.get('matricula', aluno_atual['matricula'])
        turma = data.get('turma', aluno_atual['turma'])
        turno = data.get('turno', aluno_atual['turno'])
        status_matricula = data.get('status_matricula', aluno_atual.get('status_matricula', 'ativo'))

        if turno:
            turno = normalize_turno(turno)

        cursor.execute('''
            UPDATE alunos
            SET nome = ?, data_nascimento = ?, nis = ?, rg = ?, orgao = ?, uf_rg = ?, cpf = ?, sexo = ?,
                nacionalidade = ?, naturalidade = ?, uf_naturalidade = ?, nome_pai = ?, nome_mae = ?, etnia = ?,
                deficiencia = ?, situacao_ocupacional = ?, cep = ?, rua = ?, numero = ?, bairro = ?, municipio = ?,
                estado = ?, telefone = ?, celular = ?, email = ?, escolaridade = ?, situacao_escolar = ?,
                matricula = ?, turma = ?, turno = ?, status_matricula = ?
            WHERE id = ?
        ''', (nome, data_nascimento, nis, rg, orgao, uf_rg, cpf, sexo, nacionalidade, naturalidade, uf_naturalidade,
              nome_pai, nome_mae, etnia, deficiencia, situacao_ocupacional, cep, rua, numero, bairro, municipio,
              estado, telefone, celular, email, escolaridade, situacao_escolar, matricula, turma, turno, status_matricula, id))

        conn.commit()
        conn.close()
        return jsonify({'id': id, 'nome': nome, 'turma': turma, 'status_matricula': status_matricula}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alunos_bp.route('/alunos/<int:id>', methods=['DELETE'])
def delete_aluno(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM alunos WHERE id = ?', (id,))
        aluno = cursor.fetchone()
        if not aluno:
            conn.close()
            return jsonify({'error': 'Aluno não encontrado'}), 404

        nome = aluno['nome']
        cursor.execute('DELETE FROM presencas WHERE aluno_nome = ?', (nome,))
        cursor.execute('DELETE FROM notas WHERE aluno_nome = ?', (nome,))
        cursor.execute('DELETE FROM advertencias WHERE aluno_nome = ?', (nome,))
        cursor.execute('DELETE FROM alunos WHERE id = ?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Aluno excluído com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
