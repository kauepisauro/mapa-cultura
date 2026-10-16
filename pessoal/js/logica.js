// Lógica pura do painel pessoal (sem DOM): datas, etapas, agenda, dinheiro e exportação .ics.
// Os dados NUNCA vão para o repositório: ficam só no navegador do dono (localStorage) + backup em arquivo.

export const AREAS = {
  pericia: { nome: 'Perícias', letra: 'P' },
  mestrado: { nome: 'Mestrado', letra: 'M' },
  arte: { nome: 'Artes', letra: 'A' },
};

export const ETAPAS = {
  pericia: [
    { id: 'prospeccao', nome: 'Prospecção', dica: 'Possíveis clientes. Ainda não é perícia.' },
    { id: 'pra_rolar', nome: 'Pra rolar', dica: 'Aceita ou agendada, ainda não começou.' },
    { id: 'rolando', nome: 'Rolando', dica: 'Em andamento.' },
    { id: 'pra_receber', nome: 'Pra receber', dica: 'Laudo entregue, falta o pagamento.' },
    { id: 'recebido', nome: 'Recebido', dica: 'Pago.' },
  ],
  mestrado: [
    { id: 'fazer', nome: 'A fazer' },
    { id: 'fazendo', nome: 'Fazendo' },
    { id: 'feito', nome: 'Feito' },
  ],
  arte: [
    { id: 'fazer', nome: 'A fazer' },
    { id: 'fazendo', nome: 'Fazendo' },
    { id: 'feito', nome: 'Feito' },
  ],
};

export const ROTULOS = {
  pericia: ['Vistoria / audiência', 'Entrega do laudo', 'Pagamento previsto', 'Retomar contato', 'Outro'],
  mestrado: ['Entrega', 'Reunião com orientação', 'Aula', 'Qualificação', 'Defesa', 'Outro'],
  arte: ['Entrega', 'Prazo de edital', 'Exposição / evento', 'Ensaio / ateliê', 'Outro'],
};

export const ULTIMA = { pericia: 'recebido', mestrado: 'feito', arte: 'feito' };
export const ehFinal = (it) => it.etapa === ULTIMA[it.area];
export const etapasDe = (area) => ETAPAS[area];
export const nomeEtapa = (area, id) => (ETAPAS[area].find((e) => e.id === id) || { nome: id }).nome;

// ---- datas (sempre 'AAAA-MM-DD' local, sem fuso) ----
const p2 = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const hojeISO = () => toISO(new Date());
export const addDias = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };
const utc = (s) => { const d = fromISO(s); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };
export const diffDias = (a, b) => Math.round((utc(a) - utc(b)) / 86400000);
export const mesDe = (s) => s.slice(0, 7);
export const addMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MESES_LONGO[m - 1]} de ${y}`; };
export const mesCurto = (ym) => MESES[Number(ym.slice(5)) - 1];
export const diaCurto = (s) => { const d = fromISO(s); return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`; };

export function quando(s, hoje = hojeISO()) {
  const n = diffDias(s, hoje);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  if (n > 1 && n < 7) return `${DIAS[fromISO(s).getDay()]} (em ${n} dias)`;
  if (n < 0) return `${diaCurto(s)} (${-n} dias atrás)`;
  return `${diaCurto(s)}${n < 60 ? ` (em ${n} dias)` : ''}`;
}

