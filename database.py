import os
import sys
from pathlib import Path
import sqlite3
import logging
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from werkzeug.security import generate_password_hash

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)

if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).resolve().parent

DATABASE_SQLITE = str(BASE_DIR / 'database.db')
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()

class DBError(sqlite3.Error):
    pass

class DBIntegrityError(sqlite3.IntegrityError, DBError):
    pass

class RowWrapper(dict):
    """Wrapper para linhas de resultado compatível com row['coluna'], row[0] e dict(row)."""
    def __init__(self, data):
        super().__init__(data)
        self._keys = list(data.keys())

    def __getitem__(self, item):
        if isinstance(item, int):
            if 0 <= item < len(self._keys):
                return self[self._keys[item]]
            raise IndexError("Índice de coluna fora do alcance.")
        return super().__getitem__(item)

def is_postgres():
    return bool(DATABASE_URL and (DATABASE_URL.startswith('postgres://') or DATABASE_URL.startswith('postgresql://')))

def get_postgres_url():
    url = DATABASE_URL
    if url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)
    if 'sslmode' not in query_params:
        query_params['sslmode'] = ['require']
    new_query = urlencode(query_params, doseq=True)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))

class PostgresCursorWrapper:
    def __init__(self, raw_cursor):
        self.cursor = raw_cursor
        self.lastrowid = None
        self._intercepted_insert_id = None

    def _convert_query(self, sql):
        parts = []
        in_single = False
        in_double = False
        for ch in sql:
            if ch == "'" and not in_double:
                in_single = not in_single
                parts.append(ch)
            elif ch == '"' and not in_single:
                in_double = not in_double
                parts.append(ch)
            elif ch == '?' and not in_single and not in_double:
                parts.append('%s')
            else:
                parts.append(ch)
        converted = ''.join(parts).strip()

        clean_sql = converted.rstrip(';').strip()
        is_insert = clean_sql.upper().startswith('INSERT INTO')
        has_returning = 'RETURNING' in clean_sql.upper()

        auto_returning = False
        if is_insert and not has_returning:
            clean_sql = f"{clean_sql} RETURNING id"
            auto_returning = True

        return clean_sql, auto_returning

    def execute(self, query, params=None):
        import psycopg2
        self.lastrowid = None
        self._intercepted_insert_id = None

        converted_sql, auto_returning = self._convert_query(query)
        try:
            if params is not None:
                self.cursor.execute(converted_sql, params)
            else:
                self.cursor.execute(converted_sql)

            if auto_returning:
                try:
                    res = self.cursor.fetchone()
                    if res and 'id' in res:
                        self.lastrowid = res['id']
                        self._intercepted_insert_id = res['id']
                except Exception:
                    pass

            return self
        except psycopg2.IntegrityError as e:
            logger.error(f"Erro de integridade no PostgreSQL: {e}")
            raise DBIntegrityError(str(e)) from e
        except psycopg2.Error as e:
            logger.error(f"Erro no PostgreSQL: {e}")
            raise DBError(str(e)) from e

    def fetchone(self):
        try:
            res = self.cursor.fetchone()
            if res is None:
                return None
            return RowWrapper(dict(res))
        except Exception as e:
            logger.debug(f"fetchone: {e}")
            return None

    def fetchall(self):
        try:
            results = self.cursor.fetchall()
            return [RowWrapper(dict(row)) for row in results]
        except Exception as e:
            logger.debug(f"fetchall: {e}")
            return []

    def close(self):
        self.cursor.close()

class PostgresConnectionWrapper:
    def __init__(self, raw_conn):
        self.conn = raw_conn

    def cursor(self):
        import psycopg2.extras
        raw_cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return PostgresCursorWrapper(raw_cur)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

def check_write_permissions():
    if not is_postgres():
        try:
            if not os.access(BASE_DIR, os.W_OK):
                raise PermissionError(f"Sem permissão de escrita no diretório: {BASE_DIR}")
        except PermissionError as e:
            logger.error(f"Erro de permissão: {e}")
            raise

def get_db_connection():
    if is_postgres():
        import psycopg2
        pg_url = get_postgres_url()
        try:
            conn = psycopg2.connect(pg_url)
            return PostgresConnectionWrapper(conn)
        except psycopg2.Error as e:
            logger.error(f"Erro ao conectar ao PostgreSQL (Neon): {e}")
            raise DBError(str(e)) from e
    else:
        try:
            conn = sqlite3.connect(DATABASE_SQLITE, timeout=15.0)
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.Error as e:
            logger.error(f"Erro ao conectar ao SQLite: {e}")
            raise

def seed_default_admin(conn):
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM usuarios LIMIT 1")
        row = cur.fetchone()
        if not row:
            logger.info("Nenhum usuário cadastrado. Criando administrador padrão 'admin'...")
            senha_hash = generate_password_hash("admin123")
            cur.execute(
                "INSERT INTO usuarios (nome, usuario, senha_hash, papel) VALUES (?, ?, ?, ?)",
                ("Administrador", "admin", senha_hash, "admin")
            )
            conn.commit()
            logger.info("Usuário 'admin' criado com sucesso (senha padrão: admin123).")
    except Exception as e:
        logger.warning(f"Aviso ao semear admin padrão: {e}")

