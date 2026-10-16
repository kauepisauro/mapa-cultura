// Painel pessoal: perícias, mestrado e artes. Dados só no navegador (localStorage) + backup em arquivo.
import * as L from './logica.js';

const VERSAO = '2026-10-16.1';
const CHAVE = 'painel-pessoal-v1';
const ABAS = [
  { id: 'hoje', nome: 'Hoje', icone: '◉' },
  { id: 'pericia', nome: 'Perícias', icone: 'P' },
  { id: 'mestrado', nome: 'Mestrado', icone: 'M' },
  { id: 'arte', nome: 'Artes', icone: 'A' },
  { id: 'agenda', nome: 'Agenda', icone: '▦' },
  { id: 'meta', nome: 'Meta', icone: '↗' },
];

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let dados = carregar();
const ui = { aba: 'hoje', mes: L.mesDe(L.hojeISO()), dia: null, todos: {}, acoes: false, rascunho: null };

// ---------- armazenamento ----------
function carregar() {
  try {
    const t = localStorage.getItem(CHAVE);
    if (t) {
      try { return L.normalizar(JSON.parse(t)); }
      catch (e) { localStorage.setItem(`${CHAVE}-corrompido`, t); console.warn('dados ilegíveis, cópia guardada', e); }
    }
  } catch { /* armazenamento indisponível: roda só em memória */ }
  return L.dadosVazios();
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); }
  catch { aviso('Não consegui gravar neste navegador. Exporte um backup para não perder nada.'); }
}
const hoje = () => L.hojeISO();
const achar = (id) => dados.itens.find((i) => i.id === id);

