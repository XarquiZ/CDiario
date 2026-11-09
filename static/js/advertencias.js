if (typeof window.MOTIVOS === 'undefined') {
  window.MOTIVOS = [
    { id: "1.1", texto: "Não é permitido usar mini saia, short, blusa sem manga, blusinha de alcinha ou mini blusa, cropped, bermuda", gravidade: "Leve", pontos: 3 },
    { id: "1.2", texto: "Não será permitido utilizar boné, toca, gorro ou estar de cabelo solto no refeitório", gravidade: "Leve", pontos: 3 },
    { id: "1.3", texto: "Não é permitido usar rasteirinha e chinelo", gravidade: "Leve", pontos: 3 },
    { id: "1.4", texto: "Não estar utilizando roupas adequadas para aula de esporte", gravidade: "Leve", pontos: 3 },
    { id: "1.5", texto: "Não será permitido ficar sem a utilização do crachá", gravidade: "Leve", pontos: 3 },
    { id: "2.1", texto: "Não é permitido nas aulas de Ajustador Mecânico, Eletricista Instalador, Reparador de Linha Branca (Electrolux), Assistente de T.I. e Esporte o uso de brincos, correntes, colares, pulseiras, anéis e relógios", gravidade: "Média", pontos: 5 },
    { id: "2.2", texto: "Não é permitido o uso de fone de ouvido, celular ou smartwatch fora do horário de intervalo ou utilizá-lo em sala de aula sem autorização do educador", gravidade: "Média", pontos: 5 },
    { id: "3.1", texto: "Não é permitido jogar objetos, dançar, dormir, gritar e batucar em sala de aula", gravidade: "Leve", pontos: 3 },
    { id: "3.2", texto: "Não é permitido ficar fora da sua área de trabalho sem autorização do educador", gravidade: "Leve", pontos: 3 },
    { id: "3.3", texto: "Não é permitido correr nos corredores da Instituição", gravidade: "Leve", pontos: 3 },
    { id: "3.4", texto: "Não é permitido comer qualquer tipo de alimento em sala de aula", gravidade: "Leve", pontos: 3 },
    { id: "3.5", texto: "Não será permitido qualquer tipo de desrespeito com atendidos e colaboradores da instituição", gravidade: "Grave", pontos: 7 },
    { id: "3.6", texto: "Sair da sala de aula sem autorização do educador", gravidade: "Grave", pontos: 7 },
    { id: "3.7", texto: "Não é permitido namorar nas dependências da Instituição", gravidade: "Grave", pontos: 7 },
    { id: "3.8", texto: "Não é permitido danificar os patrimônios da Instituição", gravidade: "Grave", pontos: 7 },
    { id: "3.9", texto: "Não é permitido fumar ou ingerir bebidas alcoólicas nas dependências da Instituição", gravidade: "Grave", pontos: 7 },
    { id: "3.10", texto: "Não é permitido ter brincadeiras de mão e/ou agressão (física ou verbal)", gravidade: "Grave", pontos: 7 },
    { id: "3.11", texto: "Não é permitido utilizar vocabulário inadequado na Instituição como uso de palavrões e/ou gestos obscenos", gravidade: "Grave", pontos: 7 },
    { id: "3.12", texto: "Não é permitido deixar o ambiente de trabalho sujo e desorganizado", gravidade: "Média", pontos: 5 },
    { id: "4.1", texto: "Em caso de falta, não trazer a justificativa em até 48 horas", gravidade: "Leve", pontos: 3 },
    { id: "4.2", texto: "Atrasar-se para qualquer atividade sem justificativa", gravidade: "Leve", pontos: 3 },
    { id: "4.3", texto: "Não trazer os materiais solicitados para aula", gravidade: "Leve", pontos: 3 },
    { id: "4.4", texto: "Não é permitido utilizar o armário após o sinal ou início da aula", gravidade: "Leve", pontos: 3 },
    { id: "5.1", texto: "Não trazer o EPI solicitado pelo educador em dia de aula prática. Em caso de esquecimento, o aluno não irá participar da aula", gravidade: "Média", pontos: 5 },
    { id: "5.2", texto: "Não utilizar o EPI (Equipamento de Proteção Individual) e/ou EPC (Equipamento de Proteção Coletiva) da área adequada", gravidade: "Média", pontos: 5 },
    { id: "5.3", texto: "Não zelar pelos materiais/equipamentos da Instituição (ou emprestados pelo educador). Os alunos que danificarem o material serão responsáveis por repô-los", gravidade: "Média", pontos: 5 },
    { id: "5.7", texto: "Não é permitido mochila em sala de aula", gravidade: "Leve", pontos: 3 },
    { id: "6.1", texto: "Não é permitido pegar e/ou mexer no material sem autorização do educador", gravidade: "Média", pontos: 5 },
    { id: "6.2", texto: "Limpar o próprio espaço no refeitório", gravidade: "Leve", pontos: 3 },
    { id: "6.3", texto: "Obrigatório a separação correta dos restos de comida", gravidade: "Leve", pontos: 3 },
    { id: "6.4", texto: "Não é permitido ter desperdício de comida", gravidade: "Leve", pontos: 3 },
    { id: "6.5", texto: "Não limpar os pratos e bandejas antes de colocar para lavar", gravidade: "Leve", pontos: 3 }
  ];
}

