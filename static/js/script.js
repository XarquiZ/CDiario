let currentMode = 'create';
let currentIndex = null;
let currentAlunoId = null;
let currentTurmaId = null;
let selectedAlunoId = null; // Para armazenar os IDs dos alunos selecionados para transferência
let modalMode = 'create'; // Renomeado de currentMode para evitar confusão
let currentForm = 'turma'; // Para identificar o formulário atual (turma ou aluno)
let alunosLista = []; // Lista global para armazenar os alunos buscados do backend

let modal, modalTitle, modalButton, transferButton; // Declaradas como variáveis globais, inicializadas no DOMContentLoaded

// Funções para gerenciar turmas com o backend
async function fetchTurmas() {
  try {
    const response = await fetch('/turmas', {
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

async function saveTurmas(turmas) {
  console.log('Turmas salvas no backend:', turmas);
}

async function cadastrarTurma() {
  const turmaName = document.getElementById('nome-turma').value;
  const turnos = Array.from(document.querySelectorAll('input[name="turnos"]:checked'))
    .map(checkbox => checkbox.value);

  if (!turmaName || turnos.length === 0) {
    alert('Por favor, preencha o nome da turma e selecione pelo menos um turno.');
    return;
  }

  const turmaData = {
    nome: turmaName,
    turnos: turnos
  };

  try {
    const response = await fetch('/turmas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(turmaData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar turma: ${response.status} - ${errorText || 'Resposta inválida'}`);
    }

    const result = await response.json();
    console.log('Turma criada com sucesso:', result);
    closeModal();
    await switchTab('turmas');
    alert('Turma criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar turma:', error.message);
    alert(`Erro ao criar turma: ${error.message}\nVerifique se o servidor está rodando e tente novamente.`);
  }
}

async function atualizarTurma() {
  const turmaName = document.getElementById('nome-turma').value;
  const turnos = Array.from(document.querySelectorAll('input[name="turnos"]:checked'))
    .map(checkbox => checkbox.value);

  if (!turmaName || turnos.length === 0) {
    alert('Por favor, preencha o nome da turma e selecione pelo menos um turno.');
    return;
  }

  const turmaData = {
    nome: turmaName,
    turnos: turnos
  };

  try {
    const response = await fetch(`/turmas/${currentTurmaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(turmaData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao editar turma: ${response.status} - ${errorText || 'Resposta inválida'}`);
    }

    const result = await response.json();
    console.log('Turma atualizada com sucesso:', result);
    closeModal();
    await switchTab('turmas');
    alert('Turma atualizada com sucesso!');
  } catch (error) {
    console.error('Erro ao editar turma:', error.message);
    alert(`Erro ao editar turma: ${error.message}\nVerifique se o servidor está rodando e tente novamente.`);
  }
}

async function deleteTurma(index) {
  if (!confirm('Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.')) {
    return;
  }

  const turmas = await fetchTurmas();
  const turmaId = turmas[index].id;

  try {
    const response = await fetch(`/turmas/${turmaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao excluir turma: ${response.status} - ${errorText || 'Resposta inválida'}`);
    }

    const result = await response.json();
    console.log('Turma excluída com sucesso:', result);
    await switchTab('turmas');
    alert('Turma excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir turma:', error.message);
    alert(`Erro ao excluir turma: ${error.message}\nVerifique se o servidor está rodando e tente novamente.`);
  }
}

// Funções para gerenciar alunos com o backend
async function fetchAlunos(turma = '', turno = '') {
  try {
    const turnoNormalized = turno ? normalizeString(turno) : '';
    let url = '/alunos';
    const params = [];
    if (turma && turma !== 'Todas as turmas' && turma !== 'Sem turma') {
      params.push(`turma=${encodeURIComponent(turma)}`);
    }
    if (turno && turno !== 'Todos os turnos') {
      params.push(`turno=${encodeURIComponent(turnoNormalized)}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    console.log('Buscando alunos com URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta do servidor:', errorText);
      throw new Error(`Erro ao buscar alunos: ${response.status} - ${errorText || response.statusText}`);
    }

    const alunos = await response.json();
    console.log('Alunos buscados do backend (antes de retornar):', alunos);
    return Array.isArray(alunos) ? alunos : [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error.message);
    alert('Não foi possível carregar a lista de alunos. Verifique o console para mais detalhes ou se o servidor está rodando.');
    return [];
  }
}

async function cadastrarAluno() {
  console.log('Botão "Cadastrar Aluno" clicado');
  const nomeAluno = document.getElementById('nome-aluno').value.trim();
  const dataNascimento = document.getElementById('data-nascimento').value;
  const nis = document.getElementById('nis').value.trim() || null;
  const rg = document.getElementById('rg').value.trim() || null;
  const orgao = document.getElementById('orgao').value.trim() || null;
  const ufRg = document.getElementById('uf-rg').value || null;
  const cpf = document.getElementById('cpf').value.trim() || null;
  const sexo = document.getElementById('sexo').value || null;
  const nacionalidade = document.getElementById('nacionalidade').value.trim() || null;
  const naturalidade = document.getElementById('naturalidade').value.trim() || null;
  const ufNaturalidade = document.getElementById('uf-naturalidade').value || null;
  const nomePai = document.getElementById('nome-pai').value.trim() || null;
  const nomeMae = document.getElementById('nome-mae').value.trim() || null;
  const etnia = document.getElementById('etnia').value || null;
  const deficiencias = Array.from(document.querySelectorAll('input[name="deficiencia"]:checked'))
    .map(checkbox => checkbox.value);
  const outrasDeficiencia = deficiencias.includes('Outras') ? document.getElementById('outras-deficiencia').value.trim() : null;
  if (deficiencias.includes('Outras') && !outrasDeficiencia) {
    alert('Por favor, especifique a deficiência "Outras".');
    return;
  }
  const deficiencia = deficiencias.length > 0 ? (deficiencias.includes('Outras') ? `${deficiencias.join(', ')} (${outrasDeficiencia})` : deficiencias.join(', ')) : null;
  const situacaoOcupacional = document.querySelector('input[name="situacao-ocupacional"]:checked')?.value || null;
  const cep = document.getElementById('cep').value.trim() || null;
  const rua = document.getElementById('rua').value.trim() || null;
  const numero = document.getElementById('numero').value.trim() || null;
  const bairro = document.getElementById('bairro').value.trim() || null;
  const municipio = document.getElementById('municipio').value.trim() || null;
  const estado = document.getElementById('estado').value || null;
  const telefone = document.getElementById('telefone').value.trim() || null;
  const celular = document.getElementById('celular').value.trim() || null;
  const email = document.getElementById('email').value.trim() || null;
  const escolaridade = document.querySelector('input[name="escolaridade"]:checked')?.value || null;
  const situacaoEscolar = document.getElementById('situacao-escolar').value || null;
  const turmaAluno = document.getElementById('turma-aluno').value || null;
  const turnoAluno = document.getElementById('turno-aluno').value || null;

  console.log('Valores dos campos:', {
    nomeAluno, dataNascimento, nis, rg, orgao, ufRg, cpf, sexo, nacionalidade, naturalidade, ufNaturalidade,
    nomePai, nomeMae, etnia, deficiencia, situacaoOcupacional, cep, rua, numero, bairro, municipio, estado,
    telefone, celular, email, escolaridade, situacaoEscolar, turmaAluno, turnoAluno
  });

  if (!nomeAluno) {
    console.log('Validação falhou: Nome é obrigatório');
    alert('O campo Nome é obrigatório.');
    return;
  }

  const alunoData = {
    nome: nomeAluno,
    data_nascimento: dataNascimento || null,
    nis: nis,
    rg: rg,
    orgao: orgao,
    uf_rg: ufRg,
    cpf: cpf,
    sexo: sexo,
    nacionalidade: nacionalidade,
    naturalidade: naturalidade,
    uf_naturalidade: ufNaturalidade,
    nome_pai: nomePai,
    nome_mae: nomeMae,
    etnia: etnia,
    deficiencia: deficiencia,
    situacao_ocupacional: situacaoOcupacional,
    cep: cep,
    rua: rua,
    numero: numero,
    bairro: bairro,
    municipio: municipio,
    estado: estado,
    telefone: telefone,
    celular: celular,
    email: email,
    escolaridade: escolaridade,
    situacao_escolar: situacaoEscolar,
    turma: turmaAluno,
    turno: turnoAluno
  };

  console.log('Enviando dados do aluno para o backend:', alunoData);

  try {
    const response = await fetch('/alunos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(alunoData)
    });

    console.log('Status da resposta:', response.status);
    const responseText = await response.text();
    console.log('Texto bruto da resposta:', responseText);

    if (!response.ok) {
      let errorMessage = `Erro ao criar aluno: ${response.status} - ${responseText || 'Resposta inválida'}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorMessage = `Erro ao criar aluno: ${errorData.error}`;
        }
      } catch (parseError) {
        console.warn('Erro ao parsear resposta de erro como JSON:', parseError);
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('Resposta do backend:', result);
    closeModal('novo-aluno');
    await fetchAlunosAndRender();
    alert('Aluno cadastrado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar aluno:', error.message);
    alert(`Erro ao criar aluno: ${error.message}\nVerifique os logs do console e do servidor para mais detalhes.`);
  }
}

async function atualizarAluno() {
  console.log('Botão "Salvar Alterações" clicado');
  const nomeAluno = document.getElementById('nome-aluno').value.trim();
  const dataNascimento = document.getElementById('data-nascimento').value;
  const nis = document.getElementById('nis').value.trim() || null;
  const rg = document.getElementById('rg').value.trim() || null;
  const orgao = document.getElementById('orgao').value.trim() || null;
  const ufRg = document.getElementById('uf-rg').value || null;
  const cpf = document.getElementById('cpf').value.trim() || null;
  const sexo = document.getElementById('sexo').value || null;
  const nacionalidade = document.getElementById('nacionalidade').value.trim() || null;
  const naturalidade = document.getElementById('naturalidade').value.trim() || null;
  const ufNaturalidade = document.getElementById('uf-naturalidade').value || null;
  const nomePai = document.getElementById('nome-pai').value.trim() || null;
  const nomeMae = document.getElementById('nome-mae').value.trim() || null;
  const etnia = document.getElementById('etnia').value || null;
  const deficiencias = Array.from(document.querySelectorAll('input[name="deficiencia"]:checked'))
    .map(checkbox => checkbox.value);
  const outrasDeficiencia = deficiencias.includes('Outras') ? document.getElementById('outras-deficiencia').value.trim() : null;
  if (deficiencias.includes('Outras') && !outrasDeficiencia) {
    alert('Por favor, especifique a deficiência "Outras".');
    return;
  }
  const deficiencia = deficiencias.length > 0 ? (deficiencias.includes('Outras') ? `${deficiencias.join(', ')} (${outrasDeficiencia})` : deficiencias.join(', ')) : null;
  const situacaoOcupacional = document.querySelector('input[name="situacao-ocupacional"]:checked')?.value || null;
  const cep = document.getElementById('cep').value.trim() || null;
  const rua = document.getElementById('rua').value.trim() || null;
  const numero = document.getElementById('numero').value.trim() || null;
  const bairro = document.getElementById('bairro').value.trim() || null;
  const municipio = document.getElementById('municipio').value.trim() || null;
  const estado = document.getElementById('estado').value || null;
  const telefone = document.getElementById('telefone').value.trim() || null;
  const celular = document.getElementById('celular').value.trim() || null;
  const email = document.getElementById('email').value.trim() || null;
  const escolaridade = document.querySelector('input[name="escolaridade"]:checked')?.value || null;
  const situacaoEscolar = document.getElementById('situacao-escolar').value || null;
  const turmaAluno = document.getElementById('turma-aluno').value || null;
  const turnoAluno = document.getElementById('turno-aluno').value || null;

  if (!nomeAluno) {
    console.log('Validação falhou: Nome é obrigatório');
    alert('O campo Nome é obrigatório.');
    return;
  }

  if (!currentAlunoId) {
    console.error('Erro: ID do aluno não definido para edição');
    alert('Erro ao editar aluno: ID não encontrado. Tente novamente.');
    return;
  }

  const alunoData = {
    nome: nomeAluno,
    data_nascimento: dataNascimento || null,
    nis: nis,
    rg: rg,
    orgao: orgao,
    uf_rg: ufRg,
    cpf: cpf,
    sexo: sexo,
    nacionalidade: nacionalidade,
    naturalidade: naturalidade,
    uf_naturalidade: ufNaturalidade,
    nome_pai: nomePai,
    nome_mae: nomeMae,
    etnia: etnia,
    deficiencia: deficiencia,
    situacao_ocupacional: situacaoOcupacional,
    cep: cep,
    rua: rua,
    numero: numero,
    bairro: bairro,
    municipio: municipio,
    estado: estado,
    telefone: telefone,
    celular: celular,
    email: email,
    escolaridade: escolaridade,
    situacao_escolar: situacaoEscolar,
    turma: turmaAluno,
    turno: turnoAluno
  };

  console.log('Enviando dados para edição do aluno:', alunoData, 'ID:', currentAlunoId);

  try {
    const response = await fetch(`/alunos/${currentAlunoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(alunoData)
    });

    console.log('Status da resposta (PUT):', response.status);
    const responseText = await response.text();
    console.log('Texto bruto da resposta (PUT):', responseText);

    if (!response.ok) {
      let errorMessage = `Erro ao editar aluno: ${response.status} - ${responseText || 'Resposta inválida'}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorMessage = `Erro ao editar aluno: ${errorData.error}`;
        }
      } catch (parseError) {
        console.warn('Erro ao parsear resposta de erro como JSON:', parseError);
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('Resposta do backend (PUT):', result);
    closeModal('novo-aluno');
    await fetchAlunosAndRender();
    alert('Aluno atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao editar aluno:', error.message);
    alert(`Erro ao editar aluno: ${error.message}\nVerifique os logs do console e do servidor para mais detalhes.`);
  }
}

async function deleteAluno(alunoId) {
  console.log('Botão "Excluir" clicado');
  if (!confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) {
    return;
  }

  console.log('Enviando requisição para excluir aluno com ID:', alunoId);

  try {
    const response = await fetch(`/alunos/${alunoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Status da resposta (DELETE):', response.status);
    const responseText = await response.text();
    console.log('Texto bruto da resposta (DELETE):', responseText);

    if (!response.ok) {
      let errorMessage = `Erro ao excluir aluno: ${response.status} - ${responseText || 'Resposta inválida'}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorMessage = `Erro ao excluir aluno: ${errorData.error}`;
        }
      } catch (parseError) {
        console.warn('Erro ao parsear resposta de erro como JSON:', parseError);
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('Resposta do backend (DELETE):', result);
    await fetchAlunosAndRender();
    alert('Aluno excluído com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir aluno:', error.message);
    alert(`Erro ao excluir aluno: ${error.message}\nVerifique os logs do console e do servidor para mais detalhes.`);
  }
}

async function transferirAluno() {
  const transferTurmaSelect = document.getElementById('transfer-turma');
  const transferTurnoSelect = document.getElementById('transfer-turno');
  const novaTurma = transferTurmaSelect.value;
  const novoTurno = transferTurnoSelect.value;

  if (!novaTurma) {
    alert('Por favor, selecione uma turma para transferir.');
    return;
  }

  if (novaTurma !== 'Sem turma' && !novoTurno) {
    alert('Por favor, selecione um turno para a turma selecionada.');
    return;
  }

  const alunoData = {
    turma: novaTurma === 'Sem turma' ? null : novaTurma,
    turno: novaTurma === 'Sem turma' ? null : novoTurno
  };

  try {
    console.log('Enviando requisição para transferir aluno(s):', alunoData);
    const promises = selectedAlunoId.map(async (id) => {
      const response = await fetch(`/alunos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alunoData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao transferir aluno ${id}: ${response.status} - ${errorText}`);
      }

      return response.json();
    });

    await Promise.all(promises);
    alert('Aluno(s) transferido(s) com sucesso!');
    closeModal();
    fetchAlunosAndRender();
  } catch (error) {
    console.error('Erro ao transferir aluno:', error.message);
    alert(`Erro ao transferir aluno: ${error.message}\nVerifique os logs do console e do servidor para mais detalhes.`);
  }
}

function openEditAlunoModal(alunoId) {
  modalMode = 'edit';
  currentForm = 'aluno';
  const modal = document.getElementById('novo-aluno-modal');
  const title = document.getElementById('novo-aluno-title');
  const actionBtn = document.getElementById('novo-aluno-btn');
  const form = document.getElementById('novo-aluno-form');

  // Busca o aluno correspondente na lista global usando o ID
  const aluno = alunosLista.find(a => a.id == alunoId);

  if (!aluno) {
    console.error('Aluno não encontrado para o ID:', alunoId);
    alert('Erro: Aluno não encontrado.');
    return;
  }

  currentAlunoId = aluno.id;
  console.log('Abrindo modal de edição para aluno com ID:', currentAlunoId);
  console.log('Dados do aluno para edição:', aluno);
  form.reset();
  document.getElementById('nome-aluno').value = aluno.nome || '';
  document.getElementById('data-nascimento').value = aluno.data_nascimento ? aluno.data_nascimento.split('/').reverse().join('-') : '';
  document.getElementById('nis').value = aluno.nis || '';
  document.getElementById('rg').value = aluno.rg || '';
  document.getElementById('orgao').value = aluno.orgao || '';
  document.getElementById('uf-rg').value = aluno.uf_rg || '';
  document.getElementById('cpf').value = aluno.cpf || '';
  document.getElementById('sexo').value = aluno.sexo || '';
  document.getElementById('nacionalidade').value = aluno.nacionalidade || '';
  document.getElementById('naturalidade').value = aluno.naturalidade || '';
  document.getElementById('uf-naturalidade').value = aluno.uf_naturalidade || '';
  document.getElementById('nome-pai').value = aluno.nome_pai || '';
  document.getElementById('nome-mae').value = aluno.nome_mae || '';
  document.getElementById('etnia').value = aluno.etnia || '';
  
  // Garantir que deficiencias seja um array, mesmo que aluno.deficiencia seja null ou malformado
  const deficiencias = typeof aluno.deficiencia === 'string' && aluno.deficiencia ? aluno.deficiencia.split(', ') : [];
  document.querySelectorAll('input[name="deficiencia"]').forEach(checkbox => {
    checkbox.checked = deficiencias.includes(checkbox.value);
  });

  // Tratar o campo "Outras" separadamente
  const outrasDeficienciaInput = document.getElementById('outras-deficiencia');
  if (outrasDeficienciaInput) {
    outrasDeficienciaInput.value = '';
    const outrasDeficiencia = deficiencias.find(d => d.startsWith('Outras'));
    if (outrasDeficiencia) {
      const match = outrasDeficiencia.match(/\((.*?)\)/);
      if (match && match[1]) {
        outrasDeficienciaInput.value = match[1];
      }
    }
  } else {
    console.warn('Elemento "outras-deficiencia" não encontrado no DOM.');
  }

  // Preencher os outros campos
  const situacaoOcupacionalInput = document.querySelector(`input[name="situacao-ocupacional"][value="${aluno.situacao_ocupacional || ''}"]`);
  if (situacaoOcupacionalInput) situacaoOcupacionalInput.checked = true;

  document.getElementById('cep').value = aluno.cep || '';
  document.getElementById('rua').value = aluno.rua || '';
  document.getElementById('numero').value = aluno.numero || '';
  document.getElementById('bairro').value = aluno.bairro || '';
  document.getElementById('municipio').value = aluno.municipio || '';
  document.getElementById('estado').value = aluno.estado || '';
  document.getElementById('telefone').value = aluno.telefone || '';
  document.getElementById('celular').value = aluno.celular || '';
  document.getElementById('email').value = aluno.email || '';

  const escolaridadeInput = document.querySelector(`input[name="escolaridade"][value="${aluno.escolaridade || ''}"]`);
  if (escolaridadeInput) escolaridadeInput.checked = true;

  document.getElementById('situacao-escolar').value = aluno.situacao_escolar || '';
  updateTurmaOptions().then(() => {
    document.getElementById('turma-aluno').value = aluno.turma || '';
    document.getElementById('turno-aluno').value = aluno.turno || '';
  });

  title.textContent = 'Editar Aluno';
  actionBtn.textContent = 'Salvar Alterações';
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
  console.log('Abrindo modal com modo: edit');
  console.log('Modo atual após abrir modal:', modalMode);
}

function openTransferModal() {
  const selectedAlunos = document.querySelectorAll('.aluno-checkbox:checked');
  if (selectedAlunos.length === 0) {
    alert('Por favor, selecione pelo menos um aluno para transferir.');
    return;
  }

  selectedAlunoId = Array.from(selectedAlunos).map(checkbox => 
    checkbox.parentElement.getAttribute('data-id')
  );

  if (!modal) {
    console.error('Elemento modal não encontrado. Verifique o HTML.');
    return; // Remove o alert e apenas registra no console
  }

  modalMode = 'transfer';
  currentForm = 'transfer';
  modal.classList.remove('hidden');
  modalTitle.textContent = 'Transferir Aluno(s)';
  document.getElementById('aluno-form').classList.add('hidden');
  document.getElementById('transfer-form').classList.remove('hidden');
  document.getElementById('turma-form').classList.add('hidden');

  const transferTurmaSelect = document.getElementById('transfer-turma');
  const transferTurnoSelect = document.getElementById('transfer-turno');

  transferTurmaSelect.innerHTML = '<option value="">Selecione uma turma</option><option value="Sem turma">Sem turma</option>';
  transferTurnoSelect.innerHTML = '<option value="">Selecione um turno</option>';

  fetchTurmas().then(turmas => {
    turmas.forEach(turma => {
      const option = document.createElement('option');
      option.value = turma.nome;
      option.textContent = turma.nome;
      transferTurmaSelect.appendChild(option);
    });

    transferTurmaSelect.addEventListener('change', () => {
      const selectedTurma = transferTurmaSelect.value;
      transferTurnoSelect.innerHTML = '<option value="">Selecione um turno</option>';
      if (selectedTurma && selectedTurma !== 'Sem turma') {
        const turma = turmas.find(t => t.nome === selectedTurma);
        if (turma) {
          turma.turnos.forEach(turno => {
            const option = document.createElement('option');
            option.value = turno;
            option.textContent = turno.charAt(0).toUpperCase() + turno.slice(1);
            transferTurnoSelect.appendChild(option);
          });
        }
      }
    });
  });

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
  console.log('Abrindo modal com modo: transfer');
  console.log('Modo atual após abrir modal:', modalMode);
}

// Função para alternar a visibilidade dos detalhes do aluno
function toggleAlunoDetails(index) {
  const detailsRow = document.getElementById(`aluno-details-${index}`);
  const toggleBtn = document.getElementById(`toggle-btn-${index}`);
  if (detailsRow.classList.contains('hidden')) {
    detailsRow.classList.remove('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar Detalhes';
  } else {
    detailsRow.classList.add('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Ver Detalhes';
  }
}

// Função para gerenciar a seleção de cards
function toggleCardSelection(card) {
  const checkbox = card.querySelector('.aluno-checkbox');
  const cards = document.querySelectorAll('.aluno-card');
  const selectedId = card.getAttribute('data-id');

  if (checkbox.checked) {
    checkbox.checked = false;
    card.classList.remove('selected');
  } else {
    cards.forEach(c => {
      const cb = c.querySelector('.aluno-checkbox');
      if (cb) {
        cb.checked = false;
        c.classList.remove('selected');
      }
    });
    checkbox.checked = true;
    card.classList.add('selected');
  }

  const selectedCheckboxes = document.querySelectorAll('.aluno-checkbox:checked');
  const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.parentElement.getAttribute('data-id'));
  updateButtonStates(selectedIds);
}

function updateButtonStates(selectedIds) {
  const editarBtn = document.getElementById('editar-aluno-btn');
  const transferirBtn = document.getElementById('transferir-aluno-btn');
  const excluirBtn = document.getElementById('excluir-aluno-btn');

  const isDisabled = selectedIds.length === 0;
  editarBtn.disabled = isDisabled || selectedIds.length > 1; // Editar só permite 1 aluno
  transferirBtn.disabled = isDisabled; // Transferir permite múltiplos alunos
  excluirBtn.disabled = isDisabled; // Excluir permite múltiplos alunos
}

// Renderizar turmas
async function renderTurmas() {
  const turmas = await fetchTurmas();
  console.log('Turmas recebidas para renderização:', turmas);
  let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">';
  if (turmas.length === 0) {
    html += '<p class="text-center text-gray-500">Nenhuma turma cadastrada.</p>';
  } else {
    turmas.forEach((turma, index) => {
      html += `
        <article class="turma-card" data-index="${index}" data-id="${turma.id}">
          <div>
            <h3 class="font-extrabold text-lg text-[#0F172A] mb-2 select-none">${turma.nome}</h3>
            <p class="text-sm text-[#64748B] select-none">Turnos: ${turma.turnos.length > 0 ? turma.turnos.join(', ') : 'Nenhum turno definido'}</p>
          </div>
          <div class="flex justify-between items-center mt-6">
            <button type="button" class="editar-btn" onclick="openEditModal(${index})">
              <i class="fas fa-folder-open text-base"></i>
              Editar
            </button>
            <button type="button" class="excluir-btn" onclick="deleteTurma(${index})">
              <i class="fas fa-folder text-base"></i>
              Excluir
            </button>
          </div>
        </article>
      `;
    });
  }
  html += '</div>';
  console.log('HTML gerado para turmas:', html);
  return html;
}

// Renderizar alunos
async function renderAlunos(turmaFiltro = 'Todas as turmas', turnoFiltro = 'Todos os turnos') {
  const alunos = await fetchAlunos(turmaFiltro, turnoFiltro);
  alunosLista = alunos; // Armazena a lista de alunos na variável global
  console.log('Alunos recebidos para renderização:', { alunos, isArray: Array.isArray(alunos), length: alunos ? alunos.length : 'undefined' });

  let html = `
    <section class="alunos-section w-full">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  `;

  if (!Array.isArray(alunos) || alunos.length === 0) {
    console.log('Nenhum aluno encontrado, renderizando mensagem de "Nenhum aluno cadastrado".');
    html += `
      <p class="col-span-full text-center text-gray-500">Nenhum aluno cadastrado.</p>
    `;
  } else {
    console.log('Ordenando e renderizando lista de alunos:', alunos);
    const alunosOrdenados = [...alunos].sort((a, b) => a.nome.localeCompare(b.nome));
    alunosOrdenados.forEach((aluno, index) => {
      const avisoSemTurma = !aluno.turma ? '<i class="fas fa-exclamation-triangle text-yellow-500 ml-2" title="Esse aluno está sem turma"></i>' : '';
      const dataNascimentoFormatada = aluno.data_nascimento || 'N/A';
      html += `
        <div class="aluno-card bg-white rounded-lg shadow-md p-4" data-index="${index}" data-id="${aluno.id}" onclick="toggleCardSelection(this)">
          <div class="flex justify-between items-center">
            <h3 class="font-semibold text-lg text-[#0F172A] truncate">${aluno.nome || 'N/A'} ${avisoSemTurma}</h3>
            <button id="toggle-btn-${index}" type="button" class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1" onclick="event.stopPropagation(); toggleAlunoDetails(${index})">
              <i class="fas fa-chevron-down"></i> Ver Detalhes
            </button>
          </div>
          <div class="text-sm text-gray-600 mt-2">
            <p><span class="font-medium">Data de Nascimento:</span> ${dataNascimentoFormatada}</p>
            <p><span class="font-medium">Turma:</span> ${aluno.turma || 'N/A'}</p>
            <p><span class="font-medium">Turno:</span> ${aluno.turno || 'N/A'}</p>
          </div>
          <div id="aluno-details-${index}" class="hidden mt-4 text-sm text-gray-600 border-t pt-2">
            <p><span class="font-medium">NIS:</span> ${aluno.nis || 'N/A'}</p>
            <p><span class="font-medium">RG:</span> ${aluno.rg || 'N/A'}</p>
            <p><span class="font-medium">CPF:</span> ${aluno.cpf || 'N/A'}</p>
            <p><span class="font-medium">Telefone:</span> ${aluno.telefone || 'N/A'}</p>
            <p><span class="font-medium">Celular:</span> ${aluno.celular || 'N/A'}</p>
            <p><span class="font-medium">E-mail:</span> ${aluno.email || 'N/A'}</p>
            <p><span class="font-medium">Endereço:</span> ${[aluno.rua, aluno.numero, aluno.bairro, aluno.municipio, aluno.estado].filter(Boolean).join(', ') || 'N/A'}</p>
            <p><span class="font-medium">Deficiência:</span> ${aluno.deficiencia || 'N/A'}</p>
            <p><span class="font-medium">Escolaridade:</span> ${aluno.escolaridade || 'N/A'} (${aluno.situacao_escolar || 'N/A'})</p>
            <p><span class="font-medium">Situação Ocupacional:</span> ${aluno.situacao_ocupacional || 'N/A'}</p>
          </div>
          <input type="checkbox" class="aluno-checkbox" onchange="toggleCardSelection(this.parentElement)">
        </div>
      `;
    });
  }

  html += `
      </div>
    </section>
  `;
  console.log('HTML final gerado para alunos:', html);
  return html;
}

// Atualizar opções de turmas e turnos no select do modal de aluno
async function updateTurmaOptions() {
  const turmas = await fetchTurmas();
  const turmaSelect = document.getElementById('turma-aluno');
  const turnoSelect = document.getElementById('turno-aluno');

  if (!turmaSelect || !turnoSelect) {
    console.error('Elementos de seleção (turma ou turno) não encontrados:', { turmaSelect, turnoSelect });
    return;
  }

  turmaSelect.innerHTML = '<option value="">Selecione uma turma (opcional)</option>';
  turmas.forEach(turma => {
    turmaSelect.innerHTML += `<option value="${turma.nome}">${turma.nome}</option>`;
  });

  const updateTurnos = () => {
    const selectedTurmaNome = turmaSelect.value;
    const selectedTurma = turmas.find(turma => turma.nome === selectedTurmaNome);
    turnoSelect.innerHTML = '<option value="">Selecione um turno (opcional)</option>';
    if (selectedTurma && selectedTurma.turnos.length > 0) {
      selectedTurma.turnos.forEach(turno => {
        turnoSelect.innerHTML += `<option value="${turno}">${turno}</option>`;
      });
    }
  };

  turmaSelect.addEventListener('change', updateTurnos);
  updateTurnos();
}

// Função para normalizar strings (remover acentos e converter para minúsculas)
function normalizeString(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function fetchAlunosAndRender() {
  const turmaSelect = document.querySelector('.filtro-turmas');
  const turnoSelect = document.querySelector('.filtro-turno');
  const turmaSelecionada = turmaSelect ? turmaSelect.value : 'Todas as turmas';
  const turnoSelecionado = turnoSelect ? turnoSelect.value : 'Todos os turnos';
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = await renderAlunos(turmaSelecionada, turnoSelecionado);
  filtrarAlunos();
}

function filtrarAlunos() {
  const searchInput = document.getElementById('busca-aluno');
  const turmaSelect = document.querySelector('.filtro-turmas');
  const turnoSelect = document.querySelector('.filtro-turno');
  const contentArea = document.getElementById('content-area');

  if (!searchInput || !turmaSelect || !turnoSelect) {
    console.error('Elementos de filtro não encontrados:', { searchInput, turmaSelect, turnoSelect });
    return;
  }

  const searchTerm = normalizeString(searchInput.value.trim());
  const turmaSelecionada = turmaSelect.value;
  const turnoSelecionado = turnoSelect.value;
  console.log('Filtrando alunos com:', { searchTerm, turmaSelecionada, turnoSelecionado });

  
  const cards = document.querySelectorAll('.aluno-card');
  cards.forEach(card => {
    const nome = normalizeString(card.querySelector('h3').textContent.replace(/<[^>]+>/g, ''));
    const matchesSearch = searchTerm === '' || nome.includes(searchTerm);
    card.style.display = matchesSearch ? 'block' : 'none';
  });
}

async function switchTab(tab) {
  const contentArea = document.getElementById('content-area');
  const options = document.querySelectorAll('.tab-option');
  const title = document.getElementById('section-title');
  const controlsContainer = document.getElementById('controls-container');
  const actionButtonsContainer = document.getElementById('action-buttons-container');

  contentArea.innerHTML = '';
  options.forEach(option => option.classList.remove('active'));

  if (tab === 'turmas') {
    document.querySelector('[onclick="switchTab(\'turmas\')"]').classList.add('active');
    title.textContent = 'GERENCIAMENTO DE TURMAS';
    controlsContainer.innerHTML = `
      <div class="filters-section">
        <button class="nova-turma-btn" onclick="openModal('create')">
          <i class="fas fa-folder"></i>
          Nova Turma
        </button>
      </div>
    `;
    actionButtonsContainer.innerHTML = '';
    contentArea.innerHTML = await renderTurmas();
  } else if (tab === 'alunos') {
    document.querySelector('[onclick="switchTab(\'alunos\')"]').classList.add('active');
    title.textContent = 'GERENCIAMENTO DE ALUNOS';
    const turmas = await fetchTurmas();
    let optionsHtml = '<option value="Todas as turmas">Todas as turmas</option>';
    optionsHtml += '<option value="Sem turma">Sem turma</option>';
    turmas.forEach(t => {
      optionsHtml += `<option value="${t.nome}">${t.nome}</option>`;
    });
    controlsContainer.innerHTML = `
      <div class="filters-section">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" id="busca-aluno" placeholder="Buscar aluno..." oninput="filtrarAlunos()">
        </div>
        <select class="filtro-turmas" onchange="fetchAlunosAndRender()">
          ${optionsHtml}
        </select>
        <select class="filtro-turno" onchange="fetchAlunosAndRender()">
          <option value="Todos os turnos">Todos os turnos</option>
          <option value="Manhã">Manhã</option>
          <option value="Tarde">Tarde</option>
          <option value="Noite">Noite</option>
          <option value="Integral">Integral</option>
        </select>
      </div>
    `;
    actionButtonsContainer.innerHTML = `
      <div class="action-buttons-section">
        <button type="button" id="editar-aluno-btn" class="editar-btn" disabled onclick="openEditAlunoModal(document.querySelector('.aluno-card.selected')?.getAttribute('data-id'))">
          <i class="fas fa-user-friends"></i> Editar
        </button>
        <button type="button" id="transferir-aluno-btn" class="transferir-btn" disabled onclick="openTransferModal()">
          <i class="fas fa-arrows-alt"></i> Transferir
        </button>
        <button type="button" id="excluir-aluno-btn" class="excluir-btn" disabled onclick="deleteAluno(document.querySelector('.aluno-card.selected')?.getAttribute('data-id'))">
          <i class="fas fa-user-times"></i> Excluir
        </button>
        <button type="button" class="novo-aluno-btn" onclick="openModal('novo-aluno')">
          <i class="fas fa-user-plus"></i> Novo Aluno
        </button>
      </div>
    `;
    try {
      contentArea.innerHTML = await renderAlunos('Todas as turmas', 'Todos os turnos');
    } catch (error) {
      console.error('Erro ao renderizar alunos:', error);
      contentArea.innerHTML = `
        <section class="alunos-section w-full">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <p class="col-span-full text-center text-gray-500">Erro ao carregar alunos. Verifique o servidor.</p>
          </div>
        </section>
      `;
    }
    const searchInput = document.getElementById('busca-aluno');
    const turmaSelect = document.querySelector('.filtro-turmas');
    const turnoSelect = document.querySelector('.filtro-turno');
    if (searchInput && turmaSelect && turnoSelect) {
      searchInput.addEventListener('input', filtrarAlunos);
      turmaSelect.addEventListener('change', filtrarAlunos);
      turnoSelect.addEventListener('change', filtrarAlunos);
      filtrarAlunos();
    }
  }
}

function openModal(mode) {
  console.log('Abrindo modal com modo:', mode);
  if (mode === 'novo-aluno') {
    modalMode = 'create';
    currentForm = 'aluno';
    currentAlunoId = null;
    const modal = document.getElementById('novo-aluno-modal');
    const title = document.getElementById('novo-aluno-title');
    const actionBtn = document.getElementById('novo-aluno-btn');
    title.textContent = 'Cadastrar Novo Aluno';
    actionBtn.textContent = 'Cadastrar Aluno';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
    document.getElementById('novo-aluno-form').reset();
    updateTurmaOptions();
  } else {
    modalMode = mode;
    currentForm = 'turma';
    const title = document.getElementById('modal-title');
    const actionBtn = document.getElementById('action-btn');
    const form = document.getElementById('turma-form'); // Corrige o ID do formulário
    form.reset();
    if (mode === 'create') {
      title.textContent = 'Criar Nova Turma';
      actionBtn.textContent = 'Criar Turma';
    }
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  }
  console.log('Modo atual após abrir modal:', modalMode);
}

function closeModal(type) {
  if (type !== 'novo-aluno') {
    if (modal) {
      modal.classList.remove('open');
      modal.addEventListener('transitionend', () => {
        modal.style.display = 'none';
        document.getElementById('aluno-form').classList.add('hidden');
        document.getElementById('transfer-form').classList.add('hidden');
        document.getElementById('turma-form').classList.remove('hidden');
      }, { once: true });
    }
  }

  const modalAluno = document.getElementById('novo-aluno-modal');
  if (modalAluno && (type === 'novo-aluno' || !type)) {
    modalAluno.classList.remove('open');
    modalAluno.addEventListener('transitionend', () => {
      modalAluno.style.display = 'none';
    }, { once: true });
  }

  modalMode = 'create';
  currentForm = 'turma';
  currentIndex = null;
  currentAlunoId = null;
  currentTurmaId = null;
  selectedAlunoId = null;
  console.log('Modal fechado. Modo atual:', modalMode, 'ID do aluno:', currentAlunoId, 'ID da turma:', currentTurmaId);
}

function openEditModal(index) {
  modalMode = 'edit';
  currentForm = 'turma';
  currentIndex = index;
  fetchTurmas().then(turmas => {
    const turma = turmas[index];
    currentTurmaId = turma.id;
    const title = document.getElementById('modal-title');
    const actionBtn = document.getElementById('action-btn');
    const form = document.getElementById('turma-form'); // Corrige o ID do formulário
    form.reset();
    document.getElementById('nome-turma').value = turma.nome;
    document.querySelectorAll('input[name="turnos"]').forEach(checkbox => {
      checkbox.checked = turma.turnos.includes(checkbox.value);
    });
    title.textContent = 'Editar Turma';
    actionBtn.textContent = 'Salvar Alterações';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  });
  console.log('Abrindo modal com modo: edit');
  console.log('Modo atual após abrir modal:', modalMode);
}

document.addEventListener('DOMContentLoaded', function() {
  // Inicialização dos elementos do modal com verificação
  modal = document.getElementById('modal');
  modalTitle = document.getElementById('modal-title');
  modalButton = document.getElementById('action-btn');
  transferButton = document.getElementById('transfer-action-btn');

  if (!modal || !modalTitle || !modalButton || !transferButton) {
    console.error('Elementos do modal não encontrados:', { modal, modalTitle, modalButton, transferButton });
    // Removido o alert, apenas log no console
    return;
  }

  // Configura o evento do botão do modal (para turmas)
  modalButton.onclick = () => {
    console.log('Botão do modal clicado. Modo atual:', modalMode);
    if (modalMode === 'create' && currentForm === 'turma') {
      console.log('Botão "Cadastrar Turma" clicado');
      cadastrarTurma();
    } else if (modalMode === 'edit' && currentForm === 'turma') {
      console.log('Botão "Atualizar Turma" clicado');
      atualizarTurma();
    }
  };

  // Configura o evento do botão de transferência
  transferButton.onclick = () => {
    console.log('Botão "Transferir" clicado. Modo atual:', modalMode);
    if (modalMode === 'transfer' && currentForm === 'transfer') {
      transferirAluno();
    }
  };

  // Configura o evento do botão do modal de aluno
  const novoAlunoBtn = document.getElementById('novo-aluno-btn');
  if (novoAlunoBtn) {
    novoAlunoBtn.onclick = () => {
      console.log('Botão do modal de aluno clicado. Modo atual:', modalMode);
      if (modalMode === 'create' && currentForm === 'aluno') {
        cadastrarAluno();
      } else if (modalMode === 'edit' && currentForm === 'aluno') {
        atualizarAluno();
      }
    };
  } else {
    console.error('Botão "novo-aluno-btn" não encontrado no HTML.');
  }

  // Carrega a aba "Gerenciar Turmas" ao iniciar a página
  switchTab('turmas');
});