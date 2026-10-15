// Lista de reuniões: próximas e anteriores.
import { h, icone } from '../ui.js';
import { proximosEventos, eventosPassados } from '../logica.js';
import { cartaoEvento, secao, vazio, chipsFrente } from '../componentes.js';
import { formEvento } from '../formularios.js';

export function renderReunioes(ctx) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const ui = ctx.ui.reunioes;
  const filtro = { tipo: 'reuniao', frente: ui.frente };
  const prox = proximosEventos(estado, hoje, filtro);
  const passadas = eventosPassados(estado, hoje, filtro);
  const nova = () => formEvento(ctx, { tipo: 'reuniao', frente: ui.frente });
  const raiz = h('div', { class: 'tela' },
    h('div', { class: 'tela-topo' }, h('h1', {}, 'Reuniões'), h('button', { class: 'btn primario', type: 'button', onclick: nova }, icone('mais'), 'Nova reunião')),
    chipsFrente(estado, ui.frente, (id) => { ui.frente = id; ctx.render(); }),
    secao('Próximas', prox.length ? h('div', { class: 'lista' }, prox.map((e) => cartaoEvento(ctx, e)))
      : vazio('Nenhuma reunião marcada', 'Marque a próxima para o pessoal se organizar.', h('button', { class: 'btn primario', type: 'button', onclick: nova }, 'Marcar reunião')),
    { contagem: prox.length || null }),
  );
  if (passadas.length) raiz.append(secao('Anteriores', h('div', { class: 'lista' }, passadas.slice(0, 30).map((e) => cartaoEvento(ctx, e))), { contagem: passadas.length }));
  return raiz;
}
