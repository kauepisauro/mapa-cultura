// Núcleo da sincronização em grupo (sem Firebase, sem DOM): decide o que enviar e o que receber.
//
// Cada item (reunião, tarefa, ideia, GT, pessoa) é um "documento" independente, então edições em itens
// diferentes nunca se atrapalham. No mesmo item vale o último a salvar.
// Para decidir, comparamos três versões de cada item (como o git): L = local, R = remota e B = base
// (a última versão que este aparelho sabe que está igual à do grupo; guardamos só um resumo dela).
import { hash as _h } from './sync-hash.js';

export const COLECOES = ['eventos', 'encaminhamentos', 'ideias', 'frentes'];
export const hash = _h;

// JSON com as chaves em ordem fixa: dois aparelhos sempre geram o mesmo texto para o mesmo item.
export function estavel(v) {
  if (Array.isArray(v)) return `[${v.map(estavel).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${estavel(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

// chave "colecao/id" -> texto estável do item
export function itensLocais(estado) {
  const m = new Map();
  for (const col of COLECOES) for (const x of estado[col]) m.set(`${col}/${x.id}`, estavel(x));
  for (const nome of estado.pessoas) m.set(`pessoas/${nome}`, estavel({ nome }));
  return m;
}

export const docId = (k) => {
  const i = k.indexOf('/');
  return `${k.slice(0, i)}:${encodeURIComponent(k.slice(i + 1))}`;
};

export const partirChave = (k) => {
  const i = k.indexOf('/');
  return { colecao: k.slice(0, i), id: k.slice(i + 1) };
};

// Resumo (hash) de cada item da lista inicial do movimento. Serve de "base" na 1ª vez que um aparelho entra no grupo:
// se o item deste aparelho difere da lista inicial, foi editado aqui (e é preservado quando o grupo ainda tem a versão original).
export function baseInicial(estadoInicial) {
  const m = new Map();
  itensLocais(estadoInicial).forEach((json, k) => m.set(k, hash(json)));
  return m;
}

// local: Map chave->json | base: Map chave->hash ('T' = apagado no grupo) | remoto: Map chave->{json}|{apagado}
// chaves: opcional, restringe as chaves avaliadas. Devolve o que aplicar aqui, o que enviar e a nova base.
export function planejar({ local, base, remoto = new Map(), chaves }) {
  const aplicar = [];
  const enviar = [];
  const novaBase = new Map();
  const todas = chaves || new Set([...local.keys(), ...base.keys(), ...remoto.keys()]);

  for (const k of todas) {
    const L = local.get(k);
    const Hl = L === undefined ? undefined : hash(L);
    const B = base.get(k);
    const R = remoto.get(k);

    if (R) {
      if (R.apagado) { // alguém apagou: o grupo vence
        if (L !== undefined) aplicar.push({ k, json: null });
        novaBase.set(k, 'T');
        continue;
      }
      const Hr = hash(R.json);
      if (Hl === Hr) { novaBase.set(k, Hr); continue; } // já igual
      // Só mantemos a nossa versão se ELA mudou e a do grupo não (B == R). Em qualquer outro caso o grupo vence.
      if (B === undefined || Hl === B || Hr !== B) { aplicar.push({ k, json: R.json }); novaBase.set(k, Hr); continue; }
      enviar.push({ k, json: L === undefined ? null : L }); // mudamos (ou apagamos) e o grupo não mexeu
      novaBase.set(k, L === undefined ? 'T' : Hl);
      continue;
    }

    // sem novidade do grupo: só mudanças locais
    if (L !== undefined) {
      if (Hl !== B) { enviar.push({ k, json: L }); novaBase.set(k, Hl); }
    } else if (B !== undefined && B !== 'T') { // existia e sumiu daqui: apagamos
      enviar.push({ k, json: null });
      novaBase.set(k, 'T');
    }
  }
  return { aplicar, enviar, novaBase };
}

// Aplica no estado local o que veio do grupo (json null = remover).
export function aplicarMudancas(estado, mudancas) {
  for (const { k, json } of mudancas) {
    const { colecao, id } = partirChave(k);
    if (colecao === 'pessoas') {
      estado.pessoas = estado.pessoas.filter((p) => p !== id);
      if (json !== null) estado.pessoas.push(id);
      continue;
    }
    const lista = estado[colecao];
    if (!Array.isArray(lista)) continue; // coleção desconhecida: ignora
    const i = lista.findIndex((x) => x.id === id);
    if (json === null) { if (i >= 0) lista.splice(i, 1); continue; }
    let obj;
    try { obj = JSON.parse(json); } catch { continue; }
    if (!obj || typeof obj !== 'object') continue;
    if (i >= 0) lista[i] = obj; else lista.push(obj);
  }
  return estado;
}
