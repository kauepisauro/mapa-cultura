// Guarda os dados neste aparelho (localStorage). Tudo passa por aqui, então
// no futuro dá para plugar sincronização entre aparelhos sem mexer nas telas.
import { CONFIG } from './config.js';
import { estadoInicial, normalizar } from './logica.js';

export function criarStore(storage = globalThis.localStorage) {
  let estado;
  const ouvintes = new Set();
  let falhou = false;

  const ler = (chave) => { try { return storage.getItem(chave); } catch { return null; } };
  const gravar = (chave, valor) => { try { storage.setItem(chave, valor); return true; } catch { return false; } };

  try {
    const bruto = ler(CONFIG.chaveDados);
    estado = bruto ? normalizar(JSON.parse(bruto)) : estadoInicial();
  } catch {
    estado = estadoInicial();
  }

  const salvar = () => { falhou = !gravar(CONFIG.chaveDados, JSON.stringify(estado)); };

  return {
    get estado() { return estado; },
    get salvamentoFalhou() { return falhou; },
    // silencioso: grava sem redesenhar a tela (usado enquanto a pessoa digita).
    atualizar(fn, { silencioso = false } = {}) {
      fn(estado);
      salvar();
      if (!silencioso) ouvintes.forEach((f) => f());
    },
    assinar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    exportar() { return JSON.stringify({ ...estado, exportadoEm: new Date().toISOString() }, null, 2); },
    importar(texto) {
      estado = normalizar(JSON.parse(texto)); // lança erro se inválido; não mexe no estado atual
      salvar();
      ouvintes.forEach((f) => f());
    },
    zerar() { estado = estadoInicial(); salvar(); ouvintes.forEach((f) => f()); },
    // preferências só deste aparelho
    pref: { ler, gravar },
  };
}
