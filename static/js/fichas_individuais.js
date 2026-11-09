// Módulo de Fichas Individuais do Atendido (CEDESP Rede Comunitá)

const NOMES_MESES = {
  '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL',
  '05': 'MAIO', '06': 'JUNHO', '07': 'JULHO', '08': 'AGOSTO',
  '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
};

async function getAlunosTurma(turmaNome, turno) {
  try {
    const res = await fetch(`/alunos?turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turno)}`);
    if (!res.ok) throw new Error('Erro ao buscar alunos');
    return await res.json();
  } catch (err) {
    console.error('Erro ao buscar alunos para fichas:', err);
    return [];
  }
}

async function getFaltasAluno(alunoNome, turmaNome, turno) {
  try {
    const res = await fetch(`/faltas-detalhes?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turno)}`);
    if (!res.ok) throw new Error('Erro ao buscar faltas');
    return await res.json();
  } catch (err) {
    console.error('Erro ao buscar faltas:', err);
    return [];
  }
}

async function getNotificacoesAluno(alunoNome, turmaNome, turno) {
  try {
    const res = await fetch(`/advertencias?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turno)}`);
    if (!res.ok) throw new Error('Erro ao buscar notificações');
    return await res.json();
  } catch (err) {
    console.error('Erro ao buscar notificações:', err);
    return [];
  }
}

function parseDataBR(dataStr) {
  if (!dataStr) return { mes: '00', ano: '2026', formatada: '' };
  // Aceita DD/MM/AAAA ou AAAA-MM-DD
  if (dataStr.includes('/')) {
    const parts = dataStr.split('/');
    return { dia: parts[0], mes: parts[1], ano: parts[2], formatada: dataStr };
  } else if (dataStr.includes('-')) {
    const parts = dataStr.split('-');
    const formatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
    return { dia: parts[2], mes: parts[1], ano: parts[0], formatada };
  }
  return { mes: '00', ano: '2026', formatada: dataStr };
}

