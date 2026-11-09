function getSafeTurmaTurno() {
  let turma = window.turmaNome || '';
  let turno = window.turmaTurno || '';
  if (!turma || !turno) {
    console.warn('Turma ou turno não definidos em window.turmaNome ou window.turmaTurno. Usando valores padrão ou tentando recuperar.');
    const urlParams = new URLSearchParams(window.location.search);
    turma = turma || decodeURIComponent(urlParams.get('turma') || '');
    turno = turno || decodeURIComponent(urlParams.get('turno') || '');
    if (!turma || !turno) {
      turma = 'Turma Não Definida';
      turno = 'Turno Não Definido';
    }
    window.turmaNome = turma;
    window.turmaTurno = turno;
  }
  turno = removeAccents(turno).toLowerCase();
  console.log(`Turma e turno obtidos/corrigidos: ${turma}, ${turno}`);
  return { turma, turno };
}

let currentAlunoStatusFilter = 'ativo';
let currentTurmaId = null;

async function fetchAlunos(turmaNome, turno, status = currentAlunoStatusFilter) {
  try {
    if (!turmaNome || !turno) {
      throw new Error('Turma ou turno não especificados.');
    }
    const turnoNormalized = removeAccents(turno).toLowerCase();
    const url = `/alunos?turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turnoNormalized)}&status=${encodeURIComponent(status)}&t=${Date.now()}`;
    console.log('Requisição para:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar alunos: ${response.status} - ${errorText || response.statusText}`);
    }

    const alunos = await response.json();
    console.log(`Alunos buscados para turma ${turmaNome} e turno ${turnoNormalized}:`, alunos);

    if (!Array.isArray(alunos)) {
      throw new Error('Resposta do servidor não é um array de alunos');
    }

    const alunosComTurma = alunos.map(aluno => ({
      ...aluno,
      turma: aluno.turma || turmaNome
    }));
    console.log('Alunos após aplicar fallback de turma:', alunosComTurma);

    return alunosComTurma || [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    alert(`Não foi possível carregar os alunos: ${error.message}. Verifique se o servidor está rodando e se há alunos registrados para a turma ${turmaNome} e turno ${turno}.`);
    return [];
  }
}

window.getAlunos = async function(turmaNome) {
  const turno = window.turmaTurno;
  if (!turno) {
    console.error('Turno não definido. Certifique-se de que window.turmaTurno está configurado corretamente.');
    throw new Error('Turno não definido. Por favor, selecione um turno antes de continuar.');
  }
  console.log('Usando turno:', turno, 'para turma:', turmaNome);
  return await fetchAlunos(turmaNome, turno);
};

function removeAccents(str) {
  const accentsMap = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C'
  };
  return str.replace(/[áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ]/g, match => accentsMap[match] || match);
}

async function getNotas(alunoNome, turma, turno) {
  try {
    const response = await fetch(`/notas?aluno=${encodeURIComponent(alunoNome)}&turma=${encodeURIComponent(turma)}&turno=${encodeURIComponent(turno)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`Erro ao buscar notas: ${response.statusText}`);
    const notas = await response.json();
    console.log(`Notas buscadas para ${alunoNome} (${turma}, ${turno}):`, notas);
    return notas || [];
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    alert('Não foi possível carregar as notas. Verifique se o servidor está rodando.');
    return [];
  }
}

if (!window.TIPOS_CURSO_EXTRA) {
  window.TIPOS_CURSO_EXTRA = [
    'teorica', 'pratica', 'extra_esporte', 'extra_formacao_humana',
    'extra_iniciacao_digital', 'extra_mercado_trabalho', 'extra_musica',
    'extra_qualidade_vida'
  ];
}

if (!window.TIPO_NOME_MAP) {
  window.TIPO_NOME_MAP = {
    'teorica': 'Atividade Teórica',
    'pratica': 'Atividade Prática',
    'extra_esporte': 'Curso Extra - Esporte',
    'extra_formacao_humana': 'Curso Extra - Formação Humana',
    'extra_iniciacao_digital': 'Curso Extra - Iniciação Digital',
    'extra_mercado_trabalho': 'Curso Extra - Mercado de Trabalho',
    'extra_musica': 'Curso Extra - Música',
    'extra_qualidade_vida': 'Curso Extra - Qualidade de Vida'
  };
}

async function criarNota(alunoNome, turma, turno, notaData) {
  try {
    if (!notaData.tipo || !window.TIPOS_CURSO_EXTRA.includes(notaData.tipo)) {
      throw new Error(`Tipo de nota inválido: ${notaData.tipo}. Tipos permitidos: ${window.TIPOS_CURSO_EXTRA.join(', ')}.`);
    }
    const response = await fetch('/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aluno_nome: alunoNome,
        turma: turma,
        turno: turno,
        materia: notaData.materia,
        nota: parseFloat(notaData.nota),
        max_nota: 10.0,
        data: notaData.data || null,
        descricao: notaData.descricao || '',
        tipo: notaData.tipo
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao criar nota: ${errorData.error || response.statusText}`);
    }
    const result = await response.json();
    console.log('Nota criada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    alert(`Não foi possível criar a nota: ${error.message}`);
    return null;
  }
}

async function atualizarNota(notaId, alunoNome, turma, turno, notaData) {
  try {
    if (!notaData.tipo || !window.TIPOS_CURSO_EXTRA.includes(notaData.tipo)) {
      throw new Error(`Tipo de nota inválido: ${notaData.tipo}. Tipos permitidos: ${window.TIPOS_CURSO_EXTRA.join(', ')}.`);
    }
    const response = await fetch(`/notas/${notaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aluno_nome: alunoNome,
        turma: turma,
        turno: turno,
        materia: notaData.materia,
        nota: parseFloat(notaData.nota),
        max_nota: 10.0,
        data: notaData.data || null,
        descricao: notaData.descricao || '',
        tipo: notaData.tipo
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao atualizar nota: ${errorData.error || response.statusText}`);
    }
    const result = await response.json();
    console.log('Nota atualizada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('Erro ao atualizar nota:', error);
    alert(`Não foi possível atualizar a nota: ${error.message}`);
    return null;
  }
}

async function excluirNota(notaId, alunoNome, turma, turno) {
  try {
    const response = await fetch(`/notas/${notaId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao excluir nota: ${errorData.error || response.statusText}`);
    }
    const result = await response.json();
    console.log('Nota excluída com sucesso:', result);
    return result;
  } catch (error) {
    console.error('Erro ao excluir nota:', error);
    alert(`Não foi possível excluir a nota: ${error.message}`);
    return null;
  }
}

