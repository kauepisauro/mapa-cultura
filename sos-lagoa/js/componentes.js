// Peças visuais reaproveitadas em várias telas.
import { h, icone, toast } from './ui.js';
import { dataCurta, relativo, hora, parse, MESES_CURTOS } from './datas.js';
import { TIPOS, STATUS, SEM_RESPONSAVEL, situacaoPrazo, avancarStatus, contagemDoEvento } from './logica.js';
import { formEnc, formIdeia, formEvento } from './formularios.js';
import { IDEIA_STATUS } from './logica.js';

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
  return h('div', { class: `cartao-evento${ev.data === hoje ? ' hoje' : ''}${ev.data < hoje ? ' passado' : ''}${ev.destaque ? ' destaque' : ''}${ev.aConfirmar ? ' aconfirmar' : ''}`, style: `--cor:${frente?.cor || 'var(--azul-claro)'}` },
    h('a', { class: 'cartao-link', href: `#/evento/${ev.id}` },
    h('div', { class: 'data-bloco', 'aria-hidden': 'true' }, h('b', {}, d.getDate()), h('span', {}, MESES_CURTOS[d.getMonth()])),
    h('div', { class: 'cartao-corpo' },
      h('strong', { class: 'cartao-titulo' }, ev.titulo),
      h('div', { class: 'meta' },
        h('span', {}, `${dataCurta(ev.data)}${ev.hora ? ` · ${hora(ev.hora)}` : ''}`, ' · ', relativo(ev.data, hoje)),
        ev.local && h('span', { class: 'meta-icone' }, icone('local'), ev.local)),
      h('div', { class: 'selos' }, ev.destaque && h('span', { class: 'selo selo-destaque' }, '⭐ Destaque'), ev.aConfirmar && h('span', { class: 'selo selo-confirmar' }, 'A confirmar'),
        ev.tipo !== 'reuniao' && h('span', { class: 'selo' }, TIPOS[ev.tipo].nome), seloFrente(ctx.estado, ev.frente),
        ev.exemplo && h('span', { class: 'selo selo-exemplo' }, 'exemplo'))),
    mostrarContagem && c.total > 0 && h('div', { class: 'contagem', title: `${c.feitos} de ${c.total} encaminhamentos feitos` }, h('b', {}, `${c.feitos}/${c.total}`), h('span', {}, 'feitos'))),
    h('button', { class: 'btn-icone btn-editar', type: 'button', 'aria-label': `Editar: ${ev.titulo}`, onclick: () => formEvento(ctx, { evento: ev }) }, icone('editar')));
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
        enc.paraTodos
          ? h('span', { class: 'selo selo-pessoa' }, 'Todo mundo')
          : enc.responsaveis.length
            ? enc.responsaveis.map((p) => h('span', { class: 'selo selo-pessoa' }, p))
            : h('span', { class: 'selo selo-alerta' }, SEM_RESPONSAVEL),
        sit === 'atrasado' && h('span', { class: 'selo selo-atrasado' }, `Atrasado · ${dataCurta(enc.prazo)}`),
        sit === 'hoje' && h('span', { class: 'selo selo-hoje' }, 'Hoje'),
        (sit === 'semana' || sit === 'futuro' || (sit === 'feito' && enc.prazo)) && h('span', { class: 'selo' }, `Até ${dataCurta(enc.prazo)}`),
        seloFrente(estado, enc.frente),
        evOrigem && h('span', { class: 'selo selo-origem' }, `de: ${evOrigem.titulo}`),
        enc.exemplo && h('span', { class: 'selo selo-exemplo' }, 'exemplo'))),
    h('button', { class: 'btn-icone btn-editar', type: 'button', 'aria-label': `Editar: ${enc.texto}`, onclick: () => formEnc(ctx, { enc }) }, icone('editar')));
}

export function cartaoIdeia(ctx, ideia) {
  const { estado } = ctx;
  const frente = frenteDe(estado, ideia.frente);
  const origem = ideia.origem && estado.eventos.find((e) => e.id === ideia.origem);
  return h('button', { class: `cartao-ideia st-${ideia.status}`, type: 'button', style: `--cor:${frente?.cor || 'var(--ouro)'}`, onclick: () => formIdeia(ctx, { ideia }) },
    h('span', { class: 'ideia-ico', 'aria-hidden': 'true' }, icone('ideia')),
    h('span', { class: 'cartao-corpo' },
      h('span', { class: 'cartao-titulo' }, ideia.titulo),
      ideia.notas && h('span', { class: 'ideia-notas' }, ideia.notas),
      h('span', { class: 'selos' },
        ideia.status !== 'nova' && h('span', { class: 'selo' }, IDEIA_STATUS[ideia.status].nome),
        seloFrente(estado, ideia.frente),
        ideia.interessados.length > 0 && h('span', { class: 'selo selo-pessoa' }, `Quer puxar: ${ideia.interessados.join(', ')}`),
        origem && h('span', { class: 'selo selo-origem' }, `de: ${origem.titulo}`))),
    h('span', { class: 'btn-editar dica-editar', 'aria-hidden': 'true' }, icone('editar')));
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
