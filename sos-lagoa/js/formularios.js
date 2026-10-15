// Formulários (folhas que sobem de baixo): evento/reunião, encaminhamento, frente e o menu "Novo".
import { h, icone, folha, campo, seletorPessoas, confirmar, toast } from './ui.js';
import { CORES_FRENTE } from './config.js';
import { valida, somarDias } from './datas.js';
import { TIPOS, STATUS, novoId, garantirPessoas } from './logica.js';

const opcoesFrente = (estado, atual) => [
  h('option', { value: '' }, '— nenhuma —'),
  ...estado.frentes.map((f) => h('option', { value: f.id, selected: f.id === atual }, f.nome)),
];

// ---------- evento / reunião ----------
export function formEvento(ctx, { evento, dia, tipo, frente: frenteInicial = '' } = {}) {
  const { estado } = ctx;
  const novo = !evento;
  let tipoAtual = evento?.tipo || tipo || 'reuniao';
  const titulo = h('input', { class: 'campo-input', required: true, maxlength: '140', value: evento?.titulo || '', placeholder: 'Ex.: Reunião geral, Ato na ponte, Audiência…' });
  const data = h('input', { class: 'campo-input', type: 'date', required: true, value: evento?.data || dia || ctx.hoje() });
  const horaEl = h('input', { class: 'campo-input', type: 'time', value: evento ? evento.hora : '19:00' });
  const local = h('input', { class: 'campo-input', maxlength: '200', value: evento?.local || '', placeholder: 'Onde vai ser?' });
  const frente = h('select', { class: 'campo-input' }, opcoesFrente(estado, evento ? evento.frente : frenteInicial));
  const notas = h('textarea', { class: 'campo-input', rows: '3', maxlength: '4000', placeholder: 'O que a pessoa precisa saber? (ponto de encontro, o que levar…)' }, evento?.notas || '');

  const tipos = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Tipo' });
  const marcarTipo = (t) => {
    tipoAtual = t;
    [...tipos.children].forEach((b) => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-checked', String(b.dataset.t === t)); });
    if (novo && !titulo.value.trim()) titulo.placeholder = t === 'reuniao' ? 'Ex.: Reunião geral' : TIPOS[t].nome;
  };
  Object.entries(TIPOS).forEach(([t, { nome }]) => tipos.append(h('button', { type: 'button', class: 'chip', 'data-t': t, role: 'radio', onclick: () => marcarTipo(t) }, nome)));
  marcarTipo(tipoAtual);

  folha(novo ? 'Novo no calendário' : 'Editar', (fechar) => h('form', {
    class: 'pilha',
    onsubmit: (e) => {
      e.preventDefault();
      if (!valida(data.value)) { toast('Escolha uma data válida.'); return; }
      const campos = { titulo: titulo.value.trim() || TIPOS[tipoAtual].nome, tipo: tipoAtual, data: data.value, hora: horaEl.value, local: local.value.trim(), frente: frente.value, notas: notas.value.trim() };
      let id = evento?.id;
      ctx.store.atualizar((s) => {
        if (novo) { id = novoId(); s.eventos.push({ id, ...campos, pauta: '', presentes: [], ata: '' }); } else Object.assign(s.eventos.find((x) => x.id === id), campos);
      });
      fechar();
      if (novo) ctx.ir(`#/evento/${id}`);
      toast(novo ? 'Adicionado ao calendário.' : 'Salvo.');
    },
  },
  h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'O que é'), tipos),
  campo('Nome', titulo),
  h('div', { class: 'duas' }, campo('Dia', data), campo('Horário', horaEl, 'Deixe vazio se for o dia todo.')),
  campo('Local', local),
  campo('Frente', frente),
  campo(tipoAtual === 'reuniao' ? 'Observações' : 'Detalhes', notas),
  h('div', { class: 'linha-botoes' },
    !novo && h('button', { class: 'btn perigo-suave', type: 'button', onclick: async () => {
      if (!(await confirmar('Apagar do calendário?', `“${evento.titulo}” será apagado. Os encaminhamentos dele continuam existindo, só perdem o vínculo.`))) return;
      ctx.store.atualizar((s) => { s.eventos = s.eventos.filter((x) => x.id !== evento.id); s.encaminhamentos.forEach((x) => { if (x.origem === evento.id) x.origem = ''; }); });
      fechar();
      ctx.ir('#/calendario');
      toast('Apagado.');
    } }, icone('lixeira'), 'Apagar'),
    h('button', { class: 'btn primario grande', type: 'submit' }, 'Salvar'))));
}

