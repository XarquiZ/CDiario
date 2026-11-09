if (!window.DISCIPLINAS) {
  window.DISCIPLINAS = [
    { id: "D1", nome: "Matemática", peso: 2 },
    { id: "D2", nome: "Português", peso: 2 },
    { id: "D3", nome: "Ciências", peso: 1.5 },
    { id: "D4", nome: "História", peso: 1.5 },
    { id: "D5", nome: "Geografia", peso: 1.5 }
  ];
}

async function getAlunosBoletim(turmaNome, turno) {
  try {
    if (!turno || typeof turno !== 'string') {
      console.error('Turno inválido ou não definido:', turno);
      throw new Error('Turno não especificado. Por favor, selecione um turno válido.');
    }
    const turnoNormalizado = turno.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const response = await fetch(`/alunos?turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turno)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Erro ao buscar alunos: ${response.statusText}`);
    }
    const alunos = await response.json();
    console.log('Alunos buscados do backend:', alunos);
    return alunos ? alunos.map(aluno => ({ ...aluno, turma: turmaNome })) : [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    alert('Não foi possível carregar a lista de alunos. Verifique se o servidor está rodando ou se o turno foi especificado corretamente.');
    return [];
  }
}

async function getNotas(alunoNome, turma, turno) {
  try {
    const response = await fetch(`/notas?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turma)}&turno=${encodeURIComponent(turno)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Erro ao buscar notas: ${response.statusText}`);
    }
    const notas = await response.json();
    console.log(`Notas buscadas para ${alunoNome} (${turma}, ${turno}):`, notas);
    return notas || [];
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    alert('Não foi possível carregar as notas. Verifique se o servidor está rodando.');
    return [];
  }
}

async function getAdvertencias(alunoNome, turma, turno) {
  try {
    const response = await fetch(`/advertencias?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turma)}&turno=${encodeURIComponent(turno)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Erro ao buscar advertências: ${response.statusText}`);
    }
    const advertencias = await response.json();
    console.log(`Advertências buscadas para ${alunoNome} (${turma}, ${turno}):`, advertencias);
    return advertencias || [];
  } catch (error) {
    console.error('Erro ao buscar advertências:', error);
    alert('Não foi possível carregar as advertências. Verifique se o servidor está rodando.');
    return [];
  }
}

async function getFaltas(alunoNome, turma, turno) {
  try {
    const response = await fetch(`/faltas?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turma)}&turno=${encodeURIComponent(turno)}`);
    if (!response.ok) return 0;
    const data = await response.json();
    console.log(`Faltas obtidas para ${alunoNome}:`, data.faltas);
    return data.faltas || 0;
  } catch (error) {
    console.error('Erro ao buscar faltas:', error);
    return 0;
  }
}

function calculateCursoEspecifico(notas) {
  const teoricas = notas.filter(nota => !nota.tipo || nota.tipo === 'teorica');
  const praticas = notas.filter(nota => nota.tipo === 'pratica');
  const mediaTeorica = teoricas.length > 0
    ? (teoricas.reduce((sum, nota) => sum + parseFloat(nota.nota), 0) / teoricas.length).toFixed(2)
    : 0;
  const mediaPratica = praticas.length > 0
    ? (praticas.reduce((sum, nota) => sum + parseFloat(nota.nota), 0) / praticas.length).toFixed(2)
    : 0;
  const mediaFinal = ((parseFloat(mediaTeorica) + parseFloat(mediaPratica)) / 2).toFixed(2);
  return { mediaTeorica, mediaPratica, mediaFinal };
}

function calculateCursoExtra(notas) {
  const mediasPorTipo = {};
  window.TIPOS_CURSO_EXTRA.forEach(tipo => {
    const notasDoTipo = notas.filter(nota => nota.tipo === tipo);
    mediasPorTipo[tipo] = notasDoTipo.length > 0
      ? (notasDoTipo.reduce((sum, nota) => sum + parseFloat(nota.nota), 0) / notasDoTipo.length).toFixed(2)
      : 0;
  });
  const tiposExtra = Object.keys(mediasPorTipo).filter(tipo => tipo.startsWith('extra_'));
  const mediasValidas = tiposExtra.map(tipo => parseFloat(mediasPorTipo[tipo])).filter(media => media > 0);
  const mediaFinal = mediasValidas.length > 0
    ? (mediasValidas.reduce((sum, media) => sum + media, 0) / mediasValidas.length).toFixed(2)
    : 0;
  return { mediasPorTipo, mediaFinal };
}