export const hora = (h) => { if (!h) return ''; const [hh, mm] = h.split(':'); return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`; };

export const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const parseValor = (txt) => {
  if (typeof txt === 'number') return txt;
  const s = String(txt || '').replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  // "1.500,50" ou "1500,50" ou "1500.50"
  const n = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : (/^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s);
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

// ---- itens ----
export function novoItem(area, extra = {}) {
  return {
    id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    area, titulo: '', etapa: ETAPAS[area][area === 'pericia' ? 1 : 0].id,
    cliente: '', processo: '', valor: 0, proxima_acao: '', notas: '',
    datas: [], foco: '', recebido_em: '', criado: hojeISO(), ...extra,
  };
}

/** Muda a etapa mantendo coerência (data de recebimento, datas do que acabou de ser concluído). */
export function mudarEtapa(it, etapa, hoje = hojeISO()) {
  it.etapa = etapa;
  if (it.area === 'pericia') it.recebido_em = etapa === 'recebido' ? (it.recebido_em || hoje) : '';
  if (ehFinal(it)) { it.proxima_acao = ''; it.foco = ''; }
  return it;
}
export function proximaEtapa(it) {
  const l = ETAPAS[it.area]; const i = l.findIndex((e) => e.id === it.etapa);
  return l[i + 1] || null;
}

/** Linha do tempo: uma entrada por data de cada item ainda ativo (datas marcadas como feitas ficam de fora, salvo `todas`). */
export function ocorrencias(itens, { todas = false } = {}) {
  const out = [];
  for (const it of itens) {
    if (!todas && ehFinal(it)) continue;
    (it.datas || []).forEach((d, idx) => {
      if (!d.data) return;
      if (!todas && d.feita) return;
      out.push({ item: it, idx, rotulo: d.rotulo || '', data: d.data, hora: d.hora || '', feita: !!d.feita });
    });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data) || (a.hora || '99').localeCompare(b.hora || '99') || a.item.titulo.localeCompare(b.item.titulo, 'pt-BR'));
}

export function agrupar(itens, hoje = hojeISO()) {
  const oc = ocorrencias(itens);
  return {
    atrasadas: oc.filter((o) => o.data < hoje),
    hoje: oc.filter((o) => o.data === hoje),
    semana: oc.filter((o) => o.data > hoje && o.data <= addDias(hoje, 7)),
    depois: oc.filter((o) => o.data > addDias(hoje, 7)),
  };
}

/** Urgência de um item = data pendente mais próxima (atrasada vem primeiro). Sem data → fim da fila. */
export function urgencia(it) {
  const ds = (it.datas || []).filter((d) => d.data && !d.feita).map((d) => d.data).sort();
  return ds[0] || '9999-12-31';
}

/** Próximas ações: itens ativos com `proxima_acao`, foco de hoje primeiro, depois por urgência. */
export function proximasAcoes(itens, hoje = hojeISO()) {
  return itens.filter((it) => !ehFinal(it) && it.proxima_acao)
    .sort((a, b) => (b.foco === hoje) - (a.foco === hoje) || urgencia(a).localeCompare(urgencia(b)) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

// ---- perícias: panorama e dinheiro ----
export function panorama(itens) {
  const p = itens.filter((i) => i.area === 'pericia');
  const por = {};
  for (const e of ETAPAS.pericia) {
    const l = p.filter((i) => i.etapa === e.id);
    por[e.id] = { n: l.length, valor: l.reduce((s, i) => s + (Number(i.valor) || 0), 0) };
  }
  return por;
}

export function dataPagamentoPrevisto(it) {
  const d = (it.datas || []).filter((x) => x.rotulo === 'Pagamento previsto' && x.data).sort((a, b) => a.data.localeCompare(b.data))[0];
  return d ? d.data : '';
}

/** Dinheiro do mês `ym`: recebido, previsto (com data de pagamento no mês) e total ainda sem data. */
export function dinheiroMes(itens, ym) {
  const p = itens.filter((i) => i.area === 'pericia');
  let recebido = 0; let previsto = 0;
  for (const i of p) {
    const v = Number(i.valor) || 0;
    if (i.etapa === 'recebido') { if (i.recebido_em && mesDe(i.recebido_em) === ym) recebido += v; }
    else if (i.etapa !== 'prospeccao') { const dp = dataPagamentoPrevisto(i); if (dp && mesDe(dp) === ym) previsto += v; }
  }
  const semData = p.filter((i) => i.etapa !== 'recebido' && i.etapa !== 'prospeccao' && !dataPagamentoPrevisto(i)).reduce((s, i) => s + (Number(i.valor) || 0), 0);
  return { recebido, previsto, semData };
}
export const recebidoAno = (itens, ano) => itens.filter((i) => i.area === 'pericia' && i.etapa === 'recebido' && i.recebido_em && i.recebido_em.startsWith(String(ano))).reduce((s, i) => s + (Number(i.valor) || 0), 0);
export function serieMeses(itens, ymFim, n = 6) {
  const out = [];
  for (let k = n - 1; k >= 0; k--) { const ym = addMes(ymFim, -k); out.push({ ym, ...dinheiroMes(itens, ym) }); }
  return out;
}

/** Leads de prospecção sem data de retomada, ou com retomada vencida/de hoje. */
export function leadsParaRetomar(itens, hoje = hojeISO()) {
  return itens.filter((i) => i.area === 'pericia' && i.etapa === 'prospeccao').map((i) => {
    const d = (i.datas || []).filter((x) => x.rotulo === 'Retomar contato' && x.data && !x.feita).map((x) => x.data).sort()[0] || '';
    return { item: i, data: d, estado: !d ? 'sem_data' : d < hoje ? 'atrasado' : d === hoje ? 'hoje' : 'futuro' };
  }).filter((x) => x.estado !== 'futuro');
}

// ---- backup / .ics ----
export const dadosVazios = () => ({ versao: 1, itens: [], config: { metaMensal: 0, tema: 'auto', ultimoBackup: '' } });

export function normalizar(obj) {
  const base = dadosVazios();
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.itens)) throw new Error('Arquivo de backup inválido.');
  const itens = obj.itens.filter((i) => i && AREAS[i.area] && typeof i.titulo === 'string').map((i) => {
    const it = { ...novoItem(i.area), ...i };
    if (!ETAPAS[it.area].some((e) => e.id === it.etapa)) it.etapa = ETAPAS[it.area][0].id;
    it.datas = Array.isArray(it.datas) ? it.datas.filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d.data || '')) : [];
    it.valor = Number(it.valor) || 0;
    return it;
  });
  return { ...base, ...obj, itens, config: { ...base.config, ...(obj.config || {}) } };
}

const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
export function gerarICS(itens, agora = new Date()) {
  const stamp = `${agora.getUTCFullYear()}${p2(agora.getUTCMonth() + 1)}${p2(agora.getUTCDate())}T${p2(agora.getUTCHours())}${p2(agora.getUTCMinutes())}00Z`;
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Painel pessoal//PT', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Painel pessoal'];
  for (const o of ocorrencias(itens)) {
    const dia = o.data.replace(/-/g, '');
    L.push('BEGIN:VEVENT', `UID:${o.item.id}-${o.idx}@painel-pessoal`, `DTSTAMP:${stamp}`);
    if (o.hora) {
      const [hh, mm] = o.hora.split(':'); const fim = `${p2((Number(hh) + 1) % 24)}${mm}00`;
      L.push(`DTSTART:${dia}T${hh}${mm}00`, `DTEND:${dia}T${fim}`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${dia}`, `DTEND;VALUE=DATE:${addDias(o.data, 1).replace(/-/g, '')}`);
    }
    L.push(`SUMMARY:${icsEsc(`${o.rotulo ? o.rotulo + ': ' : ''}${o.item.titulo}`)}`);
    if (o.item.proxima_acao) L.push(`DESCRIPTION:${icsEsc(`Próxima ação: ${o.item.proxima_acao}`)}`);
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}

