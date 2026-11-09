from flask import Blueprint, request, jsonify, session, redirect
import logging
import threading
import os
import signal
import time
from werkzeug.security import check_password_hash, generate_password_hash
from database import get_db_connection

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

def shutdown_server():
    """Encerra o servidor Flask de forma robusta."""
    logger.info("Encerrando o servidor...")
    try:
        func = request.environ.get('werkzeug.server.shutdown')
        if func:
            func()
            logger.info("Servidor encerrado via werkzeug.server.shutdown.")
            return
    except Exception as e:
        logger.warning(f"werkzeug.server.shutdown não disponível: {e}")

    def delayed_exit():
        time.sleep(0.5)
        os.kill(os.getpid(), signal.SIGTERM)

    threading.Thread(target=delayed_exit, daemon=True).start()

@auth_bp.route('/shutdown', methods=['POST'])
def shutdown():
    shutdown_server()
    return "Servidor sendo encerrado", 200

@auth_bp.route('/login', methods=['POST'])
@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username:
        return jsonify({'error': 'Usuário é obrigatório'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM usuarios WHERE lower(usuario) = lower(?)", (username,))
    user = cur.fetchone()
    conn.close()

    # Se usuário existir e senha for fornecida, valida hash
    if user:
        if password and not check_password_hash(user['senha_hash'], password):
            return jsonify({'error': 'Senha incorreta'}), 401

        session['usuario_id'] = user['id']
        session['usuario'] = user['usuario']
        session['nome'] = user['nome']
        session['papel'] = user['papel']

        redirect_to = '/painel' if user['papel'] == 'admin' else '/professor'
        return jsonify({
            'success': True,
            'redirect': redirect_to,
            'user': {
                'id': user['id'],
                'nome': user['nome'],
                'usuario': user['usuario'],
                'papel': user['papel']
            }
        }), 200

    # Se o usuário não existir mas for acesso rápido como professor
    session['usuario'] = username
    session['nome'] = username.capitalize()
    session['papel'] = 'professor'
    return jsonify({'success': True, 'redirect': '/professor'}), 200

@auth_bp.route('/logout', methods=['GET', 'POST'])
@auth_bp.route('/auth/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'redirect': '/'}), 200

@auth_bp.route('/me', methods=['GET'])
@auth_bp.route('/auth/me', methods=['GET'])
def get_current_user():
    return jsonify({
        'authenticated': bool(session.get('usuario')),
        'usuario': session.get('usuario'),
        'nome': session.get('nome'),
        'papel': session.get('papel', 'professor')
    }), 200

@auth_bp.route('/usuarios', methods=['GET'])
def list_usuarios():
    """Lista usuários (professores e admins)."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nome, usuario, papel, google_email, criado_em FROM usuarios ORDER BY nome ASC")
    usuarios = cur.fetchall()
    conn.close()
    return jsonify([{
        'id': u['id'],
        'nome': u['nome'],
        'usuario': u['usuario'],
        'papel': u['papel'],
        'google_email': u['google_email'],
        'criado_em': u['criado_em']
    } for u in usuarios]), 200

@auth_bp.route('/usuarios', methods=['POST'])
def create_usuario():
    """Cria novo professor ou admin."""
    data = request.get_json() or {}
    nome = data.get('nome', '').strip()
    usuario = data.get('usuario', '').strip()
    senha = data.get('senha', '').strip()
    papel = data.get('papel', 'professor')

    if not all([nome, usuario, senha]):
        return jsonify({'error': 'Nome, usuário e senha são obrigatórios'}), 400

    senha_hash = generate_password_hash(senha)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO usuarios (nome, usuario, senha_hash, papel) VALUES (?, ?, ?, ?)",
            (nome, usuario, senha_hash, papel)
        )
        conn.commit()
        novo_id = cur.lastrowid
        conn.close()
        return jsonify({'id': novo_id, 'nome': nome, 'usuario': usuario, 'papel': papel}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': f"Erro ao criar usuário (usuário pode já existir): {e}"}), 400
