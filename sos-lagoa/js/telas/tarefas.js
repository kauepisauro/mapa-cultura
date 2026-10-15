// Encaminhamentos: quadro (a fazer / fazendo / feito) ou "quem vai fazer o quê".
import { h, icone, copiar } from '../ui.js';
import { STATUS, SEM_RESPONSAVEL, filtrarEncaminhamentos, ordenarEncaminhamentos, porPessoa, situacaoPrazo } from '../logica.js';
import { cartaoEnc, chipsFrente, vazio } from '../componentes.js';
import { formEnc } from '../formularios.js';
import { resumoPendencias } from '../texto.js';

export function renderTarefas(ctx) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const ui = ctx.ui.tarefas;
  const mudar = (campos) => { Object.assign(ui, campos); ctx.render(); };
  const filtro = { pessoa: ui.pessoa, frente: ui.frente };
  let todos = filtrarEncaminhamentos(estado, filtro);
  if (ui.somenteAtrasados) todos = todos.filter((e) => situacaoPrazo(e, hoje) === 'atrasado');

  const novo = () => formEnc(ctx, { frente: ui.frente, pessoa: ui.pessoa && ui.pessoa !== SEM_RESPONSAVEL ? ui.pessoa : '' });

  const seletorPessoa = h('select', { class: 'campo-input compacto', 'aria-label': 'Filtrar por pessoa', onchange: (e) => mudar({ pessoa: e.target.value, somenteAtrasados: false }) },
    h('option', { value: '' }, 'Todas as pessoas'),
    h('option', { value: SEM_RESPONSAVEL, selected: ui.pessoa === SEM_RESPONSAVEL }, 'Sem responsável'),
    estado.pessoas.map((p) => h('option', { value: p, selected: ui.pessoa === p }, p)));

  const raiz = h('div', { class: 'tela' },
    h('div', { class: 'tela-topo' }, h('h1', {}, 'Encaminhamentos'), h('button', { class: 'btn primario', type: 'button', onclick: novo }, icone('mais'), 'Novo')),
    h('div', { class: 'filtros' },
      h('div', { class: 'segmentado', role: 'tablist' }, [['quadro', 'Quadro'], ['pessoa', 'Quem faz o quê']].map(([v, r]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.vista === v), class: ui.vista === v ? 'on' : '', onclick: () => mudar({ vista: v }) }, r))),
      seletorPessoa),
    chipsFrente(estado, ui.frente, (id) => mudar({ frente: id })),
    ui.somenteAtrasados && h('button', { class: 'chip on aviso-chip', type: 'button', onclick: () => mudar({ somenteAtrasados: false }) }, 'Só atrasados  ✕'));

  if (!estado.encaminhamentos.length) {
    raiz.append(vazio('Nenhum encaminhamento ainda', 'Durante a reunião, registre cada tarefa combinada: o quê, quem e até quando.', h('button', { class: 'btn primario', type: 'button', onclick: novo }, 'Registrar o primeiro')));
    return raiz;
  }

  if (ui.vista === 'quadro') {
    const colunas = Object.keys(STATUS).map((s) => {
      let itens = todos.filter((e) => e.status === s);
      itens = s === 'feito' ? itens.sort((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || '')) : ordenarEncaminhamentos(itens, hoje);
      return { s, itens };
    });
    raiz.append(h('div', { class: 'segmentado abas-coluna', role: 'tablist' }, colunas.map(({ s, itens }) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.col === s), class: ui.col === s ? 'on' : '', onclick: () => mudar({ col: s }) }, `${STATUS[s].nome} `, h('span', { class: 'contador' }, itens.length)))));
    raiz.append(h('div', { class: 'quadro', 'data-col': ui.col }, colunas.map(({ s, itens }) =>
      h('section', { class: `coluna c-${s}`, 'data-c': s, 'aria-label': STATUS[s].nome },
        h('h3', {}, STATUS[s].nome, h('span', { class: 'contador' }, itens.length)),
        itens.length ? h('div', { class: 'lista' }, itens.slice(0, 40).map((e) => cartaoEnc(ctx, e)))
          : h('p', { class: 'vazio-linha' }, s === 'fazer' ? 'Nada a fazer. 🎉' : s === 'fazendo' ? 'Nada em andamento.' : 'Nada concluído ainda.')))));
  } else {
    const grupos = porPessoa(estado, hoje, filtro).map((g) => ({ ...g, itens: ui.somenteAtrasados ? g.itens.filter((e) => situacaoPrazo(e, hoje) === 'atrasado') : g.itens })).filter((g) => g.itens.length);
    if (grupos.length) {
      raiz.append(h('div', { class: 'linha-botoes solta' }, h('button', { class: 'btn', type: 'button', onclick: () => copiar(resumoPendencias(estado, hoje, filtro)) }, icone('copiar'), 'Copiar lista para o WhatsApp')));
    }
    raiz.append(...(grupos.length ? grupos.map((g) => h('section', { class: `secao grupo-pessoa${g.pessoa === SEM_RESPONSAVEL ? ' sem-dono' : ''}` },
      h('div', { class: 'secao-topo' },
        h('h2', {}, h('span', { class: 'avatar', 'aria-hidden': 'true' }, g.pessoa === SEM_RESPONSAVEL ? '?' : g.pessoa.charAt(0).toUpperCase()), g.pessoa, h('span', { class: 'contador' }, g.itens.length)),
        g.pessoa !== SEM_RESPONSAVEL && h('button', { class: 'btn pequeno', type: 'button', onclick: () => formEnc(ctx, { pessoa: g.pessoa, frente: ui.frente }) }, icone('mais'))),
      h('div', { class: 'lista' }, g.itens.map((e) => cartaoEnc(ctx, e)))))
      : [vazio('Tudo em dia', 'Nenhum encaminhamento em aberto com esse filtro.')]));
  }
  return raiz;
}
