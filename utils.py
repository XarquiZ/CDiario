import re
from unidecode import unidecode
from datetime import datetime
import socket

TIPOS_PERMITIDOS = [
    'teorica', 'pratica', 'extra_esporte', 'extra_formacao_humana',
    'extra_iniciacao_digital', 'extra_mercado_trabalho', 'extra_musica',
    'extra_qualidade_vida'
]

def normalize_string(text):
    if not text: return text
    text = unidecode(text).lower()
    return text.replace(' ', '_')

def normalize_turno(turno):
    if not turno: return None
    return unidecode(turno).lower()

def convert_date_format(date_str):
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%d/%m/%Y')
    except ValueError:
        try:
            date_obj = datetime.strptime(date_str, '%d/%m/%Y')
            return date_str
        except ValueError:
            raise ValueError(f"Formato de data inválido: {date_str}. Deve ser AAAA-MM-DD ou DD/MM/AAAA.")

def validate_date_format(date_str):
    if not date_str: return True
    try:
        date_str = convert_date_format(date_str)
        if not re.match(r'^\d{2}/\d{2}/\d{4}$', date_str): return False
        day, month, year = map(int, date_str.split('/'))
        if not (1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 9999): return False
        return True
    except ValueError:
        return False

def find_free_port(start_port=5000, max_attempts=100):
    port = start_port
    for _ in range(max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return port
            except OSError:
                port += 1
    raise RuntimeError(f"Não foi possível encontrar uma porta livre entre {start_port} e {start_port + max_attempts - 1}")
