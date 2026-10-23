// Service worker do Mapa Vivo Florianópolis: funciona sem internet, abre rápido e atualiza com aviso.
// IMPORTANTE: VERSAO precisa ser igual a CONFIG.versao (js/config.js). O teste `npm test` confere.
const VERSAO = '2026-10-23.1';
const SHELL = `shell-${VERSAO}`;
const DADOS = 'dados-v1';
const TILES = 'tiles-v1';
const FONTES = 'fontes-v1';
const MAX_TILES = 700;

const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/main.js', 'js/config.js', 'js/categorias.js', 'js/utils.js', 'js/eventos.js', 'js/store.js',
  'js/mapa.js', 'js/arte.js', 'js/painel.js', 'js/contribuir.js', 'js/estilo-mapa.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/markercluster/leaflet.markercluster.js',
  'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css', 'vendor/maplibre/leaflet-maplibre-gl.js',
  'icons/icon.svg', 'icons/icon-192.png', 'data/seed.json',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' evita guardar cópias velhas do cache HTTP
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('shell-') && n !== SHELL).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });

const guardar = (cache, req, res) => {
  if (res && res.ok && res.type !== 'opaque') caches.open(cache).then((c) => c.put(req, res.clone()));
  return res;
};

async function primeiroCache(req, cache) {
  const hit = await caches.match(req);
  if (hit) return hit;
  return guardar(cache, req, await fetch(req));
}

async function primeiroRede(req, cache, ms = 5000) {
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('tempo')), ms))]);
    return guardar(cache, req, res);
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function usarERenovar(req, cache) {
  const hit = await caches.match(req);
  const rede = fetch(req).then((res) => guardar(cache, req, res)).catch(() => hit);
  return hit || rede;
}

let contagemTiles = 0;
async function tile(req) {
  const res = await primeiroCache(req, TILES);
  if (++contagemTiles % 50 === 0) {
    const c = await caches.open(TILES);
    const chaves = await c.keys();
    await Promise.all(chaves.slice(0, Math.max(0, chaves.length - MAX_TILES)).map((k) => c.delete(k)));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'tile.openstreetmap.org') return e.respondWith(tile(req));
  if (url.hostname === 'tiles.openfreemap.org') {
    // TileJSON muda a cada atualização dos dados: rede primeiro. Tiles e fontes: cache primeiro.
    return e.respondWith(/\/planet\/?$/.test(url.pathname) ? primeiroRede(req, DADOS) : tile(req));
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return e.respondWith(usarERenovar(req, FONTES));
  if (url.pathname.includes('/rest/v1/')) return e.respondWith(primeiroRede(req, DADOS));
  if (url.origin !== self.location.origin) return; // YouTube, busca de endereço etc.: direto da rede

  if (req.mode === 'navigate') {
    return e.respondWith(primeiroRede(req, SHELL, 4000).catch(() => caches.match('index.html')));
  }
  if (url.pathname.endsWith('/data/seed.json')) return e.respondWith(primeiroRede(req, DADOS));
  e.respondWith(primeiroCache(req, SHELL));
});
