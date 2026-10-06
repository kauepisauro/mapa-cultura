// Fluxo de colaboração: novo lugar, novo evento, sugestão de correção.
/* global L */
import { CONFIG } from './config.js';
import { CATEGORIAS, icone } from './categorias.js';
import { enviar, temBanco } from './store.js';
import { esc, hojeISO, linkWhatsapp } from './utils.js';
import { logo } from './arte.js';
import { iconePino } from './mapa.js';
import { I } from './painel.js';

const BAIRROS = ['Centro', 'Lagoa da Conceição', 'Barra da Lagoa', 'Campeche', 'Ribeirão da Ilha', 'Santo Antônio de Lisboa', 'Canasvieiras', 'Ingleses', 'Jurerê', 'Trindade', 'Itacorubi', 'Pantanal', 'Armação', 'Pântano do Sul', 'Rio Tavares', 'Costeira do Pirajubaé', 'Estreito', 'Coqueiros', 'Saco dos Limões', 'Rio Vermelho', 'Cacupé', 'Sambaqui', 'Daniela', 'Vargem Grande', 'Tapera', 'Morro das Pedras', 'Monte Serrat', 'Agronômica', 'Costa da Lagoa', 'São José', 'Kobrasol (São José)', 'Barreiros (São José)', 'Palhoça', 'Pinheira (Palhoça)', 'Pedra Branca (Palhoça)', 'Biguaçu', 'Santo Amaro da Imperatriz', 'Governador Celso Ramos', 'Antônio Carlos', 'Águas Mornas', 'Tijucas', 'Paulo Lopes'];
const DDD = '(48) 99999-0000';

const obrig = '<span class="obrig" aria-hidden="true">*</span>';
const campo = (rotulo, input, dica = '', id = '') => `<div class="campo">${id ? `<label for="${id}">${rotulo}</label>` : `<label>${rotulo}</label>`}${input}${dica ? `<small class="dica">${dica}</small>` : ''}</div>`;

const catRadios = (nome = 'categoria', marcado = '') => `<fieldset class="cats"><legend>Categoria ${obrig}</legend>${CATEGORIAS.map((c, i) => `
  <input type="radio" name="${nome}" id="${nome}-${c.id}" value="${c.id}" ${i === 0 ? 'required' : ''} ${marcado === c.id ? 'checked' : ''}>
  <label for="${nome}-${c.id}" style="--c:${c.cor}">${icone(c.id, 16)}${esc(c.nome)}</label>`).join('')}</fieldset>`;

const blocoMapa = (titulo = 'Onde fica?') => `<div class="campo" data-bloco-mapa>
  <label for="geo-q">${titulo} ${obrig}</label>
  <div class="geo"><input type="text" id="geo-q" placeholder="Busque um endereço ou lugar (ex.: Av. das Rendeiras)" autocomplete="off"><button type="button" class="btn" id="geo-ir">Buscar</button></div>
  <div class="geo-res" id="geo-res" role="listbox" aria-label="Resultados da busca"></div>
  <div class="mini-mapa" id="mini-mapa" aria-label="Mapa para marcar o local: clique ou arraste o pino"></div>
  <div class="mini-mapa__acoes">
    <button type="button" class="btn" id="geo-eu">${I.pin} Usar minha localização</button>
    <label class="pill" style="display:inline-flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" name="aprox" style="accent-color:var(--lichen-d)"> localização aproximada</label>
  </div>
  <small class="dica" id="geo-info">Toque no mapa ou arraste o pino até o lugar certo.</small>
  <input type="hidden" name="lat"><input type="hidden" name="lng">
</div>`;

const blocoFoto = () => `<div class="campo">
  <label for="foto">Foto <small style="font-weight:600">(opcional)</small></label>
  <input type="file" id="foto" accept="image/*" style="width:100%">
  <small class="dica">Use uma imagem sua ou com autorização de quem aparece. Ela é reduzida no seu aparelho antes de enviar.</small>
  <div class="foto-prev" id="foto-prev" hidden><img alt="" id="foto-img"><div style="flex:1">
    <label for="foto-alt" style="margin-bottom:4px">Descreva a imagem ${obrig}</label>
    <textarea id="foto-alt" name="foto_alt" style="min-height:70px;width:100%" maxlength="300" placeholder="Ex.: Roda de capoeira na praia, com berimbaus ao fundo"></textarea>
    <small class="dica">Para pessoas cegas ou com baixa visão. Todas as imagens do mapa têm descrição.</small>
    <button type="button" class="link" id="foto-x">remover foto</button></div></div>
  <input type="hidden" name="foto">
</div>`;

