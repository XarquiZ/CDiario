@echo off
cd /d "%~dp0"

echo Iniciando RCDiario...
echo Verificando ambiente virtual...

IF NOT EXIST "venv\" (
    echo Ambiente virtual nao encontrado. Criando novo ambiente...
    python -m venv venv
)

echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo Instalando/verificando dependencias...
pip install -r requirements.txt

echo Iniciando o servidor...
python start_server.py
pause