// ---------- encaminhamento ----------
export function formEnc(ctx, { enc, origem = '', frente: frenteInicial = '', pessoa = '' } = {}) {
  const { estado } = ctx;
  const novo = !enc;
  const texto = h('textarea', { class: 'campo-input', rows: '3', required: true, maxlength: '600', placeholder: 'O que precisa ser feito? Ex.: Imprimir 200 cartazes' }, enc?.texto || '');
  const quem = seletorPessoas(estado.pessoas, enc ? enc.responsaveis : (pessoa ? [pessoa] : []), { rotulo: 'Quem vai fazer?' });
  const prazo = h('input', { class: 'campo-input', type: 'date', value: enc?.prazo || '' });
  const frente = h('select', { class: 'campo-input' }, opcoesFrente(estado, enc ? enc.frente : frenteInicial));
  let status = enc?.status || 'fazer';
  const botoesStatus = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Andamento' });
  const marcarStatus = (s) => { status = s; [...botoesStatus.children].forEach((b) => { b.classList.toggle('on', b.dataset.s === s); b.setAttribute('aria-checked', String(b.dataset.s === s)); }); };
  Object.entries(STATUS).forEach(([s, { nome }]) => botoesStatus.append(h('button', { type: 'button', class: 'chip', 'data-s': s, role: 'radio', onclick: () => marcarStatus(s) }, nome)));
  marcarStatus(status);
  const atalho = (rotulo, dias) => h('button', { type: 'button', class: 'chip', onclick: () => { prazo.value = dias == null ? '' : somarDias(ctx.hoje(), dias); } }, rotulo);
  const origemEv = (enc ? enc.origem : origem) && estado.eventos.find((e) => e.id === (enc ? enc.origem : origem));

  const salvar = (e, outro) => {
    e.preventDefault();
    const t = texto.value.trim();
    if (!t) { toast('Escreva o que precisa ser feito.'); return false; }
    const responsaveis = quem.valor();
    const hoje = ctx.hoje();
    ctx.store.atualizar((s) => {
      garantirPessoas(s, responsaveis);
      if (novo) {
        s.encaminhamentos.push({ id: novoId(), texto: t, responsaveis, prazo: prazo.value, status, frente: frente.value, origem, criadoEm: hoje, feitoEm: status === 'feito' ? hoje : '' });
      } else {
        const x = s.encaminhamentos.find((i) => i.id === enc.id);
        Object.assign(x, { texto: t, responsaveis, prazo: prazo.value, frente: frente.value });
        if (x.status !== status) { x.status = status; x.feitoEm = status === 'feito' ? hoje : ''; }
      }
    });
    toast(novo ? 'Encaminhamento adicionado.' : 'Salvo.');
    return true;
  };

  folha(novo ? 'Novo encaminhamento' : 'Encaminhamento', (fechar) => h('form', {
    class: 'pilha',
    onsubmit: (e) => { if (salvar(e)) fechar(); },
  },
  origemEv && h('p', { class: 'dica' }, `Vem de: ${origemEv.titulo}`),
  campo('O que precisa ser feito', texto),
  quem.el,
  h('div', { class: 'campo' },
    h('span', { class: 'campo-rotulo' }, 'Até quando?'),
    h('div', { class: 'chips' }, atalho('Hoje', 0), atalho('Amanhã', 1), atalho('Em 1 semana', 7), atalho('Em 2 semanas', 14), atalho('Sem prazo', null)),
    prazo),
  campo('Frente', frente),
  !novo && h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Andamento'), botoesStatus),
  h('div', { class: 'linha-botoes' },
    !novo && h('button', { class: 'btn perigo-suave', type: 'button', onclick: async () => {
      if (!(await confirmar('Apagar encaminhamento?', `“${enc.texto}”`))) return;
      ctx.store.atualizar((s) => { s.encaminhamentos = s.encaminhamentos.filter((x) => x.id !== enc.id); });
      fechar();
      toast('Apagado.');
    } }, icone('lixeira'), 'Apagar'),
    novo && origem && h('button', { class: 'btn', type: 'button', onclick: (e) => {
      if (salvar(e)) { fechar(); formEnc(ctx, { origem, frente: frenteInicial }); }
    } }, 'Salvar e adicionar outro'),
    h('button', { class: 'btn primario grande', type: 'submit' }, 'Salvar'))));
}

