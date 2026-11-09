// Módulo de Advertências por Falta (Sincronizado com Chamada)

async function getAlunosFaltas(turmaNome, turno) {
  try {
    const response = await fetch(`/alunos?turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turno)}`);
    if (!response.ok) throw new Error('Erro ao buscar alunos');
    return await response.json();
  } catch (err) {
    console.error('Erro ao buscar alunos para advertências de faltas:', err);
    return [];
  }
}

async function getFaltasDetalhes(alunoNome, turmaNome, turno) {
  try {
    const response = await fetch(`/faltas-detalhes?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turno)}`);
    if (!response.ok) throw new Error('Erro ao buscar detalhes de faltas');
    return await response.json();
  } catch (err) {
    console.error('Erro ao buscar faltas detalhadas:', err);
    return [];
  }
}

function sanitizeText(text) {
  if (!text) return '';
  return text.replace(/[&<>"]/g, match => ({ '&': '&', '<': '<', '>': '>', '"': '"' }[match]));
}

function generateAdvertenciaFaltaPrintHTML(faltaItem, alunoNome, turmaNome, turno, index = 1, isSingle = false) {
  const dataFormatada = faltaItem.data || 'Sem data';
  const statusJustificativa = faltaItem.justificado ? 'Falta Justificada' : 'Falta Injustificada';

  return `
    <div class="advertencia-falta-print" style="margin-bottom: 40px; padding: 25px; border: 1px solid #e5e7eb; font-family: 'Inter', sans-serif; background: #fff; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; margin-bottom: 20px;">
        <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-height: 50px;">
        <div style="text-align: right;">
          <h2 style="font-size: 18px; font-weight: 800; color: #DC2626; margin: 0; text-transform: uppercase;">Termo de Advertência Disciplinar por Falta</h2>
          <span style="font-size: 12px; color: #64748B;">Registro de Ocorrência nº ${index}</span>
        </div>
      </div>

      <div style="background-color: #F8FAFC; border-left: 4px solid #DC2626; padding: 12px; margin-bottom: 20px; font-size: 13px; line-height: 1.5;">
        Notificamos por meio deste documento a ocorrência de ausência às atividades escolares regulares. Conforme o regimento pedagógico, cada ausência acarreta uma <strong>dedução de 0,5 ponto na nota de Participação</strong> no boletim, além da emissão deste termo para ciência formal e acompanhamento dos responsáveis.
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0;"><strong>Atendido (Aluno):</strong> ${sanitizeText(alunoNome)}</td>
          <td style="padding: 6px 0;"><strong>Turma:</strong> ${sanitizeText(turmaNome)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>Turno:</strong> ${sanitizeText(turno)}</td>
          <td style="padding: 6px 0;"><strong>Data da Falta:</strong> ${dataFormatada}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 6px 0;"><strong>Condição:</strong> ${statusJustificativa}</td>
        </tr>
      </table>

      <div style="margin-top: 40px;">
        <p style="font-size: 13px; color: #475569; margin-bottom: 35px; text-align: center;">Declaramos estar cientes da falta e das normas de frequência da instituição.</p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 20px;">
          <div style="text-align: center;">
            <div style="border-top: 1px solid #000; width: 90%; margin: 0 auto 5px auto;"></div>
            <p style="font-size: 12px; font-weight: 600; margin: 0;">Assinatura do Educador / Professor</p>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1px solid #000; width: 90%; margin: 0 auto 5px auto;"></div>
            <p style="font-size: 12px; font-weight: 600; margin: 0;">Assinatura do Atendido (Aluno)</p>
          </div>
          <div style="text-align: center; margin-top: 25px;">
            <div style="border-top: 1px solid #000; width: 90%; margin: 0 auto 5px auto;"></div>
            <p style="font-size: 12px; font-weight: 600; margin: 0;">Assinatura do Responsável pelo Atendido</p>
          </div>
          <div style="text-align: center; margin-top: 25px;">
            <div style="border-top: 1px solid #000; width: 90%; margin: 0 auto 5px auto;"></div>
            <p style="font-size: 12px; font-weight: 600; margin: 0;">Assinatura da Coordenação Pedagógica</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function printAdvertenciaFalta(faltaItem, alunoNome, turmaNome, turno, index = 1) {
  const content = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Advertência por Falta - ${sanitizeText(alunoNome)}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        .advertencia-falta-print { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      ${generateAdvertenciaFaltaPrintHTML(faltaItem, alunoNome, turmaNome, turno, index, true)}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
  } else {
    alert('Por favor, permita popups para poder imprimir a advertência.');
  }
}

function printAllAdvertenciasFaltas(faltas, alunoNome, turmaNome, turno) {
  if (!faltas || faltas.length === 0) return;

  const htmlItems = faltas.map((f, i) => generateAdvertenciaFaltaPrintHTML(f, alunoNome, turmaNome, turno, i + 1)).join('<div style="page-break-after: always;"></div>');

  const content = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Todas as Advertências por Falta - ${sanitizeText(alunoNome)}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        .advertencia-falta-print { page-break-inside: avoid; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      ${htmlItems}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
  } else {
    alert('Por favor, permita popups para poder imprimir as advertências.');
  }
}

async function renderAlunosListAdvertenciasFaltas(options = {}) {
  const alunosList = document.getElementById('alunos-list-advertencias-faltas');
  const faltasSection = document.getElementById('advertencias-faltas-section');
  const faltasList = document.getElementById('faltas-list');
  const alunoFaltasTitle = document.getElementById('aluno-faltas-title');
  const printAllBtn = document.getElementById('btn-imprimir-todas-faltas');
  const searchInput = document.getElementById('search-input-faltas');

  if (!alunosList || !faltasSection || !faltasList || !alunoFaltasTitle) return;

  const turma = options.turmaNome || window.turmaNome || '';
  const turno = options.turno || window.turmaTurno || '';

  if (!turma || !turno) {
    alunosList.innerHTML = '<li class="text-center text-red-600 py-3 text-xs">Erro: Turno ou turma não especificados.</li>';
    return;
  }

  alunosList.classList.add('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));

  const alunos = await getAlunosFaltas(turma, turno);
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));

  let alunosHtml = '';
  if (alunos.length === 0) {
    alunosHtml = `
      <li class="text-center text-gray-600 py-3">
        Nenhum aluno encontrado para a turma ${turma} e turno ${turno}.
      </li>
    `;
  } else {
    alunosHtml = alunos.map(aluno => {
      const isSelected = options.selectedAluno && aluno.nome === options.selectedAluno.nome;
      return `
        <li>
          <button
            class="w-full text-left rounded-md px-4 py-3 transition-colors ${isSelected ? 'selected-aluno' : 'text-[#1E293B] hover:bg-gray-100'}"
            style="${isSelected ? 'background-color: #2563EB !important; color: white !important;' : ''}"
            onclick="renderAlunosListAdvertenciasFaltas({ selectedAluno: { nome: '${aluno.nome}', turma: '${turma}', turno: '${turno}' }, turmaNome: '${turma}', turno: '${turno}' })"
          >
            <p class="font-semibold leading-5">${aluno.nome}</p>
            <p class="${isSelected ? 'text-white' : 'text-[#64748B]'} text-xs leading-4 mt-0.5" style="${isSelected ? 'color: white !important;' : ''}">${turma} - ${turno}</p>
          </button>
        </li>
      `;
    }).join('');
  }

  alunosList.innerHTML = alunosHtml;
  alunosList.classList.remove('fade-out');
  alunosList.classList.add('fade-in');

  let selectedAluno = options.selectedAluno;
  if (!selectedAluno && alunos.length > 0) {
    selectedAluno = { nome: alunos[0].nome, turma: turma, turno: turno };
  }

  if (selectedAluno) {
    alunoFaltasTitle.textContent = `Advertências de ${selectedAluno.nome} - ${turma}`;
    faltasList.classList.remove('fade-in');
    faltasList.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 300));

    const faltas = await getFaltasDetalhes(selectedAluno.nome, turma, turno);

    if (printAllBtn) {
      printAllBtn.disabled = faltas.length === 0;
      printAllBtn.onclick = () => printAllAdvertenciasFaltas(faltas, selectedAluno.nome, turma, turno);
    }

    let cardsHtml = '';
    if (faltas.length === 0) {
      cardsHtml = `
        <article class="bg-white rounded-md p-4 shadow-sm text-center" style="box-sizing: border-box;">
          <p class="text-gray-600">Este aluno ainda não possui advertências registradas.</p>
        </article>
      `;
    } else {
      cardsHtml = faltas.map((falta, idx) => {
        const condicao = falta.justificado ? 'Falta Justificada' : 'Falta Injustificada';
        const condicaoClass = falta.justificado ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600';

        return `
          <article class="bg-white rounded-md p-4 shadow-sm flex flex-col justify-between" aria-label="Advertência por Falta" style="box-sizing: border-box; position: relative; z-index: 1;">
            <div>
              <h4 class="font-semibold text-[#1E293B] mb-2">Ausência às Atividades Escolares (Falta #${idx + 1})</h4>
              <span class="${condicaoClass} text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block">${condicao} - deduz 0,5 na Participação</span>
              <div class="flex justify-between items-center mb-2">
                <time datetime="${falta.data || ''}" class="text-xs text-gray-400 font-normal">${falta.data || 'Sem data'}</time>
              </div>
              <p class="text-xs text-gray-600 leading-5">Ausência registrada na lista de presença/chamada. Requer documento formal assinado pelo educador, atendido, responsável e coordenação pedagógica.</p>
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-md px-2 py-1 text-xs font-semibold"
                onclick='printAdvertenciaFalta(${JSON.stringify(falta)}, "${selectedAluno.nome}", "${turma}", "${turno}", ${idx + 1})'
                style="background-color: #2563EB; color: white !important; z-index: 10;"
              >
                <i class="fas fa-print"></i> Imprimir
              </button>
            </div>
          </article>
        `;
      }).join('');
    }

    faltasList.innerHTML = cardsHtml;
    faltasList.classList.remove('fade-out');
    faltasList.classList.add('fade-in');

    // Configuração da barra de busca de advertências
    if (searchInput) {
      searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase().trim();
        const articles = faltasList.querySelectorAll('article');
        articles.forEach(art => {
          const text = art.innerText.toLowerCase();
          art.style.display = text.includes(query) ? 'flex' : 'none';
        });
      };
    }
  } else {
    if (printAllBtn) printAllBtn.disabled = true;
  }
}

window.renderAlunosListAdvertenciasFaltas = renderAlunosListAdvertenciasFaltas;
window.printAdvertenciaFalta = printAdvertenciaFalta;
window.printAllAdvertenciasFaltas = printAllAdvertenciasFaltas;