def init_postgres_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                usuario TEXT NOT NULL UNIQUE,
                senha_hash TEXT NOT NULL,
                papel TEXT NOT NULL DEFAULT 'professor',
                google_email TEXT,
                google_token TEXT,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS turmas (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL UNIQUE,
                turnos TEXT NOT NULL,
                ano_semestre TEXT DEFAULT '2026.1',
                status TEXT DEFAULT 'ativa',
                tipo_turma TEXT DEFAULT 'tradicional',
                professor_usuario TEXT,
                classroom_course_id TEXT,
                google_token TEXT,
                google_email TEXT
            );
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alunos (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                data_nascimento TEXT,
                nis TEXT,
                rg TEXT,
                orgao TEXT,
                uf_rg TEXT,
                cpf TEXT,
                sexo TEXT,
                nacionalidade TEXT,
                naturalidade TEXT,
                uf_naturalidade TEXT,
                nome_pai TEXT,
                nome_mae TEXT,
                etnia TEXT,
                deficiencia TEXT,
                situacao_ocupacional TEXT,
                cep TEXT,
                rua TEXT,
                numero TEXT,
                bairro TEXT,
                municipio TEXT,
                estado TEXT,
                telefone TEXT,
                celular TEXT,
                email TEXT,
                escolaridade TEXT,
                situacao_escolar TEXT,
                matricula TEXT,
                turma TEXT,
                turno TEXT,
                status_matricula TEXT DEFAULT 'ativo',
                classroom_user_id TEXT
            );
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notas (
                id SERIAL PRIMARY KEY,
                aluno_nome TEXT NOT NULL,
                turma TEXT NOT NULL,
                turno TEXT NOT NULL,
                materia TEXT NOT NULL,
                nota REAL NOT NULL,
                max_nota REAL NOT NULL,
                tipo TEXT,
                data TEXT,
                descricao TEXT,
                classroom_work_id TEXT,
                classroom_submission_id TEXT
            );
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS advertencias (
                id SERIAL PRIMARY KEY,
                aluno_nome TEXT NOT NULL,
                turma TEXT NOT NULL,
                turno TEXT NOT NULL,
                motivo TEXT NOT NULL,
                gravidade TEXT,
                pontos INTEGER,
                data TEXT NOT NULL,
                descricao TEXT
            );
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS presencas (
                id SERIAL PRIMARY KEY,
                aluno_nome TEXT NOT NULL,
                turma TEXT NOT NULL,
                turno TEXT NOT NULL,
                data TEXT NOT NULL,
                presente BOOLEAN NOT NULL,
                falta BOOLEAN NOT NULL DEFAULT FALSE,
                justificado BOOLEAN NOT NULL DEFAULT FALSE,
                UNIQUE(aluno_nome, turma, turno, data)
            );
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classroom_atividades (
                id SERIAL PRIMARY KEY,
                turma_id INTEGER,
                classroom_course_id TEXT NOT NULL,
                classroom_work_id TEXT NOT NULL UNIQUE,
                titulo TEXT NOT NULL,
                tipo_materia TEXT,
                max_pontos REAL,
                data_entrega TEXT,
                data_criacao TEXT,
                sincronizado_em TEXT
            );
        ''')

        # Migrações seguras no PostgreSQL
        migration_statements = [
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS ano_semestre TEXT DEFAULT '2026.1';",
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa';",
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS tipo_turma TEXT DEFAULT 'tradicional';",
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS professor_usuario TEXT;",
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS classroom_course_id TEXT;",
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS google_token TEXT;",
            "ALTER TABLE turmas ADD COLUMN IF NOT EXISTS google_email TEXT;",
            "ALTER TABLE alunos ADD COLUMN IF NOT EXISTS status_matricula TEXT DEFAULT 'ativo';",
            "ALTER TABLE alunos ADD COLUMN IF NOT EXISTS classroom_user_id TEXT;",
            "ALTER TABLE notas ADD COLUMN IF NOT EXISTS classroom_work_id TEXT;",
            "ALTER TABLE notas ADD COLUMN IF NOT EXISTS classroom_submission_id TEXT;",
            "CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor TEXT);"
        ]
        for stmt in migration_statements:
            try:
                cursor.execute(stmt)
            except Exception as e:
                logger.debug(f"Migração Postgres: {e}")

        conn.commit()
        seed_default_admin(conn)
        logger.info("Banco PostgreSQL (Neon) sincronizado com sucesso.")
    finally:
        conn.close()

def init_sqlite_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                usuario TEXT NOT NULL UNIQUE,
                senha_hash TEXT NOT NULL,
                papel TEXT NOT NULL DEFAULT 'professor',
                google_email TEXT,
                google_token TEXT,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS turmas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                turnos TEXT NOT NULL,
                ano_semestre TEXT DEFAULT '2026.1',
                status TEXT DEFAULT 'ativa',
                tipo_turma TEXT DEFAULT 'tradicional',
                professor_usuario TEXT,
                classroom_course_id TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alunos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                data_nascimento TEXT,
                nis TEXT,
                rg TEXT,
                orgao TEXT,
                uf_rg TEXT,
                cpf TEXT,
                sexo TEXT,
                nacionalidade TEXT,
                naturalidade TEXT,
                uf_naturalidade TEXT,
                nome_pai TEXT,
                nome_mae TEXT,
                etnia TEXT,
                deficiencia TEXT,
                situacao_ocupacional TEXT,
                cep TEXT,
                rua TEXT,
                numero TEXT,
                bairro TEXT,
                municipio TEXT,
                estado TEXT,
                telefone TEXT,
                celular TEXT,
                email TEXT,
                escolaridade TEXT,
                situacao_escolar TEXT,
                matricula TEXT,
                turma TEXT,
                turno TEXT,
                status_matricula TEXT DEFAULT 'ativo',
                classroom_user_id TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluno_nome TEXT NOT NULL,
                turma TEXT NOT NULL,
                turno TEXT NOT NULL,
                materia TEXT NOT NULL,
                nota REAL NOT NULL,
                max_nota REAL NOT NULL,
                tipo TEXT,
                data TEXT,
                descricao TEXT,
                classroom_work_id TEXT,
                classroom_submission_id TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS advertencias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluno_nome TEXT NOT NULL,
                turma TEXT NOT NULL,
                turno TEXT NOT NULL,
                motivo TEXT NOT NULL,
                gravidade TEXT,
                pontos INTEGER,
                data TEXT NOT NULL,
                descricao TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS presencas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aluno_nome TEXT NOT NULL,
                turma TEXT NOT NULL,
                turno TEXT NOT NULL,
                data TEXT NOT NULL,
                presente BOOLEAN NOT NULL,
                falta BOOLEAN NOT NULL DEFAULT 0,
                justificado BOOLEAN NOT NULL DEFAULT 0,
                UNIQUE(aluno_nome, turma, turno, data)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classroom_atividades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                turma_id INTEGER,
                classroom_course_id TEXT NOT NULL,
                classroom_work_id TEXT NOT NULL UNIQUE,
                titulo TEXT NOT NULL,
                tipo_materia TEXT,
                max_pontos REAL,
                data_entrega TEXT,
                data_criacao TEXT,
                sincronizado_em TEXT
            )
        ''')

        # Migrações SQLite
        cursor.execute("PRAGMA table_info(turmas)")
        colunas_turmas = [c[1] for c in cursor.fetchall()]
        if 'ano_semestre' not in colunas_turmas:
            cursor.execute("ALTER TABLE turmas ADD COLUMN ano_semestre TEXT DEFAULT '2026.1'")
        if 'status' not in colunas_turmas:
            cursor.execute("ALTER TABLE turmas ADD COLUMN status TEXT DEFAULT 'ativa'")
        if 'tipo_turma' not in colunas_turmas:
            cursor.execute("ALTER TABLE turmas ADD COLUMN tipo_turma TEXT DEFAULT 'tradicional'")
        if 'professor_usuario' not in colunas_turmas:
            cursor.execute("ALTER TABLE turmas ADD COLUMN professor_usuario TEXT")
        if 'classroom_course_id' not in colunas_turmas:
            cursor.execute("ALTER TABLE turmas ADD COLUMN classroom_course_id TEXT")

        cursor.execute("PRAGMA table_info(alunos)")
        colunas_alunos = [c[1] for c in cursor.fetchall()]
        if 'status_matricula' not in colunas_alunos:
            cursor.execute("ALTER TABLE alunos ADD COLUMN status_matricula TEXT DEFAULT 'ativo'")
        if 'classroom_user_id' not in colunas_alunos:
            cursor.execute("ALTER TABLE alunos ADD COLUMN classroom_user_id TEXT")

        cursor.execute("PRAGMA table_info(notas)")
        colunas_notas = [c[1] for c in cursor.fetchall()]
        if 'classroom_work_id' not in colunas_notas:
            cursor.execute("ALTER TABLE notas ADD COLUMN classroom_work_id TEXT")
        if 'classroom_submission_id' not in colunas_notas:
            cursor.execute("ALTER TABLE notas ADD COLUMN classroom_submission_id TEXT")

        conn.commit()
        seed_default_admin(conn)
        logger.info("Banco SQLite sincronizado com sucesso.")
    finally:
        conn.close()

def initialize_database():
    check_write_permissions()
    if is_postgres():
        logger.info("Detectada configuração de banco PostgreSQL (Neon). Sincronizando tabelas...")
        init_postgres_db()
    else:
        logger.info(f"Usando banco SQLite local em: {DATABASE_SQLITE}")
        init_sqlite_db()
