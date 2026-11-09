# RCDiario - Sistema de Gerenciamento Escolar

Sistema completo de gestão escolar e diário de classe híbrido, desenvolvido com **Flask** e banco de dados **PostgreSQL na nuvem (Neon)**, com suporte a integração direta ao **Google Sala de Aula (Google Classroom)**.

---

## 🌟 Principais Funcionalidades

1. **Gestão Flexível e Híbrida de Turmas:**
   - Suporte a **Turmas Tradicionais** (lançamento manual presencial) e **Turmas Conectadas ao Google Classroom**.
   - Organização por **Período Letivo / Semestre** (ex: `2026.1`, `2026.2`).
   - Opção de **Arquivar Turmas** ao fim do semestre (mantém o histórico preservado no arquivo escolar).
   - Recurso de **Duplicar Turma** para o próximo semestre em 1 clique.

2. **Fluxo Dinâmico de Alunos:**
   - Controle de matrícula: `Ativo`, `Transferido` ou `Desistente`.
   - Alunos que saem saem da lista de chamada diária mas **não perdem suas notas ou faltas passadas**.

3. **Integração com Google Sala de Aula (Classroom):**
   - Importação de turmas e alunos direto de contas `@gmail.com` pessoais ou institucionais.
   - Sincronização inteligente: detecta novos alunos e reativa/inativa matrículas.
   - Espelhamento de notas e atividades com pontuação máxima.
   - Acesso direto aos trabalhos e anexos do Google Drive enviados pelos alunos.

4. **Banco Centralizado na Nuvem (Neon PostgreSQL):**
   - Todos os professores, computadores e coordenação acessam e editam a mesma base em tempo real.
   - Sem risco de perda de dados ou conflito de arquivo.

---

## 🚀 Como Iniciar o Sistema

### No Mac:
Dê 2 cliques no arquivo:
```bash
iniciar_servidor.command
```
Ou pelo terminal:
```bash
./venv/bin/python main.py
```

### No Windows:
Dê 2 cliques no arquivo:
```bat
iniciar_servidor.bat
```

---

## 🌐 Como Acessar em Qualquer Computador

### 1. Acesso na mesma Rede / Wi-Fi da Escola (Sem instalar nada nos outros computadores)
Quando o sistema inicia, ele exibe na tela o IP da rede local. Exemplo:
```text
============================================================
 🚀 SISTEMA RCDIARIO PRONTO!
 • Acesso neste computador:  http://localhost:5001
 • Acesso por outros PCs:     http://192.168.1.15:5001
 • Banco de Dados:           Neon (PostgreSQL em Nuvem)
============================================================
```
Basta qualquer professor abrir o navegador do celular, notebook ou tablet conectado no mesmo Wi-Fi e acessar o endereço `http://192.168.x.x:5001`!

### 2. Acesso Online pela Internet (Em Casa ou Qualquer Lugar)
Como o banco de dados já está hospedado no Neon, você pode colocar a aplicação no ar gratuitamente no **Render.com**:
1. Conecte este repositório no seu painel do Render.
2. Crie um novo **Web Service** usando o arquivo [render.yaml](file:///Users/wellintonbatista/Documents/projetos/RCDiario/render.yaml) incluído no projeto.
3. Adicione a variável de ambiente `DATABASE_URL` com a mesma string do Neon.
4. O Render gerará um link seguro definitivo (ex: `https://rcdiario.onrender.com`) que funciona em qualquer lugar do mundo.

---

## 🔐 Login Padrão Inicial
- **Usuário:** `admin`
- **Senha:** `admin123`
*(A coordenação pode criar novos usuários para professores na tela de gerenciamento).*
