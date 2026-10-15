// Tela inicial: o que vem aí e o que precisa de atenção.
import { h, icone, gaivotas, toast } from '../ui.js';
import { dataLonga, hora, relativo, somarDias } from '../datas.js';
import { proximosEventos, proximoCompromisso, filtrarIdeias, filtrarEncaminhamentos, ordenarEncaminhamentos, situacaoPrazo, exemplos } from '../logica.js';
import { cartaoEvento, cartaoEnc, cartaoIdeia, secao, seloFrente } from '../componentes.js';
import { formEvento } from '../formularios.js';

export function renderInicio(ctx) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const eu = ctx.eu();
  const proximos = proximosEventos(estado, hoje);
  const vazioTotal = !estado.eventos.length && !estado.encaminhamentos.length;
  const raiz = h('div', { class: 'tela' });

  // ----- destaque: próximo compromisso -----
  const prox = proximoCompromisso(estado, hoje);
  const hero = h('section', { class: 'hero', 'aria-label': 'Próximo compromisso' }, h('div', { class: 'hero-sol', 'aria-hidden': 'true' }), gaivotas());
  if (prox) {
    hero.append(h('div', { class: 'hero-texto' },
      h('span', { class: 'hero-rotulo' }, 'Próximo compromisso'),
      h('h1', {}, prox.titulo),
      h('p', { class: 'hero-quando' }, h('strong', {}, relativo(prox.data, hoje)), ` · ${dataLonga(prox.data)}${prox.hora ? ` · ${hora(prox.hora)}` : ''}`),
      prox.local && h('p', { class: 'hero-local' }, icone('local'), prox.local),
      h('div', { class: 'selos' }, prox.destaque && h('span', { class: 'selo' }, '⭐ Destaque'), seloFrente(estado, prox.frente)),
      h('a', { class: 'btn claro', href: `#/evento/${prox.id}` }, 'Abrir pauta e encaminhamentos')));
  } else {
    hero.append(h('div', { class: 'hero-texto' },
      h('span', { class: 'hero-rotulo' }, 'Calendário de luta'),
      h('h1', {}, 'Nada marcado por enquanto'),
      h('p', { class: 'hero-quando' }, 'Marque a próxima reunião ou ato para todo mundo ver.'),
      h('button', { class: 'btn claro', type: 'button', onclick: () => formEvento(ctx, { tipo: 'reuniao' }) }, 'Marcar reunião')));
  }
  raiz.append(hero);

  // ----- começo de tudo: guia rápido -----
  if (vazioTotal) {
    raiz.append(h('section', { class: 'cartao guia' },
      h('h2', {}, 'Como usar em 3 passos'),
      h('ol', {},
        h('li', {}, h('strong', {}, 'Marque a reunião'), ' no botão vermelho “+”.'),
        h('li', {}, h('strong', {}, 'Durante a reunião'), ', anote a pauta e cada encaminhamento: o quê, quem e até quando.'),
        h('li', {}, h('strong', {}, 'Depois'), ', toque em “Copiar para WhatsApp” e cole no grupo.')),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        ctx.store.atualizar((s) => {
          const ex = exemplos(hoje, s);
          s.eventos.push(...ex.eventos);
          s.encaminhamentos.push(...ex.encaminhamentos);
          ex.pessoas.forEach((p) => { if (!s.pessoas.includes(p)) s.pessoas.push(p); });
        });
        toast('Exemplos carregados. Remova quando quiser em Ajustes.');
      } }, 'Ver com dados de exemplo')));
  }

  // ----- pra você / atenção -----
  if (!vazioTotal) {
    if (eu) {
      const meus = ordenarEncaminhamentos(filtrarEncaminhamentos(estado, { pessoa: eu, status: 'aberto' }), hoje);
      raiz.append(secao(`Seus encaminhamentos, ${eu.split(' ')[0]}`,
        meus.length ? h('div', { class: 'lista' }, meus.slice(0, 5).map((e) => cartaoEnc(ctx, e))) : h('p', { class: 'vazio-linha' }, 'Nada em aberto no seu nome.'),
        { contagem: meus.length || null, acao: meus.length > 5 ? h('a', { class: 'link', href: '#/tarefas', onclick: () => Object.assign(ctx.ui.tarefas, { pessoa: eu, frente: '' }) }, 'Ver todos') : null }));
    } else {
      raiz.append(h('button', { class: 'cartao convite', type: 'button', onclick: () => ctx.pedirNome() },
        icone('eu'), h('span', {}, h('strong', {}, 'Quem é você?'), h('small', {}, 'Diga seu nome para ver só o que está com você.'))));
    }
    const atencao = ordenarEncaminhamentos(estado.encaminhamentos.filter((e) => e.status !== 'feito'
      && (situacaoPrazo(e, hoje) === 'atrasado' || !e.responsaveis.length) && !(eu && e.responsaveis.includes(eu))), hoje);
    if (atencao.length) {
      raiz.append(secao('Precisam de atenção', h('div', { class: 'lista' }, atencao.slice(0, 4).map((e) => cartaoEnc(ctx, e))),
        { contagem: atencao.length, acao: atencao.length > 4 ? h('a', { class: 'link', href: '#/tarefas' }, 'Ver todos') : null }));
    }
  }

  // ----- ideias na mesa -----
  const ideias = filtrarIdeias(estado, { grupo: 'mesa' });
  if (ideias.length) {
    raiz.append(secao('Ideias na mesa', h('div', { class: 'lista' }, ideias.slice(0, 3).map((i) => cartaoIdeia(ctx, i))),
      { contagem: ideias.length, acao: h('a', { class: 'link', href: '#/ideias' }, ideias.length > 3 ? 'Ver todas' : 'Abrir') }));
  }

  // ----- próximos 7 dias -----
  const semana = proximos.filter((e) => e.data <= somarDias(hoje, 7));
  const depois = proximos.filter((e) => e.data > somarDias(hoje, 7)).slice(0, 3);
  if (semana.length || depois.length) {
    raiz.append(secao('Nos próximos dias', h('div', { class: 'lista' }, [...semana, ...depois].map((e) => cartaoEvento(ctx, e))),
      { acao: h('a', { class: 'link', href: '#/calendario' }, 'Calendário completo') }));
  }
  return raiz;
}
