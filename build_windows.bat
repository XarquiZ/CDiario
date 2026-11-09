@echo off
cd /d "%~dp0"

echo Criando executavel para RCDiario...
echo Verificando ambiente virtual...

IF NOT EXIST "venv\" (
    echo Ambiente virtual nao encontrado. Criando novo ambiente...
    python -m venv venv
)

echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo Instalando/verificando dependencias...
pip install -r requirements.txt

echo Construindo o executavel com PyInstaller...
python build.py

echo.
echo Processo de Build Concluido!
echo O executavel SistemaEscolar.exe deve estar na pasta "dist".
pause
