// Banco de ideias: possibilidades que surgiram nas reuniões e ainda não viraram ação.
import { h, icone } from '../ui.js';
import { filtrarIdeias } from '../logica.js';
import { cartaoIdeia, chipsFrente, vazio } from '../componentes.js';
import { formIdeia } from '../formularios.js';

const GRUPOS = [['mesa', 'Na mesa'], ['virou', 'Viraram ação'], ['arquivada', 'Arquivadas']];

export function renderIdeias(ctx) {
  const { estado } = ctx;
  const ui = ctx.ui.ideias;
  const nova = () => formIdeia(ctx, { frente: ui.frente });
  const lista = filtrarIdeias(estado, { frente: ui.frente, grupo: ui.grupo });
  const contar = (g) => filtrarIdeias(estado, { frente: ui.frente, grupo: g }).length;
  const raiz = h('div', { class: 'tela' },
    h('div', { class: 'tela-topo' }, h('h1', {}, 'Ideias'), h('button', { class: 'btn primario', type: 'button', onclick: nova }, icone('mais'), 'Nova ideia')),
    h('p', { class: 'intro' }, 'Possibilidades que surgiram nas reuniões. Quando uma ideia amadurecer, vire encaminhamento ou data no calendário.'),
    h('div', { class: 'segmentado cheio', role: 'tablist' }, GRUPOS.map(([g, r]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.grupo === g), class: ui.grupo === g ? 'on' : '', onclick: () => { ui.grupo = g; ctx.render(); } }, `${r} `, h('span', { class: 'contador' }, contar(g))))),
    chipsFrente(estado, ui.frente, (id) => { ui.frente = id; ctx.render(); }));
  raiz.append(lista.length ? h('div', { class: 'lista' }, lista.map((i) => cartaoIdeia(ctx, i)))
    : vazio(ui.grupo === 'mesa' ? 'Nenhuma ideia na mesa' : 'Nada por aqui', ui.grupo === 'mesa' ? 'Anote o que surgir na reunião, mesmo que ainda seja só um “e se…”.' : null,
      ui.grupo === 'mesa' ? h('button', { class: 'btn primario', type: 'button', onclick: nova }, 'Anotar uma ideia') : null));
  return raiz;
}
