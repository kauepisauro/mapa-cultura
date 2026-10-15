// Ponto de entrada: rotas por #hash, tema, instalação e service worker.
import { CONFIG } from './config.js';
import { criarStore } from './store.js';
import { hojeISO } from './datas.js';
import { garantirPessoas, mesclarInicial } from './logica.js';
import { h, icone, folha, campo, toast } from './ui.js';
import { menuNovo } from './formularios.js';
import { renderInicio } from './telas/inicio.js';
import { renderCalendario } from './telas/calendario.js';
import { renderReunioes } from './telas/reunioes.js';
import { renderEvento } from './telas/evento.js';
import { renderTarefas } from './telas/tarefas.js';
import { renderIdeias } from './telas/ideias.js';
import { renderFrentes, renderFrente } from './telas/frentes.js';
import { renderAjustes } from './telas/ajustes.js';

const store = criarStore();
const app = document.getElementById('app');
let instalador = null;
let ultimaRota = null;

const ctx = {
  store,
  get estado() { return store.estado; },
  // estado de tela que sobrevive aos redesenhos (filtros, mês aberto…)
  ui: {
    calendario: { vista: 'mes', frente: '', ano: 0, mes: 0, sel: '' },
    reunioes: { frente: '' },
    tarefas: { pessoa: '', frente: '', vista: 'quadro', col: 'fazer', somenteAtrasados: false },
    ideias: { frente: '', grupo: 'mesa' },
  },
  hoje: () => hojeISO(),
  eu: () => store.pref.ler(CONFIG.chaveEu) || '',
  definirEu(nome) {
    store.pref.gravar(CONFIG.chaveEu, nome);
    if (nome) store.atualizar((s) => garantirPessoas(s, [nome])); else render();
  },
  definirTema(t) {
    store.pref.gravar(CONFIG.chaveTema, t);
    aplicarTema();
  },
  pedirNome() {
    const nome = h('input', { class: 'campo-input', maxlength: '80', value: ctx.eu(), placeholder: 'Seu nome', required: true });
    folha('Qual é o seu nome?', (fechar) => h('form', {
      class: 'pilha',
      onsubmit: (e) => { e.preventDefault(); ctx.definirEu(nome.value.trim()); fechar(); toast(`Oi, ${nome.value.trim().split(' ')[0]}!`); },
    },
    h('p', { class: 'dica' }, 'Assim o app mostra o que está com você. Fica só neste aparelho.'),
    campo('Nome', nome),
    h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', type: 'button', onclick: fechar }, 'Agora não'), h('button', { class: 'btn primario grande', type: 'submit' }, 'Salvar'))));
  },
  podeInstalar: () => !!instalador,
  async instalar() { if (!instalador) return; instalador.prompt(); await instalador.userChoice; instalador = null; render(); },
  ir(hash) { if (location.hash === hash) render(); else location.hash = hash; },
  render,
};

function aplicarTema() {
  const t = store.pref.ler(CONFIG.chaveTema) || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = t;
}

function rota() {
  const [sec = '', id = ''] = location.hash.replace(/^#\/?/, '').split('/');
  switch (sec) {
    case '': return { nav: 'inicio', titulo: 'Início', tela: () => renderInicio(ctx) };
    case 'calendario': return { nav: 'calendario', titulo: 'Calendário de luta', tela: () => renderCalendario(ctx) };
    case 'reunioes': return { nav: 'reunioes', titulo: 'Reuniões', tela: () => renderReunioes(ctx) };
    case 'tarefas': return { nav: 'tarefas', titulo: 'Encaminhamentos', tela: () => renderTarefas(ctx) };
    case 'ideias': return { nav: 'ideias', titulo: 'Ideias', tela: () => renderIdeias(ctx) };
    case 'frentes': return { nav: 'frentes', titulo: 'Frentes', tela: () => renderFrentes(ctx) };
    case 'ajustes': return { nav: 'ajustes', titulo: 'Ajustes', tela: () => renderAjustes(ctx) };
    case 'evento': {
      const ev = store.estado.eventos.find((e) => e.id === id);
      return { nav: ev && ev.tipo !== 'reuniao' ? 'calendario' : 'reunioes', titulo: ev?.titulo || 'Compromisso', tela: () => renderEvento(ctx, id) };
    }
    case 'frente': return { nav: 'frentes', titulo: store.estado.frentes.find((f) => f.id === id)?.nome || 'Frente', tela: () => renderFrente(ctx, id) };
    default: return { nav: 'inicio', titulo: 'Início', tela: () => renderInicio(ctx) };
  }
}

function render() {
  const r = rota();
  const y = window.scrollY;
  try {
    app.replaceChildren(r.tela());
  } catch (err) {
    console.error(err);
    app.replaceChildren(h('div', { class: 'tela' }, h('div', { class: 'aviso-caixa erro' }, 'Algo deu errado ao mostrar esta tela. Seus dados estão salvos. Tente voltar ao início.', h('br'), h('a', { class: 'btn', href: '#/' }, 'Ir para o início'))));
  }
  document.title = `${r.titulo} · ${CONFIG.nome}`;
  document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === r.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const chave = location.hash || '#/';
  if (chave !== ultimaRota) { window.scrollTo(0, 0); app.focus({ preventScroll: true }); ultimaRota = chave; } else window.scrollTo(0, y);
}

// ícones do menu
const ICONES_NAV = { inicio: 'casa', calendario: 'calendario', reunioes: 'pessoas', tarefas: 'lista', ideias: 'ideia', frentes: 'frente', ajustes: 'engrenagem' };
document.querySelectorAll('[data-nav]').forEach((a) => a.prepend(icone(ICONES_NAV[a.dataset.nav])));
document.querySelector('#fab').append(icone('mais'));
document.querySelector('#fab').addEventListener('click', () => {
  const sec = location.hash.replace(/^#\/?/, '').split('/');
  menuNovo(ctx, {
    dia: sec[0] === 'calendario' && ctx.ui.calendario.vista === 'mes' ? ctx.ui.calendario.sel : '',
    frente: sec[0] === 'frente' ? sec[1] : '',
  });
});

aplicarTema();
store.assinar(render);
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); }); // virou o dia? atualiza
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalador = e; if (location.hash === '#/ajustes') render(); });
render();

