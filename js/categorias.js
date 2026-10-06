// Categorias do mapa: cor, ícone (SVG 24×24, traço) e descrição.
// Para criar uma categoria nova, basta adicionar um item aqui.

const svg = (inner) => inner;

export const CATEGORIAS = [
  {
    id: 'capoeira', nome: 'Capoeira', cor: '#D98E04', desc: 'Rodas, grupos e mestres',
    icone: svg('<path d="M4.5 20.5C3 11 9 4.5 19.5 3.5"/><path d="M4.5 20.5 19.5 3.5"/><circle cx="8.7" cy="15.5" r="3"/>'),
  },
  {
    id: 'atelie', nome: 'Ateliês & Artesanato', cor: '#E0603C', desc: 'Cerâmica, renda, costura, feiras',
    icone: svg('<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.1-1.1 1.6-2.2-.5-1.2.2-2.3 1.6-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5Z"/><circle cx="7.6" cy="11" r=".9"/><circle cx="10.2" cy="7.2" r=".9"/><circle cx="15" cy="7.6" r=".9"/>'),
  },
  {
    id: 'arte', nome: 'Artes visuais', cor: '#7A4DB8', desc: 'Galerias, murais, exposições',
    icone: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m3 17 5-5 4 4 3-3 6 5"/>'),
  },
  {
    id: 'festa', nome: 'Festas & Noite', cor: '#E4478B', desc: 'Bailes, festas de rua, pistas',
    icone: svg('<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>'),
  },
  {
    id: 'rap', nome: 'Rap & Hip-Hop', cor: '#3B3F5C', desc: 'Batalhas, estúdios, coletivos',
    icone: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>'),
  },
  {
    id: 'samba', nome: 'Samba & Choro', cor: '#C8372D', desc: 'Rodas, escolas, blocos',
    icone: svg('<ellipse cx="12" cy="7.5" rx="8" ry="3"/><path d="M4 7.5v9c0 1.7 3.6 3 8 3s8-1.3 8-3v-9"/><path d="m7.5 10.5 2 7M12 10.8v7.5M16.5 10.5l-2 7"/>'),
  },
  {
    id: 'social', nome: 'Movimentos sociais', cor: '#2457C5', desc: 'Coletivos, ocupações, associações',
    icone: svg('<path d="M3 10v4a1 1 0 0 0 1 1h3l8 4V5L7 9H4a1 1 0 0 0-1 1Z"/><path d="M18.5 9a4 4 0 0 1 0 6"/><path d="m7 15 1.2 5h2.3l-1-3.6"/>'),
  },
  {
    id: 'popular', nome: 'Cultura popular', cor: '#6E9B1F', desc: 'Boi de Mamão, Terno de Reis, pesca, renda',
    icone: svg('<path d="m12 2.5 2.4 6 6.4.5-4.9 4.2 1.6 6.3L12 16.1 6.5 19.5l1.6-6.3L3.2 9l6.4-.5Z"/>'),
  },
  {
    id: 'teatro', nome: 'Teatro & Dança', cor: '#148F8A', desc: 'Companhias, palcos, oficinas',
    icone: svg('<path d="M5 4h14v8a7 7 0 0 1-14 0Z"/><path d="M9 9.5h.01M15 9.5h.01"/><path d="M9 14c1 1.5 5 1.5 6 0"/>'),
  },
  {
    id: 'musica', nome: 'Música ao vivo', cor: '#2A9DD8', desc: 'Bares, casas de show, bandas',
    icone: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  },
  {
    id: 'audiovisual', nome: 'Foto & Cinema', cor: '#8A5A3C', desc: 'Cineclubes, coletivos, laboratórios',
    icone: svg('<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>'),
  },
  {
    id: 'espaco', nome: 'Espaços & Memória', cor: '#5B6C7A', desc: 'Museus, centros, praças, bibliotecas',
    icone: svg('<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  },
];

export const POR_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
export const cat = (id) => POR_ID[id] || POR_ID.espaco;

/** SVG inline do ícone da categoria. */
export function icone(id, tam = 20, extra = '') {
  return `<svg class="ico ${extra}" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cat(id).icone}</svg>`;
}
