// Datas em texto "AAAA-MM-DD" (sempre horário local, sem fuso) — funções puras.
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const pad = (n) => String(n).padStart(2, '0');

export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parse(s) {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export const valida = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parse(s)) === s;

export const hojeISO = (agora = new Date()) => iso(agora);

export function somarDias(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

// Dias de `a` até `b` (positivo se b é depois). Imune a horário de verão.
export function diffDias(a, b) {
  const [a1, m1, d1] = a.split('-').map(Number);
  const [a2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 864e5);
}

export const diaSemana = (s) => parse(s).getDay();

export function dataCurta(s) {
  const d = parse(s);
  return `${DIAS_CURTOS[d.getDay()]}, ${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
}

export function dataLonga(s) {
  const d = parse(s);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function relativo(s, hoje) {
  const n = diffDias(hoje, s);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  return n > 1 ? `em ${n} dias` : `há ${-n} dias`;
}

export function hora(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
}

export const inicioDaSemana = (s) => somarDias(s, -diaSemana(s));

// 6 semanas × 7 dias para desenhar o mês (semana começa no domingo).
export function grade(ano, mes) {
  const ini = inicioDaSemana(iso(new Date(ano, mes, 1)));
  return Array.from({ length: 42 }, (_, i) => {
    const x = somarDias(ini, i);
    return { iso: x, doMes: parse(x).getMonth() === mes };
  });
}

export function deslocarMes({ ano, mes }, n) {
  const d = new Date(ano, mes + n, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() };
}
