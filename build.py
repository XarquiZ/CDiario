import os
import PyInstaller.__main__

# Define o caminho base como o diretório onde build.py está localizado
base_dir = os.path.dirname(os.path.abspath(__file__))

# Caminho para o script principal
script_path = os.path.join(base_dir, 'start_server.py')
output_name = 'SistemaEscolar'  # Nome do executável sem a extensão .exe

# Caminho para o arquivo database.db
database_path = os.path.join(base_dir, 'database.db')

# Verifica se o database.db existe
if not os.path.exists(database_path):
    print(f"Erro: O arquivo database.db não foi encontrado em {database_path}")
    exit(1)

# Parâmetros do PyInstaller
params = [
    '--onefile',              # Cria um único executável
    '--noconsole',            # Suprime a janela de comando (modo GUI)
    '--add-data', f'{os.path.join(base_dir, "app.py")};.',  # Inclui app.py no diretório raiz
    '--add-data', f'{os.path.join(base_dir, "templates")};templates',  # Inclui a pasta templates
    '--add-data', f'{os.path.join(base_dir, "static")};static',        # Inclui a pasta static
    '--add-data', f'{database_path};.',  # Inclui o database.db no diretório raiz
    '--icon', f'{os.path.join(base_dir, "static", "logo.png")}',       # Opcional: ícone
    '--hidden-import', 'app',  # Garante que o módulo app seja reconhecido
    '--hidden-import', 'reportlab',  # Adiciona dependência reportlab
    '--name', output_name,    # Define o nome do executável
    script_path
]

# Executa o PyInstaller
PyInstaller.__main__.run(params)
print(f"Executável '{output_name}.exe' gerado com sucesso em {os.path.join(base_dir, 'dist')}")