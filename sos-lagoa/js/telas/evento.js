// Página de uma reunião/ato: pauta, quem veio, registro e encaminhamentos — o coração do app.
import { h, icone, copiar, baixar, toast, seletorPessoas, linkWhatsapp } from '../ui.js';
import { dataLonga, hora, relativo } from '../datas.js';
import { TIPOS, garantirPessoas, ordenarEncaminhamentos, pendenciasParaRetomar, proximaReuniao } from '../logica.js';
import { cartaoEnc, cartaoIdeia, seloFrente, frenteDe, secao, vazio } from '../componentes.js';
import { formEvento, formEnc, formIdeia } from '../formularios.js';
import { resumoEvento } from '../texto.js';
import { gerarICS } from '../ics.js';

// Caixa de texto que salva sozinha (sem redesenhar a tela enquanto digita).
function textoQueSalva(ctx, ev, campo, { rotulo, dica, linhas = 4 }) {
  const aviso = h('span', { class: 'salvo', 'aria-live': 'polite' });
  const t = h('textarea', { class: 'campo-input', rows: String(linhas), maxlength: '20000', placeholder: dica, 'aria-label': rotulo }, ev[campo]);
  let espera;
  const gravar = () => {
    clearTimeout(espera);
    if (t.value === ev[campo]) return;
    ctx.store.atualizar((s) => { s.eventos.find((x) => x.id === ev.id)[campo] = t.value; }, { silencioso: true });
    ev[campo] = t.value;
    aviso.textContent = 'Salvo ✓';
  };
  const ajustar = () => { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight + 2, 520)}px`; };
  t.addEventListener('input', () => { aviso.textContent = 'Salvando…'; clearTimeout(espera); espera = setTimeout(gravar, 500); ajustar(); });
  t.addEventListener('blur', gravar);
  setTimeout(ajustar, 0);
  return { t, aviso };
}

export function renderEvento(ctx, id) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const ev = estado.eventos.find((e) => e.id === id);
  const raiz = h('div', { class: 'tela' });
  if (!ev) {
    return h('div', { class: 'tela' }, vazio('Não encontramos esse compromisso', 'Ele pode ter sido apagado neste aparelho.', h('a', { class: 'btn', href: '#/calendario' }, 'Voltar ao calendário')));
  }
  const reuniao = ev.tipo === 'reuniao';
  const frente = frenteDe(estado, ev.frente);

  raiz.append(h('a', { class: 'voltar', href: reuniao ? '#/reunioes' : '#/calendario' }, icone('esq'), reuniao ? 'Reuniões' : 'Calendário'));

  raiz.append(h('section', { class: 'evento-cab', style: `--cor:${frente?.cor || 'var(--azul-claro)'}` },
    h('div', { class: 'selos' }, ev.destaque && h('span', { class: 'selo selo-destaque' }, '⭐ Destaque'), ev.aConfirmar && h('span', { class: 'selo selo-confirmar' }, 'A confirmar'), h('span', { class: 'selo' }, TIPOS[ev.tipo].nome), seloFrente(estado, ev.frente), ev.exemplo && h('span', { class: 'selo selo-exemplo' }, 'exemplo')),
    h('div', { class: 'titulo-editavel' }, h('h1', {}, ev.titulo),
      h('button', { class: 'btn-icone btn-editar', type: 'button', 'aria-label': 'Editar nome, dia, horário e local', onclick: () => formEvento(ctx, { evento: ev }) }, icone('editar'))),
    h('p', { class: 'evento-quando' }, h('span', { class: 'capitalizar' }, dataLonga(ev.data)), ev.hora && ` · ${hora(ev.hora)}`, ' · ', h('strong', {}, relativo(ev.data, hoje))),
    ev.local && h('p', { class: 'evento-local' }, icone('local'), ev.local),
    ev.notas && h('p', { class: 'evento-notas' }, ev.notas),
    h('div', { class: 'linha-botoes solta' },
      h('a', { class: 'btn primario', href: linkWhatsapp(resumoEvento(estado, ev, hoje)), target: '_blank', rel: 'noopener' }, 'Enviar no WhatsApp'),
      h('button', { class: 'btn', type: 'button', onclick: () => copiar(resumoEvento(estado, ev, hoje)) }, icone('copiar'), 'Copiar texto'),
      h('button', { class: 'btn', type: 'button', onclick: () => baixar(`${ev.data}-sos-lagoa.ics`, gerarICS([ev], estado), 'text/calendar') }, icone('calendario'), 'Pôr no meu calendário'),
      h('button', { class: 'btn', type: 'button', onclick: () => formEvento(ctx, { evento: ev }) }, icone('editar'), 'Editar'))));

  if (reuniao) {
    const pauta = textoQueSalva(ctx, ev, 'pauta', { rotulo: 'Pauta', dica: 'Um assunto por linha…', linhas: 3 });
    raiz.append(secao('Pauta', h('div', { class: 'pilha' }, pauta.t, pauta.aviso)));
  }

  const presentes = seletorPessoas(estado.pessoas, ev.presentes, {
    rotulo: reuniao ? 'Quem veio' : 'Quem vai',
    vazio: 'Ainda não há pessoas. Digite um nome abaixo.',
    aoMudar: (lista) => ctx.store.atualizar((s) => {
      garantirPessoas(s, lista);
      s.eventos.find((x) => x.id === ev.id).presentes = lista;
    }, { silencioso: true }),
  });
  raiz.append(h('section', { class: 'secao' }, h('div', { class: 'secao-topo' }, h('h2', {}, reuniao ? 'Presenças' : 'Quem vai')), presentes.el));

  // ----- encaminhamentos -----
  const encs = ordenarEncaminhamentos(estado.encaminhamentos.filter((e) => e.origem === ev.id), hoje);
  raiz.append(secao('Encaminhamentos', encs.length
    ? h('div', { class: 'lista' }, encs.map((e) => cartaoEnc(ctx, e, { origem: false })))
    : h('p', { class: 'vazio-linha' }, reuniao ? 'Nada ainda. Registre cada tarefa combinada: o quê, quem e até quando.' : 'Nenhuma tarefa ligada a este compromisso.'),
  {
    contagem: encs.length || null,
    acao: h('button', { class: 'btn primario pequeno', type: 'button', onclick: () => formEnc(ctx, { origem: ev.id, frente: ev.frente }) }, icone('mais'), 'Novo'),
  }));

  const ideias = estado.ideias.filter((i) => i.origem === ev.id);
  raiz.append(secao('Ideias e possibilidades', ideias.length
    ? h('div', { class: 'lista' }, ideias.map((i) => cartaoIdeia(ctx, i)))
    : h('p', { class: 'vazio-linha' }, 'Algo surgiu e ainda não virou tarefa? Guarde aqui.'),
  {
    contagem: ideias.length || null,
    acao: h('button', { class: 'btn pequeno', type: 'button', onclick: () => formIdeia(ctx, { origem: ev.id, frente: ev.frente }) }, icone('mais'), 'Nova ideia'),
  }));

  if (reuniao) {
    const registro = textoQueSalva(ctx, ev, 'ata', { rotulo: 'Registro', dica: 'O que foi decidido? Resumo, combinados, dúvidas que ficaram…', linhas: 4 });
    raiz.append(secao('Registro da reunião (ata)', h('div', { class: 'pilha' }, registro.t, registro.aviso)));

    const retomar = ordenarEncaminhamentos(pendenciasParaRetomar(estado, ev), hoje);
    if (retomar.length) {
      raiz.append(h('details', { class: 'secao retomar' },
        h('summary', {}, h('h2', {}, 'Para retomar: pendências de antes', h('span', { class: 'contador' }, retomar.length))),
        h('div', { class: 'lista' }, retomar.map((e) => cartaoEnc(ctx, e)))));
    }
    raiz.append(h('div', { class: 'linha-botoes solta' },
      h('button', { class: 'btn', type: 'button', onclick: () => {
        const nova = proximaReuniao(ev);
        ctx.store.atualizar((s) => s.eventos.push(nova));
        ctx.ir(`#/evento/${nova.id}`);
        toast('Próxima reunião marcada para 7 dias depois. Ajuste o dia se precisar.');
      } }, icone('calendario'), 'Marcar a próxima (+7 dias)')));
  }
  return raiz;
}
