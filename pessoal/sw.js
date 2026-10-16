// Service worker do Painel pessoal: abre sem internet e atualiza com aviso.
// IMPORTANTE: VERSAO precisa ser igual à de js/app.js (o `npm test` confere).
const VERSAO = '2026-10-16.1';
const SHELL = `painel-shell-${VERSAO}`;
const FONTES = 'painel-fontes-v1';

const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/pessoal.css',
  'js/app.js', 'js/logica.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const n of await caches.keys()) if (n.startsWith('painel-shell-') && n !== SHELL) await caches.delete(n);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // arquivos do app: cache primeiro; páginas: rede primeiro com cache de reserva
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).catch(() => caches.match('index.html')));
    } else {
      e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    }
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTES).then(async (c) => {
      const hit = await c.match(req);
      const rede = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || rede;
    }));
  }
});
