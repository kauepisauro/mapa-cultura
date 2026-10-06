// Mapa (Leaflet): marcadores-adesivo, clusters coloridos, rede de líquen, território-piloto.
/* global L */
import { CONFIG } from './config.js';
import { cat, icone, CATEGORIAS } from './categorias.js';
import { distanciaKm, esc, hash, rng } from './utils.js';
import { colonias, talo } from './arte.js';

function iconePino(l, selecionado) {
  const c = cat(l.categoria);
  const cls = ['pin', selecionado && 'is-sel', l.aoVivo && 'is-live', l.pendente && 'is-pend', l.exemplo && 'is-ex'].filter(Boolean).join(' ');
  return L.divIcon({
    className: 'pin-wrap',
    iconSize: [44, 60],
    iconAnchor: [22, 57],
    tooltipAnchor: [0, -50],
    html: `<div class="${cls}" style="--c:${c.cor}">${talo(l.id, l.categoria)}<i class="pin__stem"></i><i class="pin__dot"></i>${l.aoVivo ? '<b class="pin__live" title="Acontece hoje"></b>' : ''}</div>`,
  });
}

function iconeCluster(cluster) {
  const filhos = cluster.getAllChildMarkers();
  const cont = {};
  filhos.forEach((m) => { cont[m.options.cat] = (cont[m.options.cat] || 0) + 1; });
  const n = filhos.length;
  const tam = Math.round(Math.min(92, 60 + Math.log2(n) * 9));
  return L.divIcon({
    className: 'cluster-wrap',
    iconSize: [tam, tam],
    html: `<div class="cluster" style="width:${tam}px;height:${tam}px">${colonias(cont, n, tam)}<span>${n}</span></div>`,
  });
}

/** Curva suave (Bézier quadrática) entre dois pontos, com leve arco determinístico. */
function curva(a, b, semente) {
  const sinal = hash(semente) % 2 ? 1 : -1;
  const mx = (a.lat + b.lat) / 2;
  const my = (a.lng + b.lng) / 2;
  const dx = b.lat - a.lat;
  const dy = b.lng - a.lng;
  const k = 0.2 * sinal;
  const cx = mx - dy * k;
  const cy = my + dx * k;
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const u = 1 - t;
    pts.push([u * u * a.lat + 2 * u * t * cx + t * t * b.lat, u * u * a.lng + 2 * u * t * cy + t * t * b.lng]);
  }
  return pts;
}

export { iconePino };

