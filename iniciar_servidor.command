#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "============================================="
echo "  Iniciando Sistema RCDiario Escolar..."
echo "============================================="

if [ -d "venv" ]; then
    ./venv/bin/python main.py
else
    python3 main.py
fi