// ---------- frente ----------
export function formFrente(ctx, { frente } = {}) {
  const novo = !frente;
  const nome = h('input', { class: 'campo-input', required: true, maxlength: '60', value: frente?.nome || '', placeholder: 'Ex.: Comunicação' });
  const desc = h('textarea', { class: 'campo-input', rows: '2', maxlength: '400', placeholder: 'O que essa frente faz?' }, frente?.descricao || '');
  let cor = frente?.cor || CORES_FRENTE[ctx.estado.frentes.length % CORES_FRENTE.length];
  const cores = h('div', { class: 'cores', role: 'radiogroup', 'aria-label': 'Cor da frente' });
  const marcar = (c) => { cor = c; [...cores.children].forEach((b) => { b.classList.toggle('on', b.dataset.c === c); b.setAttribute('aria-checked', String(b.dataset.c === c)); }); };
  CORES_FRENTE.forEach((c) => cores.append(h('button', { type: 'button', class: 'cor', role: 'radio', 'data-c': c, style: `--cor:${c}`, 'aria-label': `Cor ${c}`, onclick: () => marcar(c) })));
  marcar(cor);
  const coord = seletorPessoas(ctx.estado.pessoas, frente?.coordenacao || [], { rotulo: 'Quem puxa essa frente?' });

  folha(novo ? 'Nova frente' : 'Editar frente', (fechar) => h('form', {
    class: 'pilha',
    onsubmit: (e) => {
      e.preventDefault();
      const coordenacao = coord.valor();
      ctx.store.atualizar((s) => {
        garantirPessoas(s, coordenacao);
        const campos = { nome: nome.value.trim(), descricao: desc.value.trim(), cor, coordenacao };
        if (novo) s.frentes.push({ id: novoId(), ...campos }); else Object.assign(s.frentes.find((x) => x.id === frente.id), campos);
      });
      fechar();
      toast('Frente salva.');
    },
  },
  campo('Nome', nome), campo('Descrição', desc),
  h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Cor'), cores),
  coord.el,
  h('div', { class: 'linha-botoes' },
    !novo && h('button', { class: 'btn perigo-suave', type: 'button', onclick: async () => {
      if (!(await confirmar('Apagar frente?', `“${frente.nome}” será apagada. Reuniões e encaminhamentos continuam, só ficam sem frente.`))) return;
      ctx.store.atualizar((s) => {
        s.frentes = s.frentes.filter((x) => x.id !== frente.id);
        [...s.eventos, ...s.encaminhamentos].forEach((x) => { if (x.frente === frente.id) x.frente = ''; });
      });
      fechar();
      if (location.hash.startsWith('#/frente/')) ctx.ir('#/frentes');
    } }, icone('lixeira'), 'Apagar'),
    h('button', { class: 'btn primario grande', type: 'submit' }, 'Salvar'))));
}

// ---------- botão "+" ----------
export function menuNovo(ctx, { dia = '', frente = '' } = {}) {
  folha('O que você quer registrar?', (fechar) => {
    const opcao = (iconeNome, titulo, sub, fn) => h('button', { type: 'button', class: 'opcao-grande', onclick: () => { fechar(); fn(); } },
      h('span', { class: 'opcao-ico' }, icone(iconeNome)), h('span', {}, h('strong', {}, titulo), h('small', {}, sub)));
    return h('div', { class: 'pilha' },
      opcao('pessoas', 'Reunião', 'Data, pauta, quem veio e encaminhamentos', () => formEvento(ctx, { tipo: 'reuniao', dia, frente })),
      opcao('calendario', 'Ato, audiência ou outra data', 'Entra no calendário de luta', () => formEvento(ctx, { tipo: 'ato', dia, frente })),
      opcao('lista', 'Encaminhamento', 'Uma tarefa: o quê, quem e até quando', () => formEnc(ctx, { frente })));
  });
}
