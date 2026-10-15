// Ajudantes de interface. Textos de usuário entram sempre como texto (nunca innerHTML).
const SVG = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

// Ícones fixos (HTML confiável, escrito aqui).
const ICONES = {
  mais: SVG('<path d="M12 5v14M5 12h14"/>'),
  ok: SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  casa: SVG('<path d="M3 11l9-7.5 9 7.5M5.5 9.5V20h13V9.5"/>'),
  calendario: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  pessoas: SVG('<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3.2 3.2 0 010 5.6M18.5 14.3c1.5.7 2.5 2.2 2.5 4.2"/>'),
  lista: SVG('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>'),
  frente: SVG('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  engrenagem: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
  copiar: SVG('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 00-2.5-2.5H6A2.5 2.5 0 003.5 6v7A2.5 2.5 0 006 15.5h2.5"/>'),
  lixeira: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 001.5 1.5h7a1.5 1.5 0 001.5-1.5L18 7M9 7V4.5h6V7"/>'),
  editar: SVG('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17z"/><path d="M14.5 7.5l3 3"/>'),
  esq: SVG('<path d="M15 5l-7 7 7 7"/>'),
  dir: SVG('<path d="M9 5l7 7-7 7"/>'),
  local: SVG('<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  relogio: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  baixar: SVG('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>'),
  subir: SVG('<path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 20h14"/>'),
  eu: SVG('<circle cx="12" cy="8.5" r="3.7"/><path d="M4.5 20c.6-3.7 3.7-6 7.5-6s6.9 2.3 7.5 6"/>'),
  alerta: SVG('<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.1"/>'),
  zap: SVG('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  x: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
  ideia: SVG('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"/>'),
};

export function icone(nome) {
  const s = document.createElement('span');
  s.className = 'ico';
  s.innerHTML = ICONES[nome] || '';
  return s;
}

export function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
  return el;
}

// ---------- aviso rápido ----------
let tToast;
export function toast(msg, acao) {
  let el = document.getElementById('toast');
  if (!el) { el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.replaceChildren(h('span', {}, msg));
  if (acao) el.append(h('button', { class: 'toast-acao', type: 'button', onclick: () => { acao.fn(); el.classList.remove('on'); } }, acao.rotulo));
  el.classList.add('on');
  clearTimeout(tToast);
  tToast = setTimeout(() => el.classList.remove('on'), acao ? 6000 : 2800);
}

// ---------- folha (janela que sobe de baixo) ----------
// construir(fechar) devolve o conteúdo (geralmente um <form>).
export function folha(titulo, construir) {
  const d = h('dialog', { class: 'folha', 'aria-label': titulo });
  const fechar = () => { if (d.open) d.close(); };
  d.append(
    h('header', { class: 'folha-topo' }, h('h2', {}, titulo), h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Fechar', onclick: fechar }, icone('x'))),
    h('div', { class: 'folha-corpo' }, construir(fechar)),
  );
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) fechar(); });
  document.body.append(d);
  d.showModal();
  d.querySelector('input:not([type=hidden]),textarea,select')?.focus({ preventScroll: true });
  return d;
}

export function confirmar(titulo, mensagem, rotulo = 'Apagar') {
  return new Promise((resolve) => {
    let resposta = false;
    const d = folha(titulo, (fechar) => h('div', { class: 'pilha' },
      h('p', {}, mensagem),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn', type: 'button', onclick: fechar }, 'Cancelar'),
        h('button', { class: 'btn perigo', type: 'button', onclick: () => { resposta = true; fechar(); } }, rotulo))));
    d.addEventListener('close', () => resolve(resposta));
  });
}

// ---------- arquivos e área de transferência ----------
export async function copiar(texto, aviso = 'Copiado! Agora é só colar no WhatsApp.') {
  try {
    await navigator.clipboard.writeText(texto);
    toast(aviso);
    return true;
  } catch {
    // plano B (http, navegador antigo): caixa de texto selecionável
    folha('Copie o texto', () => {
      const t = h('textarea', { class: 'campo-texto', rows: '12', readonly: true }, texto);
      setTimeout(() => { t.focus(); t.select(); }, 50);
      return h('div', { class: 'pilha' }, h('p', { class: 'dica' }, 'Seu navegador não deixou copiar sozinho. Selecione tudo e copie.'), t);
    });
    return false;
  }
}

export function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = h('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const linkWhatsapp = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

// ---------- formulários ----------
export function campo(rotulo, input, dica) {
  return h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo), input, dica && h('span', { class: 'dica' }, dica));
}

// Escolha de várias pessoas (chips) + digitar alguém novo. valor() devolve os nomes escolhidos.
export function seletorPessoas(todas, escolhidas, { rotulo = 'Quem', vazio = 'Ninguém ainda', aoMudar } = {}) {
  const nomes = [...new Set([...todas, ...escolhidas])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const marcados = new Set(escolhidas);
  const caixa = h('div', { class: 'chips', role: 'group', 'aria-label': rotulo });
  const entrada = h('input', { class: 'campo-input', type: 'text', placeholder: 'Outra pessoa…', maxlength: '80', 'aria-label': 'Adicionar outra pessoa' });

  const mudou = () => aoMudar?.([...marcados]);
  const chip = (n) => {
    const b = h('button', { type: 'button', class: `chip${marcados.has(n) ? ' on' : ''}`, 'aria-pressed': String(marcados.has(n)) }, n);
    b.addEventListener('click', () => {
      if (marcados.has(n)) marcados.delete(n); else marcados.add(n);
      b.classList.toggle('on', marcados.has(n));
      b.setAttribute('aria-pressed', String(marcados.has(n)));
      mudou();
    });
    return b;
  };
  nomes.forEach((n) => caixa.append(chip(n)));
  if (!nomes.length) caixa.append(h('span', { class: 'dica' }, vazio));

  const adicionar = () => {
    const n = entrada.value.trim();
    if (!n) return;
    entrada.value = '';
    marcados.add(n);
    const existente = [...caixa.querySelectorAll('.chip')].find((c) => c.textContent === n);
    if (existente) { existente.classList.add('on'); existente.setAttribute('aria-pressed', 'true'); mudou(); return; }
    caixa.querySelector('.dica')?.remove();
    const novo = chip(n);
    novo.classList.add('on');
    novo.setAttribute('aria-pressed', 'true');
    caixa.append(novo);
    mudou();
  };
  entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } });

  const el = h('div', { class: 'campo' },
    h('span', { class: 'campo-rotulo' }, rotulo), caixa,
    h('div', { class: 'linha-add' }, entrada, h('button', { type: 'button', class: 'btn pequeno', onclick: adicionar }, 'Adicionar')));
  return { el, valor: () => { adicionar(); return [...marcados]; } };
}

// Gaivotas da logo (SVG fixo, decorativo).
export function gaivotas(classe = 'gaivotas') {
  const s = document.createElement('span');
  s.className = classe;
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<svg viewBox="0 0 90 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 16c9-9 17-9 25 0 7-9 15-9 21 0"/><path d="M46 31c7-7 13-7 19 0 5-7 11-7 16 0"/></svg>';
  return s;
}