async function renderAlunos(turmaNome, containerId = 'content-area') {
  const turno = window.turmaTurno;
  if (!turno) {
    const contentArea = document.getElementById(containerId);
    if (contentArea) contentArea.innerHTML = '<p class="text-center text-red-600">Erro: Turno não especificado. Por favor, selecione um turno.</p>';
    return;
  }
  if (!turmaNome) {
    const contentArea = document.getElementById(containerId);
    if (contentArea) contentArea.innerHTML = '<p class="text-center text-red-600">Erro: Turma não especificada. Por favor, selecione uma turma.</p>';
    return;
  }
  const alunos = await fetchAlunos(turmaNome, turno, currentAlunoStatusFilter);
  const contentArea = document.getElementById(containerId);
  if (!contentArea) {
    console.error(`Elemento #${containerId} não encontrado`);
    return;
  }
  contentArea.classList.remove('p-4', 'mx-auto');
  contentArea.style.padding = '0';
  contentArea.style.margin = '0';

  alunos.sort((a, b) => a.nome.localeCompare(b.nome));

  // Barra de ferramentas e contadores da turma
  let html = `
    <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-gray-500 uppercase mr-1">Filtrar por Status:</span>
        <button onclick="setAlunoStatusFilter('ativo')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currentAlunoStatusFilter === 'ativo' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
          <i class="fas fa-user-check mr-1"></i> Ativos
        </button>
        <button onclick="setAlunoStatusFilter('transferido')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currentAlunoStatusFilter === 'transferido' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
          <i class="fas fa-exchange-alt mr-1"></i> Transferidos
        </button>
        <button onclick="setAlunoStatusFilter('desistente')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currentAlunoStatusFilter === 'desistente' ? 'bg-rose-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
          <i class="fas fa-user-times mr-1"></i> Desistentes
        </button>
        <button onclick="setAlunoStatusFilter('todos')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currentAlunoStatusFilter === 'todos' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
          <i class="fas fa-users mr-1"></i> Todos
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="abrirModalAdicionarAluno()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition">
          <i class="fas fa-plus"></i> Matricular Aluno
        </button>
      </div>
    </div>
  `;

  if (alunos.length === 0) {
    html += `
      <div class="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center my-4">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-lg">
          <i class="fas fa-user-graduate"></i>
        </div>
        <h4 class="text-base font-bold text-gray-800">Nenhum aluno com status "${currentAlunoStatusFilter}"</h4>
        <p class="text-xs text-gray-500 mt-1 mb-4">Você pode matricular novos alunos ou alterar o filtro de status acima.</p>
        <button onclick="abrirModalAdicionarAluno()" class="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <i class="fas fa-plus mr-1"></i> Matricular Aluno
        </button>
      </div>
    `;
  } else {
    html += '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">';
    alunos.forEach(aluno => {
      const statusMat = aluno.status_matricula || 'ativo';
      let statusBadge = '<span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><i class="fas fa-check-circle mr-0.5"></i> Ativo</span>';
      if (statusMat === 'transferido') {
        statusBadge = '<span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><i class="fas fa-exchange-alt mr-0.5"></i> Transferido</span>';
      } else if (statusMat === 'desistente') {
        statusBadge = '<span class="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><i class="fas fa-times-circle mr-0.5"></i> Desistente</span>';
      }

      html += `
        <article class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow transition flex flex-col justify-between" style="box-sizing: border-box;">
          <div>
            <div class="flex items-center justify-between gap-1 mb-2">
              ${statusBadge}
              <span class="text-[11px] text-gray-500 font-medium">Matrícula: ${aluno.matricula || 'S/N'}</span>
            </div>
            
            <h3 class="text-base font-bold text-gray-900 leading-snug mb-1">${aluno.nome || 'Sem nome'}</h3>
            <p class="text-xs text-gray-500 mb-3">${aluno.email || aluno.celular || 'Sem contato adicional'}</p>
          </div>

          <div>
            <!-- Ações pedagógicas -->
            <div class="grid grid-cols-3 gap-1 mb-2">
              <button class="bg-blue-50 text-blue-700 font-semibold text-[11px] py-1.5 px-1 rounded-md hover:bg-blue-100 transition text-center" onclick="switchTab('notas', '${aluno.nome}', '${aluno.turma}', '${turno}')">
                Notas
              </button>
              <button class="bg-amber-50 text-amber-700 font-semibold text-[11px] py-1.5 px-1 rounded-md hover:bg-amber-100 transition text-center" onclick="switchTab('advertencias_faltas', '${aluno.nome}', '${aluno.turma}', '${turno}')">
                Advertênc.
              </button>
              <button class="bg-purple-50 text-purple-700 font-semibold text-[11px] py-1.5 px-1 rounded-md hover:bg-purple-100 transition text-center" onclick="switchTab('boletim', '${aluno.nome}', '${aluno.turma}', '${turno}')">
                Boletim
              </button>
            </div>

            <!-- Controle de Situação / Status Escolar -->
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
              <span class="text-gray-400 font-medium">Situação:</span>
              <div class="flex items-center gap-1">
                ${statusMat === 'ativo' ? `
                  <button onclick="alterarStatusAluno(${aluno.id}, '${aluno.nome}', 'transferido')" title="Marcar como Transferido (mantém histórico escolar)" class="text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded font-medium transition">
                    Transferir
                  </button>
                  <button onclick="alterarStatusAluno(${aluno.id}, '${aluno.nome}', 'desistente')" title="Marcar como Desistente (mantém histórico escolar)" class="text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded font-medium transition">
                    Desistente
                  </button>
                ` : `
                  <button onclick="alterarStatusAluno(${aluno.id}, '${aluno.nome}', 'ativo')" title="Reativar matrícula" class="text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded font-bold transition">
                    <i class="fas fa-undo-alt mr-1"></i> Reativar
                  </button>
                `}
              </div>
            </div>
          </div>
        </article>
      `;
    });
    html += '</div>';
  }
  contentArea.innerHTML = html;
  console.log('Cards renderizados em #content-area:', contentArea.innerHTML);
}