function calculateParticipacaoResponsabilidade(advertencias, faltas) {
  let notaAdvertencias = 10;
  advertencias.forEach(adv => {
    const pontuacao = parseInt(adv.pontos || adv.pontuacao || 0);
    if (pontuacao === 3) notaAdvertencias = Math.max(0, notaAdvertencias - 0.5);
    else if (pontuacao === 5) notaAdvertencias = Math.max(0, notaAdvertencias - 1.0);
    else if (pontuacao === 7) notaAdvertencias = Math.max(0, notaAdvertencias - 1.5);
  });
  notaAdvertencias = parseFloat(notaAdvertencias.toFixed(2));
  let notaParticipacao = 10;
  notaParticipacao = Math.max(0, notaParticipacao - (faltas * 0.5));
  notaParticipacao = parseFloat(notaParticipacao.toFixed(2));
  const mediaFinal = ((notaAdvertencias + notaParticipacao) / 2).toFixed(2);
  return { notaAdvertencias, notaParticipacao, mediaFinal };
}

function toggleCardDetails(cardId) {
  const cardContent = document.getElementById(`card-content-${cardId}`);
  const toggleBtn = document.getElementById(`toggle-btn-${cardId}`);
  if (cardContent.classList.contains('expanded')) {
    cardContent.classList.remove('expanded');
    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Ver Mais';
  } else {
    cardContent.classList.add('expanded');
    toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar';
  }
}