const blocoFinal = (tipo) => `
  <div class="campo"><label for="contato">Seu contato <small style="font-weight:600">(só a curadoria vê)</small></label>
    <input type="text" id="contato" name="contato_privado" maxlength="200" placeholder="Seu nome + WhatsApp ou e-mail, para tirar dúvidas">
    <small class="dica">Não será publicado. Usamos só para confirmar os dados.</small></div>
  <label class="consent"><input type="checkbox" name="tem_autorizacao" required>
    <span>Faço parte ${tipo === 'evento' ? 'da organização deste evento' : 'deste lugar/coletivo'} ou tenho autorização para divulgar estas informações e imagens. Entendo que o conteúdo será publicado sob <a href="${esc(CONFIG.licencaUrl)}" target="_blank" rel="noopener">${esc(CONFIG.licenca)}</a> após a curadoria.</span></label>
  <div class="isca" aria-hidden="true"><label>Empresa <input type="text" name="empresa" tabindex="-1" autocomplete="off"></label></div>`;

const camposPonto = () => `
  ${campo(`Nome do lugar ou coletivo ${obrig}`, '<input type="text" id="nome" name="nome" required maxlength="120" placeholder="Ex.: Grupo de Capoeira Mar Aberto">', '', 'nome')}
  ${catRadios()}
  ${campo(`Conte um pouco ${obrig}`, '<textarea id="descricao" name="descricao" required minlength="10" maxlength="800" placeholder="O que é, quem faz, para quem é, o que rola por lá…"></textarea>', '', 'descricao')}
  ${blocoMapa()}
  <div class="linha">
    ${campo('Bairro ou cidade', `<input type="text" id="bairro" name="bairro" list="bairros" maxlength="80" placeholder="Ex.: Lagoa da Conceição, Kobrasol (São José)"><datalist id="bairros">${BAIRROS.map((b) => `<option value="${esc(b)}">`).join('')}</datalist>`, '', 'bairro')}
    ${campo('Endereço', '<input type="text" id="endereco" name="endereco" maxlength="200" placeholder="Rua, número, referência">', '', 'endereco')}
  </div>
  ${campo('Quando funciona / quando rola', '<input type="text" id="horario" name="horario" maxlength="200" placeholder="Ex.: Quintas e sábados, 19h">', 'Eventos com data específica você cadastra na aba “Evento”.', 'horario')}
  <div class="linha">
    ${campo('Instagram', '<input type="text" id="instagram" name="instagram" maxlength="200" placeholder="@seuperfil">', '', 'instagram')}
    ${campo('WhatsApp', `<input type="tel" id="whatsapp" name="whatsapp" maxlength="30" placeholder="${DDD}" inputmode="tel">`, '', 'whatsapp')}
  </div>
  ${campo('Site ou link', '<input type="text" id="site" name="site" maxlength="300" placeholder="seusite.com.br">', '', 'site')}
  ${campo('Palavras-chave', '<input type="text" id="tags" name="tags" maxlength="200" placeholder="angola, crianças, roda aberta (separe por vírgula)">', '', 'tags')}
  ${blocoFoto()}
  ${blocoFinal('ponto')}`;

