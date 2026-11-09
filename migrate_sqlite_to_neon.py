import os
import sqlite3
import psycopg2
from dotenv import load_dotenv
from database import get_postgres_url, is_postgres

load_dotenv()

def migrate():
    if not is_postgres():
        print("Erro: DATABASE_URL não configurada ou não é PostgreSQL no arquivo .env")
        print("Configure DATABASE_URL=postgresql://... no seu .env para migrar.")
        return

    sqlite_path = 'database.db'
    if not os.path.exists(sqlite_path):
        print(f"Banco SQLite local '{sqlite_path}' não encontrado.")
        return

    print("Conectando ao SQLite local e ao PostgreSQL no Neon...")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    pg_url = get_postgres_url()
    pg_conn = psycopg2.connect(pg_url)
    pg_cur = pg_conn.cursor()

    tables = ['turmas', 'alunos', 'notas', 'advertencias', 'presencas']

    try:
        for table in tables:
            sqlite_cur.execute(f"SELECT * FROM {table}")
            rows = sqlite_cur.fetchall()
            if not rows:
                print(f"Tabela '{table}' vazia no SQLite. Pulando.")
                continue

            columns = [k for k in rows[0].keys()]
            col_names = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))

            print(f"Migrando {len(rows)} registros para a tabela '{table}'...")
            for row in rows:
                values = [row[k] for k in columns]
                # Converte booleano se necessário
                if table == 'presencas':
                    # presente, falta, justificado
                    values = [bool(v) if k in ['presente', 'falta', 'justificado'] else v for k, v in zip(columns, values)]

                query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                pg_cur.execute(query, values)

            # Ajusta sequences no PostgreSQL para não conflitar com novos IDs inseridos
            try:
                pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), true);")
            except Exception as e:
                pass

        pg_conn.commit()
        print("Migração concluída com sucesso para o Neon!")
    except Exception as e:
        pg_conn.rollback()
        print(f"Erro durante a migração: {e}")
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == '__main__':
    migrate()
