FROM python:3.11-slim

# Evita geração de .pyc e buffer de saída
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependências de compilação mínimas para psycopg2 e fontes
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instala requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia código do projeto
COPY . .

# Porta padrão de execução
EXPOSE 5000
ENV PORT=5000

# Executa o servidor Flask
CMD ["python", "main.py"]