async function renderAlunosList(turmaNome, selectedAluno = null) {
  const turno = window.turmaTurno;
  if (!turno) {
    const alunosList = document.getElementById('alunos-list');
    if (alunosList) alunosList.innerHTML = '<li class="text-center text-red-600 py-3">Erro: Turno não especificado. Por favor, selecione um turno.</li>';
    return;
  }
  const alunos = await fetchAlunos(turmaNome, turno);
  const alunosList = document.getElementById('alunos-list');
  const notasSection = document.getElementById('notas-section');
  const notasList = document.getElementById('notas-list');
  const alunoNotasTitle = document.getElementById('aluno-notas-title');
  const notasContainer = document.getElementById('notas-container');
  if (notasContainer) notasContainer.classList.remove('hidden');
  if (!alunosList || !notasSection || !notasList || !alunoNotasTitle) {
    console.error('Elementos necessários não encontrados:', { alunosList, notasSection, notasList, alunoNotasTitle });
    return;
  }
  alunosList.classList.add('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));
  let alunosHtml = '';
  if (alunos.length === 0) {
    alunosHtml = `<li class="text-center text-gray-600 py-3">Nenhum aluno encontrado para a turma ${turmaNome} e turno ${turno}. Verifique se há alunos registrados no servidor.</li>`;
  } else {
    alunos.forEach(aluno => {
      const isSelected = selectedAluno && aluno.nome === selectedAluno.nome && aluno.turma === selectedAluno.turma;
      alunosHtml += `
        <li>
          <button
            class="w-full text-left rounded-md px-4 py-3 transition-colors ${isSelected ? 'selected-aluno' : 'text-[#1E293B] hover:bg-gray-100'}"
            style="${isSelected ? 'background-color: #2563EB !important; color: white !important;' : ''}"
            onclick="renderAlunosList('${turmaNome}', { nome: '${aluno.nome}', turma: '${aluno.turma}' })"
          >
            <p class="font-semibold leading-5">${aluno.nome}</p>
            <p class="${isSelected ? 'text-white' : 'text-[#64748B]'} text-xs leading-4 mt-0.5" style="${isSelected ? 'color: white !important;' : ''}">${aluno.turma} - ${turno}</p>
          </button>
        </li>
      `;
    });
  }
  alunosList.innerHTML = alunosHtml;
  alunosList.classList.remove('fade-out');
  alunosList.classList.add('fade-in');
  if (selectedAluno) {
    alunoNotasTitle.textContent = `Notas de ${selectedAluno.nome} - ${selectedAluno.turma}`;
    notasList.classList.remove('fade-in');
    notasList.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 300));
    const notas = await getNotas(selectedAluno.nome, selectedAluno.turma, turno);
    const filterValue = document.getElementById('nota-filter')?.value || 'todos';
    let filteredNotas = notas;
    if (filterValue === 'curso_especifico') {
      filteredNotas = notas.filter(nota => nota.tipo === 'teorica' || nota.tipo === 'pratica');
    } else if (filterValue === 'curso_extra') {
      filteredNotas = notas.filter(nota => window.TIPOS_CURSO_EXTRA.slice(2).includes(nota.tipo));
    } else if (window.TIPOS_CURSO_EXTRA.slice(2).includes(filterValue)) {
      filteredNotas = notas.filter(nota => nota.tipo === filterValue);
    }
    let notasHtml = '';
    if (filteredNotas.length === 0) {
      notasHtml = `
        <article class="bg-white rounded-md p-4 shadow-sm text-center" style="min-width: 300px; box-sizing: border-box;">
          <p class="text-gray-600">Este aluno ainda não possui notas registradas para o filtro selecionado.</p>
        </article>
      `;
    } else {
      filteredNotas.forEach(nota => {
        const porcentagem = (nota.nota / (nota.max_nota || 10.0)) * 100;
        let progressBarColor = nota.nota <= 4.9 ? 'bg-red-500' : nota.nota <= 6.9 ? 'bg-orange-500' : 'bg-green-500';
        const dataFormatada = nota.data ? nota.data.split('-').reverse().join('/') : 'Sem data';
        let tipoTexto, tagColorClasses;
        const tipoNormalizado = nota.tipo ? removeAccents(nota.tipo.toLowerCase().trim().replace(/\s+/g, '_')) : 'teorica';
        const normalizedTipo = tipoNormalizado.toLowerCase().trim();
        switch (normalizedTipo) {
          case 'pratica':
            tipoTexto = 'Prática';
            tagColorClasses = 'bg-blue-100 text-blue-600';
            break;
          case 'teorica':
            tipoTexto = 'Teórica';
            tagColorClasses = 'bg-blue-100 text-blue-600';
            break;
          case 'extra_esporte':
            tipoTexto = 'Curso Extra - Esporte';
            tagColorClasses = 'bg-green-100 text-green-600';
            break;
          case 'extra_formacao_humana':
            tipoTexto = 'Curso Extra - Formação Humana';
            tagColorClasses = 'bg-purple-100 text-purple-600';
            break;
          case 'extra_iniciacao_digital':
            tipoTexto = 'Curso Extra - Iniciação Digital';
            tagColorClasses = 'bg-cyan-100 text-cyan-600';
            break;
          case 'extra_mercado_trabalho':
            tipoTexto = 'Curso Extra - Mercado de Trabalho';
            tagColorClasses = 'bg-orange-100 text-orange-600';
            break;
          case 'extra_musica':
            tipoTexto = 'Curso Extra - Música';
            tagColorClasses = 'bg-pink-100 text-pink-600';
            break;
          case 'extra_qualidade_vida':
            tipoTexto = 'Curso Extra - Qualidade de Vida';
            tagColorClasses = 'bg-amber-100 text-amber-600';
            break;
          default:
            tipoTexto = 'Desconhecido';
            tagColorClasses = 'bg-gray-100 text-gray-600';
        }
        notasHtml += `
          <article class="bg-white rounded-md p-4 shadow-sm flex flex-col justify-between" aria-label="Nota de ${nota.materia}" style="min-width: 300px; box-sizing: border-box; position: relative; z-index: 1;">
            <div>
              <h4 class="font-semibold text-[#1E293B] mb-2">${nota.materia}</h4>
              <span class="${tagColorClasses} text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block">${tipoTexto}</span>
              <div class="flex justify-between items-center mb-2">
                <p class="text-[#2F855A] font-bold text-lg leading-6">
                  ${nota.nota.toFixed(1)}<span class="font-normal text-gray-500"> / ${nota.max_nota.toFixed(1)}</span>
                </p>
                <time datetime="${nota.data || ''}" class="text-xs text-gray-400 font-normal">${dataFormatada}</time>
              </div>
              <div class="w-full h-2 rounded-full bg-gray-300 overflow-hidden mb-2">
                <div class="h-2 rounded-full ${progressBarColor}" style="width: ${porcentagem}%;" aria-hidden="true"></div>
              </div>
              <p class="text-xs text-gray-600 leading-5">${nota.descricao || 'Sem descrição'}</p>
            </div>
            <div class="mt-4 flex justify-between gap-3">
              <button
                type="button"
                class="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1 text-xs font-semibold text-[#475569] hover:bg-gray-50"
                onclick='editarNota(${nota.id}, "${selectedAluno.nome}", "${selectedAluno.turma}", "${nota.materia}", "${nota.descricao || ''}", "${nota.data || ''}", ${nota.nota}, "${nota.tipo || 'teorica'}", "${turno}")'
                style="z-index: 10;"
              >
                <i class="far fa-edit"></i> Editar
              </button>
              <button
                type="button"
                class="flex items-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-md px-3 py-1 text-xs font-semibold"
                onclick="excluirNota(${nota.id}, '${selectedAluno.nome}', '${selectedAluno.turma}', '${turno}')"
                style="background-color: #EF4444; color: white !important; z-index: 10;"
              >
                <i class="fas fa-trash-alt" style="color: white;"></i> <span style="color: white;">Excluir</span>
              </button>
            </div>
          </article>
        `;
      });
    }
    notasList.innerHTML = notasHtml;
    notasList.classList.remove('fade-out');
    notasList.classList.add('fade-in');
    const novaNotaBtn = document.querySelector('.nova-nota-btn');
    if (novaNotaBtn) {
      novaNotaBtn.setAttribute('onclick', `openNovaNotaModal('${selectedAluno.nome}', '${selectedAluno.turma}', null, '', '', '', '', 'teorica', '${turno}')`);
      novaNotaBtn.disabled = false;
    }
  } else {
    alunoNotasTitle.textContent = '';
    notasList.innerHTML = `
      <article class="bg-white rounded-md p-4 shadow-sm text-center" style="min-width: 300px; box-sizing: border-box;">
        <p class="text-gray-600">Selecione um aluno para visualizar suas notas.</p>
      </article>
    `;
    const novaNotaBtn = document.querySelector('.nova-nota-btn');
    if (novaNotaBtn) novaNotaBtn.disabled = true;
  }
}

