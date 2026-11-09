let currentStatusFilter = 'ativa';
let classroomData = { connected: false, email: '' };

// Checa status do Google Classroom ao carregar
async function checkClassroomStatus() {
  try {
    const res = await fetch('/classroom/status');
    if (res.ok) {
      classroomData = await res.json();
      updateClassroomUI();
    }
  } catch (err) {
    console.warn('Erro ao checar status do Classroom:', err);
  }
}

function updateClassroomUI() {
  const badge = document.getElementById('classroom-badge');
  const badgeText = document.getElementById('classroom-badge-text');
  if (!badge || !badgeText) return;

  badge.classList.remove('hidden');
  if (classroomData.connected) {
    badge.className = 'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-emerald-50 border-emerald-200 text-emerald-700';
    badgeText.innerHTML = `<i class="fab fa-google text-emerald-600"></i> Classroom: <strong>${classroomData.email || 'Conectado'}</strong>`;
  } else {
    badge.className = 'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-100';
    badgeText.innerHTML = `<i class="fab fa-google text-gray-400"></i> Conectar Classroom`;
    badge.onclick = () => openModalClassroom();
  }
}

// Manipulação de Filtros e Busca de Turmas
async function getTurmas(turnoFilter = '', statusFilter = currentStatusFilter, semestreFilter = '') {
  try {
    let url = `/turmas?status=${encodeURIComponent(statusFilter)}`;
    if (turnoFilter) url += `&turno=${encodeURIComponent(turnoFilter)}`;
    if (semestreFilter) url += `&ano_semestre=${encodeURIComponent(semestreFilter)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro ao buscar turmas: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar turmas:', error);
    return [];
  }
}

async function renderTurmas() {
  const turmasList = document.getElementById('turmas-list');
  const turno = document.getElementById('turno-select').value;
  const semestre = document.getElementById('semestre-select').value;

  turmasList.innerHTML = `
    <div class="col-span-full py-12 text-center text-gray-400">
      <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
      <p class="text-sm">Carregando turmas...</p>
    </div>
  `;

  const turmas = await getTurmas(turno, currentStatusFilter, semestre);

  if (!turmas || turmas.length === 0) {
    turmasList.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-lg">
          <i class="fas fa-folder-open"></i>
        </div>
        <h4 class="text-base font-bold text-gray-800">Nenhuma turma encontrada</h4>
        <p class="text-sm text-gray-500 mt-1 mb-4">Não há turmas cadastradas para os filtros selecionados.</p>
        <button onclick="openModalNovaTurma()" class="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <i class="fas fa-plus"></i> Criar Nova Turma
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  turmas.forEach(t => {
    const isClassroom = t.tipo_turma === 'classroom' || !!t.classroom_course_id;
    const isArquivada = t.status === 'arquivada';
    const turnosTxt = t.turnos && t.turnos.length ? t.turnos.join(', ') : 'Não informado';
    const primeiroTurno = t.turnos && t.turnos.length ? t.turnos[0] : 'Manhã';

    html += `
      <article class="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1.5 ${isClassroom ? 'bg-emerald-500' : 'bg-blue-600'}"></div>
        
        <div>
          <!-- Tags de cabeçalho do card -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isClassroom ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
              <i class="${isClassroom ? 'fab fa-google' : 'fas fa-book'} text-[10px]"></i>
              ${isClassroom ? 'Google Classroom' : 'Tradicional'}
            </span>
            <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              ${t.ano_semestre || '2026.1'}
            </span>
          </div>

          <h3 class="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition leading-snug mb-1">
            ${t.nome}
          </h3>
          <p class="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
            <i class="far fa-clock text-gray-400"></i> Turnos: <strong class="text-gray-700">${turnosTxt}</strong>
          </p>
        </div>

        <div class="pt-4 border-t border-gray-100 flex flex-col gap-2">
          <!-- Botão principal de visualização -->
          <button onclick="selectTurma('${t.nome}', '${primeiroTurno}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition">
            <i class="fas fa-arrow-right text-xs"></i> Acessar Diário
          </button>

          <!-- Ações secundárias -->
          <div class="grid grid-cols-2 gap-2 mt-1">
            ${isClassroom ? `
              <button onclick="sincronizarTurma(${t.id}, this)" title="Sincronizar alunos e notas do Classroom" class="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition">
                <i class="fas fa-sync-alt text-[10px]"></i> Sincronizar
              </button>
            ` : `
              <button onclick="openModalDuplicar(${t.id}, '${t.nome}')" title="Duplicar para o próximo semestre" class="text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition">
                <i class="fas fa-copy text-[10px]"></i> Duplicar
              </button>
            `}
            
            <button onclick="toggleStatusTurma(${t.id}, '${isArquivada ? 'ativa' : 'arquivada'}')" class="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition">
              <i class="fas ${isArquivada ? 'fa-folder-open' : 'fa-archive'} text-[10px]"></i>
              ${isArquivada ? 'Reativar' : 'Arquivar'}
            </button>
          </div>
        </div>
      </article>
    `;
  });

  turmasList.innerHTML = html;
}

function selectTurma(turmaNome, turnoPadrao) {
  const turnoFiltro = document.getElementById('turno-select').value;
  const turno = turnoFiltro || turnoPadrao || 'Manhã';
  window.location.href = `/turma/${encodeURIComponent(turmaNome)}/${encodeURIComponent(turno)}`;
}

function filterTurmas() {
  renderTurmas();
}

function setStatusFilter(status) {
  currentStatusFilter = status;
  const tabAtivas = document.getElementById('tab-ativas');
  const tabArquivadas = document.getElementById('tab-arquivadas');

  if (status === 'ativa') {
    tabAtivas.className = 'px-4 py-1.5 rounded-md bg-white text-blue-600 shadow-sm transition';
    tabArquivadas.className = 'px-4 py-1.5 rounded-md text-gray-600 hover:text-gray-900 transition';
  } else {
    tabArquivadas.className = 'px-4 py-1.5 rounded-md bg-white text-blue-600 shadow-sm transition';
    tabAtivas.className = 'px-4 py-1.5 rounded-md text-gray-600 hover:text-gray-900 transition';
  }

  renderTurmas();
}

// Arquivar ou Reativar Turma
async function toggleStatusTurma(turmaId, novoStatus) {
  const acao = novoStatus === 'arquivada' ? 'arquivar' : 'reativar';
  if (!confirm(`Deseja realmente ${acao} esta turma? ${novoStatus === 'arquivada' ? 'Ela deixará de aparecer na lista ativa do dia a dia.' : ''}`)) {
    return;
  }

  try {
    const res = await fetch(`/turmas/${turmaId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });
    if (res.ok) {
      renderTurmas();
    } else {
      const err = await res.json();
      alert(`Erro: ${err.error || 'Não foi possível atualizar status'}`);
    }
  } catch (e) {
    alert(`Erro de conexão: ${e.message}`);
  }
}

