import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { novoItem, mudarEtapa, proximaEtapa, agrupar, ocorrencias, proximasAcoes, panorama, dinheiroMes, recebidoAno, serieMeses, leadsParaRetomar, normalizar, gerarICS, parseValor, quando, addDias, diffDias, addMes, exemplos } from '../pessoal/js/logica.js';

const H = '2026-10-16';
const item = (area, extra) => novoItem(area, extra);

test('datas e valores', () => {
  assert.equal(addDias('2026-12-30', 3), '2027-01-02');
  assert.equal(diffDias('2026-11-01', '2026-10-31'), 1);
  assert.equal(diffDias('2026-10-25', '2026-10-24'), 1); // troca de horário de verão não distorce
  assert.equal(addMes('2026-12', 1), '2027-01');
  assert.equal(addMes('2026-01', -2), '2025-11');
  assert.equal(quando(H, H), 'Hoje');
  assert.equal(quando('2026-10-17', H), 'Amanhã');
  assert.equal(parseValor('R$ 1.500,50'), 1500.5);
  assert.equal(parseValor('1500'), 1500);
  assert.equal(parseValor('3.200'), 3200);
  assert.equal(parseValor(''), 0);
});

test('mudar de etapa: recebido grava a data e limpa a ação; sair de recebido desfaz', () => {
  const p = item('pericia', { proxima_acao: 'x', foco: H });
  mudarEtapa(p, 'recebido', H);
  assert.equal(p.recebido_em, H);
  assert.equal(p.proxima_acao, '');
  mudarEtapa(p, 'pra_receber', H);
  assert.equal(p.recebido_em, '');
  assert.equal(proximaEtapa(item('pericia', { etapa: 'rolando' })).id, 'pra_receber');
  assert.equal(proximaEtapa(item('mestrado', { etapa: 'feito' })), null);
});

test('agrupar: atrasadas, hoje, semana, depois; ignora concluídas e datas feitas', () => {
  const a = item('pericia', { titulo: 'A', datas: [{ rotulo: 'Entrega do laudo', data: '2026-10-10' }, { rotulo: 'Outro', data: H }, { rotulo: 'Outro', data: '2026-10-20', feita: true }] });
  const b = item('mestrado', { titulo: 'B', datas: [{ rotulo: 'Entrega', data: '2026-10-22' }, { rotulo: 'Entrega', data: '2026-12-01' }] });
  const c = item('arte', { titulo: 'C', etapa: 'feito', datas: [{ rotulo: 'Entrega', data: H }] });
  const g = agrupar([a, b, c], H);
  assert.deepEqual(g.atrasadas.map((o) => o.item.titulo), ['A']);
  assert.deepEqual(g.hoje.map((o) => o.item.titulo), ['A']);
  assert.deepEqual(g.semana.map((o) => o.item.titulo), ['B']);
  assert.equal(g.depois.length, 1);
  assert.equal(ocorrencias([a], { todas: true }).length, 3);
});

test('próximas ações: foco primeiro, depois a data mais próxima; sem data por último', () => {
  const x = item('pericia', { titulo: 'x', proxima_acao: 'a', datas: [{ rotulo: 'Outro', data: '2026-10-30' }] });
  const y = item('mestrado', { titulo: 'y', proxima_acao: 'b', datas: [{ rotulo: 'Entrega', data: '2026-10-18' }] });
  const z = item('arte', { titulo: 'z', proxima_acao: 'c' });
  const f = item('arte', { titulo: 'f', proxima_acao: 'd', foco: H });
  const sem = item('arte', { titulo: 'sem' });
  assert.deepEqual(proximasAcoes([x, y, z, f, sem], H).map((i) => i.titulo), ['f', 'y', 'x', 'z']);
});