async function renderAlunosListBoletins(turmaNome, selectedAluno = null) {
  const turno = window.turmaTurno;
  if (!turno) {
    const alunosList = document.getElementById('alunos-list-boletins');
    if (alunosList) alunosList.innerHTML = '<li class="text-center text-red-600 py-3">Erro: Turno não especificado. Por favor, selecione um turno.</li>';
    return;
  }
  const alunos = await fetchAlunos(turmaNome, turno);
  const alunosList = document.getElementById('alunos-list-boletins');
  const boletimSection = document.getElementById('boletim-section');
  const boletimList = document.getElementById('boletim-list');
  const alunoBoletimTitle = document.getElementById('aluno-boletim-title');
  const boletimContainer = document.getElementById('boletins-container');
  if (boletimContainer) boletimContainer.classList.remove('hidden');
  if (!alunosList || !boletimSection || !boletimList || !alunoBoletimTitle) {
    console.error('Elementos necessários não encontrados:', { alunosList, boletimSection, boletimList, alunoBoletimTitle });
    return;
  }
  alunosList.classList.add('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));
  let alunosHtml = '';
  if (alunos.length === 0) {
    alunosHtml = `<li class="text-center text-gray-600 py-3">Nenhum aluno encontrado para a turma ${turmaNome} e turno ${turno}. Verifique se há alunos registrados no servidor.</li>`;
  } else {
    alunos.forEach(aluno => {
      const isSelected = selectedAluno && aluno.nome === selectedAluno.nome && aluno.turma === selectedAluno.turma;
      alunosHtml += `
        <li>
          <button
            class="w-full text-left rounded-md px-4 py-3 transition-colors ${isSelected ? 'selected-aluno' : 'text-[#1E293B] hover:bg-gray-100'}"
            style="${isSelected ? 'background-color: #2563EB !important; color: white !important;' : ''}"
            onclick="renderAlunosListBoletins('${turmaNome}', { nome: '${aluno.nome}', turma: '${aluno.turma}' })"
          >
            <p class="font-semibold leading-5">${aluno.nome}</p>
            <p class="${isSelected ? 'text-white' : 'text-[#64748B]'} text-xs leading-4 mt-0.5" style="${isSelected ? 'color: white !important;' : ''}">${aluno.turma} - ${turno}</p>
          </button>
        </li>
      `;
    });
  }
  alunosList.innerHTML = alunosHtml;
  alunosList.classList.remove('fade-out');
  alunosList.classList.add('fade-in');
  if (selectedAluno) {
    alunoBoletimTitle.textContent = `Boletim de ${selectedAluno.nome} - ${selectedAluno.turma}`;
    boletimList.classList.remove('fade-in');
    boletimList.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 300));
    const notas = await getNotas(selectedAluno.nome, selectedAluno.turma, turno);
    const cursoEspecificoData = window.calculateCursoEspecifico ? window.calculateCursoEspecifico(notas) : { mediaTeorica: 0, mediaPratica: 0, mediaFinal: 0 };
    const cursoExtraData = window.calculateCursoExtra ? window.calculateCursoExtra(notas) : { mediasPorTipo: {}, mediaFinal: 0 };
    let boletimHtml = '';
    if (notas.length === 0) {
      boletimHtml = `
        <article class="bg-white rounded-md p-4 shadow-sm text-center" style="min-width: 300px; box-sizing: border-box;">
          <p class="text-gray-600">Este aluno ainda não possui notas registradas.</p>
        </article>
      `;
    } else {
      boletimHtml = window.generateCursoEspecificoHTML ? window.generateCursoEspecificoHTML(cursoEspecificoData, selectedAluno.nome, selectedAluno.turma) : '';
      if (window.generateCursoExtraHTML) {
        const cursoExtraHtml = window.generateCursoExtraHTML(cursoExtraData, selectedAluno.nome, selectedAluno.turma);
        if (cursoExtraHtml) boletimHtml += cursoExtraHtml;
      }
    }
    boletimList.innerHTML = boletimHtml;
    boletimList.classList.remove('fade-out');
    boletimList.classList.add('fade-in');
    const printAllBtn = document.querySelector('.print-all-btn');
    if (printAllBtn) {
      printAllBtn.setAttribute('onclick', `window.printAllBoletins('${selectedAluno.nome}', '${selectedAluno.turma}')`);
      printAllBtn.disabled = notas.length === 0;
    }
  } else {
    alunoBoletimTitle.textContent = '';
    boletimList.innerHTML = `
      <article class="bg-white rounded-md p-4 shadow-sm text-center" style="min-width: 300px; box-sizing: border-box;">
        <p class="text-gray-600">Selecione um aluno para visualizar seu boletim.</p>
      </article>
    `;
    const printAllBtn = document.querySelector('.print-all-btn');
    if (printAllBtn) printAllBtn.disabled = true;
  }
}