// ---------- avisos ----------
let tToast;
function aviso(msg, desfazer) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${desfazer ? '<button data-acao="desfazer">Desfazer</button>' : ''}`;
  t.classList.add('on');
  t._desfazer = desfazer;
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove('on'), desfazer ? 6500 : 3800);
}

// ---------- peças de HTML ----------
const selo = (a) => `<span class="selo" data-area="${a}" title="${L.AREAS[a].nome}">${L.AREAS[a].letra}</span>`;

function textoData(o, h = hoje()) {
  const quando = L.quando(o.data, h);
  return `${o.rotulo ? esc(o.rotulo) + ' · ' : ''}${quando}${o.hora ? ' · ' + L.hora(o.hora) : ''}`;
}

function linhaData(o, h) {
  const cls = o.data < h ? 'lin--atraso' : o.data === h ? 'lin--hoje' : '';
  return `<li class="lin ${cls}">
    <button class="check" data-acao="data-feita" data-id="${o.item.id}" data-idx="${o.idx}" aria-label="Marcar como feito: ${esc(o.item.titulo)}"></button>
    <button class="lin__corpo" data-acao="editar" data-id="${o.item.id}">${selo(o.item.area)}
      <span class="lin__texto"><b>${esc(o.item.titulo)}</b><small class="${o.data < h ? 'atraso' : ''}">${textoData(o, h)}</small></span></button></li>`;
}

function cartao(it) {
  const h = hoje();
  const prox = L.proximaEtapa(it);
  const datas = L.ocorrencias([it]).slice(0, 3);
  const meta = [it.cliente, it.processo].filter(Boolean).map(esc).join(' · ');
  const final = L.ehFinal(it);
  let pagto = '';
  if (it.area === 'pericia' && it.etapa === 'pra_receber' && !L.dataPagamentoPrevisto(it)) pagto = '<span class="dica">sem data de pagamento prevista</span>';
  return `<article class="card" data-area="${it.area}">
    <button class="card__titulo" data-acao="editar" data-id="${it.id}">${esc(it.titulo || '(sem título)')}</button>
    ${meta ? `<div class="card__meta"><span>${meta}</span></div>` : ''}
    ${datas.length ? `<div class="datas">${datas.map((o) => `<span class="${o.data < h ? 'atraso' : ''}">${o.data < h ? '! ' : ''}${textoData(o, h)}</span>`).join('')}</div>` : ''}
    ${it.proxima_acao && !final ? `<div class="acao"><span>→ ${esc(it.proxima_acao)}</span><button data-acao="acao-feita" data-id="${it.id}" aria-label="Marcar ação como feita" title="Feita">✓</button></div>` : ''}
    ${pagto}
    <div class="card__pe">
      ${it.area === 'pericia' && it.valor ? `<span class="valor">${L.brl(it.valor)}</span>` : '<span></span>'}
      ${prox ? `<button class="btn btn--mini" data-acao="avancar" data-id="${it.id}">→ ${esc(prox.nome)}</button>` : ''}
    </div>
  </article>`;
}

// ---------- vistas ----------
function vistaHoje() {
  const h = hoje();
  const itens = dados.itens;
  if (!itens.length) {
    return `<section class="sec"><div class="cartao">
      <h2>Comece por aqui</h2>
      <p>Cadastre o que está na sua cabeça: cada perícia (mesmo as que ainda são só uma conversa), o que falta no mestrado e os projetos de arte. Cada item tem etapa, datas e uma <b>próxima ação</b>.</p>
      <p class="dica">Seus dados ficam só neste aparelho, no navegador. Nada vai para a internet; use “⋯ → Exportar backup” de vez em quando.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--forte" data-acao="novo" data-area="pericia">+ Primeira perícia</button><button class="btn" data-acao="exemplo">Ver com exemplos</button></div>
    </div></section>`;
  }
  const p = L.panorama(itens);
  const ym = L.mesDe(h);
  const din = L.dinheiroMes(itens, ym);
  const ativas = p.pra_rolar.n + p.rolando.n + p.pra_receber.n;
  const emJogo = p.pra_rolar.valor + p.rolando.valor + p.pra_receber.valor;
  const meta = Number(dados.config.metaMensal) || 0;
  const cel = (id, nome, extra = '') => `<button data-acao="aba" data-v="pericia" class="${p[id].n ? '' : 'zero'}"><b>${p[id].n}</b><span>${nome}</span>${extra}</button>`;
  let msg;
  if (!ativas && !p.prospeccao.n && !p.recebido.n) msg = 'Nenhuma perícia cadastrada ainda.';
  else if (!ativas) msg = 'Nada agendado ou em andamento agora. Bom momento para retomar contatos.';
  else msg = `${ativas} ${ativas === 1 ? 'perícia' : 'perícias'} entre agendadas, em andamento e a receber: ${L.brl(emJogo)} no total.`;
  const aguardando = p.rolando.n + p.pra_rolar.n === 0 && ativas > 0 ? ' Nada novo para fazer, só receber.' : '';

  const g = L.agrupar(itens, h);
  const leads = L.leadsParaRetomar(itens, h);
  const acoes = L.proximasAcoes(itens, h);
  const mostradas = ui.acoes ? acoes : acoes.slice(0, 5);
  const ultimo = dados.config.ultimoBackup;
  const diasBackup = ultimo ? L.diffDias(h, ultimo) : null;
  const soExemplo = itens.every((i) => i.exemplo);

  return `
  ${!soExemplo && (diasBackup === null || diasBackup > 14) ? `<div class="aviso"><span>${diasBackup === null ? 'Você ainda não fez backup.' : `Último backup há ${diasBackup} dias.`} Os dados ficam só neste aparelho.</span><button class="btn btn--mini" data-acao="exportar">Exportar backup</button></div>` : ''}
  ${itens.some((i) => i.exemplo) ? `<div class="aviso"><span>Estes são dados de exemplo.</span><button class="btn btn--mini" data-acao="apagar-exemplos">Apagar exemplos</button></div>` : ''}
  <section class="sec">
    <div class="sec__cab"><h2>Perícias, num olhar</h2></div>
    <div class="cartao"><p style="margin:0 0 10px">${msg}${aguardando}</p>
      <div class="pano">
        ${cel('prospeccao', 'prospecção')}${cel('pra_rolar', 'pra rolar', `<small>${p.pra_rolar.valor ? L.brl(p.pra_rolar.valor) : ''}</small>`)}${cel('rolando', 'rolando', `<small>${p.rolando.valor ? L.brl(p.rolando.valor) : ''}</small>`)}${cel('pra_receber', 'pra receber', `<small>${p.pra_receber.valor ? L.brl(p.pra_receber.valor) : ''}</small>`)}${cel('recebido', 'recebidas', '')}
      </div>
      ${meta ? `<small class="mono">${L.nomeMes(ym).split(' de ')[0]}: ${L.brl(din.recebido)} de ${L.brl(meta)} (${Math.round(Math.min(din.recebido / meta, 9.99) * 100)}%)</small><div class="barra" role="img" aria-label="Meta do mês"><i style="width:${Math.min(100, din.recebido / meta * 100)}%"></i></div>` : '<small class="mono">Defina a meta do mês na aba Meta.</small>'}
    </div>
  </section>

  <section class="sec">
    <div class="sec__cab"><h2>Próximas ações</h2><small>${acoes.length ? `${acoes.length} no total` : ''}</small></div>
    ${mostradas.length ? `<ul class="lista">${mostradas.map((it) => `<li class="lin ${urg(it, h)}">
      <button class="check" data-acao="acao-feita" data-id="${it.id}" aria-label="Ação feita: ${esc(it.proxima_acao)}"></button>
      <button class="lin__corpo" data-acao="editar" data-id="${it.id}">${selo(it.area)}<span class="lin__texto"><b>${esc(it.proxima_acao)}</b><small>${esc(it.titulo)}${it.foco === h ? ' · foco de hoje' : ''}</small></span></button>
      <button class="estrela" data-acao="foco" data-id="${it.id}" aria-pressed="${it.foco === h}" aria-label="Foco de hoje" title="Foco de hoje (até 3)">${it.foco === h ? '★' : '☆'}</button></li>`).join('')}</ul>
      ${acoes.length > 5 ? `<button class="btn btn--fantasma" data-acao="mais-acoes">${ui.acoes ? 'Mostrar menos' : `Ver as outras ${acoes.length - 5}`}</button>` : ''}`
      : '<div class="vazio">Nenhuma ação definida. Abra um item e escreva o próximo passo concreto (ex.: “ligar para o advogado”).</div>'}
  </section>

  ${leads.length ? `<section class="sec"><div class="sec__cab"><h2>Retomar contato</h2><small>prospecção</small></div><ul class="lista">${leads.map((x) => `<li class="lin ${x.estado === 'atrasado' ? 'lin--atraso' : x.estado === 'hoje' ? 'lin--hoje' : ''}"><button class="lin__corpo" data-acao="editar" data-id="${x.item.id}">${selo('pericia')}<span class="lin__texto"><b>${esc(x.item.titulo)}</b><small class="${x.estado === 'atrasado' ? 'atraso' : ''}">${x.estado === 'sem_data' ? 'sem data para retomar' : x.estado === 'hoje' ? 'retomar hoje' : 'retomar ' + L.quando(x.data, h)}</small></span></button></li>`).join('')}</ul></section>` : ''}

  ${g.atrasadas.length ? `<section class="sec"><div class="sec__cab"><h2>Passou da data</h2><small>marque feito ou ajuste</small></div><ul class="lista">${g.atrasadas.map((o) => linhaData(o, h)).join('')}</ul></section>` : ''}
  <section class="sec"><div class="sec__cab"><h2>Hoje</h2></div>${g.hoje.length ? `<ul class="lista">${g.hoje.map((o) => linhaData(o, h)).join('')}</ul>` : '<div class="vazio">Nada com data para hoje.</div>'}</section>
  <section class="sec"><div class="sec__cab"><h2>Próximos 7 dias</h2></div>${g.semana.length ? `<ul class="lista">${g.semana.map((o) => linhaData(o, h)).join('')}</ul>` : '<div class="vazio">Nada nos próximos 7 dias.</div>'}</section>`;
}

function urg(it, h) {
  const u = L.urgencia(it);
  return u < h ? 'lin--atraso' : u === h ? 'lin--hoje' : '';
}

function vistaQuadro(area) {
  const etapas = L.etapasDe(area);
  const h = hoje();
  const titulo = { pericia: 'Perícias', mestrado: 'Mestrado', arte: 'Artes' }[area];
  const cols = etapas.map((e) => {
    let l = dados.itens.filter((i) => i.area === area && i.etapa === e.id);
    const final = e.id === L.ULTIMA[area];
    l = final
      ? l.sort((a, b) => (b.recebido_em || b.criado || '').localeCompare(a.recebido_em || a.criado || ''))
      : l.sort((a, b) => L.urgencia(a).localeCompare(L.urgencia(b)) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
    const total = l.length;
    const chave = `${area}:${e.id}`;
    const limite = final && !ui.todos[chave] ? 5 : Infinity;
    const soma = area === 'pericia' && e.id !== 'prospeccao' ? l.reduce((s, i) => s + (Number(i.valor) || 0), 0) : 0;
    return `<section class="col" aria-label="${esc(e.nome)}">
      <div class="col__cab"><h3>${esc(e.nome)}</h3><small>${total}${soma ? ' · ' + L.brl(soma) : ''}</small></div>
      ${e.dica ? `<span class="dica">${esc(e.dica)}</span>` : ''}
      ${l.slice(0, limite).map(cartao).join('') || '<div class="vazio">Vazio</div>'}
      ${total > limite ? `<button class="btn btn--fantasma" data-acao="ver-tudo" data-chave="${chave}">Ver todas (${total})</button>` : ''}
      ${!final ? `<button class="col__mais" data-acao="novo" data-area="${area}" data-etapa="${e.id}">+ ${area === 'pericia' && e.id === 'prospeccao' ? 'possível cliente' : 'adicionar'}</button>` : ''}
    </section>`;
  }).join('');
  return `<div class="sec__cab"><h2>${titulo}</h2></div><div class="quadro ${etapas.length === 3 ? 'quadro--3' : ''}">${cols}</div>`;
}

function vistaAgenda() {
  const h = hoje();
  const [y, m] = ui.mes.split('-').map(Number);
  const primeiro = new Date(y, m - 1, 1);
  const inicio = L.addDias(L.toISO(primeiro), -primeiro.getDay());
  const oc = L.ocorrencias(dados.itens);
  const porDia = {};
  for (const o of oc) (porDia[o.data] ||= []).push(o);
  let cel = '';
  for (let k = 0; k < 42; k++) {
    const d = L.addDias(inicio, k);
    if (k >= 35 && L.mesDe(d) !== ui.mes) break;
    const lista = porDia[d] || [];
    const areas = [...new Set(lista.map((o) => o.item.area))];
    cel += `<button class="dia ${L.mesDe(d) !== ui.mes ? 'dia--fora' : ''} ${d === h ? 'dia--hoje' : ''} ${d === ui.dia ? 'dia--sel' : ''}" data-acao="dia" data-d="${d}" aria-label="${L.diaCurto(d)}${lista.length ? ', ' + lista.length + ' compromisso(s)' : ''}">${Number(d.slice(8))}<span class="pontos">${areas.map((a) => `<i data-area="${a}"></i>`).join('')}</span></button>`;
  }
  const doMes = oc.filter((o) => (ui.dia ? o.data === ui.dia : L.mesDe(o.data) === ui.mes));
  let lista = '';
  let ultimo = '';
  for (const o of doMes) {
    if (o.data !== ultimo) { lista += `${ultimo ? '</ul>' : ''}<div class="dia-tit">${L.quando(o.data, h) === 'Hoje' ? 'Hoje · ' : ''}${L.diaCurto(o.data)}</div><ul class="lista">`; ultimo = o.data; }
    lista += linhaData(o, h);
  }
  if (ultimo) lista += '</ul>';
  return `<div class="mes-cab"><h2>${L.nomeMes(ui.mes)}</h2>
    <button class="btn btn--icone" data-acao="mes" data-n="-1" aria-label="Mês anterior">‹</button>
    <button class="btn" data-acao="mes-hoje">Hoje</button>
    <button class="btn btn--icone" data-acao="mes" data-n="1" aria-label="Próximo mês">›</button></div>
    <div class="legenda">${Object.entries(L.AREAS).map(([a, v]) => `<span><i class="selo" data-area="${a}">${v.letra}</i>${v.nome}</span>`).join('')}</div>
    <div class="grade">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<div class="dow">${d}</div>`).join('')}${cel}</div>
    ${ui.dia ? `<div class="sec__cab"><h2>${L.diaCurto(ui.dia)}</h2><button class="btn btn--mini" data-acao="dia" data-d="${ui.dia}">Ver o mês todo</button></div>` : ''}
    ${lista || '<div class="vazio">Nada com data neste período.</div>'}`;
}