const camposEvento = (pontos, pontoId) => `
  ${campo(`Nome do evento ${obrig}`, '<input type="text" id="titulo" name="titulo" required maxlength="140" placeholder="Ex.: Roda de samba de sexta">', '', 'titulo')}
  ${catRadios('categoria')}
  ${campo(`Onde acontece? ${obrig}`, `<select id="ponto" name="ponto_id" required>
      <option value="">Escolha um lugar já no mapa…</option>
      ${[...pontos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((p) => `<option value="${esc(p.id)}" ${p.id === pontoId ? 'selected' : ''}>${esc(p.nome)}${p.bairro ? ` — ${esc(p.bairro)}` : ''}</option>`).join('')}
      <option value="__outro">Outro lugar (marcar no mapa)…</option></select>`, 'Se o lugar ainda não está no mapa, escolha “outro lugar”.', 'ponto')}
  <div id="bloco-outro" hidden>
    ${campo('Nome do local', '<input type="text" id="local_nome" name="local_nome" maxlength="140" placeholder="Ex.: Praça da Barra da Lagoa">', '', 'local_nome')}
    ${blocoMapa('Marque o local')}
  </div>
  <div class="linha linha--3">
    ${campo(`Data ${obrig}`, `<input type="date" id="data" name="data" required min="${hojeISO()}">`, '', 'data')}
    <div class="linha linha--hora" style="grid-column: span 2">
      ${campo('Começa', '<input type="time" id="inicio" name="inicio">', 'Sem horário? Deixe vazio: aparece como “dia todo”.', 'inicio')}
      ${campo('Termina', '<input type="time" id="fim" name="fim">', '', 'fim')}
    </div>
  </div>
  <div class="linha">
    ${campo('Se repete?', '<select id="repete" name="repete"><option value="nao">Não, é um evento único</option><option value="semanal">Toda semana</option><option value="quinzenal">A cada 15 dias</option><option value="mensal">Todo mês, no mesmo dia (ex.: dia 10)</option><option value="mensal_semana">Todo mês, no mesmo dia da semana (ex.: 1º sábado)</option><option value="dias_uteis">De segunda a sexta (exposições)</option><option value="diaria">Todos os dias (festival de vários dias)</option></select>', '', 'repete')}
    <div id="bloco-ate" hidden>${campo('Repete até', '<input type="date" id="repete_ate" name="repete_ate">', 'Deixe vazio se não tem data para acabar.', 'repete_ate')}</div>
  </div>
  <div class="linha">
    ${campo('Preço', '<input type="text" id="preco" name="preco" maxlength="60" placeholder="Grátis, R$ 20, contribuição consciente…">', 'Em branco = grátis.', 'preco')}
    ${campo('Link', '<input type="text" id="link" name="link" maxlength="300" placeholder="Instagram do evento, ingressos…">', '', 'link')}
  </div>
  ${campo('Detalhes', '<textarea id="descricao" name="descricao" maxlength="800" placeholder="Atrações, o que levar, classificação…"></textarea>', '', 'descricao')}
  ${blocoFoto()}
  ${blocoFinal('evento')}`;

// ───────── imagem: reduz no navegador ─────────
async function reduzir(file, max = 960) {
  const bmp = await createImageBitmap(file).catch(() => null);
  const img = bmp || (await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }));
  const esc_ = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * esc_);
  c.height = Math.round(img.height * esc_);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  let q = 0.78;
  let url = c.toDataURL('image/jpeg', q);
  while (url.length > 230000 && q > 0.35) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
  if (url.length > 330000) throw new Error('Essa foto ficou grande demais. Tente uma imagem menor.');
  return url;
}

function resumoWhats(tipo, d) {
  const linhas = [`*Nova colaboração — Mapa cultural vivo* (${tipo})`];
  for (const [k, v] of Object.entries(d)) {
    if (v == null || v === '' || k === 'foto' || k.startsWith('_') || k === 'tem_autorizacao') continue;
    linhas.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  }
  return linhas.join('\n');
}

