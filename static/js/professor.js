let currentStatusFilter = 'ativa';

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
          <i class="fas fa-chalkboard-teacher"></i>
        </div>
        <h4 class="text-base font-bold text-gray-800">Nenhuma turma encontrada</h4>
        <p class="text-sm text-gray-500 mt-1">As turmas e alunos são cadastrados e atribuídos pela Coordenação no Painel de Gestão.</p>
      </div>
    `;
    return;
  }

  let html = '';
  turmas.forEach(t => {
    const isClassroom = t.tipo_turma === 'classroom' || !!t.classroom_course_id;
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
          <!-- Botão principal: Acessar Diário -->
          <button onclick="selectTurma('${t.nome}', '${primeiroTurno}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition">
            <i class="fas fa-clipboard-list text-xs"></i> Acessar Diário de Classe
          </button>

          <!-- Se for Classroom, botão de sincronizar; se for Tradicional, opção de vincular -->
          ${isClassroom ? `
            <button onclick="sincronizarClassroomTurma(${t.id}, this)" class="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition">
              <i class="fab fa-google text-emerald-600"></i>
              <span>Sincronizar com Classroom</span>
            </button>
          ` : `
            <button onclick="vincularTurmaDireto('${t.nome}', '${primeiroTurno}')" class="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition">
              <i class="fab fa-google text-emerald-600"></i>
              <span>Vincular ao Classroom</span>
            </button>
          `}
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

function vincularTurmaDireto(turmaNome, turnoPadrao) {
  const turnoFiltro = document.getElementById('turno-select').value;
  const turno = turnoFiltro || turnoPadrao || 'Manhã';
  window.location.href = `/turma/${encodeURIComponent(turmaNome)}/${encodeURIComponent(turno)}?action=vincular`;
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

// Sincronização Inteligente do Classroom (login sob demanda, persistente)
async function sincronizarClassroomTurma(turmaId, btnElement) {
  const origHtml = btnElement.innerHTML;
  btnElement.disabled = true;
  btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sincronizando...`;

  try {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    const res = await fetch(`/classroom/sync/${turmaId}?return_to=${returnUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.requires_auth) {
      // Se não autenticado ainda, redireciona para autorização com a conta Google
      if (confirm('Para sincronizar os dados desta turma, é necessário conectar com sua conta Google Classroom uma única vez. Deseja prosseguir para o login?')) {
        window.location.href = data.auth_url;
      } else {
        btnElement.disabled = false;
        btnElement.innerHTML = origHtml;
      }
      return;
    }

    if (data.success) {
      alert(`✅ ${data.message}`);
      renderTurmas();
    } else {
      alert(`Aviso: ${data.error || 'Não foi possível sincronizar'}`);
    }
  } catch (err) {
    alert(`Erro na sincronização: ${err.message}`);
  } finally {
    btnElement.disabled = false;
    btnElement.innerHTML = origHtml;
  }
}

// Alertas de retorno do OAuth na URL
function checkUrlAlerts() {
  const params = new URLSearchParams(window.location.search);
  const classroomStatus = params.get('classroom');
  const alertBanner = document.getElementById('alert-banner');

  if (classroomStatus === 'success') {
    alertBanner.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
        <span class="flex items-center gap-2"><i class="fas fa-check-circle text-emerald-600"></i> Conta Google Classroom conectada e turma sincronizada com sucesso!</span>
        <button onclick="this.parentElement.remove()" class="text-emerald-600 font-bold text-base">&times;</button>
      </div>
    `;
    alertBanner.classList.remove('hidden');
    // Remove query param sem recarregar a página
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (classroomStatus === 'error') {
    const msg = params.get('msg') || 'Erro na autorização do Google.';
    alertBanner.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
        <span class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-red-600"></i> ${msg}</span>
        <button onclick="this.parentElement.remove()" class="text-red-600 font-bold text-base">&times;</button>
      </div>
    `;
    alertBanner.classList.remove('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkUrlAlerts();
  renderTurmas();
});
