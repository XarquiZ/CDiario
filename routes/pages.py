from flask import Blueprint, render_template, request, jsonify, current_app
import logging

logger = logging.getLogger(__name__)

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
def index():
    logger.info("Renderizando página inicial: index.html")
    return render_template('index.html')

@pages_bp.route('/painel')
def painel():
    logger.info("Renderizando página do painel: painel.html")
    return render_template('painel.html')

@pages_bp.route('/professor')
def professor():
    logger.info("Renderizando página de seleção de turmas: professor.html")
    return render_template('professor.html')

@pages_bp.route('/turma/<nome>/<turno>')
def turma(nome, turno):
    if not nome or not turno:
        logger.error("Nome da turma ou turno não especificado na rota /turma/<nome>/<turno>")
        return jsonify({'error': 'Nome da turma e turno são obrigatórios na URL'}), 400
    logger.info(f"Renderizando página da turma: turma.html para {nome} ({turno})")
    return render_template('turma.html', turma_nome=nome, turno=turno)

@pages_bp.route('/chamada')
def chamada():
    turma_nome = request.args.get('turma')
    turno = request.args.get('turno')
    if not turma_nome or not turno:
        logger.error(f"Parâmetros obrigatórios ausentes em /chamada: turma={turma_nome}, turno={turno}")
        return jsonify({'error': 'Parâmetros turma e turno são obrigatórios'}), 400
    logger.info(f"Renderizando página de chamada: chamada.html para {turma_nome} ({turno})")
    return render_template('chamada.html', turma_nome=turma_nome, turno=turno)

@pages_bp.route('/chamada-html')
def chamada_html():
    turma_nome = request.args.get('turma')
    turno = request.args.get('turno')
    if not turma_nome or not turno:
        logger.error(f"Parâmetros obrigatórios ausentes em /chamada-html: turma={turma_nome}, turno={turno}")
        return jsonify({'error': 'Parâmetros turma e turno são obrigatórios'}), 400
    logger.info(f"Renderizando chamada HTML para {turma_nome} ({turno})")
    return render_template('chamada.html', turma_nome=turma_nome, turno=turno)

@pages_bp.route('/notas-html')
def notas_html():
    logger.info("Renderizando página de notas: notas.html")
    return render_template('notas.html')

@pages_bp.route('/advertencias-html')
def advertencias_html():
    aluno_nome = request.args.get('aluno')
    turma = request.args.get('turma')
    turno = request.args.get('turno')
    if not turma or not turno:
        logger.error(f"Parâmetros obrigatórios ausentes em /advertencias-html: turma={turma}, turno={turno}")
        return jsonify({'error': 'Parâmetros turma e turno são obrigatórios'}), 400
    logger.info(f"Renderizando página de notificações: advertencias.html para {aluno_nome} ({turma}, {turno})")
    return render_template('advertencias.html', aluno_nome=aluno_nome, turma=turma, turno=turno)

@pages_bp.route('/advertencias-faltas-html')
def advertencias_faltas_html():
    aluno_nome = request.args.get('aluno')
    turma = request.args.get('turma')
    turno = request.args.get('turno')
    if not turma or not turno:
        logger.error(f"Parâmetros obrigatórios ausentes em /advertencias-faltas-html: turma={turma}, turno={turno}")
        return jsonify({'error': 'Parâmetros turma e turno são obrigatórios'}), 400
    logger.info(f"Renderizando página de advertências de faltas: advertencias_faltas.html para {aluno_nome} ({turma}, {turno})")
    return render_template('advertencias_faltas.html', aluno_nome=aluno_nome, turma=turma, turno=turno)

@pages_bp.route('/fichas-individuais-html')
def fichas_individuais_html():
    aluno_nome = request.args.get('aluno')
    turma = request.args.get('turma')
    turno = request.args.get('turno')
    logger.info(f"Renderizando página de fichas individuais: fichas_individuais.html para {aluno_nome} ({turma}, {turno})")
    return render_template('fichas_individuais.html', aluno_nome=aluno_nome, turma=turma, turno=turno)

@pages_bp.route('/boletim-html')
def boletim_html():
    logger.info("Renderizando página de boletim: boletim.html")
    return render_template('boletim.html')

@pages_bp.route('/boletim.js')
def boletim_js():
    logger.info("Servindo arquivo boletim.js")
    return current_app.send_static_file('js/boletim.js')
