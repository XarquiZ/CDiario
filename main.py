import sys
import os
import signal
import logging
import socket
from flask import Flask
from flask_cors import CORS
from database import initialize_database
from utils import find_free_port

from routes.pages import pages_bp
from routes.auth import auth_bp, shutdown_server
from routes.alunos import alunos_bp
from routes.turmas import turmas_bp
from routes.notas import notas_bp
from routes.advertencias import advertencias_bp
from routes.presencas import presencas_bp
from routes.classroom import classroom_bp

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_url_path='/static', static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', 'rcdiario-secreta-instituicao-2026')
CORS(app, resources={r"/*": {"origins": "*"}})

app.register_blueprint(pages_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(alunos_bp)
app.register_blueprint(turmas_bp)
app.register_blueprint(notas_bp)
app.register_blueprint(advertencias_bp)
app.register_blueprint(presencas_bp)
app.register_blueprint(classroom_bp)

def get_local_ip():
    """Descobre o IP da máquina na rede Wi-Fi / LAN local."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def signal_handler(sig, frame):
    logger.info("Recebido sinal de interrupção (Ctrl+C)...")
    shutdown_server()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    initialize_database()
    env_port = os.environ.get('PORT')
    port = int(env_port) if env_port else find_free_port()
    local_ip = get_local_ip()

    print("\n" + "="*60)
    print(" 🚀 SISTEMA RCDIARIO PRONTO!")
    print(f" • Acesso neste computador:  http://localhost:{port}")
    print(f" • Acesso por outros PCs:     http://{local_ip}:{port}")
    print(f" • Banco de Dados:           Neon (PostgreSQL em Nuvem)")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=port, debug=False)