function openNovaNotaModal(alunoNome, turma, notaId = null, materia = '', descricao = '', data = '', nota = '', tipo = 'teorica', turno = window.turmaTurno) {
  const modalHtml = `
    <div id="nova-nota-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">${notaId ? 'Editar Nota' : 'Adicionar Nova Nota'} para ${alunoNome}</h3>
        <form id="nova-nota-form">
          <div class="mb-4">
            <label for="atividade" class="block text-sm font-medium text-gray-700">Atividade</label>
            <input type="text" id="atividade" name="materia" value="${materia}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
          </div>
          <div class="mb-4">
            <label for="descricao" class="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea id="descricao" name="descricao" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">${descricao}</textarea>
          </div>
          <div class="mb-4">
            <label for="tipo" class="block text-sm font-medium text-gray-700">Tipo</label>
            <select id="tipo" name="tipo" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
              <option value="">Selecione um tipo</option>
              <option value="pratica" ${tipo === 'pratica' ? 'selected' : ''}>Atividade Prática</option>
              <option value="teorica" ${tipo === 'teorica' ? 'selected' : ''}>Atividade Teórica</option>
              <option value="extra_esporte" ${tipo === 'extra_esporte' ? 'selected' : ''}>Curso Extra - Esporte</option>
              <option value="extra_formacao_humana" ${tipo === 'extra_formacao_humana' ? 'selected' : ''}>Curso Extra - Formação Humana</option>
              <option value="extra_iniciacao_digital" ${tipo === 'extra_iniciacao_digital' ? 'selected' : ''}>Curso Extra - Iniciação Digital</option>
              <option value="extra_mercado_trabalho" ${tipo === 'extra_mercado_trabalho' ? 'selected' : ''}>Curso Extra - Mercado de Trabalho</option>
              <option value="extra_musica" ${tipo === 'extra_musica' ? 'selected' : ''}>Curso Extra - Música</option>
              <option value="extra_qualidade_vida" ${tipo === 'extra_qualidade_vida' ? 'selected' : ''}>Curso Extra - Qualidade de Vida</option>
            </select>
          </div>
          <div class="mb-4">
            <label for="data" class="block text-sm font-medium text-gray-700">Data</label>
            <input type="date" id="data" name="data" value="${data}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
          </div>
          <div class="mb-4">
            <label for="nota" class="block text-sm font-medium text-gray-700">Nota (0 a 10)</label>
            <input type="number" id="nota" name="nota" step="0.1" min="0" max="10" value="${nota}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeNovaNotaModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const form = document.getElementById('nova-nota-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const notaData = {
      materia: formData.get('materia'),
      descricao: formData.get('descricao') || '',
      data: formData.get('data') || null,
      nota: parseFloat(formData.get('nota')),
      tipo: formData.get('tipo')
    };
    let result;
    if (notaId) {
      result = await atualizarNota(notaId, alunoNome, turma, turno, notaData);
    } else {
      result = await criarNota(alunoNome, turma, turno, notaData);
    }
    if (result) {
      closeNovaNotaModal();
      const notasContainer = document.getElementById('notas-container');
      if (notasContainer) {
        notasContainer.classList.add('fade-out');
        await new Promise(resolve => setTimeout(resolve, 300));
        await renderAlunosList(turma, { nome: alunoNome, turma: turma });
        notasContainer.classList.remove('fade-out');
        notasContainer.classList.add('fade-in');
      }
    }
  });
}

function closeNovaNotaModal() {
  const modal = document.getElementById('nova-nota-modal');
  if (modal) modal.remove();
}

function editarNota(notaId, alunoNome, turma, materia, descricao, data, nota, tipo, turno) {
  openNovaNotaModal(alunoNome, turma, notaId, materia, descricao, data, nota, tipo, turno);
}

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      console.log(`Script ${src} já está carregado`);
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src.startsWith('http') || src.startsWith('/') ? src : `/static/${src}`;
    script.async = true;
    script.setAttribute('data-dynamic', 'true');
    script.onload = () => {
      console.log(`Script ${src} carregado e executado com sucesso`);
      resolve();
    };
    script.onerror = (e) => {
      console.error(`Erro ao carregar o script ${src}:`, e);
      reject(new Error(`Falha ao carregar ${src}: ${e.message || 'Sem detalhes'}`));
    };
    document.head.appendChild(script);
  });
}

async function loadAdvertenciasDependencies() {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    console.log('html2pdf.js carregado com sucesso');
  } catch (error) {
    console.error('Erro ao carregar dependências para a seção de advertências:', error);
    alert('Erro ao carregar dependências para a seção de advertências. Tente novamente mais tarde.');
    throw error;
  }
}

function getSelectedAluno() {
  const selectedBtn = document.querySelector('.selected-aluno');
  if (selectedBtn) {
    const nome = selectedBtn.querySelector('p.font-semibold')?.textContent;
    return nome ? { nome: nome, turma: window.turmaNome, turno: window.turmaTurno } : null;
  }
  return null;
}

async function switchTab(tab, alunoNome = null, turmaNomeCard = null, turno = window.turmaTurno) {
  console.log('Iniciando switchTab para aba:', tab);
  console.log('Estado inicial - window.turmaNome:', window.turmaNome, 'window.turmaTurno:', window.turmaTurno);

  const contentArea = document.getElementById('content-area');
  const notasContainer = document.getElementById('notas-container');
  const notificacoesContainer = document.getElementById('notificacoes-container') || document.getElementById('advertencias-container');
  const advertenciasFaltasContainer = document.getElementById('advertencias-faltas-container');
  const fichasIndividuaisContainer = document.getElementById('fichas-individuais-container');
  const boletimContainer = document.getElementById('boletins-container');
  const chamadaContainer = document.getElementById('chamada-container');

  // Limpar e esconder todos os containers, resetando transições
  [contentArea, notasContainer, notificacoesContainer, advertenciasFaltasContainer, fichasIndividuaisContainer, boletimContainer, chamadaContainer].forEach(container => {
    if (container) {
      container.classList.remove('fade', 'fade-in', 'fade-out');
      container.style.opacity = '1';
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  });

  const existingScripts = document.querySelectorAll('script[data-dynamic]');
  existingScripts.forEach(script => script.remove());

  const options = document.querySelectorAll('nav button');
  options.forEach(option => {
    option.classList.remove('bg-white', 'text-blue-700', 'font-semibold');
    option.classList.add('text-gray-900');
    option.setAttribute('aria-selected', 'false');
    option.setAttribute('tabindex', '-1');
  });

  const activeTab = document.querySelector(`button[onclick="switchTab('${tab}')"]`);
  if (activeTab) {
    activeTab.classList.add('bg-white', 'text-blue-700', 'font-semibold');
    activeTab.setAttribute('aria-selected', 'true');
    activeTab.setAttribute('tabindex', '0');
  }

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('tab', tab);
  if (alunoNome && turmaNomeCard) {
    urlParams.set('aluno', alunoNome);
    urlParams.set('turmaCard', turmaNomeCard);
  } else {
    urlParams.delete('aluno');
    urlParams.delete('turmaCard');
  }
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.pushState({ tab, alunoNome, turmaNomeCard }, '', newUrl);

  let turmaNome = window.turmaNome || turmaNomeCard;
  if (!turmaNome || turmaNome === "None") {
    console.error('Turma não especificada. Redirecionando para a seleção de turmas.');
    alert('Erro: Nenhuma turma especificada. Você será redirecionado para a seleção de turmas.');
    window.location.href = '/professor.html';
    return;
  }

  console.log('SwitchTab - turmaNome:', turmaNome, 'turmaNomeCard:', turmaNomeCard, 'turno:', turno, 'window.turmaNome:', window.turmaNome);

  if (!turno) {
    console.error('Erro: Turno não está definido. Redirecionando para a seleção de turmas.');
    const errorMessage = '<p class="text-center text-red-600">Erro: Turno não especificado. Por favor, selecione um turno.</p>';
    if (tab === 'alunos' && contentArea) contentArea.innerHTML = errorMessage;
    else if (tab === 'notas' && notasContainer) notasContainer.innerHTML = errorMessage;
    else if (tab === 'advertencias' && advertenciasContainer) advertenciasContainer.innerHTML = errorMessage;
    else if (tab === 'boletim' && boletimContainer) boletimContainer.innerHTML = errorMessage;
    else if (tab === 'chamada' && chamadaContainer) chamadaContainer.innerHTML = errorMessage;
    console.log('Finalizando switchTab para aba:', tab);
    return;
  }

  let htmlUrl = '';
  let selectedAluno = null;

  switch (tab) {
    case 'alunos':
      htmlUrl = '/alunos-html';
      break;
    case 'notas':
      htmlUrl = '/notas-html';
      selectedAluno = getSelectedAluno();
      break;
    case 'notificacoes':
    case 'advertencias':
      htmlUrl = '/advertencias-html';
      selectedAluno = alunoNome && turmaNomeCard ? { nome: alunoNome, turma: turmaNomeCard, turno: turno } : null;
      break;
    case 'advertencias_faltas':
      htmlUrl = '/advertencias-faltas-html';
      selectedAluno = alunoNome && turmaNomeCard ? { nome: alunoNome, turma: turmaNomeCard, turno: turno } : null;
      break;
    case 'fichas_individuais':
      htmlUrl = '/fichas-individuais-html';
      selectedAluno = alunoNome && turmaNomeCard ? { nome: alunoNome, turma: turmaNomeCard, turno: turno } : null;
      break;
    case 'boletim':
      htmlUrl = '/boletim-html';
      selectedAluno = getSelectedAluno();
      break;
    case 'chamada':
      htmlUrl = '/chamada-html';
      break;
  }

  try {
    if (htmlUrl) {
      const { turma, turno: turnoNormalized } = getSafeTurmaTurno();
      // Sempre incluir turma e turno na requisição, mesmo que aluno não esteja definido
      const urlParams = new URLSearchParams({
        turma: turma,
        turno: turnoNormalized
      });
      if (selectedAluno && selectedAluno.nome) {
        urlParams.set('aluno', selectedAluno.nome);
      }
      const fullUrl = `${htmlUrl}?${urlParams.toString()}&t=${Date.now()}`;
      console.log(`Requisição para: ${fullUrl}`);

      if (tab === 'alunos') {
        if (!contentArea) {
          console.error('Container #content-area não encontrado para aba "alunos".');
          return;
        }
        contentArea.classList.remove('hidden');
        contentArea.style.opacity = '1';
        await renderAlunos(turmaNome, 'content-area');
        contentArea.classList.add('fade-in');
      } else if (tab === 'notas') {
        if (!notasContainer) {
          console.error('Container #notas-container não encontrado para aba "notas".');
          return;
        }
        notasContainer.classList.remove('hidden');
        notasContainer.style.opacity = '1';
        let html = '';
        try {
          const response = await fetch(fullUrl, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' }
          });
          if (!response.ok) throw new Error(`Erro ao carregar notas.html: ${response.statusText}`);
          html = await response.text();
          console.log('notas.html carregado com sucesso via fetch.');
        } catch (fetchError) {
          console.warn(`Falha ao carregar notas.html via fetch: ${fetchError.message}. Usando HTML embutido como fallback.`);
          html = `
            <section class="flex flex-col lg:flex-row gap-6 p-4">
              <aside class="lg:w-1/4">
                <h2 class="text-lg font-semibold mb-4 text-gray-900">Alunos</h2>
                <ul id="alunos-list" class="space-y-2"></ul>
              </aside>
              <section id="notas-section" class="lg:w-3/4">
                <div class="flex justify-between items-center mb-4">
                  <h2 id="aluno-notas-title" class="text-lg font-semibold text-gray-900"></h2>
                  <div class="flex gap-3">
                    <select id="nota-filter" class="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onchange="applyNotaFilter()">
                      <option value="todos">Todas as Atividades</option>
                      <option value="curso_especifico">Curso Específico</option>
                      <option value="curso_extra">Cursos Extras</option>
                    </select>
                    <button class="nova-nota-btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled>Nova Nota</button>
                  </div>
                </div>
                <div id="notas-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
              </section>
            </section>
          `;
        }
        notasContainer.innerHTML = html;
        const filterSelect = notasContainer.querySelector('#nota-filter');
        if (window.TIPOS_CURSO_EXTRA && window.TIPO_NOME_MAP && filterSelect) {
          const extraTypes = window.TIPOS_CURSO_EXTRA.slice(2);
          extraTypes.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = window.TIPO_NOME_MAP[tipo] || tipo.replace('extra_', 'Curso Extra - ');
            filterSelect.appendChild(option);
          });
        }
        let selectedAlunoForNotas = null;
        if (alunoNome && turmaNomeCard) selectedAlunoForNotas = { nome: alunoNome, turma: turmaNomeCard };
        await renderAlunosList(turmaNome, selectedAlunoForNotas);
        notasContainer.classList.add('fade-in');
      } else if (tab === 'notificacoes' || tab === 'advertencias') {
        const targetContainer = notificacoesContainer;
        if (!targetContainer) {
          console.error('Container #notificacoes-container não encontrado.');
          return;
        }
        targetContainer.classList.remove('hidden');
        targetContainer.style.opacity = '1';
        await loadAdvertenciasDependencies();
        let html = '';
        try {
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao carregar advertencias.html: ${response.status} - ${errorText || response.statusText}`);
          }
          html = await response.text();
        } catch (fetchError) {
          console.warn(`Falha ao carregar advertencias.html via fetch: ${fetchError.message}`);
        }
        targetContainer.innerHTML = html;
        await new Promise(resolve => setTimeout(resolve, 0));
        if (window.renderAlunosListAdvertencias) {
          await window.renderAlunosListAdvertencias({ selectedAluno: selectedAluno, turmaNome: turmaNome, turno: turno });
          targetContainer.classList.add('fade-in');
        }
      } else if (tab === 'advertencias_faltas') {
        const targetContainer = advertenciasFaltasContainer;
        if (!targetContainer) {
          console.error('Container #advertencias-faltas-container não encontrado.');
          return;
        }
        targetContainer.classList.remove('hidden');
        targetContainer.style.opacity = '1';
        let html = '';
        try {
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          if (!response.ok) throw new Error(`Erro ao carregar advertencias_faltas.html: ${response.statusText}`);
          html = await response.text();
        } catch (fetchError) {
          console.warn(`Falha ao carregar advertencias_faltas.html via fetch: ${fetchError.message}`);
        }
        targetContainer.innerHTML = html;
        await new Promise(resolve => setTimeout(resolve, 0));
        if (window.renderAlunosListAdvertenciasFaltas) {
          await window.renderAlunosListAdvertenciasFaltas({ selectedAluno: selectedAluno, turmaNome: turmaNome, turno: turno });
          targetContainer.classList.add('fade-in');
        }
      } else if (tab === 'fichas_individuais') {
        const targetContainer = fichasIndividuaisContainer;
        if (!targetContainer) {
          console.error('Container #fichas-individuais-container não encontrado.');
          return;
        }
        targetContainer.classList.remove('hidden');
        targetContainer.style.opacity = '1';
        let html = '';
        try {
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          if (!response.ok) throw new Error(`Erro ao carregar fichas_individuais.html: ${response.statusText}`);
          html = await response.text();
        } catch (fetchError) {
          console.warn(`Falha ao carregar fichas_individuais.html via fetch: ${fetchError.message}`);
        }
        targetContainer.innerHTML = html;
        await new Promise(resolve => setTimeout(resolve, 0));
        if (window.renderAlunosListFichasIndividuais) {
          await window.renderAlunosListFichasIndividuais({ selectedAluno: selectedAluno, turmaNome: turmaNome, turno: turno });
          targetContainer.classList.add('fade-in');
        }
      } else if (tab === 'boletim') {
        if (!boletimContainer) {
          console.error('Container #boletins-container não encontrado para aba "boletim".');
          return;
        }
        boletimContainer.classList.remove('hidden');
        boletimContainer.style.opacity = '1';
        await loadScript('/static/js/boletim.js');
        let html = '';
        try {
          const response = await fetch(fullUrl, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' }
          });
          if (!response.ok) throw new Error(`Erro ao carregar boletim.html: ${response.statusText}`);
          html = await response.text();
          console.log('boletim.html carregado com sucesso via fetch.');
        } catch (fetchError) {
          console.warn(`Falha ao carregar boletim.html via fetch: ${fetchError.message}. Usando HTML embutido como fallback.`);
          html = `
            <section class="flex flex-col lg:flex-row gap-6 p-4">
              <aside class="lg:w-1/4">
                <h2 class="text-lg font-semibold mb-4 text-gray-900">Alunos</h2>
                <ul id="alunos-list-boletins" class="space-y-2"></ul>
              </aside>
              <section id="boletim-section" class="lg:w-3/4">
                <div class="flex justify-between items-center mb-4">
                  <h2 id="aluno-boletim-title" class="text-lg font-semibold text-gray-900"></h2>
                  <button class="print-all-btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled>Imprimir Boletim</button>
                </div>
                <div id="boletim-list" class="space-y-4"></div>
              </section>
            </section>
          `;
        }
        boletimContainer.innerHTML = html;
        let selectedAlunoForBoletim = null;
        if (alunoNome && turmaNomeCard) selectedAlunoForBoletim = { nome: alunoNome, turma: turmaNomeCard };
        await renderAlunosListBoletins(turmaNome, selectedAlunoForBoletim);
        boletimContainer.classList.add('fade-in');
      } else if (tab === 'chamada') {
        if (!chamadaContainer) {
          console.error('Container #chamada-container não encontrado para aba "chamada".');
          return;
        }
        chamadaContainer.classList.remove('hidden');
        chamadaContainer.style.display = 'block';
        chamadaContainer.style.visibility = 'visible';
        chamadaContainer.style.opacity = '1';

        let html = `
          <div id="chamada-container">
            <main class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section
                aria-label="Calendário"
                class="bg-white rounded-lg p-6 shadow-sm max-w-md w-full lg:col-span-4"
              >
                <h2 class="font-extrabold text-lg mb-1 text-[#1E1E2D]">Calendário</h2>
                <p class="text-sm text-[#6B7280] mb-4">
                  Selecione uma data para gerenciar a presença
                </p>
                <div
                  id="calendar-container"
                  class="border border-[#E5E7EB] rounded-md p-4 select-none"
                  aria-label="Calendário do mês maio 2025"
                >
                </div>
              </section>
              <section
                aria-label="Chamada"
                class="bg-white rounded-lg p-6 shadow-sm w-full lg:col-span-8 flex flex-col"
              >
                <div class="flex justify-between items-center mb-4">
                  <h2 class="font-extrabold text-lg text-[#1E1E2D] flex items-center gap-2">
                    <i class="fas fa-list-ul text-base"></i> Chamada
                  </h2>
                  <button
                    type="button"
                    class="bg-[#1E90FF] text-white font-semibold py-2 px-4 rounded-md hover:bg-[#1E70FF]"
                    onclick="window.printChamada()"
                  >
                    <i class="fas fa-print"></i> Imprimir
                  </button>
                </div>
                <p id="chamada-date" class="text-sm text-[#6B7280] mb-4"></p>
                <div id="chamada-table" class="overflow-x-auto rounded-md border border-[#E5E7EB]"></div>
                <p id="chamada-footer" class="text-xs text-[#6B7280] mt-2 text-center"></p>
                <div class="mt-4 flex justify-center">
                  <button
                    class="bg-[#1E90FF] text-white font-semibold py-2 px-4 rounded-md hover:bg-[#1E70FF]"
                    onclick="switchTab('advertencias')"
                  >
                    Ir para Advertências
                  </button>
                </div>
              </section>
            </main>
            <section
              aria-label="Resumo de presença"
              class="grid grid-cols-3 gap-6 mt-6"
            >
              <article
                id="presentes-card"
                class="bg-white rounded-lg p-4 shadow-sm flex flex-col justify-between"
                aria-label="Alunos Presentes"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="text-xs text-[#6B7280]">Alunos Presentes</p>
                    <p id="presentes-count" class="font-extrabold text-2xl text-[#1E1E2D] leading-none">0</p>
                    <p id="presentes-total" class="text-xs text-[#6B7280]"></p>
                  </div>
                  <i class="fas fa-user-check text-green-600 text-xl mt-1"></i>
                </div>
              </article>
              <article
                id="ausentes-card"
                class="bg-white rounded-lg p-4 shadow-sm flex flex-col justify-between"
                aria-label="Alunos Ausentes"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="text-xs text-[#6B7280]">Alunos Ausentes</p>
                    <p id="ausentes-count" class="font-extrabold text-2xl text-[#1E1E2D] leading-none">0</p>
                    <p id="ausentes-total" class="text-xs text-[#6B7280]"></p>
                  </div>
                  <i class="fas fa-user-times text-red-600 text-xl mt-1"></i>
                </div>
              </article>
              <article
                id="taxa-card"
                class="bg-white rounded-lg p-4 shadow-sm flex flex-col justify-between"
                aria-label="Taxa de Presença"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="text-xs text-[#6B7280]">Taxa de Presença</p>
                    <p id="taxa-value" class="font-extrabold text-2xl text-[#1E1E2D] leading-none">0%</p>
                    <p id="taxa-date" class="text-xs text-[#6B7280]"></p>
                  </div>
                  <i class="fas fa-calendar-alt text-[#2B49E1] text-xl mt-1"></i>
                </div>
              </article>
            </section>
          </div>
        `;
        chamadaContainer.innerHTML = html;

        await loadScript('/static/js/chamada.js');
        if (window.renderChamada) {
          await window.renderChamada(turmaNome, turno);
          chamadaContainer.classList.add('fade-in');
        } else {
          console.error('Função renderChamada não encontrada. Verifique se chamada.js foi carregado corretamente.');
          chamadaContainer.innerHTML = '<p class="text-center text-red-600">Erro: Não foi possível carregar a funcionalidade de chamada.</p>';
        }
      }
    }
  } catch (error) {
    console.error(`Erro ao carregar conteúdo da aba ${tab}:`, error);
    const errorMessage = `<p class="text-center text-gray-500">Erro ao carregar a seção de ${tab}. Verifique se o servidor está funcionando corretamente.</p>`;
    if (tab === 'alunos' && contentArea) contentArea.innerHTML = errorMessage;
    else if (tab === 'notas' && notasContainer) notasContainer.innerHTML = errorMessage;
    else if (tab === 'advertencias' && advertenciasContainer) advertenciasContainer.innerHTML = errorMessage;
    else if (tab === 'boletim' && boletimContainer) boletimContainer.innerHTML = errorMessage;
    else if (tab === 'chamada' && chamadaContainer) chamadaContainer.innerHTML = errorMessage;
  }

  if (tab !== 'chamada' && window.clearChamadaState) {
    console.log('Antes de chamar clearChamadaState - window.turmaNome:', window.turmaNome);
    window.clearChamadaState();
    console.log('Depois de chamar clearChamadaState - window.turmaNome:', window.turmaNome);
  }

  console.log('Finalizando switchTab para aba:', tab);
}

