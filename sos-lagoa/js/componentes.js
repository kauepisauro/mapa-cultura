// Peças visuais reaproveitadas em várias telas.
import { h, icone, toast } from './ui.js';
import { dataCurta, relativo, hora, parse, MESES_CURTOS } from './datas.js';
import { TIPOS, STATUS, SEM_RESPONSAVEL, situacaoPrazo, avancarStatus, contagemDoEvento } from './logica.js';
import { formEnc } from './formularios.js';

export const frenteDe = (estado, id) => estado.frentes.find((f) => f.id === id);

export function seloFrente(estado, id) {
  const f = frenteDe(estado, id);
  return f ? h('span', { class: 'selo selo-frente', style: `--cor:${f.cor}` }, f.nome) : null;
}

export function cartaoEvento(ctx, ev, { mostrarContagem = true } = {}) {
  const hoje = ctx.hoje();
  const d = parse(ev.data);
  const c = contagemDoEvento(ctx.estado, ev.id);
  const frente = frenteDe(ctx.estado, ev.frente);
  return h('a', { class: `cartao-evento${ev.data === hoje ? ' hoje' : ''}${ev.data < hoje ? ' passado' : ''}`, href: `#/evento/${ev.id}`, style: `--cor:${frente?.cor || 'var(--azul-claro)'}` },
    h('div', { class: 'data-bloco', 'aria-hidden': 'true' }, h('b', {}, d.getDate()), h('span', {}, MESES_CURTOS[d.getMonth()])),
    h('div', { class: 'cartao-corpo' },
      h('strong', { class: 'cartao-titulo' }, ev.titulo),
      h('div', { class: 'meta' },
        h('span', {}, `${dataCurta(ev.data)}${ev.hora ? ` · ${hora(ev.hora)}` : ''}`, ' · ', relativo(ev.data, hoje)),
        ev.local && h('span', { class: 'meta-icone' }, icone('local'), ev.local)),
      h('div', { class: 'selos' }, ev.tipo !== 'reuniao' && h('span', { class: 'selo' }, TIPOS[ev.tipo].nome), seloFrente(ctx.estado, ev.frente),
        ev.exemplo && h('span', { class: 'selo selo-exemplo' }, 'exemplo'))),
    mostrarContagem && c.total > 0 && h('div', { class: 'contagem', title: `${c.feitos} de ${c.total} encaminhamentos feitos` }, h('b', {}, `${c.feitos}/${c.total}`), h('span', {}, 'feitos')));
}

const ROTULO_STATUS = { fazer: 'A fazer', fazendo: 'Fazendo', feito: 'Feito' };

export function cartaoEnc(ctx, enc, { origem = true } = {}) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const sit = situacaoPrazo(enc, hoje);
  const evOrigem = origem && enc.origem ? estado.eventos.find((e) => e.id === enc.origem) : null;
  const frente = frenteDe(estado, enc.frente);

  const avancar = (e) => {
    e.stopPropagation();
    const antes = { status: enc.status, feitoEm: enc.feitoEm };
    ctx.store.atualizar((s) => avancarStatus(s.encaminhamentos.find((x) => x.id === enc.id), hoje));
    const depois = STATUS[antes.status].proximo;
    toast(`“${enc.texto.length > 40 ? `${enc.texto.slice(0, 40)}…` : enc.texto}” → ${ROTULO_STATUS[depois]}`, {
      rotulo: 'Desfazer',
      fn: () => ctx.store.atualizar((s) => Object.assign(s.encaminhamentos.find((x) => x.id === enc.id), antes)),
    });
  };

  return h('div', { class: `cartao-enc s-${enc.status} p-${sit}`, style: `--cor:${frente?.cor || 'transparent'}` },
    h('button', {
      class: `status-btn s-${enc.status}`, type: 'button', onclick: avancar,
      'aria-label': `${ROTULO_STATUS[enc.status]}. Toque para marcar como ${ROTULO_STATUS[STATUS[enc.status].proximo].toLowerCase()}`,
    }, enc.status === 'feito' ? icone('ok') : enc.status === 'fazendo' ? h('span', { class: 'meia' }) : null),
    h('button', { class: 'cartao-corpo', type: 'button', onclick: () => formEnc(ctx, { enc }) },
      h('span', { class: 'cartao-titulo' }, enc.texto),
      h('span', { class: 'selos' },
        enc.responsaveis.length
          ? enc.responsaveis.map((p) => h('span', { class: 'selo selo-pessoa' }, p))
          : h('span', { class: 'selo selo-alerta' }, SEM_RESPONSAVEL),
        sit === 'atrasado' && h('span', { class: 'selo selo-atrasado' }, `Atrasado · ${dataCurta(enc.prazo)}`),
        sit === 'hoje' && h('span', { class: 'selo selo-hoje' }, 'Hoje'),
        (sit === 'semana' || sit === 'futuro' || (sit === 'feito' && enc.prazo)) && h('span', { class: 'selo' }, `Até ${dataCurta(enc.prazo)}`),
        seloFrente(estado, enc.frente),
        evOrigem && h('span', { class: 'selo selo-origem' }, `de: ${evOrigem.titulo}`),
        enc.exemplo && h('span', { class: 'selo selo-exemplo' }, 'exemplo'))));
}

export function chipsFrente(estado, ativa, aoMudar) {
  const um = (id, nome, cor) => h('button', {
    type: 'button', class: `chip${ativa === id ? ' on' : ''}`, 'aria-pressed': String(ativa === id), style: cor ? `--cor:${cor}` : null,
    onclick: () => aoMudar(id),
  }, cor && h('i', { class: 'ponto' }), nome);
  return h('div', { class: 'chips rolavel', role: 'group', 'aria-label': 'Filtrar por frente' },
    um('', 'Todas'), estado.frentes.map((f) => um(f.id, f.nome, f.cor)));
}

export function vazio(titulo, texto, acao) {
  return h('div', { class: 'vazio' },
    h('div', { class: 'vazio-sol', 'aria-hidden': 'true' }),
    h('strong', {}, titulo), texto && h('p', {}, texto), acao);
}

export function secao(titulo, conteudo, { acao, contagem } = {}) {
  return h('section', { class: 'secao' },
    h('div', { class: 'secao-topo' }, h('h2', {}, titulo, contagem != null && h('span', { class: 'contador' }, contagem)), acao),
    conteudo);
}
