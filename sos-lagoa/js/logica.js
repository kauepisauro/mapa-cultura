// Regras do app (sem DOM): estado, filtros, prazos. Tudo recebe `hoje` por parâmetro para ser testável.
import { diffDias, somarDias, valida } from './datas.js';
import { CORES_FRENTE } from './config.js';

export const TIPOS = {
  reuniao: { nome: 'Reunião', plural: 'Reuniões' },
  ato: { nome: 'Ato / mobilização', plural: 'Atos' },
  audiencia: { nome: 'Audiência / prazo', plural: 'Audiências' },
  mutirao: { nome: 'Mutirão / ação', plural: 'Mutirões' },
  outro: { nome: 'Outro', plural: 'Outros' },
};

export const STATUS = {
  fazer: { nome: 'A fazer', proximo: 'fazendo' },
  fazendo: { nome: 'Fazendo', proximo: 'feito' },
  feito: { nome: 'Feito', proximo: 'fazer' },
};

export const IDEIA_STATUS = {
  nova: { nome: 'Nova' },
  estudando: { nome: 'Em estudo' },
  virou: { nome: 'Virou ação' },
  arquivada: { nome: 'Arquivada' },
};

export const SEM_RESPONSAVEL = 'Sem responsável';

export const novoId = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).slice(0, 12);

// GTs iniciais do movimento (editáveis, renomeáveis e apagáveis na tela Frentes).
export function estadoInicial() {
  const f = (nome, cor, descricao) => ({ id: novoId(), nome, cor, descricao, coordenacao: [] });
  return {
    versao: 1,
    frentes: [
      f('GT de Comunicação', CORES_FRENTE[1], ''),
      f('GT Técnico', CORES_FRENTE[2], ''),
      f('GT de Cultura', CORES_FRENTE[3], ''),
      f('GT de Mobilização', CORES_FRENTE[0], ''),
    ],
    pessoas: [],
    eventos: [],
    encaminhamentos: [],
    ideias: [],
  };
}

const lista = (v) => (Array.isArray(v) ? v : []);
const texto = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const nomes = (v) => [...new Set(lista(v).map((x) => texto(x, 80).trim()).filter(Boolean))];
const corOk = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : CORES_FRENTE[1]);

// Conserta/valida um estado vindo do disco ou de um arquivo importado.
export function normalizar(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) throw new Error('Arquivo inválido: não parece um backup do SOS Lagoa.');
  if (!Array.isArray(bruto.eventos) && !Array.isArray(bruto.encaminhamentos) && !Array.isArray(bruto.frentes)) {
    throw new Error('Arquivo inválido: não parece um backup do SOS Lagoa.');
  }
  const frentes = lista(bruto.frentes).filter((x) => x && x.id).map((x) => ({
    id: texto(x.id, 40), nome: texto(x.nome, 60) || 'Frente', cor: corOk(x.cor),
    descricao: texto(x.descricao, 400), coordenacao: nomes(x.coordenacao),
  }));
  const idsFrente = new Set(frentes.map((x) => x.id));
  const frenteOk = (id) => (idsFrente.has(id) ? id : '');
  const eventos = lista(bruto.eventos).filter((x) => x && x.id && valida(x.data)).map((x) => ({
    id: texto(x.id, 40), titulo: texto(x.titulo, 140) || 'Sem título',
    tipo: TIPOS[x.tipo] ? x.tipo : 'outro', data: x.data,
    hora: /^\d{2}:\d{2}$/.test(x.hora || '') ? x.hora : '',
    local: texto(x.local, 200), frente: frenteOk(x.frente), notas: texto(x.notas),
    pauta: texto(x.pauta), presentes: nomes(x.presentes), ata: texto(x.ata, 20000),
    ...(x.aConfirmar ? { aConfirmar: true } : {}),
    ...(x.destaque ? { destaque: true } : {}),
    ...(x.exemplo ? { exemplo: true } : {}),
  }));
  const idsEvento = new Set(eventos.map((x) => x.id));
  const encaminhamentos = lista(bruto.encaminhamentos).filter((x) => x && x.id).map((x) => ({
    id: texto(x.id, 40), texto: texto(x.texto, 600) || 'Sem descrição',
    responsaveis: nomes(x.responsaveis), prazo: valida(x.prazo) ? x.prazo : '',
    status: STATUS[x.status] ? x.status : 'fazer', frente: frenteOk(x.frente),
    origem: idsEvento.has(x.origem) ? x.origem : '',
    criadoEm: texto(x.criadoEm, 30), feitoEm: valida(x.feitoEm) ? x.feitoEm : '',
    ...(x.exemplo ? { exemplo: true } : {}),
  }));
  const ideias = lista(bruto.ideias).filter((x) => x && x.id).map((x) => ({
    id: texto(x.id, 40), titulo: texto(x.titulo, 160) || 'Ideia sem título', notas: texto(x.notas, 2000),
    frente: frenteOk(x.frente), origem: idsEvento.has(x.origem) ? x.origem : '',
    status: IDEIA_STATUS[x.status] ? x.status : 'nova', interessados: nomes(x.interessados),
    criadoEm: valida(x.criadoEm) ? x.criadoEm : '',
  }));
  const pessoas = nomes(bruto.pessoas);
  // Quem aparece em encaminhamentos/presenças entra na lista de pessoas.
  const conhecidas = new Set(pessoas);
  const incluir = (n) => { if (!conhecidas.has(n)) { conhecidas.add(n); pessoas.push(n); } };
  encaminhamentos.forEach((e) => e.responsaveis.forEach(incluir));
  eventos.forEach((e) => e.presentes.forEach(incluir));
  frentes.forEach((f) => f.coordenacao.forEach(incluir));
  ideias.forEach((i) => i.interessados.forEach(incluir));
  pessoas.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return { versao: 1, frentes, pessoas, eventos, encaminhamentos, ideias };
}

