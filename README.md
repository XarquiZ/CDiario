# CDiario - Sistema de Gerenciamento Escolar

Sistema completo de gestão escolar e diário de classe híbrido, conectado ao banco de dados **PostgreSQL na nuvem (Neon)** e hospedado no **Render**.

---

## 🌐 Link de Acesso Online (Qualquer Computador, Celular ou Tablet)

O sistema está online e disponível no endereço:
👉 **[https://cdiario.onrender.com](https://cdiario.onrender.com)**

### 🔐 Acesso Inicial Padrão:
* **Usuário:** `admin`
* **Senha:** `admin123`
*(A coordenação pode criar novos logins para professores pelo painel).*

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

## 💻 Como Rodar Localmente (Se Desejar)

### No Mac:
Dê 2 cliques no arquivo:
```bash
./iniciar_servidor.command
```

### No Windows:
Dê 2 cliques no arquivo:
```bat
iniciar_servidor.bat
```