// Sincronizar Classroom
async function sincronizarTurma(turmaId, btnElement) {
  const originalHtml = btnElement.innerHTML;
  btnElement.disabled = true;
  btnElement.innerHTML = `<i class="fas fa-spinner fa-spin text-[10px]"></i> Sincronizando...`;

  try {
    // 1. Roster
    const rRoster = await fetch(`/classroom/sync_roster/${turmaId}`, { method: 'POST' });
    const dRoster = await rRoster.json();

    // 2. Grades
    const rGrades = await fetch(`/classroom/sync_grades/${turmaId}`, { method: 'POST' });
    const dGrades = await rGrades.json();

    alert(`Sincronização concluída!\n• ${dRoster.message || 'Alunos sincronizados'}\n• ${dGrades.message || 'Notas sincronizadas'}`);
  } catch (e) {
    alert(`Falha na sincronização: ${e.message}`);
  } finally {
    btnElement.disabled = false;
    btnElement.innerHTML = originalHtml;
  }
}

// Modal Nova Turma Manual
function openModalNovaTurma() {
  document.getElementById('modal-nova-turma').classList.remove('hidden');
}
function closeModalNovaTurma() {
  document.getElementById('modal-nova-turma').classList.add('hidden');
}

async function salvarNovaTurma(e) {
  e.preventDefault();
  const nome = document.getElementById('nova-turma-nome').value.trim();
  const semestre = document.getElementById('nova-turma-semestre').value.trim();
  const turno = document.getElementById('nova-turma-turno').value;

  try {
    const res = await fetch('/turmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        turnos: [turno],
        ano_semestre: semestre,
        tipo_turma: 'tradicional'
      })
    });

    if (res.ok) {
      closeModalNovaTurma();
      document.getElementById('form-nova-turma').reset();
      renderTurmas();
    } else {
      const err = await res.json();
      alert(`Erro ao criar turma: ${err.error || 'Nome já existente'}`);
    }
  } catch (err) {
    alert(`Erro ao salvar: ${err.message}`);
  }
}