// ---------- eventos ----------
export const horaOrd = (e) => e.hora || '00:00';
export const ordenarEventos = (evs) => [...evs].sort((a, b) => a.data.localeCompare(b.data) || horaOrd(a).localeCompare(horaOrd(b)) || a.titulo.localeCompare(b.titulo, 'pt-BR'));

export function filtrarEventos(estado, { frente = '', tipo = '' } = {}) {
  return ordenarEventos(estado.eventos.filter((e) => (!frente || e.frente === frente) && (!tipo || e.tipo === tipo)));
}

export const eventosDoDia = (estado, dia, filtro = {}) => filtrarEventos(estado, filtro).filter((e) => e.data === dia);

export const proximosEventos = (estado, hoje, filtro = {}) => filtrarEventos(estado, filtro).filter((e) => e.data >= hoje);

export const eventosPassados = (estado, hoje, filtro = {}) => filtrarEventos(estado, filtro).filter((e) => e.data < hoje).reverse();

// Compromisso em destaque na tela inicial: o próximo firme (ignora "a confirmar" e reunião que já tem registro).
export const proximoCompromisso = (estado, hoje) => proximosEventos(estado, hoje).find((e) => !e.aConfirmar && !(e.tipo === 'reuniao' && e.ata.trim()));

export function proximaReuniao(ev, dias = 7) {
  return { id: novoId(), titulo: ev.titulo, tipo: ev.tipo, data: somarDias(ev.data, dias), hora: ev.hora, local: ev.local, frente: ev.frente, notas: '', pauta: '', presentes: [], ata: '' };
}

// ---------- encaminhamentos ----------
const ORDEM_PRAZO = { atrasado: 0, hoje: 1, semana: 2, futuro: 3, sem: 4, feito: 5 };

export function situacaoPrazo(enc, hoje) {
  if (enc.status === 'feito') return 'feito';
  if (!enc.prazo) return 'sem';
  const n = diffDias(hoje, enc.prazo);
  if (n < 0) return 'atrasado';
  if (n === 0) return 'hoje';
  return n <= 7 ? 'semana' : 'futuro';
}

export function ordenarEncaminhamentos(lista_, hoje) {
  return [...lista_].sort((a, b) => ORDEM_PRAZO[situacaoPrazo(a, hoje)] - ORDEM_PRAZO[situacaoPrazo(b, hoje)]
    || (a.prazo || '9999').localeCompare(b.prazo || '9999') || a.texto.localeCompare(b.texto, 'pt-BR'));
}

