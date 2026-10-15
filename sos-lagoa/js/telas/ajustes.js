// Ajustes: seu nome, pessoas, aparência e backup.
import { h, icone, baixar, confirmar, toast } from '../ui.js';
import { CONFIG } from '../config.js';
import { exemplos, removerPessoa, garantirPessoas } from '../logica.js';
import { hojeISO } from '../datas.js';

export function renderAjustes(ctx) {
  const { estado, store } = ctx;
  const raiz = h('div', { class: 'tela' }, h('div', { class: 'tela-topo' }, h('h1', {}, 'Ajustes')));
  const bloco = (titulo, ...filhos) => h('section', { class: 'cartao bloco' }, h('h2', {}, titulo), ...filhos);

  // ----- eu -----
  const nome = h('input', { class: 'campo-input', maxlength: '80', value: ctx.eu(), placeholder: 'Seu nome', 'aria-label': 'Seu nome' });
  raiz.append(bloco('Quem é você neste aparelho',
    h('p', { class: 'dica' }, 'Usado para mostrar “seus encaminhamentos” na tela inicial. Fica só neste aparelho.'),
    h('div', { class: 'linha-add' }, nome, h('button', { class: 'btn primario', type: 'button', onclick: () => { ctx.definirEu(nome.value.trim()); toast('Nome salvo.'); } }, 'Salvar'))));

  // ----- pessoas -----
  const novaPessoa = h('input', { class: 'campo-input', maxlength: '80', placeholder: 'Nome da pessoa', 'aria-label': 'Nova pessoa' });
  const adicionar = () => {
    const n = novaPessoa.value.trim();
    if (!n) return;
    store.atualizar((s) => garantirPessoas(s, [n]));
  };
  novaPessoa.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } });
  raiz.append(bloco('Pessoas do movimento',
    h('p', { class: 'dica' }, 'Quem aparece nas escolhas de responsável e presença.'),
    h('div', { class: 'chips' }, estado.pessoas.length ? estado.pessoas.map((p) => h('span', { class: 'chip pessoa' }, p,
      h('button', { type: 'button', class: 'chip-x', 'aria-label': `Remover ${p}`, onclick: async () => {
        if (await confirmar('Remover pessoa?', `${p} sai da lista e dos encaminhamentos e presenças em que aparece.`, 'Remover')) store.atualizar((s) => removerPessoa(s, p));
      } }, icone('x')))) : h('span', { class: 'dica' }, 'Ninguém ainda.')),
    h('div', { class: 'linha-add' }, novaPessoa, h('button', { class: 'btn', type: 'button', onclick: adicionar }, 'Adicionar'))));

  // ----- aparência -----
  const tema = store.pref.ler(CONFIG.chaveTema) || 'auto';
  raiz.append(bloco('Aparência',
    h('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': 'Tema' }, [['auto', 'Automático'], ['escuro', 'Noite'], ['claro', 'Dia']].map(([v, r]) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': String(tema === v), class: tema === v ? 'on' : '', onclick: () => { ctx.definirTema(v); ctx.render(); } }, r)))));

  // ----- dados -----
  const arquivo = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const texto = await f.text();
      if (!(await confirmar('Restaurar backup?', 'Isso substitui tudo que está neste aparelho pelo conteúdo do arquivo.', 'Restaurar'))) return;
      store.importar(texto);
      toast('Backup restaurado.');
    } catch (err) { toast(err.message || 'Não deu para ler esse arquivo.'); }
    e.target.value = '';
  } });
  const temExemplo = estado.eventos.some((e) => e.exemplo) || estado.encaminhamentos.some((e) => e.exemplo);
  raiz.append(bloco('Seus dados',
    h('div', { class: 'aviso-caixa' }, h('strong', {}, 'Os dados ficam neste aparelho. '),
      'Para o grupo todo ver, use “Enviar no WhatsApp” em cada reunião ou mande um backup. Quem recebe o backup pode restaurar no próprio aparelho.'),
    h('div', { class: 'linha-botoes solta' },
      h('button', { class: 'btn', type: 'button', onclick: () => baixar(`backup-sos-lagoa-${hojeISO()}.json`, store.exportar(), 'application/json') }, icone('baixar'), 'Baixar backup'),
      h('button', { class: 'btn', type: 'button', onclick: () => arquivo.click() }, icone('subir'), 'Restaurar backup'), arquivo),
    h('div', { class: 'linha-botoes solta' },
      !temExemplo && h('button', { class: 'btn', type: 'button', onclick: () => {
        store.atualizar((s) => { const ex = exemplos(hojeISO(), s); s.eventos.push(...ex.eventos); s.encaminhamentos.push(...ex.encaminhamentos); garantirPessoas(s, ex.pessoas); });
        toast('Exemplos carregados.');
      } }, 'Carregar exemplos'),
      temExemplo && h('button', { class: 'btn', type: 'button', onclick: () => {
        store.atualizar((s) => {
          s.eventos = s.eventos.filter((e) => !e.exemplo);
          s.encaminhamentos = s.encaminhamentos.filter((e) => !e.exemplo);
          s.pessoas.filter((p) => p.endsWith('(exemplo)')).forEach((p) => removerPessoa(s, p));
        });
        toast('Exemplos removidos.');
      } }, 'Remover exemplos'),
      h('button', { class: 'btn perigo-suave', type: 'button', onclick: async () => {
        if (await confirmar('Apagar tudo?', 'Todas as reuniões, encaminhamentos, frentes e pessoas deste aparelho serão apagados. Baixe um backup antes se tiver dúvida.', 'Apagar tudo')) { store.zerar(); toast('Tudo apagado.'); }
      } }, icone('lixeira'), 'Apagar tudo')),
    store.salvamentoFalhou && h('p', { class: 'aviso-caixa erro' }, 'Atenção: o navegador não está deixando guardar os dados (modo privado ou sem espaço). Baixe um backup.')));

  // ----- instalar -----
  if (ctx.podeInstalar()) {
    raiz.append(bloco('Instalar no celular', h('p', { class: 'dica' }, 'Vira um ícone na tela inicial e abre sem precisar da internet.'),
      h('button', { class: 'btn primario', type: 'button', onclick: () => ctx.instalar() }, 'Instalar app')));
  } else {
    raiz.append(bloco('Instalar no celular', h('p', { class: 'dica' }, 'No Android (Chrome): menu ⋮ → “Instalar app”. No iPhone (Safari): compartilhar → “Adicionar à Tela de Início”.')));
  }

  raiz.append(h('p', { class: 'rodape-app' }, `${CONFIG.nome} · ${CONFIG.lema}`, h('br'), `versão ${CONFIG.versao}`));
  return raiz;
}
