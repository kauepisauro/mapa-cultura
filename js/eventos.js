// Lógica de agenda: expansão de eventos recorrentes e janelas de tempo (sem DOM).
import { addDias, addMeses, diffDias, diaSemana, fromISO, nesimoDiaSemana, ordemNoMes, toISO } from './utils.js';

const minutos = (h) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + (mm || 0);
};

/**
 * Expande eventos (únicos ou recorrentes) em ocorrências datadas dentro de [de, ate].
 * Cada ocorrência tem `key` único e `serie` (id do evento original).
 */
export function expandir(eventos, de, ate) {
  const saida = [];
  const poe = (ev, data) => saida.push({ ...ev, data, serie: ev.id, key: `${ev.id}@${data}` });

  for (const ev of eventos) {
    if (!ev.data) continue;
    const limite = ev.repete_ate && ev.repete_ate < ate ? ev.repete_ate : ate;
    const rep = ev.repete && ev.repete !== 'nao' ? ev.repete : null;

    if (!rep) {
      if (ev.data >= de && ev.data <= ate) poe(ev, ev.data);
      continue;
    }
    if (rep === 'diaria' || rep === 'dias_uteis') {
      for (let d = ev.data < de ? de : ev.data; d <= limite; d = addDias(d, 1)) {
        const dow = diaSemana(d);
        if (rep === 'diaria' || (dow >= 1 && dow <= 5)) poe(ev, d);
      }
    } else if (rep === 'mensal_semana') {
      const base = fromISO(ev.data);
      const dow = base.getDay();
      const n = ordemNoMes(ev.data);
      for (let i = 0; i < 120; i++) {
        const d = nesimoDiaSemana(base.getFullYear(), base.getMonth() + i, dow, n);
        if (d > limite) break;
        if (d >= de && d >= ev.data) poe(ev, d);
      }
    } else if (rep === 'semanal' || rep === 'quinzenal') {
      const passo = rep === 'semanal' ? 7 : 14;
      let d = ev.data;
      if (d < de) {
        const saltos = Math.floor(diffDias(de, d) / passo);
        d = addDias(d, saltos * passo);
        if (d < de) d = addDias(d, passo);
      }
      for (; d <= limite; d = addDias(d, passo)) poe(ev, d);
    } else if (rep === 'mensal') {
      const base = fromISO(ev.data).getDate();
      for (let i = 0, d = ev.data; d <= limite && i < 120; i++, d = addMeses(ev.data, i, base)) {
        if (d >= de) poe(ev, d);
      }
    }
  }
  return saida.sort((a, b) => a.data.localeCompare(b.data) || (a.inicio || '').localeCompare(b.inicio || ''));
}

/** 'agora' | 'depois' | 'futuro' | 'encerrado' */
export function statusOcorrencia(oc, agora = new Date()) {
  const hoje = toISO(agora);
  const ontem = addDias(hoje, -1);
  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  if (!oc.inicio) return oc.data > hoje ? 'futuro' : oc.data === hoje ? 'agora' : 'encerrado'; // sem horário = dia todo
  const ini = minutos(oc.inicio);
  let fim = oc.fim ? minutos(oc.fim) : ini + 120;
  const viraNoite = fim <= ini;
  if (viraNoite) fim += 1440;

  if (oc.data > hoje) return 'futuro';
  if (oc.data === ontem) return viraNoite && nowMin < fim - 1440 ? 'agora' : 'encerrado';
  if (oc.data < hoje) return 'encerrado';
  if (nowMin < ini) return 'depois';
  return nowMin <= fim ? 'agora' : 'encerrado';
}

/** Janelas do filtro da agenda -> [de, ate] em ISO. */
export function janela(nome, hoje) {
  switch (nome) {
    case 'hoje': return [hoje, hoje];
    case 'amanha': return [addDias(hoje, 1), addDias(hoje, 1)];
    case 'fds': {
      const dow = diaSemana(hoje); // 0 dom … 6 sáb
      if (dow === 0) return [hoje, hoje];
      if (dow === 6) return [hoje, addDias(hoje, 1)];
      const sexta = addDias(hoje, 5 - dow);
      return [dow === 5 ? hoje : sexta, addDias(hoje, 7 - dow)];
    }
    case '30d': return [hoje, addDias(hoje, 29)];
    default: return [hoje, addDias(hoje, 6)]; // '7d'
  }
}

export const ehGratis = (ev) => !ev.preco || /^(gr[aá]tis|gratuito|livre|0|franco)/i.test(String(ev.preco).trim());