function gerarFichaIndividualHTML(aluno, turmaNome, turno, faltas, notificacoes, mesFiltro = 'todos') {
  const anoAtual = new Date().getFullYear();
  const semestre = (new Date().getMonth() >= 6) ? '2º SEMESTRE LETIVO' : '1º SEMESTRE LETIVO';

  // Processa as faltas
  const faltasProcessadas = faltas.map(f => {
    const parsed = parseDataBR(f.data);
    return {
      ...f,
      dia: parsed.dia,
      mes: parsed.mes,
      ano: parsed.ano,
      dataFormatada: parsed.formatada
    };
  });

  // Ordena por data crescente para determinar a ordem de advertências
  faltasProcessadas.sort((a, b) => (a.ano + a.mes + a.dia).localeCompare(b.ano + b.mes + b.dia));
  faltasProcessadas.forEach((f, idx) => {
    f.numeroAdvertencia = idx + 1; // 1ª advertência, 2ª advertência...
  });

  // Processa notificações
  const notificacoesProcessadas = notificacoes.map(n => {
    const parsed = parseDataBR(n.data);
    return {
      ...n,
      dia: parsed.dia,
      mes: parsed.mes,
      ano: parsed.ano,
      dataFormatada: parsed.formatada
    };
  });

  // Identifica os meses presentes nos dados ou usa o filtro
  let mesesParaExibir = [];
  if (mesFiltro && mesFiltro !== 'todos') {
    mesesParaExibir = [mesFiltro];
  } else {
    const setMeses = new Set();
    faltasProcessadas.forEach(f => setMeses.add(f.mes));
    notificacoesProcessadas.forEach(n => setMeses.add(n.mes));
    if (setMeses.size === 0) {
      const mesAtual = String(new Date().getMonth() + 1).padStart(2, '0');
      setMeses.add(mesAtual);
    }
    mesesParaExibir = Array.from(setMeses).sort();
  }

  // Gera as páginas (Página 1 e Página 2) para cada mês
  return mesesParaExibir.map(mesNum => {
    const nomeMes = NOMES_MESES[mesNum] || `MÊS ${mesNum}`;
    const faltasDoMes = faltasProcessadas.filter(f => f.mes === mesNum);
    const notificacoesDoMes = notificacoesProcessadas.filter(n => n.mes === mesNum);

    const totalFaltas = faltasDoMes.filter(f => !f.justificado).length;
    const totalJustif = faltasDoMes.filter(f => f.justificado).length;
    const totalAtrasos = 0; // Se houver controle específico de atrasos
    const totalAdvertencias = faltasDoMes.length; // Cada falta é 1 advertência registrada

    // Linhas de Registro de Faltas e Advertências (preenche até 12 linhas)
    let linhasFaltasHtml = '';
    const maxLinhasFalta = Math.max(faltasDoMes.length, 12);
    for (let i = 0; i < maxLinhasFalta; i++) {
      if (i < faltasDoMes.length) {
        const item = faltasDoMes[i];
        const rotuloAdv = item.numeroAdvertencia === 1 ? '1ª Advertência por Falta' : `${item.numeroAdvertencia}ª Advertência por Falta`;
        const desc = item.justificado 
          ? `Falta Justificada (${rotuloAdv})` 
          : `Ausência às atividades escolares - ${rotuloAdv}`;
        linhasFaltasHtml += `
          <tr>
            <td style="width: 100px; text-align: center; border: 1px solid #000; padding: 4px;">${item.dataFormatada}</td>
            <td style="text-align: left; border: 1px solid #000; padding: 4px 8px;">${desc}</td>
          </tr>
        `;
      } else {
        linhasFaltasHtml += `
          <tr style="height: 22px;">
            <td style="width: 100px; border: 1px solid #000;">&nbsp;</td>
            <td style="border: 1px solid #000;">&nbsp;</td>
          </tr>
        `;
      }
    }

    // Linhas de Notificações (Página 2)
    let linhasNotificacoesHtml = '';
    const maxLinhasNotif = Math.max(notificacoesDoMes.length, 7);
    for (let i = 0; i < maxLinhasNotif; i++) {
      if (i < notificacoesDoMes.length) {
        const item = notificacoesDoMes[i];
        linhasNotificacoesHtml += `
          <tr>
            <td style="width: 80px; text-align: center; border: 1px solid #000; padding: 4px;">${item.dataFormatada}</td>
            <td style="width: 70px; text-align: center; border: 1px solid #000; padding: 4px;">${item.pontos || 3} pts</td>
            <td style="text-align: left; border: 1px solid #000; padding: 4px 8px;">${item.motivo} ${item.descricao ? ' - ' + item.descricao : ''}</td>
          </tr>
        `;
      } else {
        linhasNotificacoesHtml += `
          <tr style="height: 22px;">
            <td style="width: 80px; border: 1px solid #000;">&nbsp;</td>
            <td style="width: 70px; border: 1px solid #000;">&nbsp;</td>
            <td style="border: 1px solid #000;">&nbsp;</td>
          </tr>
        `;
      }
    }

    // Linhas de Conversa com a Coordenação (4 linhas vazias)
    let linhasConversaCoord = '';
    for (let i = 0; i < 4; i++) {
      linhasConversaCoord += `
        <tr style="height: 22px;">
          <td style="width: 100px; border: 1px solid #000;">&nbsp;</td>
          <td style="border: 1px solid #000;">&nbsp;</td>
        </tr>
      `;
    }

    // Linhas de Reunião de Pais/Responsáveis (3 linhas vazias)
    let linhasReuniaoPais = '';
    for (let i = 0; i < 3; i++) {
      linhasReuniaoPais += `
        <tr style="height: 24px;">
          <td style="width: 75px; border: 1px solid #000;">&nbsp;</td>
          <td style="width: 160px; border: 1px solid #000;">&nbsp;</td>
          <td style="width: 100px; border: 1px solid #000;">&nbsp;</td>
          <td style="width: 140px; border: 1px solid #000;">&nbsp;</td>
          <td style="width: 140px; border: 1px solid #000;">&nbsp;</td>
        </tr>
      `;
    }

    return `
      <!-- PÁGINA 1 -->
      <div class="documento-folha" style="page-break-after: always; position: relative;">
        <!-- Cabeçalho Institucional -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <img src="/static/logo.png" alt="Rede Comunitá" style="max-height: 48px;">
          <div style="text-align: center; flex: 1; padding: 0 10px;">
            <p style="font-size: 11px; font-weight: 700; margin: 0; color: #000;">Centro de Desenvolvimento Social e Produtivo</p>
            <p style="font-size: 13px; font-weight: 800; margin: 0; color: #000;">CEDESP Rede Comunitá JAGUARÉ</p>
          </div>
          <div style="text-align: right; font-size: 9px; line-height: 1.1; font-weight: 700; color: #000;">
            PREFEITURA DE<br><span style="font-size: 11px; font-weight: 900;">SÃO PAULO</span><br><span style="font-size: 7.5px; font-weight: 600;">ASSISTÊNCIA E DESENVOLVIMENTO SOCIAL</span>
          </div>
        </div>

        <div class="doc-header-title">FICHA DE AVALIAÇÃO INDIVIDUAL DO ATENDIDO</div>

        <!-- Dados do Atendido -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11.5px; line-height: 1.6;">
          <tr>
            <td colspan="2" style="border-bottom: 1px solid #000; padding: 2px 0;"><strong>Nome do (a) Atendido (a):</strong> ${aluno.nome}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-bottom: 1px solid #000; padding: 2px 0;"><strong>Curso:</strong> ${turmaNome} (${turno})</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #000; padding: 2px 0; width: 60%;"><strong>Educador (a):</strong> Coordenação / Educador</td>
            <td style="border-bottom: 1px solid #000; padding: 2px 0; width: 40%;"><strong>Data de Saída:</strong> </td>
          </tr>
        </table>

        <!-- Tabela de Registros Gerais -->
        <div style="background-color: #e5e7eb; border: 1.5px solid #000; border-bottom: none; font-weight: 800; text-align: center; font-size: 11px; padding: 3px;">
          REGISTROS GERAIS – ${semestre} ${anoAtual}
        </div>
        <table class="doc-table" style="margin-bottom: 12px;">
          <thead>
            <tr>
              <th colspan="5" style="border-right: 1.5px solid #000;">QUANTIDADE DE</th>
              <th colspan="3">VISTO</th>
            </tr>
            <tr>
              <th style="width: 18%;">MÊS</th>
              <th style="width: 10%;">FALTAS</th>
              <th style="width: 10%;">JUSTIF.</th>
              <th style="width: 10%;">ATRASOS</th>
              <th style="width: 12%; border-right: 1.5px solid #000;">ADVERT.</th>
              <th style="width: 13%;">ATENDIDO</th>
              <th style="width: 13%;">EDUCADOR</th>
              <th style="width: 14%;">COORD.</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight: 700; height: 26px;">
              <td>${nomeMes}</td>
              <td>${totalFaltas}</td>
              <td>${totalJustif}</td>
              <td>${totalAtrasos}</td>
              <td style="border-right: 1.5px solid #000;">${totalAdvertencias}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <!-- Registro de Faltas e Advertências -->
        <div class="doc-header-title">REGISTRO DE FALTAS E ADVERTÊNCIA</div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 100px;">Data</th>
              <th>Descrição da Falta e/ou Advertência</th>
            </tr>
          </thead>
          <tbody>
            ${linhasFaltasHtml}
          </tbody>
        </table>

        <!-- Rodapé Legal -->
        <div class="doc-footer-legal">
          Rua Floresto Bandecchi, 156 - Jaguaré, SP<br>
          Site: redecomunita.org.br &nbsp;|&nbsp; @redecomunitabr<br>
          CNPJ: 01.501.866/0037-50, CNAS 44006.006641/98-81, SEADS 6150, Declarado Utilidade Pública Estadual: Decreto nº 44.732,<br>
          Declarado Utilidade Pública Municipal: Decreto nº 40.164/2000
        </div>
      </div>

      <!-- PÁGINA 2 -->
      <div class="documento-folha" style="page-break-after: always; position: relative;">
        <!-- Cabeçalho Página 2 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <img src="/static/logo.png" alt="Rede Comunitá" style="max-height: 48px;">
          <div style="text-align: center; flex: 1; padding: 0 10px;">
            <p style="font-size: 11px; font-weight: 700; margin: 0; color: #000;">Centro de Desenvolvimento Social e Produtivo</p>
            <p style="font-size: 13px; font-weight: 800; margin: 0; color: #000;">CEDESP Rede Comunitá JAGUARÉ</p>
          </div>
          <div style="text-align: right; font-size: 9px; line-height: 1.1; font-weight: 700; color: #000;">
            PREFEITURA DE<br><span style="font-size: 11px; font-weight: 900;">SÃO PAULO</span><br><span style="font-size: 7.5px; font-weight: 600;">ASSISTÊNCIA E DESENVOLVIMENTO SOCIAL</span>
          </div>
        </div>

        <!-- Seção de Notificações -->
        <div class="doc-header-title">REGISTRO DE NOTIFICAÇÃO</div>
        <table class="doc-table" style="margin-bottom: 16px;">
          <thead>
            <tr>
              <th style="width: 80px;">Data</th>
              <th style="width: 70px;">Pontuação</th>
              <th>Código e Descrição da Infração - Notificação</th>
            </tr>
          </thead>
          <tbody>
            ${linhasNotificacoesHtml}
          </tbody>
        </table>

        <!-- Seção Conversa com Coordenação -->
        <div class="doc-header-title">CONVERSA COM A COORDENAÇÃO</div>
        <table class="doc-table" style="margin-bottom: 16px;">
          <thead>
            <tr>
              <th style="width: 100px;">Data</th>
              <th>DESCRIÇÃO</th>
            </tr>
          </thead>
          <tbody>
            ${linhasConversaCoord}
          </tbody>
        </table>

        <!-- Seção Reunião de Pais/Responsáveis -->
        <div class="doc-header-title">REGISTRO DE REUNIÃO DE PAIS/ RESPONSÁVEIS (CONVOCAÇÕES)</div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 75px;">Data</th>
              <th>Assinatura Responsável</th>
              <th style="width: 100px;">Grau de Parentesco</th>
              <th>Assinatura Educador</th>
              <th>Assinatura Coordenação</th>
            </tr>
          </thead>
          <tbody>
            ${linhasReuniaoPais}
          </tbody>
        </table>

        <!-- Rodapé Legal -->
        <div class="doc-footer-legal">
          Rua Floresto Bandecchi, 156 - Jaguaré, SP<br>
          Site: redecomunita.org.br &nbsp;|&nbsp; @redecomunitabr<br>
          CNPJ: 01.501.866/0037-50, CNAS 44006.006641/98-81, SEADS 6150, Declarado Utilidade Pública Estadual: Decreto nº 44.732,<br>
          Declarado Utilidade Pública Municipal: Decreto nº 40.164/2000
        </div>
      </div>
    `;
  }).join('');
}

