// Utilidades puras (sem DOM) — testadas em tests/run.mjs

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Hash determinístico (string -> inteiro 32 bits) para variar formas por ponto. */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const norm = (s) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const slug = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';

// ---------- datas (sempre strings ISO locais "YYYY-MM-DD") ----------
const p2 = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
/** Meio-dia local: evita problemas de fuso/horário de verão ao somar dias. */
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};
export const hojeISO = (now = new Date()) => toISO(now);
export const addDias = (iso, n) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const diffDias = (a, b) => Math.round((fromISO(a) - fromISO(b)) / 86400000);
export const diaSemana = (iso) => fromISO(iso).getDay();

export function addMeses(iso, n, diaBase) {
  const d = fromISO(iso);
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0, 12).getDate();
  alvo.setDate(Math.min(diaBase ?? d.getDate(), ultimo));
  return toISO(alvo);
}

export function rotuloDia(iso, hoje = hojeISO()) {
  const diff = diffDias(iso, hoje);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const d = fromISO(iso);
  return `${DIAS_LONGOS[d.getDay()][0].toUpperCase()}${DIAS_LONGOS[d.getDay()].slice(1)}`;
}
export function dataCurta(iso) {
  const d = fromISO(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}
export function dataNumero(iso) {
  const d = fromISO(iso);
  return { dia: d.getDate(), mes: MESES[d.getMonth()], sem: DIAS[d.getDay()] };
}

/** "19:00" -> "19h", "21:30" -> "21h30" */
export function hora(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm && mm !== '00' ? `${Number(hh)}h${mm}` : `${Number(hh)}h`;
}
const minutos = (h) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + (mm || 0);
};

/** n-ésimo dia da semana do mês (n=5 => último). Retorna ISO. */
export function nesimoDiaSemana(ano, mes, dow, n) {
  const primeiro = new Date(ano, mes, 1, 12).getDay();
  let dia = 1 + ((dow - primeiro + 7) % 7) + (n - 1) * 7;
  const ultimo = new Date(ano, mes + 1, 0, 12).getDate();
  while (dia > ultimo) dia -= 7;
  return toISO(new Date(ano, mes, dia, 12));
}
export const ordemNoMes = (iso) => Math.min(5, Math.ceil(fromISO(iso).getDate() / 7));

export function recorrenciaTexto(ev) {
  const dia = DIAS_LONGOS[diaSemana(ev.data)];
  const plural = `${dia}s`;
  switch (ev.repete) {
    case 'diaria': return 'Todos os dias';
    case 'dias_uteis': return 'De segunda a sexta';
    case 'mensal_semana': {
      const n = ordemNoMes(ev.data);
      return n === 5 ? `Todo último ${dia} do mês` : `Todo ${n}º ${dia} do mês`;
    }
    case 'semanal': return `Toda ${dia}`.replace('Toda sábado', 'Todo sábado').replace('Toda domingo', 'Todo domingo');
    case 'quinzenal': return `A cada 15 dias (${plural})`;
    case 'mensal': return `Todo dia ${fromISO(ev.data).getDate()} do mês`;
    default: return '';
  }
}

// ---------- geo ----------
export function distanciaKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const kmTexto = (km) => (km < 1 ? `${Math.round(km * 10) * 100} m` : `${km.toFixed(1).replace('.', ',')} km`);

// ---------- links ----------
export function linkInstagram(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://instagram.com/${s.replace(/^@/, '').replace(/\/$/, '')}`;
}
export function linkWhatsapp(v, texto = '') {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length < 10) return '';
  const num = d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
  return `https://wa.me/${num}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}
export function linkSite(v) {
  if (!v) return '';
  const s = String(v).trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
export const linkRota = (p) => `https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`;
export const linkGoogleMaps = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

// ---------- calendário (.ics) ----------
const icsEsc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dt = (iso, h) => `${iso.replace(/-/g, '')}T${(h || '00:00').replace(':', '')}00`;
function dobrar(linha) {
  const out = [];
  let rest = linha;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export function gerarICS(oc, { local = '', url = '' } = {}) {
  const diaTodo = !oc.inicio;
  const inicio = oc.inicio || '00:00';
  let fimData = oc.data;
  let fim = oc.fim;
  if (diaTodo) {
    fim = null;
  } else if (!fim) {
    const m = minutos(inicio) + 120;
    fim = `${p2(Math.floor((m % 1440) / 60))}:${p2(m % 60)}`;
    if (m >= 1440) fimData = addDias(oc.data, 1);
  } else if (minutos(fim) <= minutos(inicio)) {
    fimData = addDias(oc.data, 1);
  }
  const rrule = {
    diaria: 'FREQ=DAILY',
    dias_uteis: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    semanal: 'FREQ=WEEKLY',
    quinzenal: 'FREQ=WEEKLY;INTERVAL=2',
    mensal: 'FREQ=MONTHLY',
    mensal_semana: `FREQ=MONTHLY;BYDAY=${ordemNoMes(oc.data) === 5 ? '-1' : ordemNoMes(oc.data)}${BYDAY[diaSemana(oc.data)]}`,
  }[oc.repete];
  const ate = oc.repete_ate ? (diaTodo ? `;UNTIL=${oc.repete_ate.replace(/-/g, '')}` : `;UNTIL=${oc.repete_ate.replace(/-/g, '')}T235959`) : '';
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cartografia Liquen//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${oc.key || oc.id}@cartografia-liquen`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    diaTodo ? `DTSTART;VALUE=DATE:${oc.data.replace(/-/g, '')}` : `DTSTART:${dt(oc.data, inicio)}`,
    diaTodo ? `DTEND;VALUE=DATE:${addDias(oc.data, 1).replace(/-/g, '')}` : `DTEND:${dt(fimData, fim)}`,
    `SUMMARY:${icsEsc(oc.titulo)}`,
    local && `LOCATION:${icsEsc(local)}`,
    oc.descricao && `DESCRIPTION:${icsEsc(oc.descricao)}`,
    url && `URL:${url}`,
    rrule && `RRULE:${rrule}${ate}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `${linhas.map(dobrar).join('\r\n')}\r\n`;
}

/** Reconhece link de vídeo: YouTube, Vimeo ou arquivo (.mp4/.webm). */
export function parseVideo(url) {
  const u = String(url ?? '').trim();
  if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return { tipo: 'youtube', id: m[1] };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { tipo: 'vimeo', id: m[1] };
  if (/\.(mp4|webm|ogv)(\?.*)?$/i.test(u)) return { tipo: 'arquivo', src: u };
  return null;
}
