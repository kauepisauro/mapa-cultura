// Arte gerada — herbário de líquens: capas, logo, colônias, talos (pinos) e clusters.
import { cat, icone } from './categorias.js';
import { hash, rng } from './utils.js';

export const TINTA = '#1C2A22';
export const PAPEL = '#EDE8D6';
// cores de líquen: usnea, xantória, cladônia, verdete, ferrugem, cinza-cinza
const LIQUEN = ['#A7B456', '#D08A24', '#8CA58B', '#3F7D6E', '#A5482A', '#B9BDAE', '#C9B458', '#7A8B5B'];

export function mistura(hex, com, t) {
  const a = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
  const b = com.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const f = (n) => n.toFixed(1);

/** Contorno orgânico fechado (curvas suaves), com lóbulos de tamanho variável. */
export function mancha(cx, cy, r, rand, n = 9, vari = 0.5) {
  const pts = Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2;
    const rr = r * (1 - vari / 2 + rand() * vari);
    return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).map(f)}`;
  for (let i = 0; i < n; i++) d += `Q${pts[i].map(f)} ${mid(pts[i], pts[(i + 1) % n]).map(f)}`;
  return `${d}Z`;
}

/** Roseta de líquen foliáceo: anéis concêntricos de lóbulos + apotécios. */
function roseta(cx, cy, r, rand, cores, { aneis = 4, traco = TINTA, sw = 1, apotecios = 6 } = {}) {
  let s = '';
  for (let i = 0; i < aneis; i++) {
    const rr = r * (1 - i * (0.78 / aneis));
    s += `<path d="${mancha(cx, cy, rr, rand, 10 + i * 2, 0.34)}" fill="${cores[i % cores.length]}" stroke="${traco}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  for (let i = 0; i < apotecios; i++) {
    const ang = rand() * Math.PI * 2;
    const rr = rand() * r * 0.55;
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;
    const pr = r * (0.045 + rand() * 0.05);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(pr)}" fill="${rand() > 0.5 ? '#D08A24' : '#A5482A'}" stroke="${traco}" stroke-width="${sw * 0.7}"/>`;
  }
  return s;
}

/** Colônia de crosta (areolas) — pequenos discos agrupados. */
function crosta(cx, cy, r, rand, cor, traco = TINTA) {
  let s = '';
  const n = 7 + Math.floor(rand() * 7);
  for (let i = 0; i < n; i++) {
    const ang = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * r;
    s += `<circle cx="${f(cx + Math.cos(ang) * rr)}" cy="${f(cy + Math.sin(ang) * rr)}" r="${f(r * (0.1 + rand() * 0.14))}" fill="${cor}" stroke="${traco}" stroke-width=".7"/>`;
  }
  return s;
}

/** Hifas: fios finos terminando em ponto. */
function hifas(w, h, rand, n = 3) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x1 = rand() * w;
    const y1 = rand() * h;
    const dx = rand() * 120 - 60;
    const dy = rand() * 90 - 45;
    s += `<path d="M${f(x1)} ${f(y1)}q${f(dx / 2)} ${f(dy / 2 - 18)} ${f(dx)} ${f(dy)}" fill="none" stroke="${TINTA}" stroke-width=".8" stroke-linecap="round"/><circle cx="${f(x1 + dx)}" cy="${f(y1 + dy)}" r="2" fill="${TINTA}"/>`;
  }
  return s;
}

/** Capa (prancha) única por item: mesma entrada ⇒ mesma arte. */
export function capa(item, { w = 400, h = 240 } = {}) {
  const cor = cat(item.categoria).cor;
  const rand = rng(hash(`${item.id}${item.nome || item.titulo || ''}`));
  const fundo = mistura(cor, PAPEL, 0.8);
  const par = [cor, mistura(cor, PAPEL, 0.55), LIQUEN[Math.floor(rand() * LIQUEN.length)], mistura(cor, TINTA, 0.25)];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">`;
  s += `<rect width="${w}" height="${h}" fill="${fundo}"/>`;
  // crostas ao fundo
  for (let i = 0; i < 3; i++) s += crosta(rand() * w, rand() * h, h * (0.16 + rand() * 0.14), rand, mistura(cor, PAPEL, 0.35 + rand() * 0.3));
  s += hifas(w, h, rand, 3);
  // roseta principal + satélite
  s += roseta(w * (0.52 + rand() * 0.16), h * (0.5 + rand() * 0.1), h * (0.36 + rand() * 0.1), rand, par, { aneis: 4, sw: 1.3, apotecios: 7 });
  s += roseta(w * (0.12 + rand() * 0.2), h * (0.2 + rand() * 0.6), h * (0.14 + rand() * 0.07), rand, [par[2], par[1], par[0]], { aneis: 3, sw: 1, apotecios: 3 });
  return `${s}</svg>`;
}
export const capaUri = (item, opts) => `data:image/svg+xml;utf8,${encodeURIComponent(capa(item, opts))}`;

