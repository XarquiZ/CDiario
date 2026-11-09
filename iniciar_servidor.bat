@echo off
title RCDiario - Sistema Escolar
echo =============================================
echo   Iniciando Sistema RCDiario Escolar...
echo =============================================

if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe main.py
) else (
    python main.py
)

pause
