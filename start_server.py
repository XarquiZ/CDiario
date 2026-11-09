import webbrowser
import threading
import time
import os
import sys
import atexit
from flask import request

# Adiciona o diretório atual ao sys.path para encontrar app.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importa o módulo main
from main import app, logger
from database import initialize_database
from utils import find_free_port

# Variável global para controlar se o navegador já foi aberto
browser_opened = False

def open_browser():
    global browser_opened
    if not browser_opened:
        time.sleep(1)
        browser_opened = True
        webbrowser.open(f'http://localhost:{port}/')
        logger.info(f"Navegador aberto em http://localhost:{port}/")

def run_server():
    global port
    port = find_free_port()
    logger.info(f"Iniciando aplicação na porta {port}")
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)

def cleanup():
    logger.info("Encerrando o servidor...")
    # Faz uma requisição POST ao endpoint /shutdown para encerrar o servidor
    import requests
    try:
        requests.post(f'http://localhost:{port}/shutdown')
        logger.info("Comando de desligamento enviado ao servidor.")
    except Exception as e:
        logger.error(f"Erro ao enviar comando de desligamento: {e}")
    logger.info("Servidor encerrado.")

# Registra a função de limpeza
atexit.register(cleanup)

if __name__ == '__main__':
    initialize_database()
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server_thread.join()
    except KeyboardInterrupt:
        logger.info("Servidor encerrado pelo usuário.")
        cleanup()