function generateCursoEspecificoHTML(cursoEspecificoData, alunoNome, turma, turno) {
  const cardId = `curso-especifico-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return `
    <article class="bg-white rounded-lg shadow-md" style="min-width: 250px; box-sizing: border-box; position: relative; z-index: 1;">
      <div class="text-center font-extrabold text-sm text-black pt-4 pb-3 bg-green-100">CURSO ESPECÍFICO</div>
      <div class="flex justify-between items-center px-4 py-2 font-extrabold text-xs text-black">
        <span>MÉDIA DE CURSO ESPECÍFICO</span>
        <span>${cursoEspecificoData.mediaFinal}</span>
      </div>
      <div class="border-t border-gray-100">
        <div id="card-content-${cardId}" class="card-content">
          <div class="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <div class="text-xs text-black">1</div>
            <div class="text-xs text-black flex-1 px-4">MÉDIA DE ATIVIDADES TEÓRICAS</div>
            <div class="text-xs font-extrabold text-black">${cursoEspecificoData.mediaTeorica}</div>
          </div>
          <div class="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div class="text-xs text-black">2</div>
            <div class="text-xs text-black flex-1 px-4">MÉDIA DE ATIVIDADES PRÁTICAS</div>
            <div class="text-xs font-extrabold text-black">${cursoEspecificoData.mediaPratica}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function generateCursoExtraHTML(cursoExtraData, alunoNome, turma, turno) {
  const cardId = `curso-extra-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let rowsHtml = '';
  let index = 1;
  const tiposExtra = Object.keys(cursoExtraData.mediasPorTipo).filter(tipo => tipo.startsWith('extra_'));
  for (const [tipo, media] of Object.entries(cursoExtraData.mediasPorTipo)) {
    if (tipo.startsWith('extra_')) {
      const nomeAmigavel = window.TIPO_NOME_MAP[tipo] || tipo;
      const backgroundClass = index % 2 === 0 ? 'bg-gray-50' : '';
      rowsHtml += `
        <div class="flex justify-between items-center px-4 py-3 border-b border-gray-100 ${backgroundClass}">
          <div class="text-xs text-black">${index}</div>
          <div class="text-xs text-black flex-1 px-4">MÉDIA DE ${nomeAmigavel.toUpperCase()}</div>
          <div class="text-xs font-extrabold text-black">${media}</div>
        </div>
      `;
      index++;
    }
  }
  const needsExpansion = tiposExtra.length > 5;
  return `
    <article class="bg-white rounded-lg shadow-md" style="min-width: 250px; box-sizing: border-box; position: relative; z-index: 1;">
      <div class="text-center font-extrabold text-sm text-black pt-4 pb-3" style="background-color: rgba(139, 92, 246, 0.3);">CURSO EXTRA</div>
      <div class="flex justify-between items-center px-4 py-2 font-extrabold text-xs text-black">
        <span>MÉDIA DE CURSOS EXTRAS</span>
        <span>${cursoExtraData.mediaFinal}</span>
      </div>
      <div class="border-t border-gray-100">
        <div id="card-content-${cardId}" class="card-content">
          ${rowsHtml}
        </div>
        ${needsExpansion ? `
        <div class="mt-2 text-center">
          <button
            type="button"
            id="toggle-btn-${cardId}"
            class="toggle-btn"
            onclick="toggleCardDetails('${cardId}')"
          >
            <i class="fas fa-chevron-down"></i> Ver Mais
          </button>
        </div>
        ` : ''}
      </div>
    </article>
  `;
}

function generateParticipacaoResponsabilidadeHTML(participacaoData, alunoNome, turma, turno) {
  const cardId = `participacao-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return `
    <article class="bg-white rounded-lg shadow-md" style="min-width: 250px; box-sizing: border-box; position: relative; z-index: 1;">
      <div class="text-center font-extrabold text-sm text-black pt-4 pb-3 bg-yellow-100">PARTICIPAÇÃO E RESPONSABILIDADE</div>
      <div class="flex justify-between items-center px-4 py-2 font-extrabold text-xs text-black">
        <span>MÉDIA DE PARTICIPAÇÃO E RESPONSABILIDADE</span>
        <span>${participacaoData.mediaFinal}</span>
      </div>
      <div class="border-t border-gray-100">
        <div id="card-content-${cardId}" class="card-content">
          <div class="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <div class="text-xs text-black">1</div>
            <div class="text-xs text-black flex-1 px-4">NOTA DE NOTIFICAÇÕES</div>
            <div class="text-xs font-extrabold text-black">${participacaoData.notaAdvertencias}</div>
          </div>
          <div class="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div class="text-xs text-black">2</div>
            <div class="text-xs text-black flex-1 px-4">NOTA DE PARTICIPAÇÃO</div>
            <div class="text-xs font-extrabold text-black">${participacaoData.notaParticipacao}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function printCursoEspecifico(cursoEspecificoData, alunoNome, turma, turno) {
  console.log('Iniciando impressão do curso específico para:', alunoNome, turma, turno);
  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Curso Específico</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div id="print-content">
        <div class="max-w-md mx-auto" style="padding: 20px; border: 1px solid #e5e7eb;">
          <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Curso Específico</h2>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${alunoNome}</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${turma} (${turno})</p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 14px;">MÉDIA DE ATIVIDADES TEÓRICAS</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoEspecificoData.mediaTeorica}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; background-color: #f7fafc;">
              <span style="font-size: 14px;">MÉDIA DE ATIVIDADES PRÁTICAS</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoEspecificoData.mediaPratica}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="font-size: 14px; font-weight: bold;">MÉDIA DE CURSO ESPECÍFICO</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoEspecificoData.mediaFinal}</span>
            </div>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Aluno:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Responsável:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
          </div>
        </div>
      </div>
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
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    console.error('Falha ao abrir janela de impressão. Verifique as configurações de popup do navegador.');
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
}

function printCursoExtra(cursoExtraData, alunoNome, turma, turno) {
  console.log('Iniciando impressão do curso extra para:', alunoNome, turma, turno);
  let rowsHtml = '';
  let index = 1;
  for (const [tipo, media] of Object.entries(cursoExtraData.mediasPorTipo)) {
    if (tipo.startsWith('extra_')) {
      const nomeAmigavel = window.TIPO_NOME_MAP[tipo] || tipo;
      const backgroundStyle = index % 2 === 0 ? 'background-color: #f7fafc;' : '';
      rowsHtml += `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; ${backgroundStyle}">
          <span style="font-size: 14px;">MÉDIA DE ${nomeAmigavel.toUpperCase()}</span>
          <span style="font-size: 14px; font-weight: bold;">${media}</span>
        </div>
      `;
      index++;
    }
  }
  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Curso Extra</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div id="print-content">
        <div class="max-w-md mx-auto" style="padding: 20px; border: 1px solid #e5e7eb;">
          <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Curso Extra</h2>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${alunoNome}</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${turma} (${turno})</p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb;">
            ${rowsHtml}
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="font-size: 14px; font-weight: bold;">MÉDIA DE CURSOS EXTRAS</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoExtraData.mediaFinal}</span>
            </div>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Aluno:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Responsável:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
          </div>
        </div>
      </div>
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
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    console.error('Falha ao abrir janela de impressão. Verifique as configurações de popup do navegador.');
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
}

function printParticipacaoResponsabilidade(participacaoData, alunoNome, turma, turno) {
  console.log('Iniciando impressão de Participação e Responsabilidade para:', alunoNome, turma, turno);
  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Participação e Responsabilidade</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div id="print-content">
        <div class="max-w-md mx-auto" style="padding: 20px; border: 1px solid #e5e7eb;">
          <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Participação e Responsabilidade</h2>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${alunoNome}</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${turma} (${turno})</p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 14px;">NOTA DE NOTIFICAÇÕES</span>
              <span style="font-size: 14px; font-weight: bold;">${participacaoData.notaAdvertencias}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; background-color: #f7fafc;">
              <span style="font-size: 14px;">NOTA DE PARTICIPAÇÃO</span>
              <span style="font-size: 14px; font-weight: bold;">${participacaoData.notaParticipacao}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="font-size: 14px; font-weight: bold;">MÉDIA DE PARTICIPAÇÃO E RESPONSABILIDADE</span>
              <span style="font-size: 14px; font-weight: bold;">${participacaoData.mediaFinal}</span>
            </div>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Aluno:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Responsável:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
          </div>
        </div>
      </div>
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
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    console.error('Falha ao abrir janela de impressão. Verifique as configurações de popup do navegador.');
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
}

async function printAllBoletins(alunoNome, turma, turno) {
  console.log('Iniciando impressão de todos os boletins para:', alunoNome, turma, turno);
  const notas = await getNotas(alunoNome, turma, turno);
  const cursoEspecificoData = calculateCursoEspecifico(notas);
  const cursoExtraData = calculateCursoExtra(notas);
  const advertencias = await getAdvertencias(alunoNome, turma, turno);
  const faltas = await getFaltas(alunoNome, turma, turno);
  const participacaoData = calculateParticipacaoResponsabilidade(advertencias, faltas);
  let cursoExtraRowsHtml = '';
  let index = 1;
  for (const [tipo, media] of Object.entries(cursoExtraData.mediasPorTipo)) {
    if (tipo.startsWith('extra_')) {
      const nomeAmigavel = window.TIPO_NOME_MAP[tipo] || tipo;
      const backgroundStyle = index % 2 === 0 ? 'background-color: #f7fafc;' : '';
      cursoExtraRowsHtml += `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; ${backgroundStyle}">
          <span style="font-size: 14px;">MÉDIA DE ${nomeAmigavel.toUpperCase()}</span>
          <span style="font-size: 14px; font-weight: bold;">${media}</span>
        </div>
      `;
      index++;
    }
  }
  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Todos os Boletins</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 20px; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <div id="print-content">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">Boletins de ${alunoNome} - ${turma} (${turno})</h2>
        <div class="max-w-md mx-auto" style="padding: 20px; border: 1px solid #e5e7eb;">
          <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Curso Específico</h3>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${alunoNome}</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${turma} (${turno})</p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 14px;">MÉDIA DE ATIVIDADES TEÓRICAS</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoEspecificoData.mediaTeorica}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; background-color: #f7fafc;">
              <span style="font-size: 14px;">MÉDIA DE ATIVIDADES PRÁTICAS</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoEspecificoData.mediaPratica}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="font-size: 14px; font-weight: bold;">MÉDIA DE CURSO ESPECÍFICO</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoEspecificoData.mediaFinal}</span>
            </div>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Aluno:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Responsável:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
          </div>
        </div>
        <div class="max-w-md mx-auto page-break" style="padding: 20px; border: 1px solid #e5e7eb;">
          <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Curso Extra</h3>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${alunoNome}</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${turma} (${turno})</p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb;">
            ${cursoExtraRowsHtml}
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="font-size: 14px; font-weight: bold;">MÉDIA DE CURSOS EXTRAS</span>
              <span style="font-size: 14px; font-weight: bold;">${cursoExtraData.mediaFinal}</span>
            </div>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Aluno:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Responsável:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
          </div>
        </div>
        <div class="max-w-md mx-auto page-break" style="padding: 20px; border: 1px solid #e5e7eb;">
          <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Participação e Responsabilidade</h3>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${alunoNome}</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${turma} (${turno})</p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 14px;">NOTA DE NOTIFICAÇÕES</span>
              <span style="font-size: 14px; font-weight: bold;">${participacaoData.notaAdvertencias}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; background-color: #f7fafc;">
              <span style="font-size: 14px;">NOTA DE PARTICIPAÇÃO</span>
              <span style="font-size: 14px; font-weight: bold;">${participacaoData.notaParticipacao}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="font-size: 14px; font-weight: bold;">MÉDIA DE PARTICIPAÇÃO E RESPONSABILIDADE</span>
              <span style="font-size: 14px; font-weight: bold;">${participacaoData.mediaFinal}</span>
            </div>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Aluno:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
            <div style="width: 45%;">
              <p style="font-size: 14px; margin-bottom: 50px;">Assinatura do Responsável:</p>
              <div class="signature-line" style="border-top: 1px solid #000; width: 100%; padding-top: 20px;"></div>
            </div>
          </div>
        </div>
      </div>
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
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    console.error('Falha ao abrir janela de impressão. Verifique as configurações de popup do navegador.');
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
}

async function renderAlunosListBoletins(turmaNome, selectedAluno = null) {
  const alunosList = document.getElementById('alunos-list-boletins');
  const boletimSection = document.getElementById('boletim-section');
  const boletimList = document.getElementById('boletim-list');
  const alunoBoletimTitle = document.getElementById('aluno-boletim-title');
  const boletimContainer = document.getElementById('boletins-container');

  if (!alunosList || !boletimSection || !boletimList || !alunoBoletimTitle) {
    console.error('Elementos do DOM não encontrados para renderAlunosListBoletins');
    return;
  }

  if (boletimContainer) {
    boletimContainer.classList.remove('hidden');
  }

  const turno = window.turmaTurno || '';
  if (!turno) {
    console.error('Erro: window.turmaTurno não está definido. Um turno deve ser especificado.');
    alunosList.innerHTML = `
      <li class="text-center text-red-600 py-3">
        Erro: Turno não especificado. Por favor, selecione um turno.
      </li>
    `;
    return;
  }

  alunosList.classList.add('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));

  const alunos = await getAlunosBoletim(turmaNome, turno);
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));

  let alunosHtml = '';
  if (alunos.length === 0) {
    alunosHtml = `
      <li class="text-center text-gray-600 py-3">
        Nenhum aluno encontrado para a turma ${turmaNome} e turno ${turno}.
      </li>
    `;
  } else {
    alunos.forEach(aluno => {
      const turnoDisplay = aluno.turno.charAt(0).toUpperCase() + aluno.turno.slice(1);
      const isSelected = selectedAluno && aluno.nome === selectedAluno.nome && aluno.turma === selectedAluno.turma;
      alunosHtml += `
        <li>
          <button
            class="w-full text-left rounded-md px-4 py-3 transition-colors ${isSelected ? 'selected-aluno' : 'text-[#1E293B] hover:bg-gray-100'}"
            style="${isSelected ? 'background-color: #2563EB !important; color: white !important;' : ''}"
            onclick="renderAlunosListBoletins('${turmaNome}', { nome: '${aluno.nome}', turma: '${aluno.turma}', turno: '${turno}' })"
          >
            <p class="font-semibold leading-5">${aluno.nome}</p>
            <p class="${isSelected ? 'text-white' : 'text-[#64748B]'} text-xs leading-4 mt-0.5" style="${isSelected ? 'color: white !important;' : ''}">${aluno.turma} - ${turnoDisplay}</p>
          </button>
        </li>
      `;
    });
  }

  alunosList.innerHTML = alunosHtml;
  alunosList.classList.remove('fade-out');
  alunosList.classList.add('fade-in');

  if (selectedAluno) {
    const turnoDisplay = turno.charAt(0).toUpperCase() + turno.slice(1);
    alunoBoletimTitle.textContent = `Boletim de ${selectedAluno.nome} - ${selectedAluno.turma} (${turnoDisplay})`;

    boletimList.classList.remove('fade-in');
    boletimList.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 300));

    const notas = await getNotas(selectedAluno.nome, selectedAluno.turma, turno);
    if (!notas || notas.length === 0) {
      console.warn(`Nenhuma nota encontrada para ${selectedAluno.nome} (${selectedAluno.turma}, ${turno})`);
    }
    const cursoEspecificoData = calculateCursoEspecifico(notas);
    const cursoExtraData = calculateCursoExtra(notas);
    const advertencias = await getAdvertencias(selectedAluno.nome, selectedAluno.turma, turno);
    const faltas = await getFaltas(selectedAluno.nome, selectedAluno.turma, turno);
    const participacaoData = calculateParticipacaoResponsabilidade(advertencias, faltas);

    let boletimHtml = '';
    if (notas.length === 0 && advertencias.length === 0 && faltas === 0) {
      boletimHtml = `
        <article class="bg-white rounded-md p-4 shadow-sm text-center" style="min-width: 250px; box-sizing: border-box;">
          <p class="text-gray-600">Este aluno ainda não possui notas, advertências ou faltas registradas.</p>
        </article>
      `;
    } else {
      boletimHtml = generateCursoEspecificoHTML(cursoEspecificoData, selectedAluno.nome, selectedAluno.turma, turno);
      boletimHtml += generateCursoExtraHTML(cursoExtraData, selectedAluno.nome, selectedAluno.turma, turno);
      boletimHtml += generateParticipacaoResponsabilidadeHTML(participacaoData, selectedAluno.nome, selectedAluno.turma, turno);
    }

    boletimList.innerHTML = boletimHtml;
    boletimList.classList.remove('fade-out');
    boletimList.classList.add('fade-in');

    const printAllBtn = document.querySelector('.print-all-btn');
    if (printAllBtn) {
      printAllBtn.setAttribute('onclick', `printAllBoletins('${selectedAluno.nome}', '${selectedAluno.turma}', '${turno}')`);
      printAllBtn.disabled = (notas.length === 0 && advertencias.length === 0 && faltas === 0);
    }
  } else {
    alunoBoletimTitle.textContent = '';
    boletimList.innerHTML = `
      <article class="bg-white rounded-md p-4 shadow-sm text-center" style="min-width: 250px; box-sizing: border-box;">
        <p class="text-gray-600">Selecione um aluno para visualizar seu boletim.</p>
      </article>
    `;
    const printAllBtn = document.querySelector('.print-all-btn');
    if (printAllBtn) {
      printAllBtn.disabled = true;
    }
  }
}

window.renderAlunosListBoletins = renderAlunosListBoletins;
window.calculateCursoEspecifico = calculateCursoEspecifico;
window.calculateCursoExtra = calculateCursoExtra;
window.calculateParticipacaoResponsabilidade = calculateParticipacaoResponsabilidade;
window.generateCursoEspecificoHTML = generateCursoEspecificoHTML;
window.generateCursoExtraHTML = generateCursoExtraHTML;
window.generateParticipacaoResponsabilidadeHTML = generateParticipacaoResponsabilidadeHTML;
window.printCursoEspecifico = printCursoEspecifico;
window.printCursoExtra = printCursoExtra;
window.printParticipacaoResponsabilidade = printParticipacaoResponsabilidade;
window.printAllBoletins = printAllBoletins;
window.toggleCardDetails = toggleCardDetails;