// pessoa: '' = todas | SEM_RESPONSAVEL | nome. status: '' = qualquer | 'aberto' | fazer/fazendo/feito.
export function filtrarEncaminhamentos(estado, { pessoa = '', frente = '', status = '', origem = '' } = {}) {
  return estado.encaminhamentos.filter((e) => {
    if (frente && e.frente !== frente) return false;
    if (origem && e.origem !== origem) return false;
    if (status === 'aberto' ? e.status === 'feito' : status && e.status !== status) return false;
    if (pessoa === SEM_RESPONSAVEL) return e.responsaveis.length === 0;
    if (pessoa) return e.responsaveis.includes(pessoa);
    return true;
  });
}

// "Quem vai fazer o quê": itens abertos agrupados por pessoa (quem tem 2 responsáveis aparece nos dois).
export function porPessoa(estado, hoje, filtro = {}) {
  const grupos = new Map();
  for (const e of filtrarEncaminhamentos(estado, { ...filtro, status: 'aberto' })) {
    const donos = e.responsaveis.length ? e.responsaveis : [SEM_RESPONSAVEL];
    for (const p of donos) grupos.set(p, [...(grupos.get(p) || []), e]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === SEM_RESPONSAVEL ? -1 : b === SEM_RESPONSAVEL ? 1 : a.localeCompare(b, 'pt-BR')))
    .map(([pessoa, itens]) => ({ pessoa, itens: ordenarEncaminhamentos(itens, hoje) }));
}

export function numeros(estado, hoje) {
  const abertos = estado.encaminhamentos.filter((e) => e.status !== 'feito');
  return {
    abertos: abertos.length,
    atrasados: abertos.filter((e) => situacaoPrazo(e, hoje) === 'atrasado').length,
    semDono: abertos.filter((e) => !e.responsaveis.length).length,
    feitos: estado.encaminhamentos.length - abertos.length,
  };
}

// Itens em aberto que vieram de outras reuniões (ou sem origem) — para retomar na reunião.
export function pendenciasParaRetomar(estado, ev) {
  const dataDe = new Map(estado.eventos.map((e) => [e.id, e.data]));
  return estado.encaminhamentos.filter((e) => e.status !== 'feito' && e.origem !== ev.id
    && (!e.origem || dataDe.get(e.origem) <= ev.data));
}

export function contagemDoEvento(estado, evId) {
  const itens = estado.encaminhamentos.filter((e) => e.origem === evId);
  return { total: itens.length, feitos: itens.filter((e) => e.status === 'feito').length };
}

// Remove uma pessoa de todos os lugares (usado ao apagar da lista).
export function removerPessoa(estado, nome) {
  estado.pessoas = estado.pessoas.filter((p) => p !== nome);
  estado.encaminhamentos.forEach((e) => { e.responsaveis = e.responsaveis.filter((p) => p !== nome); });
  estado.eventos.forEach((e) => { e.presentes = e.presentes.filter((p) => p !== nome); });
  estado.frentes.forEach((f) => { f.coordenacao = f.coordenacao.filter((p) => p !== nome); });
  estado.ideias.forEach((i) => { i.interessados = i.interessados.filter((p) => p !== nome); });
}

// ---------- atualização dos dados iniciais ----------
// Troca os itens que vieram da lista inicial (mesmo id) pela versão nova, preserva o que o aparelho já tinha de
// andamento (feito, presenças, registro, quem topa) e mantém tudo que a pessoa criou. `seed.remover` apaga ids obsoletos.
const MANTER = {
  frentes: ['coordenacao'],
  eventos: ['pauta', 'presentes', 'ata'],
  encaminhamentos: ['status', 'feitoEm'],
  ideias: ['status', 'interessados'],
};

export function mesclarInicial(estado, seedBruto) {
  const seed = normalizar(seedBruto);
  const remover = new Set(lista(seedBruto.remover));
  estado = structuredClone(estado);
  for (const [de, para] of Object.entries(seedBruto.renomear || {})) renomearPessoa(estado, de, para);
  const novo = { versao: 1, pessoas: [...estado.pessoas, ...seed.pessoas] };
  for (const [chave, manter] of Object.entries(MANTER)) {
    const locais = new Map(estado[chave].map((x) => [x.id, x]));
    const doSeed = seed[chave].map((s) => {
      const l = locais.get(s.id);
      return l ? { ...s, ...Object.fromEntries(manter.map((k) => [k, l[k]])) } : s;
    });
    const ids = new Set(doSeed.map((x) => x.id));
    novo[chave] = [...doSeed, ...estado[chave].filter((x) => !ids.has(x.id) && !remover.has(x.id))];
  }
  return normalizar(novo); // limpa referências a frentes/eventos que sumiram
}