const MOTIVOS = window.MOTIVOS;

// Função para obter e corrigir turma e turno de forma segura
function getSafeTurmaTurno() {
  let turma = window.turmaNome || '';
  let turno = window.turmaTurno || '';
  if (!turma || !turno) {
    console.warn('Turma ou turno não definidos em window.turmaNome ou window.turmaTurno. Tentando recuperar da URL.');
    const urlParams = new URLSearchParams(window.location.search);
    turma = decodeURIComponent(urlParams.get('turma') || '');
    turno = decodeURIComponent(urlParams.get('turno') || '');
    if (!turma || !turno) {
      console.error('Turma ou turno não encontrados na URL. Usando valores padrão.');
      turma = 'Turma Não Definida';
      turno = 'Turno Não Definido';
    }
    window.turmaNome = turma;
    window.turmaTurno = turno;
  }
  console.log(`Turma e turno obtidos/corrigidos: ${turma}, ${turno}`);
  return { turma, turno };
}

async function getAdvertencias(alunoNome, turma, turno) {
  if (!alunoNome || !turma || !turno) {
    console.error('Parâmetros alunoNome, turma ou turno ausentes ao buscar advertências:', { alunoNome, turma, turno });
    return [];
  }
  try {
    const response = await fetch(`/advertencias?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turma)}&turno=${encodeURIComponent(turno)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao buscar advertências: ${errorData.error || response.statusText}`);
    }
    const advertencias = await response.json();
    console.log(`Advertências buscadas para ${alunoNome} (${turma}, ${turno}):`, advertencias);
    return advertencias.map(a => ({
      ...a,
      gravidade: a.gravidade || MOTIVOS.find(m => m.texto === a.motivo)?.gravidade || 'Leve',
      pontos: a.pontos || MOTIVOS.find(m => m.texto === a.motivo)?.pontos || 3
    })) || [];
  } catch (error) {
    console.error('Erro ao buscar advertências:', error);
    alert('Não foi possível carregar as advertências. Verifique se o servidor está rodando ou se os parâmetros estão corretos.');
    return [];
  }
}

