// Frentes de atuação: lista e página de cada uma.
import { h, icone } from '../ui.js';
import { proximosEventos, filtrarEncaminhamentos, ordenarEncaminhamentos, situacaoPrazo } from '../logica.js';
import { cartaoEvento, cartaoEnc, secao, vazio } from '../componentes.js';
import { formFrente, formEnc, formEvento } from '../formularios.js';

export function renderFrentes(ctx) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const nova = () => formFrente(ctx);
  const raiz = h('div', { class: 'tela' },
    h('div', { class: 'tela-topo' }, h('h1', {}, 'Frentes'), h('button', { class: 'btn primario', type: 'button', onclick: nova }, icone('mais'), 'Nova frente')),
    h('p', { class: 'intro' }, 'Cada frente cuida de uma parte da luta. Renomeie, troque as cores ou crie as frentes do jeito que o movimento se organiza.'));
  if (!estado.frentes.length) {
    raiz.append(vazio('Nenhuma frente ainda', 'Crie a primeira para organizar reuniões e tarefas.', h('button', { class: 'btn primario', type: 'button', onclick: nova }, 'Criar frente')));
    return raiz;
  }
  raiz.append(h('div', { class: 'grade-frentes' }, estado.frentes.map((f) => {
    const abertos = filtrarEncaminhamentos(estado, { frente: f.id, status: 'aberto' });
    const atrasados = abertos.filter((e) => situacaoPrazo(e, hoje) === 'atrasado').length;
    const prox = proximosEventos(estado, hoje, { frente: f.id });
    return h('div', { class: 'cartao frente-cartao', style: `--cor:${f.cor}` },
      h('a', { class: 'frente-link', href: `#/frente/${f.id}` },
        h('strong', { class: 'frente-nome' }, f.nome),
        f.descricao && h('p', {}, f.descricao),
        f.coordenacao.length > 0 && h('div', { class: 'selos' }, f.coordenacao.map((p) => h('span', { class: 'selo selo-pessoa' }, p))),
        h('div', { class: 'frente-numeros' },
          h('span', {}, h('b', {}, abertos.length), ' em aberto'),
          atrasados > 0 && h('span', { class: 'alerta-texto' }, h('b', {}, atrasados), ' atrasado', atrasados > 1 ? 's' : ''),
          h('span', {}, h('b', {}, prox.length), ' no calendário'))),
      h('button', { class: 'btn-icone btn-editar', type: 'button', 'aria-label': `Editar: ${f.nome}`, onclick: () => formFrente(ctx, { frente: f }) }, icone('editar')));
  })));
  return raiz;
}

export function renderFrente(ctx, id) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const f = estado.frentes.find((x) => x.id === id);
  if (!f) return h('div', { class: 'tela' }, vazio('Frente não encontrada', null, h('a', { class: 'btn', href: '#/frentes' }, 'Ver todas as frentes')));
  const evs = proximosEventos(estado, hoje, { frente: id });
  const encs = ordenarEncaminhamentos(filtrarEncaminhamentos(estado, { frente: id, status: 'aberto' }), hoje);
  return h('div', { class: 'tela' },
    h('a', { class: 'voltar', href: '#/frentes' }, icone('esq'), 'Frentes'),
    h('section', { class: 'evento-cab', style: `--cor:${f.cor}` },
      h('h1', {}, f.nome),
      f.descricao && h('p', { class: 'evento-notas' }, f.descricao),
      f.coordenacao.length > 0 && h('div', { class: 'selos' }, h('span', { class: 'dica' }, 'Puxam:'), f.coordenacao.map((p) => h('span', { class: 'selo selo-pessoa' }, p))),
      h('div', { class: 'linha-botoes solta' }, h('button', { class: 'btn', type: 'button', onclick: () => formFrente(ctx, { frente: f }) }, icone('editar'), 'Editar frente'))),
    secao('Encaminhamentos em aberto', encs.length ? h('div', { class: 'lista' }, encs.map((e) => cartaoEnc(ctx, e))) : h('p', { class: 'vazio-linha' }, 'Nada em aberto nesta frente.'),
      { contagem: encs.length || null, acao: h('button', { class: 'btn primario pequeno', type: 'button', onclick: () => formEnc(ctx, { frente: id }) }, icone('mais'), 'Novo') }),
    secao('No calendário', evs.length ? h('div', { class: 'lista' }, evs.map((e) => cartaoEvento(ctx, e))) : h('p', { class: 'vazio-linha' }, 'Nenhum compromisso marcado.'),
      { acao: h('button', { class: 'btn pequeno', type: 'button', onclick: () => formEvento(ctx, { frente: id }) }, icone('mais'), 'Marcar') }));
}
