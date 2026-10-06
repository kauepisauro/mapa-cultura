// Construtores de HTML do painel (cards, agenda, ficha de detalhe). Sem estado.
import { CATEGORIAS, cat, icone } from './categorias.js';
import { capa } from './arte.js';
import { dataCurta, dataNumero, esc, hora, kmTexto, linkInstagram, linkRota, linkSite, linkWhatsapp, parseVideo, recorrenciaTexto, rotuloDia } from './utils.js';
import { ehGratis } from './eventos.js';

const svg = (d, t = 18) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  pin: svg('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  insta: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8h.01"/>'),
  whats: svg('<path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19Z"/><path d="M9 9.5c.3 2.2 2.3 4.2 5 5l1.3-1.2-1.8-1.1-.8.6a4 4 0 0 1-1.7-1.7l.6-.8-1.1-1.8Z"/>'),
  globo: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'),
  agenda: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/>'),
  enviar: svg('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  voltar: svg('<path d="m15 5-7 7 7 7"/>', 20),
  rota: svg('<path d="M5 19a2 2 0 1 0 0-.01M19 5a2 2 0 1 0 0-.01"/><path d="M7 19h8.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H17"/>'),
  bandeira: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  tag: svg('<path d="M20 12 12 20 3.5 11.5V3.5h8Z"/><circle cx="8" cy="8" r="1.2"/>'),
  cal: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', 16),
  play: svg('<path d="M8 5.5v13l11-6.5Z" fill="currentColor"/>', 26),
};

export const imgCapa = (item, mini = false) =>
  item.foto ? `<img src="${esc(mini && item.foto_mini ? item.foto_mini : item.foto)}" alt="${esc(item.foto_alt || '')}" loading="lazy" decoding="async">` : capa({ id: item.id, nome: item.nome || item.titulo, categoria: item.categoria });

const selos = (l) => `${l.exemplo ? '<span class="selo">exemplo</span>' : ''}${l.pendente ? '<span class="selo selo--pend">em análise</span>' : ''}`;

export function chipsHTML(ativos) {
  const todos = `<button class="chip chip--todos" data-acao="chip" data-id="" aria-pressed="${ativos.size === 0}">Todos</button>`;
  return todos + CATEGORIAS.map((c) => `<button class="chip" style="--c:${c.cor}" data-acao="chip" data-id="${c.id}" aria-pressed="${ativos.has(c.id)}" title="${esc(c.desc)}">${icone(c.id, 16)}${esc(c.nome)}</button>`).join('');
}