function vistaMeta() {
  const h = hoje();
  const ym = L.mesDe(h);
  const meta = Number(dados.config.metaMensal) || 0;
  const din = L.dinheiroMes(dados.itens, ym);
  const ano = L.recebidoAno(dados.itens, h.slice(0, 4));
  const p = L.panorama(dados.itens);
  const serie = L.serieMeses(dados.itens, ym, 6);
  const nomeM = L.nomeMes(ym).split(' de ')[0];
  const falta = Math.max(0, meta - din.recebido);
  const comValor = dados.itens.filter((i) => i.area === 'pericia' && i.etapa !== 'prospeccao' && i.valor > 0);
  const medio = comValor.length ? comValor.reduce((s, i) => s + i.valor, 0) / comValor.length : 0;
  const cobertura = din.recebido + din.previsto;
  let frase = '';
  if (meta && falta && medio) {
    const faltaApos = Math.max(0, meta - cobertura);
    frase = faltaApos
      ? `Com o que já entrou (${L.brl(din.recebido)}) e o previsto para ${nomeM.toLowerCase()} (${L.brl(din.previsto)}), faltam ${L.brl(faltaApos)} — cerca de ${Math.ceil(faltaApos / medio)} ${Math.ceil(faltaApos / medio) === 1 ? 'perícia' : 'perícias'} no valor médio de ${L.brl(medio)}.`
      : `Entrando o que está previsto, a meta de ${nomeM.toLowerCase()} fica coberta.`;
  } else if (meta && !falta) frase = 'Meta do mês atingida.';
  else if (meta && !medio) frase = 'Cadastre o valor das perícias para ver quantas faltam para a meta.';
  return `<div class="sec__cab"><h2>Meta</h2></div>
  <div class="campo-meta"><label class="mono" for="meta" style="font-size:13px">Meta de recebimento por mês (R$)</label>
    <input id="meta" type="text" inputmode="decimal" value="${meta ? String(meta).replace('.', ',') : ''}" placeholder="ex.: 8000" style="min-height:44px;border:1px solid var(--line);border-radius:10px;background:var(--paper-3);padding:8px 12px;width:150px;font-size:16px"></div>
  <div class="num-grade">
    <div class="num"><small>Recebido em ${nomeM}</small><b>${L.brl(din.recebido)}</b>${meta ? `<div class="barra" role="img" aria-label="${Math.round(din.recebido / meta * 100)}% da meta"><i style="width:${Math.min(100, din.recebido / meta * 100)}%"></i></div><small>${Math.round(din.recebido / meta * 100)}% de ${L.brl(meta)}</small>` : ''}</div>
    <div class="num"><small>Previsto para ${nomeM}</small><b>${L.brl(din.previsto)}</b><small>com “Pagamento previsto” neste mês</small></div>
    <div class="num"><small>Sem data de pagamento</small><b>${L.brl(din.semData)}</b><small>agendadas, em andamento ou entregues</small></div>
    <div class="num"><small>Recebido em ${h.slice(0, 4)}</small><b>${L.brl(ano)}</b><small>${p.recebido.n} ${p.recebido.n === 1 ? 'perícia recebida' : 'perícias recebidas'} (todas)</small></div>
  </div>
  ${frase ? `<div class="cartao" style="margin-bottom:18px">${frase}</div>` : ''}
  <section class="sec"><div class="sec__cab"><h2>Últimos 6 meses</h2><small>recebido e previsto</small></div><div class="cartao">${grafico(serie, meta)}</div></section>
  <section class="sec"><div class="sec__cab"><h2>Funil de perícias</h2></div><div class="cartao"><table class="tab"><thead><tr><th>Etapa</th><th>Qtde</th><th>Valor</th></tr></thead><tbody>${L.etapasDe('pericia').map((e) => `<tr><td>${e.nome}</td><td>${p[e.id].n}</td><td>${e.id === 'prospeccao' ? '—' : L.brl(p[e.id].valor)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function grafico(serie, meta) {
  const W = 360; const Ht = 200; const ml = 6; const mr = 6; const mt = 22; const mb = 26;
  const max = Math.max(meta, ...serie.map((s) => s.recebido + s.previsto), 1) * 1.12;
  const bw = (W - ml - mr) / serie.length; const larg = Math.min(34, bw * 0.55);
  const y = (v) => mt + (Ht - mt - mb) * (1 - v / max);
  const k = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')} mil` : String(Math.round(v)));
  let s = `<svg class="grafico" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Recebido e previsto por mês, últimos 6 meses">`;
  s += `<line class="eixo" x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}"/>`;
  serie.forEach((d, i) => {
    const x = ml + bw * i + (bw - larg) / 2;
    const yr = y(d.recebido); const yp = y(d.recebido + d.previsto);
    s += `<g><title>${L.nomeMes(d.ym)}: recebido ${L.brl(d.recebido)}, previsto ${L.brl(d.previsto)}</title>`;
    if (d.recebido > 0) s += `<rect class="barra-r" x="${x}" y="${yr}" width="${larg}" height="${y(0) - yr}" rx="3"/>`;
    if (d.previsto > 0) s += `<rect class="barra-p" x="${x}" y="${yp}" width="${larg}" height="${Math.max(2, yr - yp - 2)}" rx="3"/>`;
    const topo = d.recebido + d.previsto;
    if (topo > 0) s += `<text class="val" x="${x + larg / 2}" y="${yp - 4}" text-anchor="middle">${[d.recebido ? k(d.recebido) : '', d.previsto ? (d.recebido ? '+' : '~') + k(d.previsto) : ''].join('')}</text>`;
    s += `<text x="${x + larg / 2}" y="${Ht - 8}" text-anchor="middle">${L.mesCurto(d.ym)}</text></g>`;
  });
  if (meta) s += `<line class="meta" x1="${ml}" x2="${W - mr}" y1="${y(meta)}" y2="${y(meta)}"/><text x="${ml + 2}" y="${y(meta) - 4}">meta ${k(meta)}</text>`;
  s += '</svg>';
  const leg = `<div class="legenda" style="margin:8px 0 0"><span><svg width="16" height="12"><rect width="16" height="12" rx="3" fill="var(--lichen-d)"/></svg>recebido</span><span><svg width="16" height="12"><rect x="1" y="1" width="14" height="10" rx="3" fill="none" stroke="var(--lichen-d)" stroke-width="1.5" stroke-dasharray="3 2"/></svg>previsto</span>${meta ? '<span><svg width="20" height="12"><line x1="0" x2="20" y1="6" y2="6" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 4"/></svg>meta</span>' : ''}</div>`;
  const tab = `<details><summary>Ver como tabela</summary><table class="tab"><thead><tr><th>Mês</th><th>Recebido</th><th>Previsto</th></tr></thead><tbody>${serie.map((d) => `<tr><td>${L.mesCurto(d.ym)}</td><td>${L.brl(d.recebido)}</td><td>${L.brl(d.previsto)}</td></tr>`).join('')}</tbody></table></details>`;
  return s + leg + tab;
}

// ---------- render ----------
function render() {
  $('#data-hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#abas').innerHTML = ABAS.map((a) => `<button data-acao="aba" data-v="${a.id}" ${ui.aba === a.id ? 'aria-current="page"' : ''}><b aria-hidden="true">${a.icone}</b>${a.nome}</button>`).join('');
  const v = ui.aba;
  $('#vista').innerHTML = (v === 'hoje' ? vistaHoje() : v === 'agenda' ? vistaAgenda() : v === 'meta' ? vistaMeta() : vistaQuadro(v))
    + `<p class="rodape">Painel pessoal · versão ${VERSAO} · dados apenas neste aparelho</p>`;
}

// ---------- formulário ----------
function abrirForm(id, base = {}) {
  const existente = id ? achar(id) : null;
  ui.rascunho = existente ? structuredClone(existente) : L.novoItem(base.area || (['pericia', 'mestrado', 'arte'].includes(ui.aba) ? ui.aba : 'pericia'), base.etapa ? { etapa: base.etapa } : {});
  if (!existente && ui.rascunho.area === 'pericia' && ui.rascunho.etapa === 'prospeccao' && !ui.rascunho.datas.length) ui.rascunho.datas = [{ rotulo: 'Retomar contato', data: L.addDias(hoje(), 7) }];
  ui.rascunho._novo = !existente;
  desenharForm();
  $('#dlg').showModal();
}

function desenharForm() {
  const it = ui.rascunho; const a = it.area; const novo = it._novo;
  const etapas = L.etapasDe(a);
  const rotulos = L.ROTULOS[a];
  $('#dlg').innerHTML = `<form class="form" method="dialog" id="form" autocomplete="off">
    <h2>${novo ? 'Novo item' : 'Editar'}</h2>
    ${novo ? `<fieldset><legend>Área</legend><div class="areas">${Object.entries(L.AREAS).map(([k, v]) => `<label><input type="radio" name="area" value="${k}" ${a === k ? 'checked' : ''}> ${v.nome}</label>`).join('')}</div></fieldset>` : `<div>${selo(a)} <small class="mono">${L.AREAS[a].nome}</small></div>`}
    <label>${a === 'pericia' ? 'Perícia (cliente ou assunto)' : a === 'mestrado' ? 'O que é' : 'Projeto ou obra'}<input type="text" name="titulo" required value="${esc(it.titulo)}" placeholder="${a === 'pericia' ? 'ex.: Perícia — Escritório Silva' : a === 'mestrado' ? 'ex.: Capítulo 2' : 'ex.: Edital de residência'}"></label>
    <div class="linha2">
      <label>Etapa<select name="etapa">${etapas.map((e) => `<option value="${e.id}" ${it.etapa === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></label>
      ${a === 'pericia' ? `<label>Valor dos honorários (R$)<input type="text" name="valor" inputmode="decimal" value="${it.valor ? String(it.valor).replace('.', ',') : ''}" placeholder="0"></label>` : '<span></span>'}
    </div>
    ${a === 'pericia' ? `<div class="linha2"><label>Cliente / advogado<input type="text" name="cliente" value="${esc(it.cliente)}"></label><label>Processo / referência<input type="text" name="processo" value="${esc(it.processo)}"></label></div>` : ''}
    ${a === 'pericia' && it.etapa === 'recebido' ? `<label>Recebido em<input type="date" name="recebido_em" value="${esc(it.recebido_em || hoje())}"></label>` : ''}
    <label>Próxima ação (um passo pequeno e concreto)<input type="text" name="proxima_acao" value="${esc(it.proxima_acao)}" placeholder="ex.: ligar para o advogado"></label>
    <fieldset><legend>Datas</legend>
      <div style="display:grid;gap:8px">${it.datas.map((d, i) => `<div class="drow" data-i="${i}">
        <select name="rotulo" aria-label="Tipo de data">${[...new Set([...rotulos, d.rotulo].filter(Boolean))].map((r) => `<option ${d.rotulo === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
        <div style="display:grid;grid-template-columns:1fr 112px;gap:6px"><input type="date" name="data" value="${esc(d.data)}" aria-label="Data"><input type="time" name="hora" value="${esc(d.hora || '')}" aria-label="Hora (opcional)"></div>
        <div class="fim"><label><input type="checkbox" name="feita" ${d.feita ? 'checked' : ''}> já foi</label><button type="button" class="btn btn--mini btn--fantasma" data-acao="del-data" data-i="${i}">remover</button></div></div>`).join('')}</div>
      <button type="button" class="btn btn--mini" style="justify-self:start;margin-top:4px" data-acao="add-data">+ data</button>
    </fieldset>
    <label>Notas<textarea name="notas">${esc(it.notas)}</textarea></label>
    <div class="rodape-form" style="margin:0 -18px -14px">
      ${novo ? '<span></span>' : '<button type="button" class="btn btn--perigo" data-acao="excluir">Excluir</button>'}
      <div class="dir"><button type="button" class="btn" data-acao="fechar">Cancelar</button><button class="btn btn--forte" value="salvar">Salvar</button></div></div>
  </form>`;
}

function lerForm() {
  const f = $('#form'); const it = ui.rascunho;
  const v = (n) => (f.elements[n] ? f.elements[n].value : '');
  if (f.elements.area && f.elements.area.length) it.area = [...f.elements.area].find((r) => r.checked).value;
  it.titulo = v('titulo').trim();
  it.etapa = v('etapa') || it.etapa;
  if (f.elements.valor) it.valor = L.parseValor(v('valor'));
  if (f.elements.cliente) { it.cliente = v('cliente').trim(); it.processo = v('processo').trim(); }
  if (f.elements.recebido_em) it.recebido_em = v('recebido_em');
  it.proxima_acao = v('proxima_acao').trim();
  it.notas = v('notas').trim();
  it.datas = [...f.querySelectorAll('.drow')].map((r) => ({
    rotulo: r.querySelector('[name=rotulo]').value, data: r.querySelector('[name=data]').value,
    hora: r.querySelector('[name=hora]').value, feita: r.querySelector('[name=feita]').checked,
  }));
  return it;
}

function fecharForm() { $('#dlg').close(); ui.rascunho = null; }

function confirmarForm() {
  const it = lerForm();
  if (!it.titulo) { $('#form').elements.titulo.focus(); return; }
  const novo = it._novo; delete it._novo;
  it.datas = it.datas.filter((d) => d.data).map((d) => (d.hora ? d : { rotulo: d.rotulo, data: d.data, ...(d.feita ? { feita: true } : {}) }));
  it.datas.forEach((d) => { if (!d.feita) delete d.feita; });
  const antes = novo ? null : achar(it.id);
  L.mudarEtapa(it, it.etapa);
  if (it.area === 'pericia' && it.etapa === 'recebido' && !it.recebido_em) it.recebido_em = hoje();
  if (novo) dados.itens.push(it); else dados.itens[dados.itens.indexOf(antes)] = it;
  salvar(); fecharForm(); render();
  aviso(novo ? 'Item criado.' : 'Salvo.');
}

// ---------- ações ----------
function marcarAcaoFeita(id) {
  const it = achar(id); if (!it) return;
  const feita = it.proxima_acao;
  $('#dlg').innerHTML = `<form class="form" method="dialog" id="form-prox">
    <h2>Feito ✓</h2><p style="margin:0">${esc(feita)}</p>
    <label>Qual é o próximo passo? (pode deixar em branco)<input type="text" name="prox" autofocus placeholder="ex.: enviar o laudo"></label>
    <div class="rodape-form" style="margin:0 -18px -14px"><span></span><div class="dir"><button class="btn btn--forte">Pronto</button></div></div></form>`;
  $('#dlg').showModal();
  $('#form-prox').addEventListener('submit', () => {
    const antes = it.proxima_acao;
    it.proxima_acao = $('#form-prox').elements.prox.value.trim();
    salvar(); render();
    aviso('Ação concluída.', () => { it.proxima_acao = antes; salvar(); render(); });
  });
}

function avancar(id) {
  const it = achar(id); const prox = it && L.proximaEtapa(it); if (!prox) return;
  const antes = { etapa: it.etapa, recebido_em: it.recebido_em, proxima_acao: it.proxima_acao, foco: it.foco };
  L.mudarEtapa(it, prox.id);
  salvar(); render();
  aviso(prox.id === 'recebido' ? `Recebido${it.valor ? ': ' + L.brl(it.valor) : ''}. Bom trabalho.` : `Movido para “${prox.nome}”.`, () => { Object.assign(it, antes); salvar(); render(); });
}

function alternarFoco(id) {
  const it = achar(id); const h = hoje(); if (!it) return;
  if (it.foco === h) it.foco = '';
  else if (dados.itens.filter((i) => i.foco === h).length >= 3) { aviso('Três focos já bastam por hoje. Tire um para escolher outro.'); return; }
  else it.foco = h;
  salvar(); render();
}

function dataFeita(id, idx) {
  const it = achar(id); if (!it || !it.datas[idx]) return;
  it.datas[idx].feita = true; salvar(); render();
  aviso('Marcado como feito.', () => { delete it.datas[idx].feita; salvar(); render(); });
}

function baixar(nome, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportar() {
  dados.config.ultimoBackup = hoje(); salvar();
  baixar(`painel-backup-${hoje()}.json`, JSON.stringify(dados, null, 2), 'application/json');
  aviso('Backup baixado. Guarde o arquivo num lugar seguro (nuvem, e-mail para você mesmo).'); render();
}

function abrirMenu() {
  const t = dados.config.tema || 'auto';
  $('#dlg').innerHTML = `<div class="menu"><h2>Opções</h2>
    <button class="btn" data-acao="exportar">⬇ Exportar backup (.json)</button>
    <button class="btn" data-acao="importar">⬆ Importar backup</button>
    <button class="btn" data-acao="ics">📅 Exportar datas para o calendário (.ics)</button>
    ${dados.itens.some((i) => i.exemplo) ? '<button class="btn" data-acao="apagar-exemplos">Apagar dados de exemplo</button>' : '<button class="btn" data-acao="exemplo">Carregar exemplos</button>'}
    <div class="tema" role="group" aria-label="Tema">${['auto', 'claro', 'escuro'].map((x) => `<button class="btn btn--mini" data-acao="tema" data-v="${x}" aria-pressed="${t === x}">${x === 'auto' ? 'Tema automático' : x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div>
    <p>Último backup: ${dados.config.ultimoBackup ? L.diaCurto(dados.config.ultimoBackup) : 'nunca'}. Os dados ficam apenas neste navegador; limpar os dados do site apaga tudo, por isso o backup.</p>
    <button class="btn" data-acao="fechar">Fechar</button></div>`;
  $('#dlg').showModal();
}

function aplicarTema() {
  const t = dados.config.tema;
  if (t && t !== 'auto') document.documentElement.dataset.tema = t; else delete document.documentElement.dataset.tema;
  const cor = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  document.querySelector('meta[name=theme-color]').content = cor || '#E8E3D1';
}

// ---------- eventos ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]'); if (!el) return;
  const d = el.dataset; const id = d.id;
  switch (d.acao) {
    case 'aba': ui.aba = d.v; ui.dia = null; render(); window.scrollTo(0, 0); break;
    case 'novo': if ($('#dlg').open) $('#dlg').close(); abrirForm(null, { area: d.area, etapa: d.etapa }); break;
    case 'editar': abrirForm(id); break;
    case 'avancar': avancar(id); break;
    case 'foco': alternarFoco(id); break;
    case 'acao-feita': marcarAcaoFeita(id); break;
    case 'data-feita': dataFeita(id, Number(d.idx)); break;
    case 'mais-acoes': ui.acoes = !ui.acoes; render(); break;
    case 'ver-tudo': ui.todos[d.chave] = true; render(); break;
    case 'mes': ui.mes = L.addMes(ui.mes, Number(d.n)); ui.dia = null; render(); break;
    case 'mes-hoje': ui.mes = L.mesDe(hoje()); ui.dia = null; render(); break;
    case 'dia': ui.dia = ui.dia === d.d ? null : d.d; if (ui.dia && L.mesDe(ui.dia) !== ui.mes) ui.mes = L.mesDe(ui.dia); render(); break;
    case 'mais': abrirMenu(); break;
    case 'fechar': fecharForm(); break;
    case 'add-data': { lerForm(); const a = ui.rascunho.area; ui.rascunho.datas.push({ rotulo: L.ROTULOS[a][a === 'pericia' && ui.rascunho.etapa === 'prospeccao' ? 3 : 0], data: '', hora: '' }); desenharForm(); const ds = document.querySelectorAll('#form [name=data]'); ds[ds.length - 1].focus(); break; }
    case 'del-data': lerForm(); ui.rascunho.datas.splice(Number(d.i), 1); desenharForm(); break;
    case 'excluir': {
      const it = achar(ui.rascunho.id); const pos = dados.itens.indexOf(it);
      dados.itens.splice(pos, 1); salvar(); fecharForm(); render();
      aviso('Item excluído.', () => { dados.itens.splice(pos, 0, it); salvar(); render(); });
      break;
    }
    case 'exportar': exportar(); if ($('#dlg').open) $('#dlg').close(); break;
    case 'importar': $('#arquivo').click(); break;
    case 'ics': baixar('painel-agenda.ics', L.gerarICS(dados.itens), 'text/calendar'); $('#dlg').close(); aviso('Arquivo .ics baixado: abra-o no seu app de calendário.'); break;
    case 'exemplo': dados.itens.push(...L.exemplos(hoje())); salvar(); if ($('#dlg').open) $('#dlg').close(); render(); break;
    case 'apagar-exemplos': dados.itens = dados.itens.filter((i) => !i.exemplo); salvar(); if ($('#dlg').open) $('#dlg').close(); render(); aviso('Exemplos apagados.'); break;
    case 'tema': dados.config.tema = d.v; salvar(); aplicarTema(); abrirMenu(); break;
    case 'desfazer': { const t = $('#toast'); const f = t._desfazer; t.classList.remove('on'); if (f) f(); break; }
    default:
  }
});

document.addEventListener('submit', (e) => { if (e.target.id === 'form') { e.preventDefault(); confirmarForm(); } });
document.addEventListener('change', (e) => {
  if (e.target.id === 'meta') { dados.config.metaMensal = L.parseValor(e.target.value); salvar(); render(); return; }
  if (!ui.rascunho || !e.target.closest('#form')) return;
  if (e.target.name === 'area') {
    const antes = ui.rascunho.area; lerForm();
    if (ui.rascunho.area !== antes) { ui.rascunho.etapa = L.etapasDe(ui.rascunho.area)[ui.rascunho.area === 'pericia' ? 1 : 0].id; ui.rascunho.datas = []; ui.rascunho.valor = 0; }
    desenharForm();
  } else if (e.target.name === 'etapa') { lerForm(); desenharForm(); }
});
$('#dlg').addEventListener('close', () => { ui.rascunho = null; });
$('#arquivo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const novo = L.normalizar(JSON.parse(await f.text()));
    if (dados.itens.length && !confirm(`Substituir os ${dados.itens.length} itens atuais pelos ${novo.itens.length} do arquivo?`)) return;
    dados = novo; salvar(); aplicarTema(); if ($('#dlg').open) $('#dlg').close(); render(); aviso(`Backup importado: ${novo.itens.length} itens.`);
  } catch (err) { aviso(err.message || 'Não consegui ler esse arquivo.'); }
});

// atualiza a data/“hoje” ao voltar para o app depois de horas
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#dlg').open) render(); });

// ---------- início ----------
aplicarTema();
render();
try { navigator.storage?.persist?.(); } catch { /* sem problema */ }

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const novo = reg.installing;
      novo?.addEventListener('statechange', () => {
        if (novo.state === 'installed' && navigator.serviceWorker.controller) {
          aviso('Nova versão do painel disponível.');
          $('#toast').insertAdjacentHTML('beforeend', '<button id="atualizar">Atualizar</button>');
          $('#atualizar').onclick = () => novo.postMessage('atualizar');
        }
      });
    });
  }).catch(() => {});
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recarregando) { recarregando = true; location.reload(); } });
}
