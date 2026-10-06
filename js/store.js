// Camada de dados: Supabase (REST, sem SDK) ou modo demonstração (seed.json).
import { CONFIG } from './config.js';
import { addDias, hojeISO, norm } from './utils.js';

const LS_PEND = 'liquen:pendentes';
const LS_RATE = 'liquen:envios';

export const temBanco = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

const COLS = {
  pontos: 'id,nome,categoria,descricao,lat,lng,aprox,bairro,endereco,horario,instagram,whatsapp,site,fonte,foto,foto_alt,tags',
  eventos: 'id,ponto_id,titulo,categoria,descricao,data,inicio,fim,repete,repete_ate,preco,link,fonte,confirmar,lat,lng,local_nome,foto,foto_alt',
};

const hh = (v) => (v ? String(v).slice(0, 5) : null);

function limparPonto(p) {
  return { ...p, lat: Number(p.lat), lng: Number(p.lng), tags: p.tags || [], aprox: Boolean(p.aprox) };
}
function limparEvento(e) {
  return {
    ...e,
    inicio: hh(e.inicio),
    fim: hh(e.fim),
    repete: e.repete || 'nao',
    lat: e.lat == null ? null : Number(e.lat),
    lng: e.lng == null ? null : Number(e.lng),
  };
}

function headers(extra = {}) {
  return { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${CONFIG.supabaseAnonKey}`, 'Content-Type': 'application/json', ...extra };
}
const rest = (tabela, qs = '') => `${CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${tabela}${qs}`;

async function lerSeed() {
  const r = await fetch('data/seed.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('seed.json indisponível');
  const j = await r.json();
  const hoje = hojeISO();
  return {
    pontos: j.pontos.map(limparPonto),
    eventos: j.eventos.map((e) => limparEvento({ ...e, data: e.data || addDias(hoje, e.em ?? 0) })),
  };
}

async function lerBanco() {
  const hoje = hojeISO();
  const [rp, re] = await Promise.all([
    fetch(rest('pontos', `?select=${COLS.pontos}&status=eq.aprovado&order=nome`), { headers: headers() }),
    // eventos únicos futuros OU recorrentes ainda vigentes
    fetch(rest('eventos', `?select=${COLS.eventos}&status=eq.aprovado&or=(repete.neq.nao,data.gte.${addDias(hoje, -1)})`), { headers: headers() }),
  ]);
  if (!rp.ok || !re.ok) throw new Error(`Supabase respondeu ${rp.status}/${re.status}`);
  return { pontos: (await rp.json()).map(limparPonto), eventos: (await re.json()).map(limparEvento) };
}

/** Carrega os dados publicados. Retorna { pontos, eventos, modo, aviso? } */
export async function carregar() {
  if (temBanco()) {
    try {
      return { ...(await lerBanco()), modo: 'banco' };
    } catch (err) {
      console.warn('[liquen] falha no banco, usando seed:', err);
      return { ...(await lerSeed()), modo: 'demo', aviso: 'Não consegui falar com o banco agora; mostrando dados de exemplo.' };
    }
  }
  return { ...(await lerSeed()), modo: 'demo' };
}

// ───────── envios pendentes (guardados no navegador de quem enviou) ─────────
const ler = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
};
const gravar = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage cheio/bloqueado: segue sem */ }
};

export function pendentesLocais() {
  const limite = Date.now() - 14 * 86400000;
  return ler(LS_PEND).filter((p) => p.criado > limite);
}

/** Pontos pendentes do próprio usuário, formatados como pontos (marcados com pendente:true). */
export function meusPontosPendentes(publicados) {
  const nomes = new Set(publicados.map((p) => norm(p.nome)));
  return pendentesLocais()
    .filter((p) => p.tipo === 'ponto' && !nomes.has(norm(p.dados.nome)))
    .map((p) => limparPonto({ ...p.dados, id: p.id, pendente: true }));
}
export function meusEventosPendentes() {
  return pendentesLocais()
    .filter((p) => p.tipo === 'evento')
    .map((p) => limparEvento({ ...p.dados, id: p.id, pendente: true }));
}

function checarLimite() {
  const hora = Date.now() - 3600000;
  const recentes = ler(LS_RATE).filter((t) => t > hora);
  if (recentes.length >= 6) throw new Error('Muitos envios seguidos. Tente novamente daqui a pouco.');
  gravar(LS_RATE, [...recentes, Date.now()]);
}

const CAMPOS_PRIVADOS = ['contato_privado', 'tem_autorizacao'];
const TABELA = { ponto: 'pontos', evento: 'eventos', sugestao: 'sugestoes' };

/**
 * Envia uma contribuição para curadoria.
 * `dados._ninho` é o campo-isca anti-spam: se vier preenchido, finge sucesso e descarta.
 */
export async function enviar(tipo, dados) {
  if (dados._ninho) return { ok: true, id: 'descartado', modo: 'demo' };
  const limpo = Object.fromEntries(Object.entries(dados).filter(([k, v]) => !k.startsWith('_') && v !== '' && v != null));
  checarLimite();
  const id = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  if (temBanco()) {
    const r = await fetch(rest(TABELA[tipo]), { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(limpo) });
    if (!r.ok) throw new Error(`Não consegui enviar (${r.status}). Tente novamente em instantes.`);
  }
  if (tipo !== 'sugestao') {
    const publico = Object.fromEntries(Object.entries(limpo).filter(([k]) => !CAMPOS_PRIVADOS.includes(k)));
    gravar(LS_PEND, [...pendentesLocais(), { id, tipo, dados: publico, criado: Date.now() }]);
  }
  return { ok: true, id, modo: temBanco() ? 'banco' : 'demo' };
}