function imprimirFichaHTML(htmlConteudo, tituloDoc = 'Ficha Individual') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Permita popups no navegador para imprimir as fichas individuais.');
    return;
  }

  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${tituloDoc}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        body {
          font-family: 'Inter', Arial, sans-serif;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
        }
        .documento-folha {
          background: #fff;
          width: 100%;
          box-sizing: border-box;
          page-break-after: always;
        }
        .documento-folha:last-child {
          page-break-after: avoid;
        }
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000;
          margin-bottom: 12px;
        }
        .doc-table th, .doc-table td {
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: center;
          font-size: 11px;
        }
        .doc-table th {
          background-color: #e5e7eb !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-weight: 800;
        }
        .doc-header-title {
          background-color: #e5e7eb !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-weight: 800;
          text-align: center;
          padding: 5px;
          border: 1.5px solid #000;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .doc-footer-legal {
          font-size: 8.5px;
          color: #374151;
          text-align: center;
          line-height: 1.3;
          border-top: 1px solid #9ca3af;
          padding-top: 8px;
          margin-top: 25px;
        }
      </style>
    </head>
    <body>
      ${htmlConteudo}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
}

async function renderAlunosListFichasIndividuais(options = {}) {
  const alunosList = document.getElementById('alunos-list-fichas');
  const fichaPreview = document.getElementById('ficha-preview');
  const mesFiltroSelect = document.getElementById('mes-filtro');
  const btnImprimirTodas = document.getElementById('btn-imprimir-todas-fichas');
  const btnImprimirAtual = document.getElementById('btn-imprimir-ficha-atual');

  if (!alunosList || !fichaPreview) return;

  const turma = options.turmaNome || window.turmaNome || '';
  const turno = options.turno || window.turmaTurno || '';

  if (!turma || !turno) {
    alunosList.innerHTML = '<li class="text-center text-red-600 py-3 text-xs">Erro: Turma ou turno não definidos.</li>';
    return;
  }

  alunosList.classList.add('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));

  const alunos = await getAlunosTurma(turma, turno);
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));

  let alunosHtml = '';
  if (alunos.length === 0) {
    alunosList.innerHTML = '<li class="text-center text-gray-600 py-3 text-xs">Nenhum aluno encontrado nesta turma.</li>';
    return;
  }

  let selectedAluno = options.selectedAluno || (alunos.length > 0 ? alunos[0] : null);

  alunosHtml = alunos.map(aluno => {
    const isSelected = selectedAluno && selectedAluno.nome === aluno.nome;
    return `
      <li>
        <button
          type="button"
          class="w-full text-left rounded-md px-4 py-3 transition-colors ${isSelected ? 'selected-aluno' : 'text-[#1E293B] hover:bg-gray-100'}"
          style="${isSelected ? 'background-color: #2563EB !important; color: white !important;' : ''}"
          onclick="renderAlunosListFichasIndividuais({ selectedAluno: { nome: '${aluno.nome}', turma: '${turma}', turno: '${turno}' }, turmaNome: '${turma}', turno: '${turno}' })"
        >
          <p class="font-semibold leading-5">${aluno.nome}</p>
          <p class="${isSelected ? 'text-white' : 'text-[#64748B]'} text-xs leading-4 mt-0.5" style="${isSelected ? 'color: white !important;' : ''}">${turma} - ${turno}</p>
        </button>
      </li>
    `;
  }).join('');

  alunosList.innerHTML = alunosHtml;
  alunosList.classList.remove('fade-out');
  alunosList.classList.add('fade-in');

  // Configura ação de filtro de mês
  if (mesFiltroSelect) {
    mesFiltroSelect.onchange = () => {
      renderAlunosListFichasIndividuais({ selectedAluno, turmaNome: turma, turno });
    };
  }

  // Ação de Imprimir Todas as Fichas da Turma
  if (btnImprimirTodas) {
    btnImprimirTodas.disabled = alunos.length === 0;
    btnImprimirTodas.onclick = async () => {
      btnImprimirTodas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando Fichas...';
      btnImprimirTodas.disabled = true;

      const mesFiltro = mesFiltroSelect ? mesFiltroSelect.value : 'todos';
      let htmlGeral = '';

      for (const al of alunos) {
        const [faltas, notificacoes] = await Promise.all([
          getFaltasAluno(al.nome, turma, turno),
          getNotificacoesAluno(al.nome, turma, turno)
        ]);
        htmlGeral += gerarFichaIndividualHTML(al, turma, turno, faltas, notificacoes, mesFiltro);
      }

      btnImprimirTodas.innerHTML = '<i class="fas fa-file-download"></i> Baixar Todas as Fichas';
      btnImprimirTodas.disabled = false;

      imprimirFichaHTML(htmlGeral, `Fichas Individuais - Turma ${turma} (${turno})`);
    };
  }

  if (selectedAluno) {
    fichaPreview.classList.remove('fade-in');
    fichaPreview.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 200));

    const mesFiltro = mesFiltroSelect ? mesFiltroSelect.value : 'todos';
    const [faltas, notificacoes] = await Promise.all([
      getFaltasAluno(selectedAluno.nome, turma, turno),
      getNotificacoesAluno(selectedAluno.nome, turma, turno)
    ]);

    const fichaHtml = gerarFichaIndividualHTML(selectedAluno, turma, turno, faltas, notificacoes, mesFiltro);

    fichaPreview.innerHTML = fichaHtml;
    fichaPreview.classList.remove('fade-out');
    fichaPreview.classList.add('fade-in');

    if (btnImprimirAtual) {
      btnImprimirAtual.disabled = false;
      btnImprimirAtual.onclick = () => {
        imprimirFichaHTML(fichaHtml, `Ficha Individual - ${selectedAluno.nome}`);
      };
    }
  } else {
    if (btnImprimirAtual) btnImprimirAtual.disabled = true;
  }
}

window.renderAlunosListFichasIndividuais = renderAlunosListFichasIndividuais;
window.gerarFichaIndividualHTML = gerarFichaIndividualHTML;
