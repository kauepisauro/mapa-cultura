// Gera arquivo .ics (abre no calendário do celular). Horário "flutuante" = o horário local de quem importa.
import { somarDias } from './datas.js';

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dia = (s) => s.replace(/-/g, '');
const pad = (n) => String(n).padStart(2, '0');
const utcAgora = (d = new Date()) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

// Dobra linhas em 75 bytes (RFC 5545) sem cortar caractere no meio.
function dobrar(linha) {
  const enc = new TextEncoder();
  const partes = [];
  let atual = '';
  let bytes = 0;
  for (const ch of linha) {
    const n = enc.encode(ch).length;
    if (bytes + n > 74) { partes.push(atual); atual = ' '; bytes = 1; }
    atual += ch;
    bytes += n;
  }
  partes.push(atual);
  return partes.join('\r\n');
}

function fim(ev) {
  // duração padrão de 2h; se passar da meia-noite, vai para o dia seguinte
  const [h, m] = ev.hora.split(':').map(Number);
  const total = h * 60 + m + 120;
  const d = total >= 1440 ? somarDias(ev.data, 1) : ev.data;
  const t = total % 1440;
  return `${dia(d)}T${pad(Math.floor(t / 60))}${pad(t % 60)}00`;
}

export function gerarICS(eventos, estado, agora = new Date()) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SOS Lagoa//Calendario de luta//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:SOS Lagoa'];
  for (const ev of eventos) {
    const frente = estado.frentes.find((f) => f.id === ev.frente)?.nome;
    const desc = [frente && `Frente: ${frente}`, ev.notas, (ev.pauta || '').trim() && `Pauta:\n${ev.pauta.trim()}`].filter(Boolean).join('\n\n');
    L.push('BEGIN:VEVENT', `UID:${ev.id}@soslagoa`, `DTSTAMP:${utcAgora(agora)}`);
    if (ev.hora) L.push(`DTSTART:${dia(ev.data)}T${ev.hora.replace(':', '')}00`, `DTEND:${fim(ev)}`);
    else L.push(`DTSTART;VALUE=DATE:${dia(ev.data)}`, `DTEND;VALUE=DATE:${dia(somarDias(ev.data, 1))}`);
    L.push(`SUMMARY:${esc(`SOS Lagoa · ${ev.titulo}${ev.aConfirmar ? ' (a confirmar)' : ''}`)}`);
    if (ev.aConfirmar) L.push('STATUS:TENTATIVE');
    if (ev.local) L.push(`LOCATION:${esc(ev.local)}`);
    if (desc) L.push(`DESCRIPTION:${esc(desc)}`);
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return `${L.map(dobrar).join('\r\n')}\r\n`;
}
