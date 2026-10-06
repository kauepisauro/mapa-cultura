// Cartografia Líquen — orquestração: estado, filtros, rotas, painel, mapa.
import { CONFIG } from './config.js';
import { CATEGORIAS, cat } from './categorias.js';
import { carregar, meusEventosPendentes, meusPontosPendentes } from './store.js';
import { expandir, ehGratis, janela, statusOcorrencia } from './eventos.js';
import { Mapa } from './mapa.js';
import { colonia, logo } from './arte.js';
import { addDias, distanciaKm, dataCurta, gerarICS, hojeISO, hora, norm, rotuloDia, slug } from './utils.js';
import { cardEvento, cardLugar, chipsHTML, detalheHTML, grupoDia, janelasHTML, miniHoje, proxTexto, vazioHTML } from './painel.js';
import { iniciarContribuir } from './contribuir.js';

const $ = (s, el = document) => el.querySelector(s);
const mobile = window.matchMedia('(max-width: 760px)');

const S = {
  pontosPub: [], eventosPub: [], pontos: [], lugares: [], porId: new Map(), ocorr: [], porKey: new Map(), idx: new Map(),
  modo: 'demo', aba: 'explorar', cats: new Set(), busca: '', janela: '7d', gratis: false,
  sel: null, eu: null, tema: 'dia', sheet: 'peek', vis: 176, ultimoEnvio: null, carregou: false,
};

const status = (o) => statusOcorrencia(o, new Date());
const el = { app: $('#app'), painel: $('#painel'), rolagem: $('#rolagem'), lista: $('#lista'), detalhe: $('#detalhe'), chips: $('#chips'), janelas: $('#janelas'), hoje: $('#hoje-lista'), fab: $('#fab'), toast: $('#toast') };