/** Marca: roseta de líquen foliáceo. */
export function logo(tam = 44) {
  const rand = rng(7);
  const s = `<svg class="logo" width="${tam}" height="${tam}" viewBox="0 0 48 48" aria-hidden="true">${roseta(24, 24, 21.5, rand, ['#A7B456', '#8CA58B', '#C9B458', '#D08A24'], { aneis: 4, sw: 1.4, apotecios: 7 })}<circle cx="24" cy="24" r="2.6" fill="#A5482A" stroke="${TINTA}" stroke-width="1"/></svg>`;
  return s;
}

/** Ornamento do cabeçalho: colônias de líquen crescendo no canto. */
export function colonia(w = 190, h = 120, semente = 11) {
  const rand = rng(semente);
  const c = [['#A7B456', '#8CA58B', '#C9B458'], ['#D08A24', '#E3B65A', '#C9B458'], ['#8CA58B', '#B9BDAE', '#A7B456'], ['#3F7D6E', '#8CA58B', '#B9BDAE']];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">`;
  s += crosta(w * 0.5, h * 0.2, 46, rand, '#B9BDAE') + crosta(w * 0.85, h * 0.7, 36, rand, '#C9B458');
  s += roseta(w * 0.82, h * 0.18, 34, rand, c[0], { aneis: 4, sw: 1, apotecios: 5 });
  s += roseta(w * 0.5, h * 0.55, 22, rand, c[1], { aneis: 3, sw: 1, apotecios: 4 });
  s += roseta(w * 0.96, h * 0.62, 24, rand, c[2], { aneis: 3, sw: 1, apotecios: 3 });
  s += roseta(w * 0.68, h * 0.9, 16, rand, c[3], { aneis: 3, sw: 1, apotecios: 2 });
  s += hifas(w, h, rand, 4);
  return `${s}</svg>`;
}

/** Talo (marcador): roseta lobada na cor da categoria, com ícone no centro. */
export function talo(id, categoria) {
  const rand = rng(hash(id));
  const cor = cat(categoria).cor;
  const claro = mistura(cor, '#FFF8EA', 0.28);
  let s = `<svg class="talo" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">`;
  s += `<path d="${mancha(22, 22, 20, rand, 11, 0.3)}" fill="${cor}" style="stroke:var(--pin-borda)" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += `<path d="${mancha(22, 22, 13.5, rand, 9, 0.2)}" fill="${claro}" fill-opacity=".22" stroke="#FFF8EA" stroke-opacity=".5" stroke-width=".8"/>`;
  for (let i = 0; i < 5; i++) {
    const ang = rand() * Math.PI * 2;
    s += `<circle cx="${f(22 + Math.cos(ang) * 16.2)}" cy="${f(22 + Math.sin(ang) * 16.2)}" r="1.15" fill="#FFF8EA" fill-opacity=".7"/>`;
  }
  s += `<g transform="translate(11.5 11.5) scale(.875)" fill="none" stroke="#FFF8EA" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${cat(categoria).icone}</g>`;
  return `${s}</svg>`;
}

/** Colônia (cluster): mancha clara cercada de pontos nas cores das categorias contidas. */
export function colonias(contagem, n, tam) {
  const rand = rng(n * 977 + tam);
  const c = tam / 2;
  const R = tam * 0.27;
  let s = `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" aria-hidden="true">`;
  const dots = [];
  const total = Math.min(n, 20);
  Object.entries(contagem).sort((a, b) => b[1] - a[1]).forEach(([id, q]) => {
    const k = Math.max(1, Math.round((q / n) * total));
    for (let i = 0; i < k; i++) dots.push(cat(id).cor);
  });
  dots.slice(0, total).forEach((cor, i, a) => {
    const ang = (i / a.length) * Math.PI * 2 + rand() * 0.25;
    const rr = R * (1.38 + rand() * 0.32);
    s += `<circle cx="${f(c + Math.cos(ang) * rr)}" cy="${f(c + Math.sin(ang) * rr)}" r="${f(2.6 + rand() * 1.4)}" fill="${cor}" style="stroke:var(--pin-borda)" stroke-width=".9"/>`;
  });
  s += `<path d="${mancha(c, c, R * 1.32, rand, 10, 0.3)}" style="fill:var(--paper-3);stroke:var(--pin-borda)" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<path d="${mancha(c, c, R * 0.98, rand, 8, 0.25)}" fill="none" style="stroke:var(--pin-borda)" stroke-opacity=".28" stroke-width=".8"/>`;
  return `${s}</svg>`;
}

export { icone };
