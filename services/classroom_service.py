import os
import json
import logging
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students',
    'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]

CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'credentials.json')

def get_client_config():
    """Lê a configuração do cliente OAuth de credentials.json ou de variáveis de ambiente."""
    if os.path.exists(CLIENT_SECRETS_FILE):
        with open(CLIENT_SECRETS_FILE, 'r') as f:
            return json.load(f)
    
    # Suporte a configuração via variáveis de ambiente
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    if client_id and client_secret:
        return {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/classroom/oauth2callback')]
            }
        }
    return None

def create_flow(redirect_uri):
    """Cria o fluxo de autorização OAuth."""
    config = get_client_config()
    if not config:
        raise ValueError("Credenciais do Google não configuradas. Adicione 'credentials.json' ou GOOGLE_CLIENT_ID/SECRET no .env.")

    flow = Flow.from_client_config(
        config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    return flow

def credentials_from_token_dict(token_dict):
    """Reconstitui Credentials do Google a partir do dicionário ou JSON salvo."""
    if isinstance(token_dict, str):
        token_dict = json.loads(token_dict)

    creds = Credentials(
        token=token_dict.get('token'),
        refresh_token=token_dict.get('refresh_token'),
        token_uri=token_dict.get('token_uri', 'https://oauth2.googleapis.com/token'),
        client_id=token_dict.get('client_id'),
        client_secret=token_dict.get('client_secret'),
        scopes=token_dict.get('scopes', SCOPES)
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as e:
            logger.error(f"Erro ao renovar token do Google: {e}")

    return creds

def get_classroom_service(creds):
    """Retorna o client da Classroom API v1."""
    return build('classroom', 'v1', credentials=creds, cache_discovery=False)

def get_drive_service(creds):
    """Retorna o client da Drive API v3."""
    return build('drive', 'v3', credentials=creds, cache_discovery=False)

def list_teacher_courses(creds):
    """Lista as turmas ativas do professor autenticado."""
    service = get_classroom_service(creds)
    results = service.courses().list(teacherId='me', courseStates=['ACTIVE']).execute()
    return results.get('courses', [])

def list_course_students(creds, course_id):
    """Lista os alunos de uma turma."""
    service = get_classroom_service(creds)
    students = []
    page_token = None
    while True:
        results = service.courses().students().list(
            courseId=course_id,
            pageToken=page_token,
            pageSize=100
        ).execute()
        students.extend(results.get('students', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break
    return students

def list_course_works(creds, course_id):
    """Lista as atividades criadas na turma."""
    service = get_classroom_service(creds)
    works = []
    page_token = None
    while True:
        results = service.courses().courseWork().list(
            courseId=course_id,
            pageToken=page_token,
            pageSize=50
        ).execute()
        works.extend(results.get('courseWork', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break
    return works

def list_student_submissions(creds, course_id, course_work_id):
    """Lista as entregas dos alunos com notas e anexos de arquivos."""
    service = get_classroom_service(creds)
    submissions = []
    page_token = None
    while True:
        results = service.courses().courseWork().studentSubmissions().list(
            courseId=course_id,
            courseWorkId=course_work_id,
            pageToken=page_token,
            pageSize=100
        ).execute()
        submissions.extend(results.get('studentSubmissions', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break
    return submissions
