// Arte gerada: capas determinísticas (zine/risografia) e logo do líquen.
import { cat, icone } from './categorias.js';
import { hash, rng } from './utils.js';

const TINTA = '#1B2A22';
const PAPEL = '#F3E9D8';
const APOIO = ['#F2B531', '#9BBF3A', '#E4478B', '#2A9DD8', '#E0603C', '#F3E9D8'];

function mistura(hex, com, t) {
  const a = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
  const b = com.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

function mancha(cx, cy, r, rand, n = 8) {
  const pts = Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2;
    const rr = r * (0.72 + rand() * 0.5);
    return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).map((v) => v.toFixed(1))}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${p.map((v) => v.toFixed(1))} ${m.map((v) => v.toFixed(1))}`;
  }
  return `${d}Z`;
}

/** Capa SVG única por item (mesma entrada => mesma arte). */
export function capa(item, { w = 400, h = 240, icon = true } = {}) {
  const cor = cat(item.categoria).cor;
  const rand = rng(hash(`${item.id}${item.nome || item.titulo || ''}`));
  const fundo = mistura(cor, PAPEL, 0.72);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">`;
  s += `<rect width="${w}" height="${h}" fill="${fundo}"/>`;

  // retícula de meio-tom (halftone)
  const hx = rand() * w * 0.5;
  const hy = rand() * h * 0.4;
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 5; j++) {
      const r = 1.2 + (i + j) * 0.55;
      s += `<circle cx="${(hx + i * 13).toFixed(1)}" cy="${(hy + j * 13).toFixed(1)}" r="${r.toFixed(1)}" fill="${cor}" opacity=".55"/>`;
    }
  }
  // manchas
  const n = 4;
  for (let i = 0; i < n; i++) {
    const cx = w * (0.12 + rand() * 0.76);
    const cy = h * (0.15 + rand() * 0.7);
    const r = h * (0.16 + rand() * 0.24);
    const fill = i === 0 ? cor : i === 1 ? TINTA : APOIO[Math.floor(rand() * APOIO.length)];
    s += `<path d="${mancha(cx, cy, r, rand)}" fill="${fill}" stroke="${TINTA}" stroke-width="2.4" stroke-linejoin="round" opacity="${i === 1 ? 0.92 : 1}"/>`;
  }
  // fios de líquen
  for (let i = 0; i < 3; i++) {
    const x1 = rand() * w;
    const y1 = rand() * h;
    s += `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)}q${(rand() * 80 - 40).toFixed(0)} ${(rand() * 80 - 40).toFixed(0)} ${(rand() * 120 - 60).toFixed(0)} ${(rand() * 90 - 45).toFixed(0)}" fill="none" stroke="${TINTA}" stroke-width="1.6" stroke-dasharray="1 7" stroke-linecap="round"/>`;
  }
  if (icon) {
    const sz = h * 0.46;
    s += `<g transform="translate(${(w - sz - 14).toFixed(0)} ${(h - sz - 12).toFixed(0)}) scale(${(sz / 24).toFixed(3)})" color="${TINTA}" fill="${PAPEL}" stroke="${TINTA}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${cat(item.categoria).icone}</g>`;
  }
  return `${s}</svg>`;
}

export const capaUri = (item, opts) => `data:image/svg+xml;utf8,${encodeURIComponent(capa(item, opts))}`;

/** Logo: um líquen — mancha verde com pontos (apotécios) e fios de rede. */
export function logo(tam = 44) {
  return `<svg class="logo" width="${tam}" height="${tam}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M9 30c-4-7 1-15 8-14 2-6 11-7 14-1 8-1 12 7 8 13 3 7-3 12-10 10-3 6-12 5-15-1-6 1-9-3-5-7Z" fill="#9BBF3A" stroke="#1B2A22" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M14 27c4-2 6 1 9-2M25 33c3-3 6-1 8-4M20 20c1 3 4 3 6 6" fill="none" stroke="#1B2A22" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 3.2"/>
    <circle cx="19" cy="23" r="3.1" fill="#E0603C" stroke="#1B2A22" stroke-width="1.8"/>
    <circle cx="30.5" cy="21.5" r="2.4" fill="#F2B531" stroke="#1B2A22" stroke-width="1.8"/>
    <circle cx="27" cy="32" r="2.8" fill="#E4478B" stroke="#1B2A22" stroke-width="1.8"/>
  </svg>`;
}

export { icone };
