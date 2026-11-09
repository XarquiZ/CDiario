#!/bin/bash
# Script de Atualização Rápida no TrueNAS / Servidor Local
echo "==========================================="
echo "   Atualizando CDiario para a versão mais recente..."
echo "==========================================="

git pull origin main

echo "Reiniciando aplicação no Docker..."
docker compose restart web

echo "==========================================="
echo "   Atualização concluída com sucesso!"
echo "==========================================="