async function criarAdvertencia(alunoNome, turma, turno, advertenciaData) {
  try {
    const motivoData = MOTIVOS.find(m => m.texto === advertenciaData.motivo);
    const gravidade = advertenciaData.gravidade || (motivoData ? motivoData.gravidade : 'Leve');
    const pontos = advertenciaData.pontos || (motivoData ? motivoData.pontos : 3);
    console.log('Dados enviados para criar advertência:', {
      aluno_nome: alunoNome,
      turma: turma,
      turno: turno,
      motivo: advertenciaData.motivo,
      gravidade,
      pontos,
      data: advertenciaData.data || null,
      descricao: advertenciaData.descricao || ''
    });
    const response = await fetch('/advertencias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aluno_nome: alunoNome,
        turma: turma,
        turno: turno,
        motivo: advertenciaData.motivo,
        gravidade,
        pontos,
        data: advertenciaData.data || null,
        descricao: advertenciaData.descricao || ''
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao criar advertência: ${errorData.error || response.statusText}`);
    }
    const result = await response.json();
    console.log('Advertência criada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('Erro ao criar advertência:', error);
    alert(`Não foi possível criar a advertência: ${error.message}`);
    return null;
  }
}

async function atualizarAdvertencia(advertenciaId, alunoNome, turma, turno, advertenciaData) {
  try {
    const motivoData = MOTIVOS.find(m => m.texto === advertenciaData.motivo);
    const gravidade = advertenciaData.gravidade || (motivoData ? motivoData.gravidade : 'Leve');
    const pontos = advertenciaData.pontos || (motivoData ? motivoData.pontos : 3);
    console.log('Dados enviados para atualizar advertência:', {
      aluno_nome: alunoNome,
      turma: turma,
      turno: turno,
      motivo: advertenciaData.motivo,
      gravidade,
      pontos,
      data: advertenciaData.data || null,
      descricao: advertenciaData.descricao || ''
    });
    const response = await fetch(`/advertencias/${advertenciaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aluno_nome: alunoNome,
        turma: turma,
        turno: turno,
        motivo: advertenciaData.motivo,
        gravidade,
        pontos,
        data: advertenciaData.data || null,
        descricao: advertenciaData.descricao || ''
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao atualizar advertência: ${errorData.error || response.statusText}`);
    }
    const result = await response.json();
    console.log('Advertência atualizada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('Erro ao atualizar advertência:', error);
    alert(`Não foi possível atualizar a advertência: ${error.message}`);
    return null;
  }
}

async function excluirAdvertencia(advertenciaId, alunoNome, turma, turno) {
  try {
    const response = await fetch(`/advertencias/${advertenciaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao excluir advertência: ${errorData.error || response.statusText}`);
    }
    const result = await response.json();
    console.log('Advertência excluída com sucesso:', result);

    const advertenciasContainer = document.getElementById('advertencias-container');
    if (advertenciasContainer) {
      advertenciasContainer.classList.add('fade-out');
      await new Promise(resolve => setTimeout(resolve, 300));
      await renderAlunosListAdvertencias({ selectedAluno: { nome: alunoNome, turma: turma, turno: turno } });
      advertenciasContainer.classList.remove('fade-out');
      advertenciasContainer.classList.add('fade-in');
    }

    return result;
  } catch (error) {
    console.error('Erro ao excluir advertência:', error);
    alert(`Não foi possível excluir a advertência: ${error.message}`);
    return null;
  }
}

function generateAdvertenciaPrintHTML(advertencia, alunoNome, turma, turno, isSingle = false) {
  const dataFormatada = advertencia.data ? advertencia.data.split('-').reverse().join('/') : 'Sem data';
  const motivoData = MOTIVOS.find(m => m.texto === advertencia.motivo) || {};
  const gravidade = advertencia.gravidade || motivoData.gravidade || 'Leve';
  const pontos = advertencia.pontos || motivoData.pontos || 3;

  const sanitize = (text) => text ? text.replace(/[&<>"]/g, match => ({ '&': '&', '<': '<', '>': '>', '"': '"' }[match])) : '';

  return `
    <div class="advertencia-print" style="margin-bottom: 40px; padding: 20px; border: 1px solid #e5e7eb;">
      <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
      ${isSingle ? '<h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Notificação Disciplinar</h2>' : ''}
      <p style="font-size: 16px; margin-bottom: 5px;"><strong>Aluno:</strong> ${sanitize(alunoNome)}</p>
      <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${sanitize(turma)}</p>
      <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turno:</strong> ${sanitize(turno)}</p>
      <p style="font-size: 16px; margin-bottom: 5px;"><strong>Motivo:</strong> ${sanitize(advertencia.motivo)}</p>
      <p style="font-size: 16px; margin-bottom: 5px;"><strong>Gravidade:</strong> ${sanitize(gravidade)} - ${pontos} pontos</p>
      <p style="font-size: 16px; margin-bottom: 20px;"><strong>Data:</strong> ${dataFormatada}</p>
      <p style="font-size: 16px; margin-bottom: 20px;"><strong>Descrição:</strong> ${sanitize(advertencia.descricao || 'Sem descrição')}</p>
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
  `;
}

function printAdvertencia(advertencia, alunoNome, turma, turno) {
  console.log('Iniciando impressão de advertência para:', alunoNome, turma, turno);
  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Advertência</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 20px; }
        .advertencia-print { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div id="print-content">
        ${generateAdvertenciaPrintHTML(advertencia, alunoNome, turma, turno, true)}
      </div>
      <script>
        window.onload = function() {
          window.print();
          console.log('Comando de impressão enviado');
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    console.log('Janela de impressão aberta com sucesso');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    console.error('Falha ao abrir janela de impressão. Verifique as configurações de popup do navegador.');
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
}

async function printAllAdvertencias(alunoNome, turma, turno) {
  console.log('Iniciando impressão de todas as advertências para:', alunoNome, turma, turno);
  const advertencias = await getAdvertencias(alunoNome, turma, turno);
  if (advertencias.length === 0) {
    alert('Nenhuma advertência para imprimir.');
    return;
  }

  let advertenciasHTML = '';
  advertencias.forEach(advertencia => {
    advertenciasHTML += generateAdvertenciaPrintHTML(advertencia, alunoNome, turma, turno);
  });

  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Todas as Advertências</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        .signature-line { border-top: 1px solid #000; width: 100%; padding-top: 20px; }
        .advertencia-print { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div id="print-content">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">Advertências de ${alunoNome} - ${turma} (${turno})</h2>
        ${advertenciasHTML}
      </div>
      <script>
        window.onload = function() {
          window.print();
          console.log('Comando de impressão enviado');
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    console.log('Janela de impressão aberta com sucesso');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    console.error('Falha ao abrir janela de impressão. Verifique as configurações de popup do navegador.');
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
}

async function getAlunosAdvertencias(turma, turno) {
  if (!turma || !turno) {
    console.error('Turma ou turno não especificados ao buscar alunos:', { turma, turno });
    return [];
  }
  try {
    const turnoNormalized = turno.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const response = await fetch(`/alunos?turma=${encodeURIComponent(turma)}&turno=${encodeURIComponent(turnoNormalized)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao buscar alunos: ${errorData.error || response.statusText}`);
    }
    const alunos = await response.json();
    console.log(`Alunos buscados para turma ${turma} e turno ${turnoNormalized}:`, alunos);
    return alunos.map(aluno => ({ ...aluno, turma: turma }));
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    alert('Não foi possível carregar os alunos. Verifique se o servidor está rodando ou se os parâmetros estão corretos.');
    return [];
  }
}

async function renderAlunosListAdvertencias(options = {}) {
  let { turma, turno } = getSafeTurmaTurno();

  const alunosList = document.getElementById('alunos-list-advertencias');
  const advertenciasSection = document.getElementById('advertencias-section');
  const advertenciasList = document.getElementById('advertencias-list');
  const alunoAdvertenciasTitle = document.getElementById('aluno-advertencias-title');
  const advertenciasContainer = document.getElementById('advertencias-container');

  if (!alunosList || !advertenciasSection || !advertenciasList || !alunoAdvertenciasTitle || !advertenciasContainer) {
    console.error('Elementos necessários não encontrados:', { alunosList, advertenciasSection, advertenciasList, alunoAdvertenciasTitle, advertenciasContainer });
    return;
  }

  advertenciasContainer.classList.remove('hidden');

  alunosList.classList.add('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));

  const alunos = await getAlunosAdvertencias(turma, turno);
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));

  let alunosHtml = '';
  if (alunos.length === 0) {
    alunosHtml = `
      <li class="text-center text-gray-600 py-3">
        Nenhum aluno encontrado para a turma ${turma} e turno ${turno}. Verifique se há alunos registrados no servidor.
      </li>
    `;
  } else {
    alunosHtml = alunos.map(aluno => {
      const isSelected = options.selectedAluno && aluno.nome === options.selectedAluno.nome && aluno.turma === options.selectedAluno.turma;
      return `
        <li>
          <button
            class="w-full text-left rounded-md px-4 py-3 transition-colors ${isSelected ? 'selected-aluno' : 'text-[#1E293B] hover:bg-gray-100'}"
            style="${isSelected ? 'background-color: #2563EB !important; color: white !important;' : ''}"
            onclick="renderAlunosListAdvertencias({ selectedAluno: { nome: '${aluno.nome}', turma: '${aluno.turma}', turno: '${turno}' } })"
          >
            <p class="font-semibold leading-5">${aluno.nome}</p>
            <p class="${isSelected ? 'text-white' : 'text-[#64748B]'} text-xs leading-4 mt-0.5" style="${isSelected ? 'color: white !important;' : ''}">${aluno.turma} - ${turno}</p>
          </button>
        </li>
      `;
    }).join('');
  }

  alunosList.innerHTML = alunosHtml;
  alunosList.classList.remove('fade-out');
  alunosList.classList.add('fade-in');

  if (options.selectedAluno) {
    const selectedTurma = options.selectedAluno.turma || turma;
    const selectedTurno = options.selectedAluno.turno || turno;
    alunoAdvertenciasTitle.textContent = `Advertências de ${options.selectedAluno.nome} - ${selectedTurma}`;
    advertenciasList.classList.remove('fade-in');
    advertenciasList.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 300));

    const advertencias = await getAdvertencias(options.selectedAluno.nome, selectedTurma, selectedTurno);

    let advertenciasHtml = '';
    if (advertencias.length === 0) {
      advertenciasHtml = `
        <article class="bg-white rounded-md p-4 shadow-sm text-center" style="box-sizing: border-box;">
          <p class="text-gray-600">Este aluno ainda não possui advertências registradas.</p>
        </article>
      `;
    } else {
      advertenciasHtml = advertencias.map(advertencia => {
        const dataFormatada = advertencia.data ? advertencia.data.split('-').reverse().join('/') : 'Sem data';
        const motivoData = MOTIVOS.find(m => m.texto === advertencia.motivo) || {};
        const gravidade = advertencia.gravidade || motivoData.gravidade || 'Leve';
        const pontos = advertencia.pontos || motivoData.pontos || 3;
        const gravidadeColor = gravidade === 'Leve' ? 'bg-green-100 text-green-600' : gravidade === 'Média' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600';

        return `
          <article class="bg-white rounded-md p-4 shadow-sm flex flex-col justify-between" aria-label="Advertência de ${advertencia.motivo}" style="box-sizing: border-box; position: relative; z-index: 1;">
            <div>
              <h4 class="font-semibold text-[#1E293B] mb-2">${advertencia.motivo}</h4>
              <span class="${gravidadeColor} text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block">${gravidade} - ${pontos} pontos</span>
              <div class="flex justify-between items-center mb-2">
                <time datetime="${advertencia.data || ''}" class="text-xs text-gray-400 font-normal">${dataFormatada}</time>
              </div>
              <p class="text-xs text-gray-600 leading-5">${advertencia.descricao || 'Sem descrição'}</p>
            </div>
            <div class="mt-4 flex justify-between gap-2">
              <button
                type="button"
                class="flex items-center gap-2 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-[#475569] hover:bg-gray-50"
                onclick='editarAdvertencia(${advertencia.id}, "${options.selectedAluno.nome}", "${selectedTurma}", "${selectedTurno}", "${advertencia.motivo}", "${advertencia.descricao || ''}", "${advertencia.data || ''}", "${gravidade}", ${pontos})'
                style="z-index: 10;"
              >
                <i class="far fa-edit"></i> Editar
              </button>
              <button
                type="button"
                class="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-md px-2 py-1 text-xs font-semibold"
                onclick='printAdvertencia(${JSON.stringify(advertencia)}, "${options.selectedAluno.nome}", "${selectedTurma}", "${selectedTurno}")'
                style="background-color: #2563EB; color: white !important; z-index: 10;"
              >
                <i class="fas fa-print"></i> Imprimir
              </button>
              <button
                type="button"
                class="flex items-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-md px-2 py-1 text-xs font-semibold"
                onclick="excluirAdvertencia(${advertencia.id}, '${options.selectedAluno.nome}', '${selectedTurma}', '${selectedTurno}')"
                style="background-color: #EF4444; color: white !important; z-index: 10;"
              >
                <i class="fas fa-trash-alt" style="color: white;"></i> <span style="color: white;">Excluir</span>
              </button>
            </div>
          </article>
        `;
      }).join('');
    }

    advertenciasList.innerHTML = advertenciasHtml;
    advertenciasList.classList.remove('fade-out');
    advertenciasList.classList.add('fade-in');

    const novaAdvertenciaBtn = document.querySelector('.nova-advertencia-btn');
    const printAllBtn = document.querySelector('.print-all-btn');
    if (novaAdvertenciaBtn) {
      novaAdvertenciaBtn.setAttribute('onclick', `openNovaAdvertenciaModal('${options.selectedAluno.nome}', '${selectedTurma}', null, '', '', '', '', 0, '${selectedTurno}')`);
      novaAdvertenciaBtn.disabled = false;
    }
    if (printAllBtn) {
      printAllBtn.setAttribute('onclick', `printAllAdvertencias('${options.selectedAluno.nome}', '${selectedTurma}', '${selectedTurno}')`);
      printAllBtn.disabled = advertencias.length === 0;
    }
  } else {
    alunoAdvertenciasTitle.textContent = '';
    advertenciasList.innerHTML = `
      <article class="bg-white rounded-md p-4 shadow-sm text-center" style="box-sizing: border-box;">
        <p class="text-gray-600">Selecione um aluno para visualizar suas advertências.</p>
      </article>
    `;
    const novaAdvertenciaBtn = document.querySelector('.nova-advertencia-btn');
    const printAllBtn = document.querySelector('.print-all-btn');
    if (novaAdvertenciaBtn) novaAdvertenciaBtn.disabled = true;
    if (printAllBtn) printAllBtn.disabled = true;
  }
}

function openNovaAdvertenciaModal(alunoNome, turma, advertenciaId = null, motivo = '', descricao = '', data = '', gravidade = '', pontos = 0, turno = '') {
  const modalHtml = `
    <div id="nova-advertencia-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">${advertenciaId ? 'Editar Notificação' : 'Adicionar Nova Notificação'} para ${alunoNome}</h3>
        <form id="nova-advertencia-form">
          <div class="mb-4">
            <label for="motivo" class="block text-sm font-medium text-gray-700">Motivo</label>
            <div class="relative">
              <input type="text" id="motivo" name="motivo" value="${motivo}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Digite para buscar um motivo (ex.: atraso)" autocomplete="off" required>
              <ul id="motivo-options" class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto hidden"></ul>
            </div>
            <input type="hidden" id="motivo-gravidade" name="motivo-gravidade" value="${gravidade}">
            <input type="hidden" id="motivo-pontos" name="motivo-pontos" value="${pontos}">
          </div>
          <div class="mb-4">
            <label for="descricao" class="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea id="descricao" name="descricao" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">${descricao}</textarea>
          </div>
          <div class="mb-4">
            <label class="flex items-center">
              <input type="checkbox" id="reincidencia" name="reincidencia" class="mr-2" ${gravidade === 'Grave' && pontos === 7 && !MOTIVOS.some(m => m.texto === motivo && m.gravidade === 'Grave') ? 'checked' : ''}>
              <span class="text-sm font-medium text-gray-700">Reincidência (altera para Gravidade: Grave, 7 pontos)</span>
            </label>
          </div>
          <div class="mb-4">
            <label for="data" class="block text-sm font-medium text-gray-700">Data</label>
            <input type="date" id="data" name="data" value="${data}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeNovaAdvertenciaModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const motivoInput = document.getElementById('motivo');
  const motivoOptions = document.getElementById('motivo-options');
  const motivoGravidadeInput = document.getElementById('motivo-gravidade');
  const motivoPontosInput = document.getElementById('motivo-pontos');
  const reincidenciaCheckbox = document.getElementById('reincidencia');

  if (!motivoInput || !motivoOptions || !motivoGravidadeInput || !motivoPontosInput || !reincidenciaCheckbox) {
    console.error('Elementos do modal não encontrados no DOM');
    return;
  }

  const updateOptions = (filterText = '') => {
    const searchText = filterText.toLowerCase();
    const filteredMotivos = MOTIVOS.filter(m => m.texto.toLowerCase().includes(searchText));
    motivoOptions.innerHTML = filteredMotivos.map(m => `
      <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer" data-texto="${m.texto}" data-gravidade="${m.gravidade}" data-pontos="${m.pontos}">
        ${m.id} - ${m.texto}
      </li>
    `).join('');
    motivoOptions.classList.toggle('hidden', filteredMotivos.length === 0);
  };

  motivoInput.addEventListener('focus', () => updateOptions(motivoInput.value));
  motivoInput.addEventListener('input', () => updateOptions(motivoInput.value));

  motivoOptions.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) {
      const texto = li.getAttribute('data-texto');
      const gravidade = li.getAttribute('data-gravidade');
      const pontos = li.getAttribute('data-pontos');
      motivoInput.value = texto;
      motivoGravidadeInput.value = gravidade;
      motivoPontosInput.value = pontos;
      motivoOptions.classList.add('hidden');
      reincidenciaCheckbox.checked = false;
    }
  });

  reincidenciaCheckbox.addEventListener('change', () => {
    if (reincidenciaCheckbox.checked) {
      motivoGravidadeInput.value = 'Grave';
      motivoPontosInput.value = 7;
    } else {
      const selectedMotivo = MOTIVOS.find(m => m.texto === motivoInput.value);
      motivoGravidadeInput.value = selectedMotivo?.gravidade || 'Leve';
      motivoPontosInput.value = selectedMotivo?.pontos || 3;
    }
  });

  document.addEventListener('click', (e) => {
    if (!motivoInput.contains(e.target) && !motivoOptions.contains(e.target)) {
      motivoOptions.classList.add('hidden');
    }
  });

  const form = document.getElementById('nova-advertencia-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const selectedMotivo = formData.get('motivo');
      const isReincidencia = formData.get('reincidencia') === 'on';
      const gravidade = isReincidencia ? 'Grave' : formData.get('motivo-gravidade') || 'Leve';
      const pontos = isReincidencia ? 7 : parseInt(formData.get('motivo-pontos')) || 3;

      const advertenciaData = {
        motivo: selectedMotivo,
        gravidade,
        pontos,
        descricao: formData.get('descricao') || '',
        data: formData.get('data') || null
      };

      let result;
      if (advertenciaId) {
        result = await atualizarAdvertencia(advertenciaId, alunoNome, turma, turno, advertenciaData);
      } else {
        result = await criarAdvertencia(alunoNome, turma, turno, advertenciaData);
      }

      if (result) {
        closeNovaAdvertenciaModal();
        const advertenciasContainer = document.getElementById('advertencias-container');
        if (advertenciasContainer) {
          advertenciasContainer.classList.add('fade-out');
          await new Promise(resolve => setTimeout(resolve, 300));
          await renderAlunosListAdvertencias({ selectedAluno: { nome: alunoNome, turma: turma, turno: turno } });
          advertenciasContainer.classList.remove('fade-out');
          advertenciasContainer.classList.add('fade-in');
        }
      }
    });
  }
}

function closeNovaAdvertenciaModal() {
  const modal = document.getElementById('nova-advertencia-modal');
  if (modal) {
    modal.remove();
  }
}

function editarAdvertencia(advertenciaId, alunoNome, turma, turno, motivo, descricao, data, gravidade, pontos) {
  openNovaAdvertenciaModal(alunoNome, turma, advertenciaId, motivo, descricao, data, gravidade, pontos, turno);
}

window.renderAlunosListAdvertencias = renderAlunosListAdvertencias;