function applyNotaFilter() {
  const turmaNome = window.turmaNome;
  const selectedAluno = document.querySelector('#alunos-list .selected-aluno')?.parentElement?.querySelector('p')?.textContent
    ? { nome: document.querySelector('#alunos-list .selected-aluno')?.parentElement?.querySelector('p')?.textContent, turma: turmaNome }
    : null;
  if (selectedAluno) renderAlunosList(turmaNome, selectedAluno);
}

window.addEventListener('popstate', (event) => {
  const state = event.state || {};
  const tab = state.tab || new URLSearchParams(window.location.search).get('tab') || 'alunos';
  const alunoNome = state.alunoNome || new URLSearchParams(window.location.search).get('aluno');
  const turmaNomeCard = state.turmaNomeCard || new URLSearchParams(window.location.search).get('turmaCard');
  switchTab(tab, alunoNome, turmaNomeCard);
});

function setAlunoStatusFilter(status) {
  currentAlunoStatusFilter = status;
  renderAlunos(window.turmaNome);
}

function abrirModalAdicionarAluno() {
  const modal = document.getElementById('modal-adicionar-aluno');
  if (modal) modal.classList.remove('hidden');
}

function fecharModalAdicionarAluno() {
  const modal = document.getElementById('modal-adicionar-aluno');
  if (modal) modal.classList.add('hidden');
}

