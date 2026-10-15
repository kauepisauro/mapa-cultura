// Sincronização em grupo, em tempo real, pelo Firestore. A lógica de decisão está em sync-core.js (testada à parte).
// Cada item vira um documento em grupos/{codigo}/itens; o código do grupo é o "segredo" (quem não tem, não entra).
import { estavel, hash, itensLocais, planejar, aplicarMudancas, docId, partirChave, baseInicial } from './sync-core.js';
import { normalizar } from './logica.js';

export const CODIGO_VALIDO = /^[a-z0-9]{16,64}$/i;

// aoEstado('conectando' | 'online' | 'offline' | 'erro', detalhe)
// confirmarNovo(): chamado se o código não tem dados ainda (evita criar um grupo novo por erro de digitação); devolve Promise<boolean>.
export async function iniciarSync({ store, config, codigo, quem = () => '', aoEstado = () => {}, confirmarNovo = async () => true }) {
  aoEstado('conectando');
  let fb;
  try { fb = await import('../vendor/firebase/firebase.js'); } catch { aoEstado('erro', 'modulo'); return null; }

  const chaveBase = `soslagoa:sync-base:${hash(codigo)}`; // um resumo por item = "o que este aparelho sabe que está igual ao grupo"
  let base = new Map();
  try { base = new Map(JSON.parse(store.pref.ler(chaveBase) || '[]')); } catch { base = new Map(); }
  const salvarBase = () => store.pref.gravar(chaveBase, JSON.stringify([...base]));
  // Na 1ª entrada ainda não há "base" guardada: usamos a lista inicial como referência. Assim, o que a pessoa editou
  // ANTES de entrar no grupo não é sobrescrito pela versão original que está lá.
  let baseSeed = new Map();
  try {
    const r = await fetch('data/inicial.json', { cache: 'no-cache' });
    if (r.ok) baseSeed = baseInicial(normalizar(await r.json()));
  } catch { baseSeed = new Map(); }
  const baseEfetiva = () => { const b = new Map(baseSeed); base.forEach((v, k) => b.set(k, v)); return b; };

  const app = fb.initializeApp(config, `grupo-${Date.now()}`);
  let db;
  try {
    db = fb.initializeFirestore(app, {
      localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }), // guarda edições feitas sem internet
      experimentalAutoDetectLongPolling: true, // redes/proxies que bloqueiam o canal em tempo real
    });
  } catch { db = fb.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); }
  const itens = fb.collection(db, 'grupos', codigo, 'itens');

  let pronto = false; // só depois da 1ª resposta REAL do servidor (nunca confiar no cache vazio de um aparelho novo)
  let parado = false;
  let decidindo = false; // esperando a pessoa confirmar a criação de um grupo novo
  let ultima = null;
  const fila = new Map();
  let timerEnvio; let timerLocal;

  const enviar = () => {
    const lote = [...fila]; fila.clear();
    for (const [k, json] of lote) {
      const { colecao, id } = partirChave(k);
      fb.setDoc(fb.doc(itens, docId(k)), { colecao, id, dados: json === null ? '{}' : json, apagado: json === null, em: Date.now(), por: quem() || '' })
        .catch((e) => { if (e?.code === 'permission-denied') aoEstado('erro', 'permissao'); else { fila.set(k, json); clearTimeout(timerEnvio); timerEnvio = setTimeout(enviar, 5000); } });
    }
  };
  const enfileirar = (lista) => {
    for (const { k, json } of lista) fila.set(k, json);
    clearTimeout(timerEnvio); timerEnvio = setTimeout(enviar, 400);
  };
  const guardar = (plano) => { plano.novaBase.forEach((v, k) => base.set(k, v)); salvarBase(); };

  const parar = () => {
    if (parado) return;
    parado = true;
    clearTimeout(timerEnvio); clearTimeout(timerLocal);
    try { cancelar(); } catch { /* já cancelado */ }
    desassinar();
    window.removeEventListener('online', aoOnline); window.removeEventListener('offline', aoOffline);
    fb.terminate(db).catch(() => {}).finally(() => fb.deleteApp(app).catch(() => {}));
  };

  const aoOffline = () => aoEstado('offline');
  const aoOnline = () => aoEstado(pronto ? 'online' : 'conectando');
  window.addEventListener('offline', aoOffline); window.addEventListener('online', aoOnline);

  // mudanças feitas AQUI (inclui digitação) -> grupo
  const desassinar = store.assinarGravacao(() => {
    if (!pronto || parado) return;
    clearTimeout(timerLocal);
    timerLocal = setTimeout(() => {
      const plano = planejar({ local: itensLocais(store.estado), base: baseEfetiva() });
      guardar(plano);
      if (plano.enviar.length) enfileirar(plano.enviar);
    }, 250);
  });

  // mudanças do grupo -> AQUI
  const cancelar = fb.onSnapshot(itens, { includeMetadataChanges: true }, async (snap) => {
    if (parado) return;
    ultima = snap;
    const doServidor = !snap.metadata.fromCache;
    if (!pronto && !doServidor) { aoEstado('conectando'); return; }
    aoEstado(doServidor && navigator.onLine !== false ? 'online' : 'offline');

    const primeiro = !pronto;
    if (primeiro) {
      if (decidindo) return;
      if (snap.empty) {
        decidindo = true;
        const ok = await confirmarNovo();
        decidindo = false;
        if (!ok) { parar(); aoEstado('recusado'); return; }
      }
    }
    if (parado) return;
    snap = ultima; // usa a resposta mais recente do servidor (pode ter chegado durante a confirmação)

    const remoto = new Map();
    const lerDoc = (d) => {
      const x = d.data();
      if (!x || typeof x.colecao !== 'string' || typeof x.id !== 'string') return;
      const k = `${x.colecao}/${x.id}`;
      if (x.apagado === true) { remoto.set(k, { apagado: true }); return; }
      try { remoto.set(k, { json: estavel(JSON.parse(x.dados)) }); } catch { /* documento inválido: ignora */ }
    };
    if (primeiro) snap.docs.forEach(lerDoc); // 1ª vez: o grupo inteiro
    else snap.docChanges().forEach((c) => lerDoc(c.doc)); // depois: só o que mudou

    const plano = planejar({ local: itensLocais(store.estado), base: baseEfetiva(), remoto, chaves: primeiro ? undefined : new Set(remoto.keys()) });
    guardar(plano);
    if (plano.aplicar.length) store.aplicarRemoto((e) => { aplicarMudancas(e, plano.aplicar); Object.assign(e, normalizar(e)); });
    if (plano.enviar.length) enfileirar(plano.enviar);
    pronto = true;
  }, (erro) => {
    if (parado) return;
    aoEstado(erro?.code === 'permission-denied' ? 'erro' : 'offline', erro?.code || '');
  });

  return { parar, get pronto() { return pronto; } };
}