// ---------- ideias ----------
// grupo: 'mesa' (novas e em estudo) | 'virou' | 'arquivada'
export function filtrarIdeias(estado, { frente = '', grupo = 'mesa' } = {}) {
  const ok = grupo === 'mesa' ? ['nova', 'estudando'] : [grupo];
  return estado.ideias.filter((i) => (!frente || i.frente === frente) && ok.includes(i.status))
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
}

// Troca um nome em todos os lugares (pessoas, responsáveis, presenças, coordenação, quem topa).
export function renomearPessoa(estado, de, para) {
  const troca = (l) => [...new Set(l.map((p) => (p === de ? para : p)))];
  estado.pessoas = troca(estado.pessoas).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  estado.encaminhamentos.forEach((e) => { e.responsaveis = troca(e.responsaveis); });
  estado.eventos.forEach((e) => { e.presentes = troca(e.presentes); });
  estado.frentes.forEach((f) => { f.coordenacao = troca(f.coordenacao); });
  estado.ideias.forEach((i) => { i.interessados = troca(i.interessados); });
}

export function garantirPessoas(estado, lista_) {
  for (const n of lista_) if (n && !estado.pessoas.includes(n)) estado.pessoas.push(n);
  estado.pessoas.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function avancarStatus(enc, hoje) {
  enc.status = STATUS[enc.status].proximo;
  enc.feitoEm = enc.status === 'feito' ? hoje : '';
}

// Dados de exemplo para testar (marcados com exemplo:true; dá para remover com um toque).
export function exemplos(hoje, estado) {
  const fr = (nome) => estado.frentes.find((f) => f.nome === nome)?.id || '';
  const ev = (titulo, tipo, dias, hora, local, frente, extra = {}) => ({
    id: novoId(), titulo, tipo, data: somarDias(hoje, dias), hora, local, frente, notas: '', pauta: '', presentes: [], ata: '', exemplo: true, ...extra,
  });
  const passada = ev('Reunião geral (exemplo)', 'reuniao', -5, '19:00', 'Local a definir', '', {
    pauta: 'Informes das frentes\nPlanejamento do próximo ato\nComo dividir as tarefas',
    presentes: ['Ana (exemplo)', 'Bruno (exemplo)'], ata: 'Exemplo de registro: decidimos fazer um ato e dividir as tarefas entre as frentes.',
  });
  const proxima = ev('Reunião geral (exemplo)', 'reuniao', 2, '19:00', 'Local a definir', '', { pauta: 'Retomar os encaminhamentos da última reunião' });
  const ato = ev('Ato (exemplo)', 'ato', 9, '09:00', 'Local a definir', fr('GT de Mobilização'));
  const aud = ev('Audiência (exemplo)', 'audiencia', 14, '14:00', '', fr('GT Técnico'));
  const enc = (texto, quem, prazoDias, status, origem, frente) => ({
    id: novoId(), texto, responsaveis: quem, prazo: prazoDias == null ? '' : somarDias(hoje, prazoDias), status,
    frente, origem, criadoEm: hoje, feitoEm: status === 'feito' ? hoje : '', exemplo: true,
  });
  return {
    eventos: [passada, proxima, ato, aud],
    encaminhamentos: [
      enc('Fazer o cartaz do ato (exemplo)', ['Ana (exemplo)'], -1, 'fazendo', passada.id, fr('GT de Comunicação')),
      enc('Pedir autorização para o som (exemplo)', ['Bruno (exemplo)'], 3, 'fazer', passada.id, fr('GT de Mobilização')),
      enc('Conferir o prazo no processo (exemplo)', [], 5, 'fazer', passada.id, fr('GT Técnico')),
      enc('Reservar o espaço da reunião (exemplo)', ['Ana (exemplo)', 'Bruno (exemplo)'], null, 'feito', passada.id, ''),
    ],
    pessoas: ['Ana (exemplo)', 'Bruno (exemplo)'],
  };
}
