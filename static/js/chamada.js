async function getAlunosChamada(turmaNome, turno) {
  try {
    if (!turno || typeof turno !== 'string') {
      console.error('Turno inválido ou não definido:', turno);
      throw new Error('Turno não especificado. Por favor, selecione um turno válido.');
    }
    const turnoNormalizado = turno.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const response = await fetch(`/alunos?turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turnoNormalizado)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Erro ao buscar alunos: ${response.statusText}`);
    }
    const alunos = await response.json();
    console.log('Alunos buscados do backend:', alunos);
    return alunos.map(aluno => ({ id: aluno.id, nome: aluno.nome })) || [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    alert('Não foi possível carregar a lista de alunos. Verifique se o servidor está rodando ou se o turno foi especificado corretamente.');
    return [];
  }
}

async function getPresencas(turmaNome, turno, date) {
  try {
    const turnoNormalizado = turno.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const dateFormatted = date.toISOString().split('T')[0];
    console.log('Parâmetros enviados para getPresencas:', { turmaNome, turnoNormalizado, dateFormatted });
    const response = await fetch(`/presencas?turma=${encodeURIComponent(turmaNome)}&turno=${encodeURIComponent(turnoNormalizado)}&date=${encodeURIComponent(dateFormatted)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta do servidor para /presencas:', errorText);
      throw new Error(`Erro ao buscar presenças: ${response.statusText} - ${errorText}`);
    }
    const presencas = await response.json();
    console.log('Presenças retornadas do backend (detalhado):', JSON.stringify(presencas, null, 2));
    const mappedPresencas = {};
    for (const [id, data] of Object.entries(presencas)) {
      mappedPresencas[parseInt(id)] = data;
    }
    return mappedPresencas || {};
  } catch (error) {
    console.error('Erro ao buscar presenças:', error);
    return {};
  }
}

async function savePresencas(turmaNome, turno, date, presencas) {
  try {
    const dateFormatted = date.toISOString().split('T')[0];
    const turnoNormalizado = turno.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const payload = {
      turma: turmaNome,
      turno: turnoNormalizado,
      date: dateFormatted,
      presencas: presencas
    };
    console.log('Enviando payload para /presencas:', payload);
    const response = await fetch('/presencas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao salvar presenças, resposta do servidor:', errorText);
      throw new Error(`Erro ao salvar presenças: ${response.statusText} - ${errorText}`);
    }
    const result = await response.json();
    console.log('Presenças salvas com sucesso:', result);
    return result.presencas;
  } catch (error) {
    console.error('Erro ao salvar presenças:', error);
    alert('Não foi possível salvar as presenças. Verifique se o servidor está rodando.');
    throw error;
  }
}

function generateCalendar(year, month, selectedDate) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDay = firstDay.getDay();
  const monthLength = lastDay.getDate();
  const today = new Date();

  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const dayNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

  let html = `
    <header class="flex justify-between items-center mb-3 text-[#6B7280] text-sm font-semibold">
      <button
        aria-label="Mês anterior"
        class="p-1 rounded hover:bg-[#F3F4F6] active:bg-[#E5E7EB]"
        onclick="window.changeMonth(-1)"
      >
        <i class="fas fa-chevron-left"></i>
      </button>
      <div>${monthNames[month]} ${year}</div>
      <button
        aria-label="Próximo mês"
        class="p-1 rounded hover:bg-[#F3F4F6] active:bg-[#E5E7EB]"
        onclick="window.changeMonth(1)"
      >
        <i class="fas fa-chevron-right"></i>
      </button>
    </header>
    <div class="calendar-table-container">
      <table class="w-full max-w-full text-center text-xs text-[#6B7280] font-normal">
        <thead>
          <tr>
            ${dayNames.map(day => `<th class="p-2 font-normal">${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  let day = 1;
  for (let i = 0; i < 6; i++) {
    html += '<tr>';
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < startingDay) {
        html += '<td class="p-2"></td>';
      } else if (day > monthLength) {
        html += '<td class="p-2"></td>';
      } else {
        const currentDate = new Date(year, month, day);
        const isToday = currentDate.toDateString() === today.toDateString();
        const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
        const isPastOrToday = currentDate <= today;
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isPastOrToday) {
          html += `
            <td class="p-2">
              <button
                class="calendar-day ${isSelected ? 'selected' : ''} ${isWeekend ? 'non-school-day' : ''} w-8 h-8 rounded-full text-center inline-block"
                data-year="${year}"
                data-month="${month}"
                data-day="${day}"
                style="line-height: 32px;"
                ${isWeekend ? 'disabled' : ''}
              >
                ${day}
              </button>
            </td>
          `;
        } else {
          html += `<td class="p-2 text-[#D1D5DB]">${day}</td>`;
        }
        day++;
      }
    }
    html += '</tr>';
    if (day > monthLength) break;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  setTimeout(() => {
    document.querySelectorAll('.calendar-day').forEach(button => {
      button.classList.remove('selected');
      const year = parseInt(button.getAttribute('data-year'));
      const month = parseInt(button.getAttribute('data-month'));
      const day = parseInt(button.getAttribute('data-day'));
      const currentDate = new Date(year, month, day);
      if (selectedDate && currentDate.toDateString() === selectedDate.toDateString()) {
        button.classList.add('selected');
      }
      button.addEventListener('click', (e) => {
        if (button.classList.contains('non-school-day')) {
          e.preventDefault();
          alert('Este não é um dia letivo.');
          return;
        }
        document.querySelectorAll('.calendar-day').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        window.selectDate(new Date(year, month, day));
      });
    });
  }, 0);

  return html;
}

function updateSummary(alunos, presencas) {
  const totalAlunos = alunos.length;
  const presentes = alunos.filter(aluno => presencas[aluno.id]?.presente).length;
  const ausentes = alunos.filter(aluno => presencas[aluno.id]?.falta && !presencas[aluno.id]?.justificado).length;
  const justificadas = alunos.filter(aluno => presencas[aluno.id]?.justificado).length;
  const taxa = totalAlunos > 0 ? ((presentes / totalAlunos) * 100).toFixed(0) : 0;

  const presentesCount = document.getElementById('presentes-count');
  const presentesTotal = document.getElementById('presentes-total');
  const ausentesCount = document.getElementById('ausentes-count');
  const ausentesTotal = document.getElementById('ausentes-total');
  const taxaValue = document.getElementById('taxa-value');

  if (presentesCount) presentesCount.textContent = presentes;
  if (presentesTotal) presentesTotal.textContent = `de ${totalAlunos} alunos`;
  if (ausentesCount) ausentesCount.textContent = ausentes;
  if (ausentesTotal) ausentesTotal.textContent = `de ${totalAlunos} alunos`;
  if (taxaValue) taxaValue.textContent = `${taxa}%`;
}

async function renderChamadaContent(turmaNome, turno, selectedDate) {
  console.log(`Renderizando conteúdo da chamada para ${turmaNome}, turno ${turno}, data ${selectedDate.toISOString()}`);

  let chamadaDate = document.getElementById('chamada-date');
  let chamadaTable = document.getElementById('chamada-table');
  let chamadaFooter = document.getElementById('chamada-footer');
  let taxaDate = document.getElementById('taxa-date');

  // Verificar se os elementos estão presentes com retry
  const maxRetries = 5;
  let retries = 0;
  while ((!chamadaDate || !chamadaTable || !chamadaFooter || !taxaDate) && retries < maxRetries) {
    console.warn('Elementos do DOM não encontrados. Tentativa', retries + 1, 'de', maxRetries);
    await new Promise(resolve => setTimeout(resolve, 100));
    chamadaDate = document.getElementById('chamada-date');
    chamadaTable = document.getElementById('chamada-table');
    chamadaFooter = document.getElementById('chamada-footer');
    taxaDate = document.getElementById('taxa-date');
    retries++;
  }

  if (!chamadaTable) {
    console.error('Elemento #chamada-table não encontrado após tentativas');
    alert('Erro ao carregar a tabela de chamada. O elemento #chamada-table não foi encontrado.');
    return;
  }

  // Garante que a tabela e seu container estejam visíveis
  const chamadaContainer = document.getElementById('chamada-container');
  if (chamadaContainer) {
    chamadaContainer.classList.remove('hidden');
    chamadaContainer.style.display = 'block';
    chamadaContainer.style.visibility = 'visible';
  }
  chamadaTable.classList.remove('hidden');
  chamadaTable.style.display = 'block';
  chamadaTable.style.visibility = 'visible';

  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = selectedDate.toLocaleDateString('pt-BR', dateOptions);
  const dateShortOptions = { day: 'numeric', month: 'short' };
  const formattedShortDate = selectedDate.toLocaleDateString('pt-BR', dateShortOptions);

  chamadaDate.textContent = formattedDate;
  chamadaFooter.textContent = `Lista de presença para ${formattedDate}`;
  taxaDate.textContent = formattedShortDate;

  const alunos = await getAlunosChamada(turmaNome, turno);
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));

  if (alunos.length === 0) {
    chamadaTable.innerHTML = `
      <div class="p-4 text-center text-[#6B7280]">
        Nenhum aluno encontrado para esta turma e turno.
      </div>
    `;
    updateSummary(alunos, {});
    return;
  }

  const presencas = await getPresencas(turmaNome, turno, selectedDate);
  window.chamadaState.presencas = { ...presencas };
  alunos.forEach(aluno => {
    if (!window.chamadaState.presencas[aluno.id]) {
      window.chamadaState.presencas[aluno.id] = { presente: false, falta: false, justificado: false, nome: aluno.nome };
    }
  });
  console.log('Estado de presenças após inicialização (detalhado):', JSON.stringify(window.chamadaState.presencas, null, 2));

  let tableHtml = `
    <table class="w-full text-left text-sm text-[#1E1E2D]">
      <thead class="bg-white border-b border-[#E5E7EB]">
        <tr>
          <th class="py-3 px-4 font-semibold">Nome</th>
          <th class="py-3 px-4 font-semibold text-center">Presente</th>
          <th class="py-3 px-4 font-semibold text-center">Falta</th>
          <th class="py-3 px-4 font-semibold text-center">Justificado</th>
          <th class="py-3 px-4 font-semibold text-center">Ações</th>
        </tr>
      </thead>
      <tbody>
  `;

  alunos.forEach((aluno, index) => {
    const alunoPresenca = window.chamadaState.presencas[aluno.id];
    console.log(`Aluno: ${aluno.nome}, Presença renderizada:`, alunoPresenca);
    const isLast = index === alunos.length - 1;

    const hasStateDefined = alunoPresenca.presente || alunoPresenca.falta || alunoPresenca.justificado;

    const nomeCellContent = hasStateDefined
      ? aluno.nome
      : `
        <div class="flex items-center gap-2">
          <span>${aluno.nome}</span>
          <span class="relative group">
            <i class="fas fa-exclamation-triangle text-yellow-500 text-sm"></i>
            <span class="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              Estado não definido
            </span>
          </span>
        </div>
      `;

    // Ajuste no link para advertências usando switchTab
    const escapedAlunoNome = aluno.nome ? aluno.nome.replace(/'/g, "\\'") : '';
    const escapedTurmaNome = turmaNome ? turmaNome.replace(/'/g, "\\'") : '';
    const escapedTurno = turno ? turno.replace(/'/g, "\\'") : '';
    console.log(`Gerando link para advertências: aluno=${escapedAlunoNome}, turma=${escapedTurmaNome}, turno=${escapedTurno}`);

    tableHtml += `
      <tr class="${!isLast ? 'border-b border-[#E5E7EB]' : ''}">
        <td class="py-3 px-4 font-semibold">${nomeCellContent}</td>
        <td class="py-3 px-4 text-center">
          <input
            type="checkbox"
            ${alunoPresenca.presente === true ? 'checked' : ''}
            aria-label="${aluno.nome} presente"
            class="w-4 h-4 text-[#2B49E1] border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#2B49E1]"
            onchange="window.updatePresenca(${aluno.id}, 'presente', this.checked)"
          />
        </td>
        <td class="py-3 px-4 text-center">
          <input
            type="checkbox"
            ${alunoPresenca.falta === true ? 'checked' : ''}
            aria-label="${aluno.nome} falta"
            class="w-4 h-4 border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#2B49E1]"
            onchange="window.updatePresenca(${aluno.id}, 'falta', this.checked)"
          />
        </td>
        <td class="py-3 px-4 text-center">
          <input
            type="checkbox"
            ${alunoPresenca.justificado === true ? 'checked' : ''}
            aria-label="${aluno.nome} justificado"
            class="w-4 h-4 border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#2B49E1]"
            onchange="window.updatePresenca(${aluno.id}, 'justificado', this.checked)"
          />
        </td>
        <td class="py-3 px-4 text-center">
          <a
            href="#"
            onclick="switchTab('advertencias', '${escapedAlunoNome}', '${escapedTurmaNome}', '${escapedTurno}')"
            class="text-[#1E90FF] hover:text-[#1E70FF] font-semibold"
          >
            Advertências
          </a>
        </td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  chamadaTable.innerHTML = tableHtml;

  // Verifica o estado do checkbox após a renderização
  setTimeout(() => {
    const checkbox = document.querySelector(`input[aria-label="${alunos[0].nome} presente"]`);
    if (checkbox) {
      console.log(`Estado do checkbox de presente após renderização: ${checkbox.checked} (esperado: ${window.chamadaState.presencas[alunos[0].id].presente})`);
    }
  }, 0);

  updateSummary(alunos, window.chamadaState.presencas);
}

window.renderChamada = async function(turmaNome, turno) {
  console.log(`Iniciando renderChamada para ${turmaNome}, turno ${turno}`);

  // Preservar turmaNome e turno no escopo global para uso em outras seções
  window.turmaNome = turmaNome;
  window.turmaTurno = turno;
  console.log(`Valores globais definidos: window.turmaNome=${window.turmaNome}, window.turmaTurno=${window.turmaTurno}`);

  if (!window.chamadaState) {
    window.chamadaState = {
      turmaNome: turmaNome,
      turno: turno,
      currentDate: new Date(),
      selectedDate: new Date(),
      presencas: {},
      loaded: false
    };
  } else {
    window.chamadaState.turmaNome = turmaNome;
    window.chamadaState.turno = turno;
    if (!window.chamadaState.currentDate) {
      window.chamadaState.currentDate = new Date();
      window.chamadaState.selectedDate = new Date();
    }
  }

  const chamadaContainer = document.getElementById('chamada-container');
  if (!chamadaContainer) {
    console.error('Container #chamada-container não encontrado');
    alert('Erro ao carregar a seção de chamada. O elemento #chamada-container não foi encontrado.');
    return;
  }

  // Garante que o container esteja visível imediatamente
  chamadaContainer.classList.remove('hidden');
  chamadaContainer.style.display = 'block';
  chamadaContainer.style.visibility = 'visible';

  if (window.chamadaState.loaded) {
    console.log('Chamada já carregada, atualizando apenas os dados');
    await renderChamadaContent(turmaNome, turno, window.chamadaState.selectedDate);
    return;
  }

  window.chamadaState.loaded = true;

  const calendarContainer = document.getElementById('calendar-container');
  if (calendarContainer) {
    calendarContainer.innerHTML = generateCalendar(
      window.chamadaState.currentDate.getFullYear(),
      window.chamadaState.currentDate.getMonth(),
      window.chamadaState.selectedDate
    );
    calendarContainer.classList.remove('hidden');
    calendarContainer.style.display = 'block';
    calendarContainer.style.visibility = 'visible';
  }

  await renderChamadaContent(turmaNome, turno, window.chamadaState.selectedDate);
  console.log('renderChamada concluído');
};

window.changeMonth = function(delta) {
  if (!window.chamadaState) return;
  window.chamadaState.currentDate.setMonth(window.chamadaState.currentDate.getMonth() + delta);
  const calendarContainer = document.getElementById('calendar-container');
  if (calendarContainer) {
    calendarContainer.innerHTML = generateCalendar(
      window.chamadaState.currentDate.getFullYear(),
      window.chamadaState.currentDate.getMonth(),
      window.chamadaState.selectedDate
    );
    calendarContainer.classList.remove('hidden');
    calendarContainer.style.display = 'block';
    calendarContainer.style.visibility = 'visible';
  }
};

window.selectDate = async function(date) {
  if (!window.chamadaState) return;
  window.chamadaState.selectedDate = new Date(date);
  console.log('Data selecionada:', window.chamadaState.selectedDate.toISOString());
  const calendarContainer = document.getElementById('calendar-container');
  if (calendarContainer) {
    calendarContainer.innerHTML = generateCalendar(
      window.chamadaState.currentDate.getFullYear(),
      window.chamadaState.currentDate.getMonth(),
      window.chamadaState.selectedDate
    );
    calendarContainer.classList.remove('hidden');
    calendarContainer.style.display = 'block';
    calendarContainer.style.visibility = 'visible';
  }
  await renderChamadaContent(window.chamadaState.turmaNome, window.chamadaState.turno, window.chamadaState.selectedDate);
};

window.updatePresenca = async function(alunoId, tipo, checked) {
  if (!window.chamadaState || !window.chamadaState.presencas) return;

  if (!window.chamadaState.presencas[alunoId]) {
    window.chamadaState.presencas[alunoId] = { presente: false, falta: false, justificado: false };
  }

  const presenca = window.chamadaState.presencas[alunoId];
  const originalState = { ...presenca };

  if (tipo === 'presente') {
    presenca.presente = checked;
    if (checked) {
      presenca.falta = false;
      presenca.justificado = false;
    }
  } else if (tipo === 'falta') {
    presenca.falta = checked;
    if (checked) {
      presenca.presente = false;
    } else {
      presenca.justificado = false;
    }
  } else if (tipo === 'justificado') {
    presenca.justificado = checked;
    if (checked) {
      presenca.presente = false;
      presenca.falta = true;
    } else if (!checked && presenca.falta) {
      presenca.falta = false;
    }
  }

  if (presenca.presente) {
    presenca.falta = false;
    presenca.justificado = false;
  } else if (presenca.justificado) {
    presenca.presente = false;
    presenca.falta = true;
  }

  console.log(`Atualizando presença para aluno ID ${alunoId}: Original - ${JSON.stringify(originalState)}, Novo - ${JSON.stringify(presenca)}`);

  const checkboxes = document.querySelectorAll(`input[aria-label*="${alunoId}"]`);
  checkboxes.forEach(checkbox => {
    const checkboxType = checkbox.getAttribute('aria-label').split(' ')[1];
    if (checkboxType === 'presente') checkbox.checked = presenca.presente;
    else if (checkboxType === 'falta') checkbox.checked = presenca.falta;
    else if (checkboxType === 'justificado') checkbox.checked = presenca.justificado;
  });

  try {
    const savedPresencas = await savePresencas(window.chamadaState.turmaNome, window.chamadaState.turno, window.chamadaState.selectedDate, window.chamadaState.presencas);
    if (savedPresencas) {
      window.chamadaState.presencas = { ...savedPresencas };
    }
    await renderChamadaContent(window.chamadaState.turmaNome, window.chamadaState.turno, window.chamadaState.selectedDate);
  } catch (error) {
    console.error('Falha ao atualizar presença:', error);
    await renderChamadaContent(window.chamadaState.turmaNome, window.chamadaState.turno, window.chamadaState.selectedDate);
  }
};

window.printChamada = async function() {
  if (!window.chamadaState) return;
  const alunos = await getAlunosChamada(window.chamadaState.turmaNome, window.chamadaState.turno);
  const presencas = window.chamadaState.presencas;
  const dateFormatted = window.chamadaState.selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  let tableRows = '';
  alunos.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(aluno => {
    const alunoPresenca = presencas[aluno.id] || { presente: false, falta: false, justificado: false };
    const status = alunoPresenca.presente ? 'Presente' : (alunoPresenca.falta && alunoPresenca.justificado) ? 'Falta Justificada' : alunoPresenca.falta ? 'Falta' : 'Não registrado';
    tableRows += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; font-weight: 600;">${aluno.nome}</td>
        <td style="padding: 8px; text-align: center;">${status}</td>
      </tr>
    `;
  });

  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Imprimir Chamada</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 600; }
      </style>
    </head>
    <body>
      <div id="print-content">
        <img src="/static/logo.png" alt="Logotipo da Instituição" style="max-width: 150px; margin-bottom: 20px;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Lista de Presença</h2>
        <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turma:</strong> ${window.chamadaState.turmaNome}</p>
        <p style="font-size: 16px; margin-bottom: 5px;"><strong>Turno:</strong> ${window.chamadaState.turno}</p>
        <p style="font-size: 16px; margin-bottom: 20px;"><strong>Data:</strong> ${dateFormatted}</p>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      <script>
        window.onload = function() {
          window.print();
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
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    alert('Não foi possível abrir a janela de impressão. Verifique se os popups estão bloqueados e permita-os para este site.');
  }
};

window.selectNewDate = function() {
  if (!window.chamadaState) return;
  const calendarContainer = document.getElementById('calendar-container');
  if (calendarContainer) {
    calendarContainer.scrollIntoView({ behavior: 'smooth' });
    calendarContainer.classList.remove('hidden');
    calendarContainer.style.display = 'block';
    calendarContainer.style.visibility = 'visible';
  }
};

window.clearChamadaState = function() {
  if (window.chamadaState) {
    // Preservar window.turmaNome e window.turmaTurno antes de limpar o estado
    const preservedTurmaNome = window.chamadaState.turmaNome;
    const preservedTurmaTurno = window.chamadaState.turno;
    delete window.chamadaState;
    // Restaurar os valores globais
    window.turmaNome = preservedTurmaNome;
    window.turmaTurno = preservedTurmaTurno;
    console.log('Estado da chamada limpo, mas preservando valores globais: window.turmaNome=', window.turmaNome, 'window.turmaTurno=', window.turmaTurno);
  } else {
    console.log('Nenhum estado de chamada para limpar');
  }
};

// Inicialização da seção de chamada ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const turma = params.get('turma');
  const turno = params.get('turno');

  if (turma && turno) {
    window.turmaNome = decodeURIComponent(turma);
    window.turmaTurno = decodeURIComponent(turno);
    await window.renderChamada(window.turmaNome, window.turmaTurno);
  } else {
    console.warn('Nenhum parâmetro de turma ou turno encontrado na URL. Certifique-se de passar os parâmetros corretamente.');
  }
});