export function iniciarContribuir(ctx) {
  const dlg = document.getElementById('dlg-colaborar');
  let mapa = null;
  let marcador = null;
  let tipo = 'ponto';
  let pontoInicial = '';

  const fechar = () => dlg.close();
  dlg.addEventListener('close', () => { mapa?.remove(); mapa = null; marcador = null; });
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fechar(); });

  function esqueleto(titulo, corpo, { tipos = true } = {}) {
    dlg.dataset.tema = ctx.tema();
    dlg.innerHTML = `<form id="f" novalidate>
      <div class="dlg__cab"><h2 id="colab-t">${titulo}</h2><button type="button" class="btn-redondo" data-fechar aria-label="Fechar">×</button></div>
      <div class="dlg__corpo">
        ${tipos ? `<div class="tipos" role="group" aria-label="O que você quer cadastrar?">
          <button type="button" data-tipo="ponto" aria-pressed="${tipo === 'ponto'}">Lugar ou coletivo<small>ateliê, roda, espaço, grupo…</small></button>
          <button type="button" data-tipo="evento" aria-pressed="${tipo === 'evento'}">Evento<small>data, horário e repetição</small></button></div>` : ''}
        <div id="erro" role="alert"></div>
        ${corpo}
      </div></form>`;
  }

  const erro = (msg) => { const e = dlg.querySelector('#erro'); if (e) e.innerHTML = msg ? `<p class="erro">${esc(msg)}</p>` : ''; };

  // ───────── mini-mapa ─────────
  function montarMapa(inicial) {
    const el = dlg.querySelector('#mini-mapa');
    if (!el) return;
    mapa?.remove();
    const centro = inicial || CONFIG.centro;
    mapa = L.map(el, { zoomControl: true, attributionControl: false, scrollWheelZoom: false, maxBounds: L.latLngBounds(CONFIG.limites) }).setView(centro, inicial ? 17 : 12);
    L.tileLayer(CONFIG.tiles[ctx.tema()], { maxZoom: 19, className: `tiles tiles--${ctx.tema()}` }).addTo(mapa);
    const cor = () => dlg.querySelector('input[name=categoria]:checked')?.value || 'espaco';
    const por = (lat, lng, mover = false) => {
      const ic = () => iconePino({ id: 'novo', categoria: cor() }, true);
      if (!marcador) {
        marcador = L.marker([lat, lng], { icon: ic(), draggable: true }).addTo(mapa);
        marcador.on('dragend', () => { const p = marcador.getLatLng(); define(p.lat, p.lng); });
      } else { marcador.setLatLng([lat, lng]); marcador.setIcon(ic()); }
      define(lat, lng);
      if (mover) mapa.flyTo([lat, lng], Math.max(mapa.getZoom(), 17), { duration: 0.6 });
    };
    const define = (lat, lng) => {
      dlg.querySelector('[name=lat]').value = lat.toFixed(6);
      dlg.querySelector('[name=lng]').value = lng.toFixed(6);
      dlg.querySelector('#geo-info').textContent = `Local marcado (${lat.toFixed(5)}, ${lng.toFixed(5)}). Arraste o pino para ajustar.`;
    };
    mapa.on('click', (e) => por(e.latlng.lat, e.latlng.lng));
    dlg.querySelectorAll('input[name=categoria]').forEach((r) => r.addEventListener('change', () => marcador?.setIcon(iconePino({ id: 'novo', categoria: cor() }, true))));

    const buscar = async () => {
      const q = dlg.querySelector('#geo-q').value.trim();
      const res = dlg.querySelector('#geo-res');
      if (q.length < 3) return;
      res.innerHTML = '<small class="dica">Buscando…</small>';
      try {
        const [[s, o], [n, l]] = [CONFIG.limites[0], CONFIG.limites[1]];
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=br&accept-language=pt-BR&viewbox=${o},${n},${l},${s}&bounded=1&q=${encodeURIComponent(q)}`);
        const j = await r.json();
        res.innerHTML = j.length ? j.map((x, i) => `<button type="button" role="option" data-i="${i}">${esc(x.display_name.split(',').slice(0, 3).join(','))}</button>`).join('') : '<small class="dica">Nada encontrado por aqui. Tente outro nome ou marque direto no mapa.</small>';
        res.onclick = (ev) => {
          const b = ev.target.closest('button[data-i]');
          if (!b) return;
          const x = j[Number(b.dataset.i)];
          por(Number(x.lat), Number(x.lon), true);
          res.innerHTML = '';
        };
      } catch { res.innerHTML = '<small class="dica">Não consegui buscar agora. Marque direto no mapa.</small>'; }
    };
    dlg.querySelector('#geo-ir').onclick = buscar;
    dlg.querySelector('#geo-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } });
    dlg.querySelector('#geo-eu').onclick = () => {
      navigator.geolocation?.getCurrentPosition(({ coords }) => por(coords.latitude, coords.longitude, true), () => erro('Não consegui pegar sua localização. Busque o endereço ou marque no mapa.'), { enableHighAccuracy: true, timeout: 9000 });
    };
    setTimeout(() => mapa?.invalidateSize(), 80);
  }

  function ligarFoto() {
    const inp = dlg.querySelector('#foto');
    if (!inp) return;
    const prev = dlg.querySelector('#foto-prev');
    inp.addEventListener('change', async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const url = await reduzir(f);
        dlg.querySelector('[name=foto]').value = url;
        dlg.querySelector('#foto-img').src = url;
        prev.hidden = false;
        dlg.querySelector('#foto-alt').required = true;
        erro('');
      } catch (e) { inp.value = ''; erro(e.message || 'Não consegui ler essa imagem.'); }
    });
    dlg.querySelector('#foto-x').onclick = () => { inp.value = ''; dlg.querySelector('[name=foto]').value = ''; dlg.querySelector('#foto-alt').required = false; dlg.querySelector('#foto-alt').value = ''; prev.hidden = true; };
  }

  function desenhar() {
    mapa?.remove(); mapa = null; marcador = null;
    const pontos = ctx.pontos();
    esqueleto('Colaborar com o <em>mapa</em>', `${tipo === 'ponto' ? camposPonto() : camposEvento(pontos, pontoInicial)}
      <div class="dlg__acoes"><button class="btn btn--cheio" type="submit" id="enviar">Enviar para a curadoria</button><button type="button" class="btn btn--fantasma" data-fechar>Cancelar</button></div>`);
    ligarFoto();
    const f = dlg.querySelector('#f');
    dlg.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { tipo = b.dataset.tipo; desenhar(); }));
    f.addEventListener('submit', submeter);
    if (tipo === 'ponto') montarMapa();
    else {
      const sel = f.querySelector('#ponto');
      const outro = f.querySelector('#bloco-outro');
      const atual = () => {
        const o = sel.value === '__outro';
        outro.hidden = !o;
        f.querySelector('#local_nome').required = o;
        if (o && !mapa) montarMapa();
      };
      sel.addEventListener('change', () => {
        atual();
        const p = pontos.find((x) => x.id === sel.value);
        if (p) f.querySelector(`input[name=categoria][value=${p.categoria}]`).checked = true;
      });
      const rep = f.querySelector('#repete');
      rep.addEventListener('change', () => { f.querySelector('#bloco-ate').hidden = rep.value === 'nao'; });
      const p0 = pontos.find((x) => x.id === pontoInicial);
      if (p0) f.querySelector(`input[name=categoria][value=${p0.categoria}]`).checked = true;
    }
  }

  async function submeter(e) {
    e.preventDefault();
    const f = e.currentTarget;
    erro('');
    const fd = new FormData(f);
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const lat = Number(fd.get('lat'));
    const lng = Number(fd.get('lng'));
    const precisaMapa = tipo === 'ponto' || fd.get('ponto_id') === '__outro';
    if (precisaMapa && (!lat || !lng)) { erro('Marque o local no mapa (ou busque o endereço) para o ponto aparecer no lugar certo.'); f.querySelector('#mini-mapa')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const v = (k) => String(fd.get(k) ?? '').trim();
    let dados;
    if (tipo === 'ponto') {
      dados = {
        nome: v('nome'), categoria: v('categoria'), descricao: v('descricao'), lat, lng, aprox: fd.get('aprox') === 'on',
        bairro: v('bairro'), endereco: v('endereco'), horario: v('horario'), instagram: v('instagram'), whatsapp: v('whatsapp'), site: v('site'),
        tags: v('tags').split(',').map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 8),
        foto: v('foto'), foto_alt: v('foto_alt'), contato_privado: v('contato_privado'), tem_autorizacao: true, _ninho: v('empresa'),
      };
    } else {
      const outro = fd.get('ponto_id') === '__outro';
      if (v('repete') !== 'nao' && v('repete_ate') && v('repete_ate') < v('data')) { erro('A data final da repetição precisa ser depois da data do evento.'); return; }
      dados = {
        ponto_id: outro ? null : v('ponto_id'), titulo: v('titulo'), categoria: v('categoria'), descricao: v('descricao'),
        data: v('data'), inicio: v('inicio'), fim: v('fim'), repete: v('repete') || 'nao', repete_ate: v('repete') !== 'nao' ? v('repete_ate') : '',
        preco: v('preco'), link: v('link'), ...(outro ? { lat, lng, local_nome: v('local_nome') } : {}),
        foto: v('foto'), foto_alt: v('foto_alt'), contato_privado: v('contato_privado'), tem_autorizacao: true, _ninho: v('empresa'),
      };
    }
    const btn = f.querySelector('#enviar');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const res = await enviar(tipo, dados);
      sucesso(dados, res);
      ctx.aoEnviar(tipo, res);
    } catch (err) {
      erro(err.message || 'Não foi possível enviar agora.');
      btn.disabled = false; btn.textContent = 'Enviar para a curadoria';
    }
  }

  function canais(texto) {
    const w = CONFIG.curadoriaWhatsapp ? linkWhatsapp(CONFIG.curadoriaWhatsapp, texto) : '';
    const m = CONFIG.curadoriaEmail ? `mailto:${CONFIG.curadoriaEmail}?subject=${encodeURIComponent('Colaboração — Mapa cultural vivo')}&body=${encodeURIComponent(texto)}` : '';
    return `${w ? `<a class="btn btn--terra" href="${esc(w)}" target="_blank" rel="noopener">${I.whats} Enviar por WhatsApp</a>` : ''}${m ? `<a class="btn" href="${esc(m)}">Enviar por e-mail</a>` : ''}`;
  }

  function sucesso(dados, res) {
    const demo = res.modo === 'demo';
    const nome = dados.nome || dados.titulo;
    esqueleto('Obrigado!', `<div class="sucesso">${logo(84)}
      <h3>${esc(nome)} entrou no mapa!</h3>
      <p>${demo
    ? 'Estamos em <b>modo demonstração</b>: seu envio já aparece <b>para você</b> no mapa (marcado “em análise”), mas ainda não foi publicado para todo mundo.'
    : 'Recebemos! A curadoria vai conferir os dados e <b>publicar assim que for aprovado</b>. Você já vê o envio no mapa, marcado como “em análise”.'}</p>
      ${demo ? `<p>${canais(resumoWhats(tipo, dados)) ? 'Para chegar à curadoria de verdade, envie por aqui:' : 'Configure o banco (README) para receber os envios.'}</p>` : ''}
      <div class="dlg__acoes">${demo ? canais(resumoWhats(tipo, dados)) : ''}
        <button class="btn btn--cheio" type="button" data-fechar>Ver no mapa</button>
        <button class="btn" type="button" id="mais">Cadastrar outro</button>
        <button class="btn" type="button" id="convidar">Convidar outro coletivo</button></div></div>`, { tipos: false });
    dlg.querySelector('#mais').onclick = () => { pontoInicial = ''; desenhar(); };
    dlg.querySelector('#convidar').onclick = () => ctx.compartilhar(`${location.origin}${location.pathname}#/colaborar`, 'Cadastre seu coletivo, ateliê ou evento no Cartografia Líquen');
    dlg.querySelector('.dlg__corpo').scrollTop = 0;
  }

  /** Correção / reivindicação de ficha */
  function abrirSugestao(lugar, tipoSug = 'correcao') {
    esqueleto('Sugerir <em>correção</em>', `
      <p style="margin:0 0 14px;font-weight:700">${esc(lugar.nome)}</p>
      ${campo('O que você quer fazer?', `<select id="s-tipo" name="tipo"><option value="correcao" ${tipoSug === 'correcao' ? 'selected' : ''}>Corrigir uma informação</option><option value="reivindicar" ${tipoSug === 'reivindicar' ? 'selected' : ''}>Este espaço é meu / do meu coletivo</option><option value="remocao">Pedir a retirada desta ficha</option></select>`, '', 's-tipo')}
      ${campo(`Mensagem ${obrig}`, '<textarea id="s-msg" name="mensagem" required minlength="3" maxlength="1500" placeholder="Conte o que precisa ser ajustado. Se for reivindicar, diga quem você é no coletivo."></textarea>', '', 's-msg')}
      ${campo('Seu contato', '<input type="text" id="s-contato" name="contato" maxlength="200" placeholder="WhatsApp ou e-mail, para a curadoria responder">', 'Só a curadoria vê.', 's-contato')}
      <div class="isca" aria-hidden="true"><label>Empresa <input type="text" name="empresa" tabindex="-1" autocomplete="off"></label></div>
      <div class="dlg__acoes"><button class="btn btn--cheio" type="submit">Enviar</button><button type="button" class="btn btn--fantasma" data-fechar>Cancelar</button></div>`, { tipos: false });
    dlg.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const fd = new FormData(f);
      const dados = { tipo: fd.get('tipo'), alvo_id: lugar.id, mensagem: String(fd.get('mensagem')).trim(), contato: String(fd.get('contato') || '').trim(), _ninho: fd.get('empresa') };
      try {
        const res = await enviar('sugestao', dados);
        const texto = `*${lugar.nome}* (${dados.tipo})\n${dados.mensagem}\nContato: ${dados.contato || '—'}`;
        esqueleto('Obrigado!', `<div class="sucesso">${logo(72)}<h3>Recebido!</h3>
          <p>${res.modo === 'demo' ? 'Modo demonstração: para a curadoria receber de verdade, envie por aqui.' : 'A curadoria vai olhar com carinho e, se precisar, fala com você.'}</p>
          <div class="dlg__acoes">${res.modo === 'demo' ? canais(texto) : ''}<button class="btn btn--cheio" type="button" data-fechar>Fechar</button></div></div>`, { tipos: false });
      } catch (err) { erro(err.message); }
    });
    if (!dlg.open) dlg.showModal();
  }

  return {
    abrir({ tipo: t = 'ponto', pontoId = '' } = {}) {
      tipo = t;
      pontoInicial = pontoId;
      desenhar();
      if (!dlg.open) dlg.showModal();
      dlg.querySelector('.dlg__corpo').scrollTop = 0;
    },
    abrirSugestao,
    temBanco,
  };
}
