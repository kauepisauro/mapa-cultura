// Textos prontos para colar no WhatsApp (formatação *negrito*). Funções puras.
import { dataCurta, dataLonga, hora, somarDias } from './datas.js';
import { TIPOS, SEM_RESPONSAVEL, ordenarEncaminhamentos, porPessoa, proximosEventos, situacaoPrazo } from './logica.js';

const RODAPE = '_SOS Lagoa · movimento popular em defesa da Lagoa da Conceição_';
const nomeFrente = (estado, id) => estado.frentes.find((f) => f.id === id)?.nome || '';
const limpaMarcador = (l) => l.replace(/^\s*[-•*·]+\s*/, '').trim();

function linhaEnc(e, i, hoje, comQuem = true) {
  const quem = comQuem ? ` — *${e.paraTodos ? 'todo mundo' : (e.responsaveis.length ? e.responsaveis.join(', ') : SEM_RESPONSAVEL.toLowerCase())}*` : '';
  const prazo = e.prazo ? ` · até ${dataCurta(e.prazo)}` : '';
  const alerta = situacaoPrazo(e, hoje) === 'atrasado' ? ' (atrasado)' : '';
  const status = e.status === 'feito' ? ' ✅' : e.status === 'fazendo' ? ' (em andamento)' : '';
  return `${i}. ${e.texto}${quem}${prazo}${alerta}${status}`;
}

export function resumoEvento(estado, ev, hoje) {
  const L = [];
  const frente = nomeFrente(estado, ev.frente);
  L.push(`*${TIPOS[ev.tipo].nome.toUpperCase()}${frente ? ` · ${frente}` : ''}*`);
  L.push(`*${ev.titulo}*${ev.aConfirmar ? ' _(a confirmar)_' : ''}`);
  L.push(`📅 ${dataLonga(ev.data)}${ev.hora ? ` às ${hora(ev.hora)}` : ''}`);
  if (ev.local) L.push(`📍 ${ev.local}`);
  const pauta = (ev.pauta || '').split('\n').map(limpaMarcador).filter(Boolean);
  if (pauta.length) L.push('', '*Pauta*', ...pauta.map((p) => `• ${p}`));
  if (ev.notas.trim()) L.push('', ev.notas.trim());
  if (ev.presentes.length) L.push('', `*${ev.tipo === 'reuniao' ? 'Presentes' : 'Quem vai'}:* ${ev.presentes.join(', ')}`);
  if (ev.ata.trim()) L.push('', '*Registro*', ev.ata.trim());
  const encs = ordenarEncaminhamentos(estado.encaminhamentos.filter((e) => e.origem === ev.id), hoje);
  if (encs.length) L.push('', '*Encaminhamentos*', ...encs.map((e, i) => linhaEnc(e, i + 1, hoje)));
  const ideias = estado.ideias.filter((i) => i.origem === ev.id);
  if (ideias.length) L.push('', '*Ideias que surgiram*', ...ideias.map((i) => `• ${i.titulo}${i.notas.trim() ? ` — ${i.notas.trim()}` : ''}`));
  L.push('', RODAPE);
  return L.join('\n');
}

// Quem vai fazer o quê (só itens abertos), agrupado por pessoa.
export function resumoPendencias(estado, hoje, filtro = {}) {
  const grupos = porPessoa(estado, hoje, filtro);
  if (!grupos.length) return `*Encaminhamentos em aberto*\nNada pendente por aqui.\n\n${RODAPE}`;
  const L = [`*Encaminhamentos em aberto* · ${dataCurta(hoje)}`];
  for (const g of grupos) L.push('', `*${g.pessoa}*`, ...g.itens.map((e, i) => linhaEnc(e, i + 1, hoje, false)));
  L.push('', RODAPE);
  return L.join('\n');
}

export function resumoAgenda(estado, hoje, dias = 21) {
  const limite = somarDias(hoje, dias);
  const evs = proximosEventos(estado, hoje).filter((e) => e.data <= limite);
  if (!evs.length) return `*Calendário de luta*\nNenhum compromisso marcado para os próximos ${dias} dias.\n\n${RODAPE}`;
  const L = [`*Calendário de luta · próximos ${dias} dias*`, ''];
  for (const e of evs) {
    const frente = nomeFrente(estado, e.frente);
    L.push(`📅 *${dataCurta(e.data)}${e.hora ? ` · ${hora(e.hora)}` : ''}* — ${e.destaque ? '⭐ ' : ''}${e.titulo}${e.aConfirmar ? ' (a confirmar)' : ''}${frente ? ` (${frente})` : ''}${e.local ? `\n      📍 ${e.local}` : ''}`);
  }
  L.push('', RODAPE);
  return L.join('\n');
}
