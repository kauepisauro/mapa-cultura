// Estilo vetorial do mapa-base (dados OpenStreetMap via OpenFreeMap, esquema OpenMapTiles).
// Desenhado para o Mapa Vivo: papel, água verde-acinzentada, ruas finas, nomes discretos.
// Sem ícones: nada de picos (triângulos), comércios ou números de casa.
import { CONFIG } from './config.js';

const CORES = {
  dia: {
    fundo: '#E9E3CF', bairro: '#E4DDC7', verde: '#D7DBBF', parque: '#D2D9BA', areia: '#EEE4C6',
    agua: '#B6C8BD', aguaLinha: '#A5BAAF', rua: '#FBF8EE', ruaBorda: '#D6CCB2', via: '#F6EED6', viaBorda: '#C7B994',
    caminho: '#BDB297', trilho: '#AFA388', predio: '#DCD3BB', predioLinha: '#CBC1A6', limite: '#AFA68D',
    texto: '#3C4A41', textoSec: '#66705F', aguaTexto: '#4A6761', halo: '#EFE9D6',
  },
  noite: {
    fundo: '#131D18', bairro: '#16211B', verde: '#18261E', parque: '#1A2B21', areia: '#1D251E',
    agua: '#1E3330', aguaLinha: '#284139', rua: '#2A3931', ruaBorda: '#18221D', via: '#35473C', viaBorda: '#18221D',
    caminho: '#33443A', trilho: '#3B4B41', predio: '#1B2620', predioLinha: '#25332B', limite: '#40503F',
    texto: '#CBD3C5', textoSec: '#98A595', aguaTexto: '#8FB0A6', halo: '#131D18',
  },
};

const nome = ['coalesce', ['get', 'name:pt'], ['get', 'name']];
const largura = (pares) => ['interpolate', ['exponential', 1.6], ['zoom'], ...pares];

export function estiloMapa(tema = 'dia') {
  const c = CORES[tema] || CORES.dia;
  const v = CONFIG.mapaVetorial;
  const linha = (id, filtro, cor, larg, extra = {}) => ({
    id, type: 'line', source: 'omt', 'source-layer': 'transportation', filter: filtro,
    layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': cor, 'line-width': larg, ...extra.paint }, ...extra.raiz,
  });
  const classe = (...cls) => ['in', ['get', 'class'], ['literal', cls]];
  const principais = classe('motorway', 'trunk', 'primary', 'secondary', 'tertiary');
  const locais = classe('minor', 'service');

  return {
    version: 8,
    name: `Mapa Vivo · ${tema}`,
    glyphs: v.glyphs,
    sources: { omt: { type: 'vector', url: v.fonte, attribution: v.atribuicao } },
    layers: [
      { id: 'fundo', type: 'background', paint: { 'background-color': c.fundo } },
      { id: 'cobertura-verde', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: classe('wood', 'forest', 'grass', 'scrub', 'farmland', 'wetland'),
        paint: { 'fill-color': c.verde, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 0.85] } },
      { id: 'areia', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: classe('sand', 'beach'), paint: { 'fill-color': c.areia } },
      { id: 'bairros', type: 'fill', source: 'omt', 'source-layer': 'landuse', minzoom: 11, filter: classe('residential', 'suburb', 'neighbourhood'),
        paint: { 'fill-color': c.bairro, 'fill-opacity': 0.6 } },
      { id: 'parques', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.parque, 'fill-opacity': 0.75 } },
      { id: 'agua', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.agua } },
      { id: 'rios', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 10,
        paint: { 'line-color': c.aguaLinha, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 16, 2.4] } },
      { id: 'pistas', type: 'fill', source: 'omt', 'source-layer': 'aeroway', minzoom: 11, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': c.bairro } },
      { id: 'predios', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
        paint: { 'fill-color': c.predio, 'fill-outline-color': c.predioLinha, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.9] } },
      { id: 'limites', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['<=', ['get', 'admin_level'], 8], ['!=', ['get', 'maritime'], 1]],
        paint: { 'line-color': c.limite, 'line-width': 0.8, 'line-dasharray': [3, 3], 'line-opacity': 0.7 } },
      linha('balsa', ['==', ['get', 'class'], 'ferry'], c.aguaLinha, 1, { paint: { 'line-dasharray': [2, 3] }, raiz: { minzoom: 10 } }),
      linha('caminhos', classe('path', 'track'), c.caminho, largura([14, 0.6, 18, 1.6]), { paint: { 'line-dasharray': [2, 2] }, raiz: { minzoom: 14 } }),
      linha('trilhos', ['==', ['get', 'class'], 'rail'], c.trilho, largura([12, 0.6, 18, 1.6]), { paint: { 'line-dasharray': [3, 3] }, raiz: { minzoom: 12 } }),
      linha('ruas-borda', locais, c.ruaBorda, largura([13, 1, 16, 8, 18, 19]), { raiz: { minzoom: 13 } }),
      linha('ruas', locais, c.rua, largura([12, 0.5, 14, 2.4, 16, 6.5, 18, 16])),
      linha('vias-borda', principais, c.viaBorda, largura([10, 1, 14, 5.5, 16, 11, 18, 23]), { raiz: { minzoom: 10 } }),
      linha('vias', principais, c.via, largura([7, 0.5, 10, 1.4, 14, 4, 16, 9, 18, 20])),
      { id: 'nomes-ruas', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14,
        layout: { 'symbol-placement': 'line', 'text-field': nome, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 9.5, 18, 12.5], 'text-letter-spacing': 0.04 },
        paint: { 'text-color': c.textoSec, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } },
      { id: 'nomes-agua', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9,
        layout: { 'text-field': nome, 'text-font': ['Noto Sans Italic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 14], 'text-letter-spacing': 0.12, 'text-max-width': 8 },
        paint: { 'text-color': c.aguaTexto, 'text-halo-color': c.halo, 'text-halo-width': 1.2 } },
      { id: 'nomes-ilhas', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 9, filter: classe('island', 'islet'),
        layout: { 'text-field': nome, 'text-font': ['Noto Sans Italic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 15], 'text-letter-spacing': 0.1 },
        paint: { 'text-color': c.textoSec, 'text-halo-color': c.halo, 'text-halo-width': 1.2 } },
      { id: 'nomes-bairros', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11.5, filter: classe('suburb', 'neighbourhood', 'quarter', 'village', 'hamlet'),
        layout: { 'text-field': nome, 'text-font': ['Noto Sans Italic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10.5, 16, 13], 'text-max-width': 7 },
        paint: { 'text-color': c.textoSec, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } },
      { id: 'nomes-cidades', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 7, filter: classe('city', 'town'),
        layout: { 'text-field': nome, 'text-font': ['Noto Sans Regular'], 'text-transform': 'uppercase', 'text-letter-spacing': 0.22, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10.5, 13, 14] },
        paint: { 'text-color': c.texto, 'text-halo-color': c.halo, 'text-halo-width': 1.6 } },
    ],
  };
}
