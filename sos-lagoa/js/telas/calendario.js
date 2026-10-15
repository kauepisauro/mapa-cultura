// Calendário de luta: mês (com pontinhos por frente) ou lista.
import { h, icone, baixar, copiar, toast } from '../ui.js';
import { MESES, DIAS_CURTOS, grade, deslocarMes, dataLonga, parse } from '../datas.js';
import { eventosDoDia, proximosEventos, eventosPassados } from '../logica.js';
import { cartaoEvento, chipsFrente, vazio, frenteDe } from '../componentes.js';
import { menuNovo } from '../formularios.js';
import { gerarICS } from '../ics.js';
import { resumoAgenda } from '../texto.js';

export function renderCalendario(ctx) {
  const { estado } = ctx;
  const hoje = ctx.hoje();
  const ui = ctx.ui.calendario;
  if (!ui.ano) { const d = parse(hoje); Object.assign(ui, { ano: d.getFullYear(), mes: d.getMonth(), sel: hoje }); }
  const filtro = { frente: ui.frente };
  const raiz = h('div', { class: 'tela' });

  raiz.append(h('div', { class: 'tela-topo' },
    h('h1', {}, 'Calendário de luta'),
    h('div', { class: 'segmentado', role: 'tablist' },
      ['mes', 'lista'].map((v) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.vista === v), class: ui.vista === v ? 'on' : '', onclick: () => { ui.vista = v; ctx.render(); } }, v === 'mes' ? 'Mês' : 'Lista')))));
  raiz.append(chipsFrente(estado, ui.frente, (id) => { ui.frente = id; ctx.render(); }));

  if (ui.vista === 'mes') {
    const dias = grade(ui.ano, ui.mes);
    const nav = h('div', { class: 'mes-nav' },
      h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Mês anterior', onclick: () => { Object.assign(ui, deslocarMes(ui, -1)); ctx.render(); } }, icone('esq')),
      h('h2', {}, `${MESES[ui.mes]} ${ui.ano}`),
      h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Próximo mês', onclick: () => { Object.assign(ui, deslocarMes(ui, 1)); ctx.render(); } }, icone('dir')),
      h('button', { class: 'btn pequeno', type: 'button', onclick: () => { const d = parse(hoje); Object.assign(ui, { ano: d.getFullYear(), mes: d.getMonth(), sel: hoje }); ctx.render(); } }, 'Hoje'));
    const grid = h('div', { class: 'grade', role: 'grid', 'aria-label': `${MESES[ui.mes]} ${ui.ano}` },
      DIAS_CURTOS.map((d) => h('div', { class: 'grade-cab', role: 'columnheader' }, d)),
      dias.map(({ iso, doMes }) => {
        const evs = eventosDoDia(estado, iso, filtro);
        const d = parse(iso);
        const pts = evs.slice(0, 4).map((e) => ({ cor: frenteDe(estado, e.frente)?.cor || 'var(--azul-claro)', vazio: !!e.aConfirmar }));
        return h('button', {
          type: 'button', role: 'gridcell',
          class: `dia${doMes ? '' : ' fora'}${iso === hoje ? ' hoje' : ''}${iso === ui.sel ? ' sel' : ''}${evs.length ? ' tem' : ''}${evs.some((e) => e.destaque) ? ' destaque' : ''}`,
          'aria-label': `${dataLonga(iso)}${evs.length ? `, ${evs.length} compromisso${evs.length > 1 ? 's' : ''}` : ''}`,
          'aria-pressed': String(iso === ui.sel),
          onclick: () => { ui.sel = iso; if (!doMes) Object.assign(ui, { ano: d.getFullYear(), mes: d.getMonth() }); ctx.render(); },
        }, h('b', {}, d.getDate()), h('span', { class: 'pontos' }, pts.map((p) => h('i', { class: p.vazio ? 'vazio' : null, style: `--cor:${p.cor}` })), evs.length > 4 && h('em', {}, '+')));
      }));
    const doDia = eventosDoDia(estado, ui.sel, filtro);
    raiz.append(h('section', { class: 'cartao calendario' }, nav, grid));
    raiz.append(h('section', { class: 'secao' },
      h('div', { class: 'secao-topo' }, h('h2', { class: 'capitalizar' }, dataLonga(ui.sel)),
        h('button', { class: 'btn pequeno', type: 'button', onclick: () => menuNovo(ctx, { dia: ui.sel }) }, icone('mais'), 'Adicionar neste dia')),
      doDia.length ? h('div', { class: 'lista' }, doDia.map((e) => cartaoEvento(ctx, e))) : h('p', { class: 'vazio-linha' }, 'Nada marcado nesse dia.')));
  } else {
    const prox = proximosEventos(estado, hoje, filtro);
    const passados = eventosPassados(estado, hoje, filtro);
    raiz.append(h('div', { class: 'lista' }, prox.length ? prox.map((e) => cartaoEvento(ctx, e))
      : vazio('Nenhum compromisso à frente', 'Marque uma reunião, ato ou audiência no botão “+”.')));
    if (passados.length) {
      raiz.append(h('details', { class: 'passados' }, h('summary', {}, `Já aconteceram (${passados.length})`),
        h('div', { class: 'lista' }, passados.map((e) => cartaoEvento(ctx, e)))));
    }
  }

  raiz.append(h('div', { class: 'linha-botoes solta' },
    h('button', { class: 'btn', type: 'button', onclick: () => copiar(resumoAgenda(estado, hoje, 21)) }, icone('copiar'), 'Copiar próximos 21 dias'),
    h('button', { class: 'btn', type: 'button', onclick: () => {
      const evs = proximosEventos(estado, hoje, filtro);
      if (!evs.length) { toast('Não há compromissos futuros para baixar.'); return; }
      baixar('calendario-sos-lagoa.ics', gerarICS(evs, estado), 'text/calendar');
    } }, icone('baixar'), 'Baixar para o celular (.ics)')));
  return raiz;
}
