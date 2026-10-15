// Resumo curto de um texto (FNV-1a de 32 bits + tamanho). Serve só para comparar versões de um item.
export function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}.${s.length}`;
}
