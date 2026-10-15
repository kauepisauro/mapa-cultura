// Service worker do SOS Lagoa: abre sem internet e atualiza com aviso.
// IMPORTANTE: VERSAO precisa ser igual a CONFIG.versao (js/config.js). O teste confere.
const VERSAO = '2026-10-15.11';
const SHELL = `soslagoa-shell-${VERSAO}`;

const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/config.js', 'js/datas.js', 'js/logica.js', 'js/texto.js', 'js/ics.js', 'js/store.js', 'js/ui.js',
  'js/componentes.js', 'js/formularios.js', 'js/sync.js', 'js/sync-core.js', 'js/sync-hash.js', 'js/firebase-config.js', 'js/grupo-padrao.js',
  'vendor/firebase/firebase.js',
  'js/telas/inicio.js', 'js/telas/calendario.js', 'js/telas/reunioes.js', 'js/telas/evento.js',
  'js/telas/tarefas.js', 'js/telas/ideias.js', 'js/telas/frentes.js', 'js/telas/ajustes.js', 'data/inicial.json',
  'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' evita guardar cópias velhas do cache HTTP
  // skipWaiting: a versão nova assume sozinha (o app recarrega uma vez), sem depender de aviso.
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('soslagoa-shell-') && n !== SHELL).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });

// Cache primeiro (rápido e offline); a versão nova entra pela troca de VERSAO.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // A lista inicial do movimento muda sem trocar a versão do app: rede primeiro, cache só se estiver sem internet.
  if (new URL(req.url).pathname.endsWith('/data/inicial.json')) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        if (r.ok) (await caches.open(SHELL)).put(req, r.clone());
        return r;
      } catch { return (await caches.match(req)) || Response.error(); }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); } catch { return (await caches.match('index.html')) || Response.error(); }
  })());
});
