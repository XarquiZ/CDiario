let allTurmas = [];

async function getTurmas(turnoFilter = '') {
  try {
    const url = turnoFilter ? `/turmas?turno=${encodeURIComponent(turnoFilter)}` : '/turmas';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Erro ao buscar turmas: ${response.statusText}`);
    }
    const turmas = await response.json();
    console.log('Turmas buscadas do backend:', turmas);
    return turmas || [];
  } catch (error) {
    console.error('Erro ao buscar turmas:', error);
    alert('Não foi possível carregar a lista de turmas. Verifique se o servidor está rodando.');
    return [];
  }
}

async function renderTurmas(turnoFilter = '') {
  const turmasList = document.getElementById('turmas-list');
  let html = '';

  if (turnoFilter === '') {
    // Se não houver filtro, buscar todas as turmas e armazenar
    allTurmas = await getTurmas();
  }

  const turmas = turnoFilter ? await getTurmas(turnoFilter) : allTurmas;

  if (turmas.length === 0) {
    html = '<p class="text-center text-gray-500 col-span-full">Nenhuma turma encontrada para o turno selecionado.</p>';
  } else {
    turmas.forEach(turma => {
      html += `
        <article class="turma-card">
          <h3 class="font-extrabold text-lg text-[#0F172A] mb-2 select-none">${turma.nome}</h3>
          <p class="text-sm text-[#64748B] mb-4 select-none">Turnos disponíveis: ${turma.turnos.length > 0 ? turma.turnos.join(', ') : 'Nenhum turno definido'}</p>
          <button class="editar-btn" onclick="selectTurma('${turma.nome}')">
            <i class="fas fa-eye"></i> Visualizar
          </button>
        </article>
      `;
    });
  }

  turmasList.innerHTML = html;
}

function selectTurma(turmaNome) {
  const turno = getSelectedTurno();
  if (!turno) {
    alert('Por favor, selecione um turno para prosseguir.');
    return;
  }
  window.location.href = `/turma/${encodeURIComponent(turmaNome)}/${encodeURIComponent(turno)}`;
}

function getSelectedTurno() {
  const turnoSelect = document.getElementById('turno-select');
  return turnoSelect.value || '';
}

function filterTurmas() {
  const turno = getSelectedTurno();
  renderTurmas(turno);
}

document.addEventListener('DOMContentLoaded', function() {
  renderTurmas();
});