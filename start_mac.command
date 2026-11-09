#!/bin/bash
cd "$(dirname "$0")"

echo "Iniciando RCDiario..."
echo "Verificando ambiente virtual..."

if [ ! -d "venv" ]; then
    echo "Ambiente virtual não encontrado. Criando novo ambiente..."
    python3 -m venv venv
fi

echo "Ativando ambiente virtual..."
source venv/bin/activate

echo "Instalando/verificando dependências..."
pip install -r requirements.txt

echo "Iniciando o servidor..."
python3 start_server.py