async function salvarNovoAluno(e) {
  e.preventDefault();
  const nome = document.getElementById('novo-aluno-nome').value.trim();
  const matricula = document.getElementById('novo-aluno-matricula').value.trim();
  const telefone = document.getElementById('novo-aluno-telefone').value.trim();
  const email = document.getElementById('novo-aluno-email').value.trim();
  const turno = window.turmaTurno;
  const turmaNome = window.turmaNome;

  try {
    const res = await fetch('/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        matricula: matricula || null,
        celular: telefone || null,
        email: email || null,
        turma: turmaNome,
        turno: turno,
        status_matricula: 'ativo'
      })
    });

    if (res.ok) {
      fecharModalAdicionarAluno();
      document.getElementById('form-adicionar-aluno').reset();
      await renderAlunos(turmaNome);
    } else {
      const err = await res.json();
      alert(`Erro ao adicionar aluno: ${err.error}`);
    }
  } catch (err) {
    alert(`Erro de conexão: ${err.message}`);
  }
}

async function alterarStatusAluno(alunoId, alunoNome, novoStatus) {
  const descricoes = {
    'ativo': 'reativar a matrícula deste aluno',
    'transferido': 'marcar este aluno como TRANSFERIDO (ele sairá da lista de chamada diária, mas todas as notas e registros passados continuarão preservados)',
    'desistente': 'marcar este aluno como DESISTENTE (ele sairá da lista de chamada diária, mas todo o histórico continuará salvo)'
  };

  const confirmMsg = `Deseja realmente ${descricoes[novoStatus] || 'alterar status do aluno'} para "${alunoNome}"?`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/alunos/${alunoId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_matricula: novoStatus })
    });

    if (res.ok) {
      await renderAlunos(window.turmaNome);
    } else {
      const err = await res.json();
      alert(`Erro ao atualizar status: ${err.error}`);
    }
  } catch (err) {
    alert(`Erro: ${err.message}`);
  }
}