// ---- dados iniciais do movimento (data/inicial.json) ----
// 1ª abertura: carrega. Depois: se o movimento publicar uma edição nova, oferece atualizar (sem apagar o que a pessoa criou).
const edicaoAplicada = () => Number(store.pref.ler(CONFIG.chaveSemeado)) || 0;
async function buscarInicial() {
  try { const r = await fetch('data/inicial.json', { cache: 'no-cache' }); return r.ok ? JSON.parse(await r.text()) : null; } catch { return null; }
}

async function semear() {
  if (edicaoAplicada()) return;
  const seed = await buscarInicial();
  if (!seed) return; // sem internet na 1ª vez: tenta de novo na próxima abertura
  if (!store.temDadosSalvos) store.importar(JSON.stringify(seed));
  store.pref.gravar(CONFIG.chaveSemeado, String(seed.edicao || 1));
}

function oferecerAtualizacao(seed, { manual = false } = {}) {
  folha(manual ? 'Recarregar dados do movimento' : 'Há dados novos do movimento', (fechar) => h('div', { class: 'pilha' },
    h('p', {}, 'Isto atualiza as datas, locais e GTs que vieram da lista inicial do movimento. ',
      h('strong', {}, 'O que você criou continua'), ', assim como o que já marcou como feito, as presenças e os registros.'),
    h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn', type: 'button', onclick: () => { store.pref.gravar(CONFIG.chaveEdicaoRecusada, String(seed.edicao || 0)); fechar(); } }, 'Agora não'),
      h('button', { class: 'btn primario grande', type: 'button', onclick: () => {
        store.atualizar((e) => Object.assign(e, mesclarInicial(e, seed)));
        store.pref.gravar(CONFIG.chaveSemeado, String(seed.edicao || 1));
        fechar();
        toast('Dados do movimento atualizados.');
      } }, 'Atualizar'))));
}

async function verificarAtualizacao() {
  const seed = await buscarInicial();
  if (!seed || !(seed.edicao > edicaoAplicada())) return;
  if (Number(store.pref.ler(CONFIG.chaveEdicaoRecusada)) >= seed.edicao) return;
  oferecerAtualizacao(seed);
}

ctx.atualizarInicial = async () => {
  const seed = await buscarInicial();
  if (!seed) { toast('Sem conexão agora. Tente de novo com internet.'); return; }
  oferecerAtualizacao(seed, { manual: true });
};

// primeira vez: carrega dados iniciais e pergunta o nome (uma vez só); nas seguintes, confere se há edição nova
semear().then(() => {
  if (!store.pref.ler(CONFIG.chaveBoasVindas)) {
    store.pref.gravar(CONFIG.chaveBoasVindas, '1');
    if (!ctx.eu()) setTimeout(() => ctx.pedirNome(), 600);
  } else verificarAtualizacao();
});

// funciona sem internet; versão nova do app entra sozinha (recarrega uma vez)
if ('serviceWorker' in navigator) {
  const tinhaControle = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaControle) return; // 1ª instalação: nada a recarregar
    if (document.querySelector('dialog[open]')) toast('Versão nova pronta.', { rotulo: 'Atualizar', fn: () => location.reload() });
    else location.reload();
  });
}