test('panorama e dinheiro do mês', () => {
  const itens = [
    item('pericia', { etapa: 'recebido', valor: 1000, recebido_em: '2026-10-05' }),
    item('pericia', { etapa: 'recebido', valor: 700, recebido_em: '2026-09-20' }),
    item('pericia', { etapa: 'pra_receber', valor: 2000, datas: [{ rotulo: 'Pagamento previsto', data: '2026-10-28' }] }),
    item('pericia', { etapa: 'rolando', valor: 3000 }),
    item('pericia', { etapa: 'prospeccao', valor: 9999 }),
    item('mestrado', { valor: 500 }),
  ];
  const p = panorama(itens);
  assert.equal(p.recebido.n, 2);
  assert.equal(p.rolando.valor, 3000);
  const m = dinheiroMes(itens, '2026-10');
  assert.deepEqual(m, { recebido: 1000, previsto: 2000, semData: 3000 });
  assert.equal(recebidoAno(itens, 2026), 1700);
  const s = serieMeses(itens, '2026-10', 3);
  assert.deepEqual(s.map((x) => x.ym), ['2026-08', '2026-09', '2026-10']);
  assert.equal(s[1].recebido, 700);
});

test('prospecção: lead sem data ou vencido aparece; futuro não', () => {
  const l1 = item('pericia', { etapa: 'prospeccao', titulo: '1' });
  const l2 = item('pericia', { etapa: 'prospeccao', titulo: '2', datas: [{ rotulo: 'Retomar contato', data: '2026-10-10' }] });
  const l3 = item('pericia', { etapa: 'prospeccao', titulo: '3', datas: [{ rotulo: 'Retomar contato', data: '2026-10-30' }] });
  assert.deepEqual(leadsParaRetomar([l1, l2, l3], H).map((x) => `${x.item.titulo}:${x.estado}`), ['1:sem_data', '2:atrasado']);
});

test('backup: normalizar recusa lixo, conserta etapa/datas inválidas e mantém o resto', () => {
  assert.throws(() => normalizar({}));
  assert.throws(() => normalizar(null));
  const n = normalizar({ itens: [{ area: 'arte', titulo: 'ok', etapa: 'inexistente', valor: '12', datas: [{ data: 'ontem' }, { data: '2026-10-20' }] }, { area: 'outra', titulo: 'x' }], config: { metaMensal: 8000 } });
  assert.equal(n.itens.length, 1);
  assert.equal(n.itens[0].etapa, 'fazer');
  assert.equal(n.itens[0].valor, 12);
  assert.equal(n.itens[0].datas.length, 1);
  assert.equal(n.config.metaMensal, 8000);
  assert.equal(n.config.tema, 'auto');
});

test('.ics: dia inteiro, com hora, escapes e sem itens concluídos', () => {
  const itens = [
    item('pericia', { id: 'a', titulo: 'Perícia; A, B', proxima_acao: 'ligar', datas: [{ rotulo: 'Vistoria / audiência', data: '2026-10-20', hora: '09:30' }] }),
    item('mestrado', { id: 'b', titulo: 'Capítulo', datas: [{ rotulo: 'Entrega', data: '2026-10-31' }] }),
    item('arte', { id: 'c', titulo: 'Já feito', etapa: 'feito', datas: [{ rotulo: 'Entrega', data: '2026-10-21' }] }),
  ];
  const ics = gerarICS(itens, new Date(Date.UTC(2026, 9, 16, 12, 0)));
  assert.match(ics, /DTSTART:20261020T093000/);
  assert.match(ics, /DTEND:20261020T103000/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261031/);
  assert.match(ics, /DTEND;VALUE=DATE:20261101/);
  assert.match(ics, /SUMMARY:Vistoria \/ audiência: Perícia\; A\\, B/);
  assert.doesNotMatch(ics, /Já feito/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
});

test('exemplos são marcados e normalizam sem perdas', () => {
  const ex = exemplos(H);
  assert.ok(ex.length >= 5 && ex.every((i) => i.exemplo));
  assert.equal(normalizar({ itens: ex }).itens.length, ex.length);
});

test('app pessoal: arquivos do shell existem e a versão do sw é a da tela', () => {
  const sw = fs.readFileSync(new URL('../pessoal/sw.js', import.meta.url), 'utf8');
  const v = sw.match(/VERSAO = '([^']+)'/)[1];
  const app = fs.readFileSync(new URL('../pessoal/js/app.js', import.meta.url), 'utf8');
  assert.equal(app.match(/VERSAO = '([^']+)'/)[1], v, 'VERSAO de pessoal/js/app.js e pessoal/sw.js precisam ser iguais');
  const lista = sw.match(/ARQUIVOS = \[([\s\S]*?)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  for (const a of lista) if (a !== './') assert.ok(fs.existsSync(new URL(`../pessoal/${a}`, import.meta.url)), `falta: pessoal/${a}`);
});