// ---- exemplo para conhecer o painel (marcado, apagável) ----
export function exemplos(hoje = hojeISO()) {
  const d = (n, rotulo, hora = '') => ({ rotulo, data: addDias(hoje, n), hora });
  const mk = (area, titulo, etapa, extra) => ({ ...novoItem(area, { titulo, exemplo: true, ...extra }), etapa });
  return [
    mk('pericia', 'Exemplo · Perícia de engenharia (cliente A)', 'rolando', { valor: 4500, proxima_acao: 'Pedir documentos ao advogado', datas: [d(3, 'Vistoria / audiência', '09:00'), d(12, 'Entrega do laudo')] }),
    mk('pericia', 'Exemplo · Perícia contábil (cliente B)', 'pra_rolar', { valor: 3200, proxima_acao: 'Confirmar data da vistoria', datas: [d(6, 'Vistoria / audiência', '14:00')] }),
    mk('pericia', 'Exemplo · Laudo entregue (cliente C)', 'pra_receber', { valor: 6000, datas: [d(9, 'Pagamento previsto')] }),
    mk('pericia', 'Exemplo · Escritório D', 'prospeccao', { proxima_acao: 'Mandar mensagem perguntando se há processos', datas: [d(0, 'Retomar contato')] }),
    mk('mestrado', 'Exemplo · Capítulo de revisão', 'fazendo', { proxima_acao: 'Escrever 1 página da introdução', datas: [d(10, 'Entrega')] }),
    mk('mestrado', 'Exemplo · Reunião com orientação', 'fazer', { datas: [d(5, 'Reunião com orientação', '10:30')] }),
    mk('arte', 'Exemplo · Edital de residência', 'fazer', { proxima_acao: 'Separar 5 imagens do portfólio', datas: [d(14, 'Prazo de edital')] }),
  ];
}