async function verificarMetadadosTurma() {
  try {
    const res = await fetch('/turmas?status=todos');
    if (!res.ok) return;
    const turmas = await res.json();
    const t = turmas.find(item => item.nome.trim().toLowerCase() === window.turmaNome.trim().toLowerCase());
    if (!t) return;

    currentTurmaId = t.id;
    const tipoBadge = document.getElementById('turma-tipo-badge');
    const syncBtn = document.getElementById('btn-sync-classroom-turma');
    const vincularBtn = document.getElementById('btn-vincular-classroom-turma');
    const opcoesBtn = document.getElementById('btn-opcoes-classroom-turma');
    const desvincularBtn = document.getElementById('btn-desvincular-turma');

    if (t.classroom_course_id) {
      if (tipoBadge) {
        tipoBadge.className = 'text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200';
        tipoBadge.innerHTML = '<i class="fab fa-google text-emerald-600 mr-1"></i> Classroom (Vinculada)';
        tipoBadge.classList.remove('hidden');
      }
      if (syncBtn) {
        syncBtn.classList.remove('hidden');
        syncBtn.classList.add('flex');
      }
      if (opcoesBtn) opcoesBtn.classList.remove('hidden');
      if (vincularBtn) vincularBtn.classList.add('hidden');
      if (desvincularBtn) desvincularBtn.classList.remove('hidden');
    } else {
      if (tipoBadge) {
        tipoBadge.className = 'text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700 border border-gray-200';
        tipoBadge.textContent = 'Tradicional';
        tipoBadge.classList.remove('hidden');
      }
      if (vincularBtn) {
        vincularBtn.classList.remove('hidden');
        vincularBtn.classList.add('flex');
      }
      if (syncBtn) syncBtn.classList.add('hidden');
      if (opcoesBtn) opcoesBtn.classList.add('hidden');
      if (desvincularBtn) desvincularBtn.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Erro ao verificar metadados da turma:', err);
  }
}

// Modal e Vinculação de Sala do Classroom pelo Professor
async function abrirModalVincularClassroom() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramTurmaId = urlParams.get('turma_id');
  if (!currentTurmaId && paramTurmaId) {
    currentTurmaId = parseInt(paramTurmaId, 10);
  }

  if (!currentTurmaId) {
    alert('Identificador da turma não localizado.');
    return;
  }

  // Abre o modal imediatamente exibindo estado de carregamento
  const modal = document.getElementById('modal-vincular-classroom');
  if (modal) modal.classList.remove('hidden');

  const listaEl = document.getElementById('lista-salas-vincular');
  if (listaEl) {
    listaEl.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center"><i class="fas fa-spinner fa-spin mr-1"></i> Verificando conexão com o Google...</p>';
  }

  // Verifica se o professor está autenticado no Google
  let statusData = { connected: false };
  try {
    const statusRes = await fetch(`/classroom/status?turma_id=${currentTurmaId}`);
    if (statusRes.ok) {
      statusData = await statusRes.json();
    }
  } catch (e) {
    console.warn('Erro ao verificar status classroom:', e);
  }

  if (!statusData.connected) {
    if (modal) modal.classList.add('hidden');
    if (confirm('Para vincular esta turma oficial à sua sala do Google Classroom, conecte sua conta Google. Deseja prosseguir para o login?')) {
      const returnUrl = encodeURIComponent(window.location.pathname + '?action=vincular&turma_id=' + currentTurmaId);
      window.location.href = `/classroom/auth?turma_id=${currentTurmaId}&return_to=${returnUrl}`;
    }
    return;
  }

  carregarSalasDoProfessor();
}

function fecharModalVincularClassroom() {
  const modal = document.getElementById('modal-vincular-classroom');
  if (modal) modal.classList.add('hidden');
}

async function carregarSalasDoProfessor() {
  const listaEl = document.getElementById('lista-salas-vincular');
  listaEl.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center"><i class="fas fa-spinner fa-spin mr-1"></i> Carregando suas salas do Google Classroom...</p>';

  try {
    const res = await fetch(`/classroom/courses?turma_id=${currentTurmaId}`);
    if (!res.ok) {
      const err = await res.json();
      listaEl.innerHTML = `<p class="text-xs text-red-500 py-3 text-center">${err.error || 'Não foi possível carregar turmas'}</p>`;
      return;
    }

    const courses = await res.json();
    if (!courses || courses.length === 0) {
      listaEl.innerHTML = '<p class="text-xs text-gray-500 py-4 text-center">Nenhuma turma encontrada na sua conta Google Classroom.</p>';
      return;
    }

    let html = '';
    courses.forEach(c => {
      html += `
        <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition">
          <div class="pr-2">
            <h5 class="text-xs font-bold text-gray-900">${c.nome}</h5>
            <p class="text-[11px] text-gray-500">${c.secao || 'Sem seção'} • ID: ${c.id}</p>
          </div>
          <button onclick="vincularCursoTurma('${c.id}', this)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition">
            <i class="fas fa-link"></i> Vincular a esta Turma
          </button>
        </div>
      `;
    });
    listaEl.innerHTML = html;
  } catch (err) {
    listaEl.innerHTML = `<p class="text-xs text-red-500 py-3 text-center">Erro: ${err.message}</p>`;
  }
}

async function vincularCursoTurma(courseId, btn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Vinculando...';

  try {
    const res = await fetch('/classroom/link_course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turma_id: currentTurmaId,
        course_id: courseId
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.message || 'Turma vinculada e sincronizada com sucesso!'}`);
      fecharModalVincularClassroom();
      await verificarMetadadosTurma();
      await renderAlunos(window.turmaNome);
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (e) {
    alert(`Erro ao vincular: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

async function desvincularTurma() {
  if (!confirm('Deseja realmente desvincular o Google Classroom desta turma? Todas as notas, presenças e histórico continuarão salvos no CDiario.')) {
    return;
  }

  try {
    const res = await fetch(`/classroom/unlink_course/${currentTurmaId}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Turma desvinculada.');
      fecharModalVincularClassroom();
      await verificarMetadadosTurma();
      await renderAlunos(window.turmaNome);
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (e) {
    alert(`Erro: ${e.message}`);
  }
}

async function sincronizarEstaTurma(btn) {
  if (!currentTurmaId) {
    alert('Identificador da turma não localizado.');
    return;
  }
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Sincronizando...';

  try {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    const res = await fetch(`/classroom/sync/${currentTurmaId}?return_to=${returnUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.requires_auth) {
      if (confirm('Para sincronizar os dados desta turma com o Classroom, é necessário conectar sua conta Google uma única vez. Deseja prosseguir?')) {
        window.location.href = data.auth_url;
      } else {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
      return;
    }

    if (data.success) {
      alert(`✅ ${data.message}`);
      await renderAlunos(window.turmaNome);
    } else {
      alert(`Aviso: ${data.error || 'Não foi possível sincronizar'}`);
    }
  } catch (e) {
    alert(`Erro na sincronização: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab') || 'alunos';
  const alunoNome = urlParams.get('aluno');
  const turmaNomeCard = urlParams.get('turmaCard');

  const pathSegments = window.location.pathname.split('/');
  const turmaNomeFromPath = pathSegments.length > 2 ? decodeURIComponent(pathSegments[2]) : null;
  const turnoFromPath = pathSegments.length > 3 ? decodeURIComponent(pathSegments[3]) : null;

  window.turmaNome = turmaNomeFromPath || urlParams.get('turma');
  window.turmaTurno = turnoFromPath || urlParams.get('turno');

  if (!window.turmaNome || window.turmaNome === "None") {
    console.error('Turma não especificada na URL. Redirecionando para a seleção de turmas.');
    alert('Erro: Nenhuma turma especificada. Você será redirecionado para a seleção de turmas.');
    window.location.href = '/professor.html';
    return;
  }

  console.log('Valores definidos no DOMContentLoaded - window.turmaNome:', window.turmaNome, 'window.turmaTurno:', window.turmaTurno);
  
  if (urlParams.get('action') === 'vincular') {
    if (urlParams.get('turma_id')) {
      currentTurmaId = parseInt(urlParams.get('turma_id'), 10);
    }
    abrirModalVincularClassroom();
  }

  verificarMetadadosTurma().then(() => {
    if (urlParams.get('action') === 'vincular' && !document.getElementById('modal-vincular-classroom').classList.contains('hidden')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
  switchTab(tab, alunoNome, turmaNomeCard);
});