// ───────── utilidades de UI ─────────
let toastT;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.toast.classList.remove('is-on'), 3200);
}
const baseUrl = () => `${location.origin}${location.pathname}`;
async function compartilhar(url, texto) {
  if (navigator.share) {
    try { await navigator.share({ title: CONFIG.nome, text: texto, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${texto}\n${url}`); toast('Link copiado. Cole onde quiser.'); } catch { window.prompt('Copie o link:', url); }
}

// ───────── dados derivados ─────────
function derivar() {
  const hoje = hojeISO();
  const evAll = [...S.eventosPub, ...meusEventosPendentes()];
  S.pontos = [...S.pontosPub, ...meusPontosPendentes(S.pontosPub)];
  const virt = evAll.filter((e) => !e.ponto_id && e.lat && e.lng).map((e) => ({
    id: `v-${e.id}`, virtual: true, nome: e.local_nome || e.titulo, categoria: e.categoria, lat: e.lat, lng: e.lng, bairro: '', descricao: e.descricao || '', tags: [], exemplo: e.exemplo, pendente: e.pendente, foto: e.foto, foto_alt: e.foto_alt,
  }));
  S.lugares = [...S.pontos, ...virt];
  S.porId = new Map(S.lugares.map((l) => [l.id, l]));
  S.ocorr = expandir(evAll, addDias(hoje, -1), addDias(hoje, CONFIG.horizonteDias))
    .map((o) => ({ ...o, lugarId: o.ponto_id && S.porId.has(o.ponto_id) ? o.ponto_id : `v-${o.serie}` }))
    .filter((o) => S.porId.has(o.lugarId));
  S.porKey = new Map(S.ocorr.map((o) => [o.key, o]));
  // índice de busca: nome, bairro, tags, descrição, categoria e títulos dos eventos
  S.idx = new Map(S.lugares.map((l) => [l.id, norm([l.nome, l.bairro, l.endereco, (l.tags || []).join(' '), l.descricao, cat(l.categoria).nome, ...S.ocorr.filter((o) => o.lugarId === l.id).map((o) => o.titulo)].join(' '))]));
}

const casaCat = (c) => S.cats.size === 0 || S.cats.has(c);

function proximoPorLugar() {
  const m = new Map();
  for (const o of S.ocorr) {
    const st = status(o);
    if (st === 'encerrado' || m.has(o.lugarId)) continue;
    m.set(o.lugarId, { o, st });
  }
  return m;
}

function ocorrenciasFiltradas() {
  const hoje = hojeISO();
  const [de, ate] = janela(S.janela, hoje);
  const q = norm(S.busca);
  return S.ocorr.filter((o) => {
    const st = status(o);
    if (st === 'encerrado') return false;
    const naJanela = (o.data >= de && o.data <= ate) || (st === 'agora' && de === hoje);
    if (!naJanela) return false;
    const l = S.porId.get(o.lugarId);
    if (!casaCat(o.categoria || l.categoria)) return false;
    if (S.gratis && !ehGratis(o)) return false;
    return !q || norm(`${o.titulo} ${o.descricao || ''} ${l.nome} ${l.bairro || ''}`).includes(q);
  });
}

// ───────── render ─────────
let ultimoHTML = '';
function setHTML(node, html, chave) {
  if (node._h === html) return;
  node._h = html;
  node.innerHTML = html;
  if (chave) ultimoHTML = chave;
}

function render() {
  const hoje = hojeISO();
  const prox = proximoPorLugar();
  const q = norm(S.busca);

  setHTML(el.chips, chipsHTML(S.cats));
  setHTML(el.janelas, janelasHTML(S.janela, S.gratis));
  el.janelas.hidden = S.aba !== 'agenda';

  // "Acontece hoje"
  const hojeOc = S.ocorr.filter((o) => { const st = status(o); return st === 'agora' || (o.data === hoje && st !== 'encerrado'); })
    .sort((a, b) => (status(b) === 'agora') - (status(a) === 'agora') || (a.inicio || '').localeCompare(b.inicio || ''));
  const aoVivo = new Set(hojeOc.map((o) => o.lugarId));
  setHTML(el.hoje, hojeOc.length
    ? hojeOc.slice(0, 12).map((o) => miniHoje(o, S.porId.get(o.lugarId), status(o))).join('')
    : '<p class="hoje__vazio">Nada marcado para hoje ainda. Sabe de algum evento? <button class="link" data-acao="colab" style="color:#1b2a22">Divulgue aqui</button></p>');

  let itensMapa;
  let html;
  const evFiltrados = ocorrenciasFiltradas();
  const lugaresFiltrados = S.lugares.filter((l) => !l.virtual && casaCat(l.categoria) && (!q || S.idx.get(l.id)?.includes(q)));

  if (S.aba === 'explorar') {
    const dist = (l) => (S.eu ? distanciaKm(S.eu, l) : null);
    const ord = [...lugaresFiltrados].sort((a, b) => (S.eu ? dist(a) - dist(b) : (aoVivo.has(b.id) - aoVivo.has(a.id)) || a.nome.localeCompare(b.nome, 'pt-BR')));
    html = ord.length
      ? ord.map((l, i) => { const p = prox.get(l.id); return cardLugar(l, { prox: p ? proxTexto(p.o, p.st, hoje) : '', dist: dist(l), i }); }).join('')
      : vazioHTML('Nada por aqui… ainda', q || S.cats.size ? 'Tente outra busca ou limpe os filtros. E se o lugar existe e não está no mapa, cadastre!' : 'Seja a primeira pessoa a colocar um ponto no mapa.');
    itensMapa = ord;
  } else {
    // exposições/mostras de vários dias entram uma vez só, em "Em cartaz"
    const multi = (o) => o.repete === 'diaria' || o.repete === 'dias_uteis';
    const vistos = new Set();
    const cartaz = evFiltrados.filter((o) => multi(o) && !vistos.has(o.serie) && vistos.add(o.serie));
    const normais = evFiltrados.filter((o) => !multi(o));
    let ultimo = '';
    html = (cartaz.length ? `<div class="grupo"><b>Em cartaz</b><span>exposições e mostras</span></div>${cartaz.map((o, i) => cardEvento(o, S.porId.get(o.lugarId), status(o), i)).join('')}` : '')
      + normais.map((o, i) => {
        const cab = o.data !== ultimo ? grupoDia(o.data, hoje) : '';
        ultimo = o.data;
        return cab + cardEvento(o, S.porId.get(o.lugarId), status(o), i);
      }).join('');
    if (!html) html = vazioHTML('Nenhum evento nesse período', 'Mude o período ou os filtros. Ou divulgue o próximo evento.');
    S.nEventos = cartaz.length + normais.length;
    const ids = [...new Set(evFiltrados.map((o) => o.lugarId))];
    itensMapa = ids.map((id) => S.porId.get(id));
  }
  setHTML(el.lista, html);
  $('#n-lugares').textContent = lugaresFiltrados.length;
  $('#n-eventos').textContent = S.aba === 'agenda' ? S.nEventos : new Set(evFiltrados.map((o) => o.serie)).size;

  // abas
  document.querySelectorAll('.abas [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === S.aba)));

  // mapa (sempre inclui o lugar selecionado)
  const vivosAgenda = new Set(evFiltrados.filter((o) => o.data === hoje).map((o) => o.lugarId));
  const itens = itensMapa.map((l) => ({ ...l, aoVivo: aoVivo.has(l.id) || vivosAgenda.has(l.id) }));
  if (S.sel && !itens.some((i) => i.id === S.sel) && S.porId.has(S.sel)) itens.push({ ...S.porId.get(S.sel), aoVivo: aoVivo.has(S.sel) });
  mapa.setItens(itens, { ajustar: S.ajustar });
  S.ajustar = false;
  S.itens = itens;
}

// ───────── detalhe ─────────
function abrirDetalhe(id, { voar = true, empurrar = true } = {}) {
  const l = S.porId.get(id);
  if (!l) return;
  S.sel = id;
  const vizinhos = S.lugares.filter((x) => x.id !== id && !x.virtual).map((x) => ({ l: x, d: distanciaKm(l, x) })).sort((a, b) => a.d - b.d).slice(0, 3);
  const ocorr = S.ocorr.filter((o) => o.lugarId === id && status(o) !== 'encerrado');
  el.detalhe.innerHTML = detalheHTML(l, { ocorr, vizinhos, dist: S.eu ? distanciaKm(S.eu, l) : null, hoje: hojeISO(), statusDe: status });
  el.detalhe.hidden = false;
  el.detalhe.querySelector('.detalhe__rolagem').scrollTop = 0;
  el.detalhe.querySelector('.detalhe__voltar')?.focus({ preventScroll: true });
  mapa.selecionar(id);
  mapa.mostrarVizinhos(l, vizinhos.map((v) => v.l));
  render();
  if (voar) mapa.voar(l.lat, l.lng, 16);
  if (mobile.matches && S.sheet === 'peek') setSheet('half');
  if (empurrar && !l.virtual) history.pushState(null, '', `#/ponto/${encodeURIComponent(id)}`);
}

function fecharDetalhe({ empurrar = true } = {}) {
  if (el.detalhe.hidden) return;
  const id = S.sel;
  S.sel = null;
  el.detalhe.hidden = true;
  mapa.selecionar(null);
  render();
  if (empurrar) history.pushState(null, '', S.aba === 'agenda' ? '#/agenda' : location.pathname);
  el.lista.querySelector(`[data-id="${CSS.escape(id || '')}"]`)?.focus({ preventScroll: true });
}

// ───────── bottom-sheet (mobile) ─────────
const SNAP = { peek: () => 176, half: () => Math.round(innerHeight * 0.56), full: () => Math.round(innerHeight * 0.92) };
function aplicarSheet(vis) {
  S.vis = vis;
  document.documentElement.style.setProperty('--vis', `${vis}px`);
  el.painel.classList.toggle('is-peek', vis < 260);
  el.painel.classList.toggle('is-cheio', vis > innerHeight * 0.8);
  el.fab.classList.toggle('is-oculto', mobile.matches && vis > innerHeight * 0.7);
}
function setSheet(estado) {
  S.sheet = estado;
  aplicarSheet(SNAP[estado]());
  mapa?.setPadding(mobile.matches ? 0 : 460, mobile.matches ? SNAP[estado]() : 0);
}
function ligarSheet() {
  const alca = $('#alca');
  let d = null;
  alca.addEventListener('pointerdown', (e) => { d = { y: e.clientY, vis: S.vis, t: performance.now(), mexeu: false }; alca.setPointerCapture(e.pointerId); el.painel.classList.add('is-arrastando'); });
  alca.addEventListener('pointermove', (e) => {
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 5) d.mexeu = true;
    aplicarSheet(Math.max(120, Math.min(SNAP.full(), d.vis + dy)));
  });
  const fim = (e) => {
    if (!d) return;
    el.painel.classList.remove('is-arrastando');
    const dt = Math.max(1, performance.now() - d.t);
    const vel = (d.y - e.clientY) / dt; // px/ms (positivo = subindo)
    const alvo = S.vis + vel * 220;
    const ordem = ['peek', 'half', 'full'];
    if (!d.mexeu) setSheet(ordem[(ordem.indexOf(S.sheet) + 1) % 3]);
    else setSheet(ordem.reduce((m, k) => (Math.abs(SNAP[k]() - alvo) < Math.abs(SNAP[m]() - alvo) ? k : m)));
    d = null;
  };
  alca.addEventListener('pointerup', fim);
  alca.addEventListener('pointercancel', fim);
  // tocar no cabeçalho (peek) expande
  $('.marca').addEventListener('click', () => { if (mobile.matches && S.sheet === 'peek') setSheet('half'); });
  $('#busca').addEventListener('focus', () => { if (mobile.matches && S.sheet !== 'full') setSheet('full'); });
  addEventListener('resize', () => setSheet(S.sheet));
  mobile.addEventListener('change', () => setSheet(S.sheet));
}

// ───────── tema ─────────
function setTema(t) {
  S.tema = t;
  el.app.dataset.tema = t;
  document.querySelectorAll('.dlg').forEach((d) => { d.dataset.tema = t; });
  $('meta[name=theme-color]').content = t === 'noite' ? '#16221d' : '#f3e9d8';
  mapa?.setTema(t);
  try { localStorage.setItem('liquen:tema', t); } catch { /* sem storage */ }
}

// ───────── ações ─────────
function setAba(a, { empurrar = true } = {}) {
  S.aba = a;
  if (a === 'agenda' && !el.detalhe.hidden) { el.detalhe.hidden = true; S.sel = null; mapa.selecionar(null); }
  S.ajustar = true;
  render();
  el.rolagem.scrollTo({ top: 0 });
  if (empurrar) history.pushState(null, '', a === 'agenda' ? '#/agenda' : location.pathname);
}

function baixarICS(key) {
  const o = S.porKey.get(key);
  if (!o) return;
  const l = S.porId.get(o.lugarId);
  const local = [l.nome, l.endereco, l.bairro, 'Grande Florianópolis'].filter(Boolean).join(', ');
  const blob = new Blob([gerarICS(o, { local, url: `${baseUrl()}#/ponto/${encodeURIComponent(l.id)}` })], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(o.titulo)}-${o.data}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Evento baixado. Abra o arquivo para salvar no seu calendário.');
}

function compartilharEvento(key) {
  const o = S.porKey.get(key);
  if (!o) return;
  const l = S.porId.get(o.lugarId);
  const quando = `${rotuloDia(o.data, hojeISO())}, ${dataCurta(o.data)}${o.inicio ? ` às ${hora(o.inicio)}` : ''}`;
  const texto = `${o.titulo}\n${quando} · ${l.nome}${l.bairro ? ` (${l.bairro})` : ''}\nVi no Mapa cultural vivo:`;
  const url = `${baseUrl()}#/ponto/${encodeURIComponent(l.id)}`;
  if (navigator.share) compartilhar(url, texto);
  else window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, '_blank', 'noopener');
}

const acoes = {
  chip(t) {
    const id = t.dataset.id;
    if (!id) S.cats.clear(); else if (S.cats.has(id)) S.cats.delete(id); else S.cats.add(id);
    S.ajustar = true;
    render();
  },
  janela(t) { S.janela = t.dataset.id; S.ajustar = true; render(); },
  gratis() { S.gratis = !S.gratis; render(); },
  sel(t) { const id = t.dataset.id; if (id) abrirDetalhe(id); },
  'fechar-det': () => fecharDetalhe(),
  ics: (t) => baixarICS(t.dataset.key),
  chamar: (t) => compartilharEvento(t.dataset.key),
  compartilhar(t) { const l = S.porId.get(t.dataset.id); compartilhar(`${baseUrl()}#/ponto/${encodeURIComponent(l.id)}`, `${l.nome} — ${cat(l.categoria).nome} na Grande Florianópolis. Vi no Mapa cultural vivo:`); },
  video(t) {
    const { tipo, id } = t.dataset;
    const src = tipo === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&cc_load_policy=1&hl=pt-BR`
      : `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`;
    const f = document.createElement('iframe');
    f.className = 'video__frame';
    f.src = src;
    f.title = t.getAttribute('aria-label') || 'Vídeo';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    t.replaceWith(f);
  },
  colab: () => contrib.abrir(),
  'add-evento': (t) => contrib.abrir({ tipo: 'evento', pontoId: t.dataset.id }),
  corrigir: (t) => contrib.abrirSugestao(S.porId.get(t.dataset.id), 'correcao'),
  reivindicar: (t) => contrib.abrirSugestao(S.porId.get(t.dataset.id), 'reivindicar'),
};

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-acao]');
  if (t && acoes[t.dataset.acao]) { e.preventDefault(); acoes[t.dataset.acao](t); }
  const abrirColab = e.target.closest('[data-abrir-colab]');
  if (abrirColab) setTimeout(() => contrib.abrir(), 60);
  if (e.target.closest('#dlg-sobre [data-fechar]')) $('#dlg-sobre').close();
});

// ───────── rotas ─────────
function rota() {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'ponto' && b) { abrirDetalhe(decodeURIComponent(b), { empurrar: false }); return; }
  if (!el.detalhe.hidden) fecharDetalhe({ empurrar: false });
  if (a === 'agenda' && S.aba !== 'agenda') setAba('agenda', { empurrar: false });
  else if (a !== 'agenda' && S.aba === 'agenda' && !a) setAba('explorar', { empurrar: false });
  if (a === 'colaborar') contrib.abrir();
  if (a === 'sobre') $('#dlg-sobre').showModal();
}
addEventListener('popstate', rota);

// ───────── inicialização ─────────
let mapa;
let contrib;

async function iniciar() {
  $('#logo').innerHTML = logo(58);
  $('#deco').innerHTML = colonia(190, 120, 11);
  $('#lic').textContent = CONFIG.licenca; $('#lic').href = CONFIG.licencaUrl;
  $('#lic2').textContent = CONFIG.licenca; $('#lic2').href = CONFIG.licencaUrl;
  if (CONFIG.mostrarCreditosEdital) {
    const c = $('#creditos');
    c.hidden = false;
    c.textContent = 'Projeto executado com recursos da Política Nacional Aldir Blanc, por meio da Fundação Catarinense de Cultura e do Governo do Estado de Santa Catarina.';
  }

  mapa = new Mapa($('#mapa'), { aoSelecionar: (id) => abrirDetalhe(id, { voar: true }), aoMoverVazio: () => { if (!el.detalhe.hidden && !mobile.matches) fecharDetalhe(); } });
  contrib = iniciarContribuir({
    tema: () => S.tema,
    pontos: () => S.pontos,
    compartilhar,
    aoEnviar: (tipo, res) => { S.ultimoEnvio = { tipo, id: res.id }; derivar(); render(); },
  });
  $('#dlg-colaborar').addEventListener('close', () => {
    if (location.hash === '#/colaborar') history.replaceState(null, '', location.pathname);
    const u = S.ultimoEnvio;
    if (!u) return;
    S.ultimoEnvio = null;
    if (u.tipo === 'ponto') abrirDetalhe(u.id); else { S.janela = '30d'; setAba('agenda'); }
  });
  $('#dlg-sobre').addEventListener('close', () => { if (location.hash === '#/sobre') history.replaceState(null, '', location.pathname); });

  let t = 'dia';
  try { t = localStorage.getItem('liquen:tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'noite' : 'dia'); } catch { /* ok */ }
  setTema(t);

  ligarSheet();
  setSheet(mobile.matches ? 'peek' : 'half');

  // controles
  $('#ctl-mais').onclick = () => mapa.zoom(1);
  $('#ctl-menos').onclick = () => mapa.zoom(-1);
  $('#ctl-tema').onclick = () => setTema(S.tema === 'dia' ? 'noite' : 'dia');
  $('#ctl-rede').onclick = (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    mapa.setRede(on);
    if (on) toast('Rede ligada: cada ponto se conecta aos mais próximos.');
  };
  $('#ctl-onde').onclick = async () => {
    try {
      S.eu = await mapa.localizar();
      mapa.map.flyTo([S.eu.lat, S.eu.lng], 15, { duration: 0.9 });
      toast('Mostrando o que está mais perto de você');
      render();
    } catch (err) { toast(err.message); }
  };
  el.fab.onclick = () => contrib.abrir();
  $('#btn-sobre').onclick = () => { $('#dlg-sobre').dataset.tema = S.tema; $('#dlg-sobre').showModal(); };
  $('#hoje-ver').onclick = () => { S.janela = 'hoje'; setAba('agenda'); };
  document.querySelectorAll('.abas [role=tab]').forEach((b) => b.addEventListener('click', () => setAba(b.dataset.aba)));
  $('#chips-mais').onclick = (e) => {
    const fechado = el.chips.classList.toggle('is-fechado');
    e.currentTarget.setAttribute('aria-expanded', String(!fechado));
    e.currentTarget.textContent = fechado ? 'todas as categorias ▾' : 'recolher categorias ▴';
  };
  let deb;
  $('#busca').addEventListener('input', (e) => {
    clearTimeout(deb);
    $('#busca-x').hidden = !e.target.value;
    deb = setTimeout(() => { S.busca = e.target.value; S.ajustar = true; render(); }, 140);
  });
  $('#busca-x').onclick = () => { $('#busca').value = ''; $('#busca-x').hidden = true; S.busca = ''; S.ajustar = true; render(); $('#busca').focus(); };
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]') && !el.detalhe.hidden) fecharDetalhe();
  });

  el.lista.innerHTML = '<div class="vazio"><b>Carregando o mapa…</b>Colhendo os pontos de cultura da Ilha.</div>';
  try {
    const d = await carregar();
    S.pontosPub = d.pontos; S.eventosPub = d.eventos; S.modo = d.modo;
    if (d.aviso) toast(d.aviso);
  } catch (err) {
    console.error(err);
    el.lista.innerHTML = vazioHTML('Não consegui carregar o mapa', 'Verifique sua conexão e tente de novo.', false);
    return;
  }
  S.carregou = true;
  $('#ctl-rede').setAttribute('aria-pressed', 'true');
  $('#rodape-modo').textContent = `${S.modo === 'demo' ? (S.pontosPub.some((p) => p.exemplo) ? 'Modo demonstração: itens marcados “exemplo” são fictícios. ' : 'Eventos pesquisados em 06/10/2026; confira a fonte antes de ir. ') : ''}v${CONFIG.versao}`;
  derivar();
  S.ajustar = true;
  render();
  mapa.setRede(true);
  rota();
  setInterval(() => { derivar(); render(); }, 60000);
}

iniciar();