export class Mapa {
  constructor(el, { aoSelecionar, aoMoverVazio }) {
    this.el = el;
    this.aoSelecionar = aoSelecionar;
    this.marcadores = new Map(); // id -> { m, sig }
    this.selId = null;
    this.itens = [];
    this.padding = { esq: 0, baixo: 0 };

    this.map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      maxBounds: L.latLngBounds(CONFIG.limites),
      maxBoundsViscosity: 0.7,
      minZoom: 9,
      maxZoom: 19,
      zoomSnap: 0.5,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 90,
    }).setView(CONFIG.centro, CONFIG.zoomInicial);

    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(this.map).addAttribution(CONFIG.tiles.atribuicao);

    this.map.createPane('rede').style.zIndex = 450;
    this.map.getPane('rede').style.pointerEvents = 'none';

    this.camadaRede = L.layerGroup();
    this.camadaVizinhos = L.layerGroup().addTo(this.map);
    this.camadaEu = L.layerGroup().addTo(this.map);

    this.cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      iconCreateFunction: iconeCluster,
      animateAddingMarkers: false,
    }).addTo(this.map);

    this.#piloto();
    this.setTema('dia');

    this.map.on('click', () => aoMoverVazio?.());
    const z = () => el.classList.toggle('zoom-perto', this.map.getZoom() >= 14.5);
    this.map.on('zoomend', z);
    z();
  }

  #piloto() {
    const t = CONFIG.territorioPiloto;
    if (!t) return;
    const rand = rng(21);
    const [lat0, lng0] = t.centro;
    const kLat = 111320;
    const kLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const pts = Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2;
      const k = 1 + 0.17 * Math.sin(a * 3 + 1) + 0.09 * Math.sin(a * 5) + (rand() - 0.5) * 0.06;
      return [lat0 + ((t.raioM * k) / kLat) * Math.sin(a), lng0 + ((t.raioM * k) / kLng) * Math.cos(a)];
    });
    this.piloto = L.polygon(pts, { className: 'piloto', color: '#5f7a2a', weight: 1.6, dashArray: '1 7', lineCap: 'round', fillColor: '#a7b456', fillOpacity: 0.13, interactive: false, smoothFactor: 1.2 }).addTo(this.map);
    const topo = pts.reduce((m, p) => (p[0] > m[0] ? p : m), pts[0]);
    this.pilotoRotulo = L.circleMarker(topo, { radius: 0, opacity: 0, fillOpacity: 0, interactive: false })
      .bindTooltip(`<span>${esc(t.nome)}</span>`, { permanent: true, direction: 'top', className: 'tt-piloto', interactive: false, offset: [0, 4] })
      .addTo(this.map);
  }

  setTema(tema) {
    this.tema = tema;
    if (this.tiles) this.map.removeLayer(this.tiles);
    this.tiles = L.tileLayer(CONFIG.tiles[tema], {
      maxZoom: 19,
      detectRetina: false,
      className: `tiles tiles--${tema}`,
      crossOrigin: true,
    }).addTo(this.map);
    this.tiles.bringToBack();
  }

  setPadding(esq, baixo) { this.padding = { esq, baixo }; }

  /** Atualiza marcadores (com diff, para não "piscar" a cada tecla). */
  setItens(itens, { ajustar = false } = {}) {
    this.itens = itens;
    const novos = new Set(itens.map((i) => i.id));
    const remover = [];
    for (const [id, o] of this.marcadores) {
      if (!novos.has(id)) { remover.push(o.m); this.marcadores.delete(id); }
    }
    if (remover.length) this.cluster.removeLayers(remover);

    const adicionar = [];
    for (const l of itens) {
      const sig = `${l.categoria}|${l.aoVivo}|${l.pendente}|${l.id === this.selId}`;
      const atual = this.marcadores.get(l.id);
      if (atual) {
        if (atual.sig !== sig) { atual.m.setIcon(iconePino(l, l.id === this.selId)); atual.sig = sig; }
        continue;
      }
      const m = L.marker([l.lat, l.lng], { icon: iconePino(l, l.id === this.selId), cat: l.categoria, keyboard: true, title: l.nome, riseOnHover: true });
      m.bindTooltip(esc(l.nome), { direction: 'top', className: 'tt-pino', offset: [0, -4] });
      m.on('click', (e) => { L.DomEvent.stopPropagation(e); this.aoSelecionar(l.id); });
      this.marcadores.set(l.id, { m, sig });
      adicionar.push(m);
    }
    if (adicionar.length) this.cluster.addLayers(adicionar);
    if (this.redeLigada) this.#desenharRede();
    if (ajustar) this.ajustar();
  }

  ajustar(itens = this.itens) {
    if (!itens.length) return;
    const b = L.latLngBounds(itens.map((i) => [i.lat, i.lng]));
    this.map.flyToBounds(b, {
      paddingTopLeft: [this.padding.esq + 40, 90],
      paddingBottomRight: [40, this.padding.baixo + 40],
      maxZoom: 15,
      duration: 0.9,
    });
  }

  selecionar(id) {
    const ant = this.selId;
    this.selId = id;
    for (const k of [ant, id]) {
      const o = this.marcadores.get(k);
      const l = this.itens.find((i) => i.id === k);
      if (o && l) { o.m.setIcon(iconePino(l, k === id)); o.sig = `${l.categoria}|${l.aoVivo}|${l.pendente}|${k === id}`; }
    }
    if (!id) this.camadaVizinhos.clearLayers();
  }

  /** Centraliza o ponto na parte visível do mapa (fora do painel). */
  voar(lat, lng, zoom = 16) {
    const z = Math.max(this.map.getZoom(), zoom);
    const alvo = this.map.project([lat, lng], z);
    alvo.x -= this.padding.esq / 2;
    alvo.y += this.padding.baixo / 2;
    const o = this.marcadores.get(this.selId);
    const ir = () => this.map.flyTo(this.map.unproject(alvo, z), z, { duration: 0.8 });
    if (o && !o.m._icon) this.cluster.zoomToShowLayer(o.m, ir);
    else ir();
  }

  /** Linhas destacadas do ponto selecionado até os vizinhos. */
  mostrarVizinhos(origem, vizinhos) {
    this.camadaVizinhos.clearLayers();
    if (!origem) return;
    for (const v of vizinhos) {
      L.polyline(curva(origem, v, origem.id + v.id), { pane: 'rede', className: 'rede-sel', color: cat(v.categoria).cor, weight: 3.2, opacity: 1, lineCap: 'round' }).addTo(this.camadaVizinhos);
    }
  }

  setRede(on) {
    this.redeLigada = on;
    if (on) { this.camadaRede.addTo(this.map); this.#desenharRede(); } else { this.map.removeLayer(this.camadaRede); }
  }

  #desenharRede() {
    this.camadaRede.clearLayers();
    const feitos = new Set();
    for (const a of this.itens) {
      const viz = this.itens.filter((b) => b !== a).map((b) => ({ b, d: distanciaKm(a, b) })).sort((x, y) => x.d - y.d).slice(0, 2);
      for (const { b, d } of viz) {
        if (d > 14) continue;
        const k = [a.id, b.id].sort().join('~');
        if (feitos.has(k)) continue;
        feitos.add(k);
        L.polyline(curva(a, b, k), { pane: 'rede', className: 'rede-linha', color: cat(a.categoria).cor, weight: 2.8, opacity: 0.9, lineCap: 'round' }).addTo(this.camadaRede);
      }
    }
  }

  localizar() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Seu navegador não permite localização.'));
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const eu = { lat: coords.latitude, lng: coords.longitude };
          this.camadaEu.clearLayers();
          L.marker([eu.lat, eu.lng], { icon: L.divIcon({ className: 'eu-wrap', html: '<div class="eu"><i></i></div>', iconSize: [26, 26] }), interactive: false, keyboard: false }).addTo(this.camadaEu);
          resolve(eu);
        },
        () => reject(new Error('Não consegui pegar sua localização. Verifique a permissão do navegador.')),
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
      );
    });
  }

  zoom(d) { this.map.setZoom(this.map.getZoom() + d); }
  invalidar() { this.map.invalidateSize(); }
}

export { CATEGORIAS };