// Modal Duplicar Turma
function openModalDuplicar(id, nome) {
  document.getElementById('duplicar-turma-id').value = id;
  document.getElementById('duplicar-turma-nome').textContent = nome;
  document.getElementById('modal-duplicar').classList.remove('hidden');
}
function closeModalDuplicar() {
  document.getElementById('modal-duplicar').classList.add('hidden');
}

async function executarDuplicacao(e) {
  e.preventDefault();
  const id = document.getElementById('duplicar-turma-id').value;
  const novoSemestre = document.getElementById('duplicar-semestre').value.trim();
  const copiarAlunos = document.getElementById('duplicar-copiar-alunos').checked;

  try {
    const res = await fetch(`/turmas/${id}/duplicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novo_ano_semestre: novoSemestre,
        copiar_alunos: copiarAlunos
      })
    });

    if (res.ok) {
      const data = await res.json();
      alert(data.message || 'Turma duplicada com sucesso!');
      closeModalDuplicar();
      // Ajusta o filtro para o novo semestre para que a turma nova seja vista de imediato
      document.getElementById('semestre-select').value = novoSemestre;
      renderTurmas();
    } else {
      const err = await res.json();
      alert(`Erro ao duplicar: ${err.error}`);
    }
  } catch (err) {
    alert(`Erro: ${err.message}`);
  }
}

// Modal Classroom
async function openModalClassroom() {
  const modal = document.getElementById('modal-classroom');
  modal.classList.remove('hidden');

  await checkClassroomStatus();

  const secDesc = document.getElementById('classroom-desconectado');
  const secCon = document.getElementById('classroom-conectado');

  if (classroomData.connected) {
    secDesc.classList.add('hidden');
    secCon.classList.remove('hidden');
    document.getElementById('classroom-user-email').textContent = classroomData.email || 'Conta Google';
    carregarCursosClassroom();
  } else {
    secCon.classList.add('hidden');
    secDesc.classList.remove('hidden');
  }
}

function closeModalClassroom() {
  document.getElementById('modal-classroom').classList.add('hidden');
}

async function carregarCursosClassroom() {
  const listEl = document.getElementById('classroom-courses-list');
  listEl.innerHTML = '<p class="text-xs text-gray-400 py-3 text-center"><i class="fas fa-spinner fa-spin mr-1"></i> Carregando suas turmas do Google...</p>';

  try {
    const res = await fetch('/classroom/courses');
    if (!res.ok) throw new Error('Não foi possível obter turmas');
    const courses = await res.json();

    if (!courses || courses.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-500 py-4 text-center">Nenhuma turma encontrada na sua conta Google Classroom.</p>';
      return;
    }

    let html = '';
    courses.forEach(c => {
      html += `
        <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition">
          <div class="pr-3">
            <h5 class="text-sm font-bold text-gray-900">${c.nome}</h5>
            <p class="text-xs text-gray-500">${c.secao || 'Sem seção'} • ID: ${c.id}</p>
          </div>
          <button onclick="importarCursoClassroom('${c.id}', this)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition">
            <i class="fas fa-download"></i> Importar
          </button>
        </div>
      `;
    });
    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = `<p class="text-xs text-red-500 py-3 text-center">Erro ao carregar: ${err.message}</p>`;
  }
}

async function importarCursoClassroom(courseId, btn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importando...`;

  try {
    const res = await fetch('/classroom/import_course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: courseId,
        turnos: ['Manhã'],
        ano_semestre: '2026.1'
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`Sucesso! Turma '${data.turma_nome}' importada com ${data.total_alunos} alunos.`);
      closeModalClassroom();
      renderTurmas();
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (e) {
    alert(`Erro ao importar: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

// Feedback de retorno do OAuth na URL
function checkUrlAlerts() {
  const params = new URLSearchParams(window.location.search);
  const classroomStatus = params.get('classroom');
  const alertBanner = document.getElementById('alert-banner');

  if (classroomStatus === 'success') {
    alertBanner.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
        <span class="flex items-center gap-2"><i class="fas fa-check-circle text-emerald-600"></i> Conta Google Classroom conectada com sucesso!</span>
        <button onclick="this.parentElement.remove()" class="text-emerald-600 font-bold text-base">&times;</button>
      </div>
    `;
    alertBanner.classList.remove('hidden');
  } else if (classroomStatus === 'error') {
    const msg = params.get('msg') || 'Erro desconhecido na autorização.';
    alertBanner.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
        <span class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-red-600"></i> ${msg}</span>
        <button onclick="this.parentElement.remove()" class="text-red-600 font-bold text-base">&times;</button>
      </div>
    `;
    alertBanner.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkUrlAlerts();
  checkClassroomStatus();
  renderTurmas();
});