export function janelasHTML(atual, gratis) {
  const j = [['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['fds', 'Fim de semana'], ['7d', '7 dias'], ['30d', '30 dias']];
  return j.map(([id, nome]) => `<button class="pill" data-acao="janela" data-id="${id}" aria-pressed="${atual === id}">${nome}</button>`).join('')
    + `<button class="pill" data-acao="gratis" aria-pressed="${gratis}">Só grátis</button>`;
}

/** Texto do "próximo evento" mostrado no card do lugar. */
export function proxTexto(oc, status, hoje) {
  if (!oc) return '';
  const quando = status === 'agora' ? 'Acontecendo agora' : `${rotuloDia(oc.data, hoje)}${oc.inicio ? ` ${hora(oc.inicio)}` : ''}`;
  return `${quando} · ${oc.titulo}`;
}

export function cardLugar(l, { prox = '', dist = null, i = 0 } = {}) {
  const c = cat(l.categoria);
  const sub = [l.bairro, dist != null ? kmTexto(dist) : ''].filter(Boolean).join(' · ');
  return `<button class="card" style="--c:${c.cor};animation-delay:${Math.min(i, 14) * 28}ms" data-acao="sel" data-id="${esc(l.id)}">
    <div class="card__capa">${imgCapa(l, true)}</div>
    <div class="card__txt">
      <div class="card__cat">${icone(l.categoria, 13)}${esc(c.nome)}${selos(l)}</div>
      <div class="card__nome">${esc(l.nome)}</div>
      <div class="card__sub">${esc(sub)}</div>
      ${prox ? `<div class="card__prox"><span>● ${esc(prox)}</span></div>` : ''}
    </div></button>`;
}

export function cardEvento(oc, lugar, status, i = 0) {
  const c = cat(oc.categoria || lugar?.categoria);
  const tags = [];
  if (status === 'agora') tags.push('<span class="tag tag--agora">Acontecendo agora</span>');
  tags.push(ehGratis(oc) ? '<span class="tag tag--gratis">Grátis</span>' : `<span class="tag">${esc(oc.preco)}</span>`);
  if (oc.repete && oc.repete !== 'nao') tags.push(`<span class="tag tag--rec">${esc(recorrenciaTexto(oc))}</span>`);
  if ((oc.repete === 'diaria' || oc.repete === 'dias_uteis') && oc.repete_ate) tags.push(`<span class="tag">até ${esc(oc.repete_ate.slice(8))}/${esc(oc.repete_ate.slice(5, 7))}</span>`);
  if (oc.confirmar) tags.push(`<span class="tag tag--conf" title="${esc(oc.confirmar)}">confirme antes de ir</span>`);
  if (oc.exemplo) tags.push('<span class="tag">exemplo</span>');
  if (oc.pendente) tags.push('<span class="tag">em análise</span>');
  const onde = lugar ? `${esc(lugar.nome)}${lugar.bairro ? ` · ${esc(lugar.bairro)}` : ''}` : esc(oc.local_nome || '');
  return `<button class="ev" style="--c:${c.cor};animation-delay:${Math.min(i, 14) * 28}ms" data-acao="sel" data-id="${esc(lugar?.id || '')}" data-key="${esc(oc.key)}">
    <div class="ev__hora"><b>${oc.inicio ? esc(hora(oc.inicio)) : 'dia'}</b><small>${oc.inicio ? (oc.fim ? `até ${esc(hora(oc.fim))}` : '') : 'todo'}</small></div>
    <div class="ev__corpo">
      <div class="ev__tit">${esc(oc.titulo)}</div>
      <div class="ev__loc">${onde}</div>
      <div class="ev__tags">${tags.join('')}</div>
    </div></button>`;
}

export const grupoDia = (iso, hoje) => `<div class="grupo"><b>${esc(rotuloDia(iso, hoje))}</b><span>${esc(dataCurta(iso))}</span></div>`;

export function miniHoje(oc, lugar, status) {
  const c = cat(oc.categoria || lugar?.categoria);
  return `<button class="mini" style="--c:${c.cor}" data-acao="sel" data-id="${esc(lugar?.id || '')}" data-key="${esc(oc.key)}">
    <div class="mini__hora">${status === 'agora' ? '<span class="vivo"></span>' : ''}${status === 'agora' ? 'Agora' : esc(hora(oc.inicio) || 'Hoje')}</div>
    <div class="mini__tit">${esc(oc.titulo)}</div>
    <div class="mini__loc">${esc(lugar?.nome || oc.local_nome || '')}</div></button>`;
}

export const vazioHTML = (titulo, texto, botao = true) => `<div class="vazio"><b>${esc(titulo)}</b>${esc(texto)}${botao ? '<br><button class="btn btn--cheio" data-acao="colab">Colaborar com o mapa</button>' : ''}</div>`;

/** Vídeo: YouTube/Vimeo carregam só no clique (privacidade e velocidade); arquivo usa <video> com legenda. */
export function videoHTML(l) {
  const v = parseVideo(l.video);
  if (!v) return '';
  const legenda = [l.video_titulo && esc(l.video_titulo), l.video_credito && `Vídeo: ${esc(l.video_credito)}`].filter(Boolean).join(' · ');
  let corpo;
  if (v.tipo === 'arquivo') {
    corpo = `<video class="video__player" controls playsinline preload="metadata" ${l.foto ? `poster="${esc(l.foto)}"` : ''} src="${esc(v.src)}">${l.video_legenda ? `<track kind="captions" srclang="pt" label="Português" src="${esc(l.video_legenda)}" default>` : ''}</video>`;
  } else {
    corpo = `<button class="video__capa" data-acao="video" data-tipo="${v.tipo}" data-id="${esc(v.id)}" aria-label="Reproduzir vídeo${l.video_titulo ? `: ${esc(l.video_titulo)}` : ''}"><span class="video__bg">${imgCapa(l)}</span><span class="video__play">${I.play}</span></button>`;
  }
  return `<div class="secao"><h3>Vídeo</h3></div><figure class="video">${corpo}${legenda ? `<figcaption>${legenda}</figcaption>` : ''}</figure>`;
}

/** Ficha completa de um lugar. */
export function detalheHTML(l, { ocorr = [], vizinhos = [], dist = null, hoje, statusDe }) {
  const c = cat(l.categoria);
  const info = [];
  const onde = [l.endereco, l.bairro].filter(Boolean).join(' · ');
  if (onde || l.aprox) info.push(`<div>${I.pin}<span>${esc(onde || 'Grande Florianópolis')}${dist != null ? ` <b>· ${esc(kmTexto(dist))} de você</b>` : ''}${l.aprox ? '<br><small>Localização aproximada</small>' : ''}</span></div>`);
  if (l.horario) info.push(`<div>${I.relogio}<span>${esc(l.horario)}</span></div>`);
  if (l.instagram) info.push(`<div>${I.insta}<a href="${esc(linkInstagram(l.instagram))}" target="_blank" rel="noopener">${esc(String(l.instagram).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@').replace(/\/$/, ''))}</a></div>`);
  if (l.whatsapp && linkWhatsapp(l.whatsapp)) info.push(`<div>${I.whats}<a href="${esc(linkWhatsapp(l.whatsapp, `Oi! Vi vocês no Cartografia Líquen (${l.nome}).`))}" target="_blank" rel="noopener">Chamar no WhatsApp</a></div>`);
  if (l.fonte) info.push(`<div>${I.globo}<a href="${esc(l.fonte)}" target="_blank" rel="noopener">Fonte da informação ↗</a></div>`);
  if (l.site) info.push(`<div>${I.globo}<a href="${esc(linkSite(l.site))}" target="_blank" rel="noopener">${esc(String(l.site).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''))}</a></div>`);

  const avisos = [];
  if (l.pendente) avisos.push('<div class="aviso">⏳<span><b>Em análise pela curadoria.</b> Por enquanto só você vê este envio; ele aparece para todo mundo assim que for aprovado.</span></div>');
  if (l.exemplo) avisos.push('<div class="aviso">✎<span><b>Ficha de exemplo.</b> Serve para mostrar como o mapa funciona. Conhece um lugar assim de verdade? Cadastre!</span></div>');

  const evs = ocorr.slice(0, 6).map((o) => {
    const n = dataNumero(o.data);
    const quando = o.inicio ? `${hora(o.inicio)}${o.fim ? `–${hora(o.fim)}` : ''}` : 'Dia todo';
    return `<div class="mini-ev">
      <div class="mini-ev__d"><b>${n.dia}</b><small>${esc(n.sem)} · ${esc(n.mes)}</small></div>
      <div class="mini-ev__t">${esc(o.titulo)}<span>${esc(quando)} · ${ehGratis(o) ? 'Grátis' : esc(o.preco)}${o.repete && o.repete !== 'nao' ? ` · ${esc(recorrenciaTexto(o))}` : ''}${statusDe(o) === 'agora' ? ' · <b>acontecendo agora</b>' : ''}</span>
        ${o.confirmar ? `<span class="conf">⚠ ${esc(o.confirmar)}</span>` : ''}
        ${o.descricao ? `<details class="mais"><summary>detalhes</summary><p>${esc(o.descricao)}</p>${o.fonte ? `<a href="${esc(o.fonte)}" target="_blank" rel="noopener">fonte ↗</a>` : ''}</details>` : ''}
      </div>
      <button class="btn-redondo" data-acao="ics" data-key="${esc(o.key)}" aria-label="Adicionar ao calendário: ${esc(o.titulo)}" title="Adicionar ao calendário">${I.cal}</button>
      <button class="btn-redondo" data-acao="chamar" data-key="${esc(o.key)}" aria-label="Compartilhar: ${esc(o.titulo)}" title="Compartilhar evento">${I.enviar.replace('width="18" height="18"', 'width="16" height="16"')}</button>
    </div>`;
  }).join('');

  const perto = vizinhos.map(({ l: v, d }) => `<button data-acao="sel" data-id="${esc(v.id)}" style="--c:${cat(v.categoria).cor}"><i>${icone(v.categoria, 18)}</i><span>${esc(v.nome)}</span><small>${esc(kmTexto(d))}</small></button>`).join('');

  return `<div class="detalhe__rolagem">
    <div class="detalhe__capa">
      ${imgCapa(l)}
      ${l.foto && l.foto_credito ? `<span class="detalhe__credito">Foto: ${esc(l.foto_credito)}</span>` : ''}
      <button class="btn-redondo detalhe__voltar" data-acao="fechar-det" aria-label="Voltar à lista">${I.voltar}</button>
      <span class="detalhe__sel" style="--c:${c.cor}">${icone(l.categoria, 17)}${esc(c.nome)}</span>
    </div>
    <div class="detalhe__corpo">
      <h2>${esc(l.nome)}${selos(l)}</h2>
      <p class="detalhe__onde">${esc(l.bairro || 'Grande Florianópolis')}</p>
      ${avisos.join('')}
      ${l.descricao ? `<p class="desc">${esc(l.descricao)}</p>` : ''}
      ${l.tags?.length ? `<div class="tags">${l.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="info">${info.join('')}</div>
      <div class="acoes">
        <a class="btn btn--cheio" href="${esc(linkRota(l))}" target="_blank" rel="noopener">${I.rota} Como chegar</a>
        <button class="btn" data-acao="compartilhar" data-id="${esc(l.id)}">${I.enviar} Compartilhar</button>
      </div>
      ${videoHTML(l)}
      <div class="secao"><h3>Próximos eventos</h3>${l.virtual || l.pendente ? '' : `<button class="link" data-acao="add-evento" data-id="${esc(l.id)}">+ adicionar evento</button>`}</div>
      ${evs || `<div class="vazio" style="margin:0 0 8px"><b>Nada marcado ainda</b>${l.virtual ? '' : 'Sabe de algum evento neste local?'}</div>`}
      ${perto ? `<div class="secao"><h3>Também por perto</h3></div><div class="perto">${perto}</div>` : ''}
      ${l.virtual || l.pendente ? '' : `<div class="secao"><h3>Esta ficha</h3></div>
      <div class="acoes">
        <button class="btn btn--fantasma" data-acao="corrigir" data-id="${esc(l.id)}">${I.bandeira} Sugerir correção</button>
        <button class="btn btn--fantasma" data-acao="reivindicar" data-id="${esc(l.id)}">Este espaço é seu?</button>
      </div>`}
    </div></div>`;
}
