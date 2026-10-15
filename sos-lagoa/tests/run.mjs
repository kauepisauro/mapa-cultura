import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { somarDias, diffDias, grade, dataCurta, dataLonga, relativo, hora, valida, deslocarMes } from '../js/datas.js';
import {
  estadoInicial, normalizar, situacaoPrazo, porPessoa, numeros, filtrarEncaminhamentos, avancarStatus,
  pendenciasParaRetomar, proximoCompromisso, filtrarIdeias, proximosEventos, eventosPassados, proximaReuniao, removerPessoa, exemplos, SEM_RESPONSAVEL, ordenarEncaminhamentos,
} from '../js/logica.js';
import { resumoEvento, resumoPendencias, resumoAgenda } from '../js/texto.js';
import { gerarICS } from '../js/ics.js';
import { criarStore } from '../js/store.js';
import { CONFIG } from '../js/config.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const HOJE = '2026-10-15'; // quinta-feira

test('datas: soma, diferença e validação', () => {
  assert.equal(somarDias('2026-12-30', 3), '2027-01-02');
  assert.equal(somarDias('2026-10-18', 1), '2026-10-19'); // virada de horário de verão não quebra
  assert.equal(diffDias('2026-10-15', '2026-10-22'), 7);
  assert.equal(diffDias('2026-10-15', '2026-10-10'), -5);
  assert.ok(valida('2026-02-28'));
  assert.ok(!valida('2026-02-30'));
  assert.ok(!valida('15/10/2026'));
});

test('datas: rótulos em português', () => {
  assert.equal(dataCurta('2026-10-15'), 'qui, 15 out');
  assert.equal(dataLonga('2026-10-15'), 'quinta-feira, 15 de outubro');
  assert.equal(relativo('2026-10-15', HOJE), 'hoje');
  assert.equal(relativo('2026-10-16', HOJE), 'amanhã');
  assert.equal(relativo('2026-10-18', HOJE), 'em 3 dias');
  assert.equal(relativo('2026-10-10', HOJE), 'há 5 dias');
  assert.equal(hora('19:00'), '19h');
  assert.equal(hora('19:30'), '19h30');
  assert.equal(hora(''), '');
});

test('datas: grade do mês tem 42 dias, começa no domingo e marca dias do mês', () => {
  const g = grade(2026, 9); // outubro/2026 começa numa quinta
  assert.equal(g.length, 42);
  assert.equal(g[0].iso, '2026-09-27');
  assert.equal(g[0].doMes, false);
  assert.equal(g.filter((d) => d.doMes).length, 31);
  assert.deepEqual(deslocarMes({ ano: 2026, mes: 11 }, 1), { ano: 2027, mes: 0 });
  assert.deepEqual(deslocarMes({ ano: 2026, mes: 0 }, -1), { ano: 2025, mes: 11 });
});

function base() {
  const e = estadoInicial();
  const [com, jur] = e.frentes;
  const ev = (id, data, extra = {}) => ({ id, titulo: id, tipo: 'reuniao', data, hora: '', local: '', frente: '', notas: '', pauta: '', presentes: [], ata: '', ...extra });
  e.eventos = [ev('r1', '2026-10-10'), ev('r2', '2026-10-17', { hora: '19:00', frente: com.id }), ev('ato', '2026-10-25', { tipo: 'ato', hora: '09:00' })];
  const enc = (id, extra) => ({ id, texto: `tarefa ${id}`, responsaveis: [], prazo: '', status: 'fazer', frente: '', origem: '', criadoEm: HOJE, feitoEm: '', ...extra });
  e.encaminhamentos = [
    enc('a', { responsaveis: ['Ana'], prazo: '2026-10-14', origem: 'r1' }),
    enc('b', { responsaveis: ['Bia', 'Ana'], prazo: HOJE, frente: jur.id, origem: 'r1' }),
    enc('c', { prazo: '2026-10-20', origem: 'r1' }),
    enc('d', { responsaveis: ['Caio'], status: 'feito', origem: 'r1' }),
    enc('e', { responsaveis: ['Ana'], status: 'fazendo', prazo: '2026-12-01' }),
  ];
  return e;
}

test('prazos: atrasado, hoje, semana, futuro, sem prazo e feito', () => {
  const e = base();
  const s = (id) => situacaoPrazo(e.encaminhamentos.find((x) => x.id === id), HOJE);
  assert.equal(s('a'), 'atrasado');
  assert.equal(s('b'), 'hoje');
  assert.equal(s('c'), 'semana');
  assert.equal(s('d'), 'feito');
  assert.equal(s('e'), 'futuro');
  assert.equal(situacaoPrazo({ status: 'fazer', prazo: '' }, HOJE), 'sem');
});

test('ordenação: atrasados primeiro, depois hoje, semana, futuro', () => {
  const e = base();
  const ids = ordenarEncaminhamentos(e.encaminhamentos, HOJE).map((x) => x.id);
  assert.deepEqual(ids, ['a', 'b', 'c', 'e', 'd']);
});

test('quem vai fazer o quê: agrupa por pessoa; sem responsável vem primeiro; feitos ficam de fora', () => {
  const g = porPessoa(base(), HOJE);
  assert.deepEqual(g.map((x) => x.pessoa), [SEM_RESPONSAVEL, 'Ana', 'Bia']);
  assert.deepEqual(g.find((x) => x.pessoa === 'Ana').itens.map((x) => x.id), ['a', 'b', 'e']);
  assert.ok(!g.some((x) => x.pessoa === 'Caio'));
});

test('filtros e números', () => {
  const e = base();
  assert.deepEqual(filtrarEncaminhamentos(e, { pessoa: 'Ana', status: 'aberto' }).map((x) => x.id), ['a', 'b', 'e']);
  assert.deepEqual(filtrarEncaminhamentos(e, { pessoa: SEM_RESPONSAVEL }).map((x) => x.id), ['c']);
  assert.deepEqual(filtrarEncaminhamentos(e, { status: 'feito' }).map((x) => x.id), ['d']);
  assert.deepEqual(numeros(e, HOJE), { abertos: 4, atrasados: 1, semDono: 1, feitos: 1 });
});

test('avançar status: fazer → fazendo → feito → fazer, registrando a data', () => {
  const x = { status: 'fazer', feitoEm: '' };
  avancarStatus(x, HOJE); assert.equal(x.status, 'fazendo');
  avancarStatus(x, HOJE); assert.equal(x.status, 'feito'); assert.equal(x.feitoEm, HOJE);
  avancarStatus(x, HOJE); assert.equal(x.status, 'fazer'); assert.equal(x.feitoEm, '');
});

test('eventos: próximos e passados; próxima reunião vem limpa +7 dias', () => {
  const e = base();
  assert.deepEqual(proximosEventos(e, HOJE).map((x) => x.id), ['r2', 'ato']);
  assert.deepEqual(eventosPassados(e, HOJE).map((x) => x.id), ['r1']);
  assert.deepEqual(proximosEventos(e, HOJE, { tipo: 'ato' }).map((x) => x.id), ['ato']);
  const prox = proximaReuniao({ ...e.eventos[1], ata: 'x', pauta: 'y', presentes: ['Ana'] });
  assert.equal(prox.data, '2026-10-24');
  assert.equal(prox.hora, '19:00');
  assert.equal(prox.ata, ''); assert.equal(prox.pauta, ''); assert.deepEqual(prox.presentes, []);
  assert.notEqual(prox.id, 'r2');
});

test('pendências para retomar: só abertos e de reuniões anteriores (ou sem origem)', () => {
  const e = base();
  assert.deepEqual(pendenciasParaRetomar(e, e.eventos[1]).map((x) => x.id), ['a', 'b', 'c', 'e']);
  assert.deepEqual(pendenciasParaRetomar(e, e.eventos[0]).map((x) => x.id), ['e']); // r1 é a origem de a-d
});

test('remover pessoa limpa responsáveis, presenças e coordenação', () => {
  const e = base();
  e.pessoas = ['Ana', 'Bia'];
  e.eventos[0].presentes = ['Ana'];
  e.frentes[0].coordenacao = ['Ana'];
  removerPessoa(e, 'Ana');
  assert.deepEqual(e.pessoas, ['Bia']);
  assert.deepEqual(e.encaminhamentos.find((x) => x.id === 'b').responsaveis, ['Bia']);
  assert.deepEqual(e.eventos[0].presentes, []);
  assert.deepEqual(e.frentes[0].coordenacao, []);
});

test('normalizar: conserta lixo, bloqueia cor/ids inválidos e junta pessoas', () => {
  const n = normalizar({
    frentes: [{ id: 'f1', nome: 'X', cor: 'red;background:url(x)' }],
    eventos: [
      { id: 'ok', titulo: 'T', tipo: 'bobagem', data: '2026-10-15', hora: '7h', frente: 'nao-existe', presentes: ['Zé', 'Zé', ' '] },
      { id: 'ruim', titulo: 'sem data' },
    ],
    encaminhamentos: [{ id: 'e1', texto: 'x', status: 'xx', prazo: 'ontem', origem: 'fantasma', responsaveis: ['Ana'] }],
  });
  assert.match(n.frentes[0].cor, /^#[0-9a-f]{6}$/i);
  assert.equal(n.eventos.length, 1);
  assert.equal(n.eventos[0].tipo, 'outro');
  assert.equal(n.eventos[0].hora, '');
  assert.equal(n.eventos[0].frente, '');
  assert.deepEqual(n.eventos[0].presentes, ['Zé']);
  assert.equal(n.encaminhamentos[0].status, 'fazer');
  assert.equal(n.encaminhamentos[0].prazo, '');
  assert.equal(n.encaminhamentos[0].origem, '');
  assert.deepEqual(n.pessoas, ['Ana', 'Zé']);
  assert.throws(() => normalizar(null));
  assert.throws(() => normalizar({ oi: 1 }));
  assert.throws(() => normalizar([]));
});

test('exemplos: passam pela normalização sem perder nada e são marcados', () => {
  const e = estadoInicial();
  const ex = exemplos(HOJE, e);
  const n = normalizar({ ...e, ...ex });
  assert.equal(n.eventos.length, ex.eventos.length);
  assert.equal(n.encaminhamentos.length, ex.encaminhamentos.length);
  assert.ok(n.eventos.every((x) => x.exemplo));
  assert.ok(n.encaminhamentos.every((x) => x.origem === '' || n.eventos.some((v) => v.id === x.origem)));
});

test('texto do WhatsApp: resumo da reunião com pauta, ata e encaminhamentos', () => {
  const e = base();
  e.eventos[0] = { ...e.eventos[0], titulo: 'Reunião geral', hora: '19:00', local: 'Sede', pauta: '- Informes\n• Ato', presentes: ['Ana', 'Bia'], ata: 'Definimos o ato.' };
  const t = resumoEvento(e, e.eventos[0], HOJE);
  assert.match(t, /\*REUNIÃO\*/);
  assert.match(t, /sábado, 10 de outubro às 19h/);
  assert.match(t, /📍 Sede/);
  assert.match(t, /• Informes\n• Ato/);
  assert.match(t, /\*Presentes:\* Ana, Bia/);
  assert.match(t, /1\. tarefa a — \*Ana\* · até qua, 14 out \(atrasado\)/);
  assert.match(t, /tarefa c — \*sem responsável\*/);
  assert.match(t, /tarefa d — \*Caio\* ✅/);
});

test('texto do WhatsApp: pendências por pessoa e agenda', () => {
  const e = base();
  const p = resumoPendencias(e, HOJE);
  assert.match(p, /\*Sem responsável\*\n1\. tarefa c · até ter, 20 out/);
  assert.match(p, /\*Ana\*\n1\. tarefa a · até qua, 14 out \(atrasado\)/);
  assert.ok(!p.includes('tarefa d'));
  assert.match(resumoPendencias({ ...e, encaminhamentos: [] }, HOJE), /Nada pendente/);
  const a = resumoAgenda(e, HOJE, 21);
  assert.match(a, /\*sáb, 17 out · 19h\* — r2 \(GT de Comunicação\)/);
  assert.match(a, /\*dom, 25 out · 9h\* — ato/);
  assert.match(resumoAgenda(e, HOJE, 1), /Nenhum compromisso/);
});

test('ICS: evento com hora, dia todo, escape e dobra de linhas', () => {
  const e = base();
  e.eventos[0] = { ...e.eventos[0], titulo: 'Reunião, geral; com vírgula', hora: '23:00', local: 'Sede', pauta: 'um\ndois', frente: e.frentes[0].id };
  const ics = gerarICS(e.eventos, e, new Date('2026-10-15T12:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /DTSTART:20261010T230000\r\n/);
  assert.match(ics, /DTEND:20261011T010000\r\n/); // passa da meia-noite
  assert.match(ics, /SUMMARY:SOS Lagoa · Reunião\\, geral\\; com vírgula/);
  assert.match(ics, /DTSTAMP:20261015T120000Z/);
  assert.match(ics, /DESCRIPTION:Frente: GT de Comunicação\\n\\nPauta:\\num\\ndois/);
  e.eventos[1].titulo = 'x'.repeat(200);
  const longo = gerarICS([e.eventos[1]], e);
  assert.ok(longo.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75));
  assert.match(longo, /DTSTART:20261017T190000/);
  const dia = gerarICS([{ ...e.eventos[2], hora: '' }], e);
  assert.match(dia, /DTSTART;VALUE=DATE:20261025\r\nDTEND;VALUE=DATE:20261026/);
});

test('store: grava, recarrega, exporta/importa e recusa arquivo inválido sem perder dados', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const s = criarStore(storage);
  assert.equal(s.estado.frentes.length, 4);
  let avisos = 0;
  s.assinar(() => avisos++);
  s.atualizar((e) => e.pessoas.push('Ana'));
  s.atualizar((e) => e.pessoas.push('Bia'), { silencioso: true });
  assert.equal(avisos, 1);
  const s2 = criarStore(storage);
  assert.deepEqual(s2.estado.pessoas, ['Ana', 'Bia']);
  const backup = s2.exportar();
  s2.zerar();
  assert.deepEqual(s2.estado.pessoas, []);
  s2.importar(backup);
  assert.deepEqual(s2.estado.pessoas, ['Ana', 'Bia']);
  assert.throws(() => s2.importar('{"oi":1}'));
  assert.throws(() => s2.importar('não é json'));
  assert.deepEqual(s2.estado.pessoas, ['Ana', 'Bia']);
  // armazenamento quebrado não derruba o app
  const ruim = criarStore({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
  ruim.atualizar((e) => e.pessoas.push('Zé'));
  assert.equal(ruim.salvamentoFalhou, true);
  assert.deepEqual(ruim.estado.pessoas, ['Zé']);
});

test('ideias: normaliza, filtra por grupo e frente, ordena da mais nova e limpa pessoa removida', () => {
  const e = base();
  e.ideias = [
    { id: 'i1', titulo: 'A', notas: '', frente: e.frentes[0].id, origem: 'r1', status: 'nova', interessados: ['Ana'], criadoEm: '2026-10-10' },
    { id: 'i2', titulo: 'B', notas: '', frente: '', origem: '', status: 'estudando', interessados: [], criadoEm: '2026-10-14' },
    { id: 'i3', titulo: 'C', notas: '', frente: '', origem: '', status: 'virou', interessados: [], criadoEm: '2026-10-01' },
    { id: 'i4', titulo: 'D', notas: '', frente: '', origem: '', status: 'arquivada', interessados: [], criadoEm: '' },
  ];
  assert.deepEqual(filtrarIdeias(e).map((x) => x.id), ['i2', 'i1']);
  assert.deepEqual(filtrarIdeias(e, { grupo: 'virou' }).map((x) => x.id), ['i3']);
  assert.deepEqual(filtrarIdeias(e, { grupo: 'arquivada' }).map((x) => x.id), ['i4']);
  assert.deepEqual(filtrarIdeias(e, { frente: e.frentes[0].id }).map((x) => x.id), ['i1']);
  const n = normalizar({ ...e, ideias: [...e.ideias, { id: 'i5', titulo: 'x', status: 'zzz', origem: 'fantasma', interessados: ['Zé'], criadoEm: 'ontem' }, null, { titulo: 'sem id' }] });
  assert.equal(n.ideias.length, 5);
  const i5 = n.ideias.find((x) => x.id === 'i5');
  assert.equal(i5.status, 'nova'); assert.equal(i5.origem, ''); assert.equal(i5.criadoEm, '');
  assert.ok(n.pessoas.includes('Zé'));
  assert.deepEqual(normalizar({ eventos: [] }).ideias, []); // backup antigo, sem ideias
  e.pessoas = ['Ana'];
  removerPessoa(e, 'Ana');
  assert.deepEqual(e.ideias[0].interessados, []);
});

test('"a confirmar" e destaque: normalizam, aparecem nos textos e no .ics', () => {
  const e = base();
  e.eventos[1] = { ...e.eventos[1], titulo: 'Piquenique', aConfirmar: true, destaque: true };
  const n = normalizar(e);
  assert.equal(n.eventos.find((x) => x.id === 'r2').aConfirmar, true);
  assert.equal(n.eventos.find((x) => x.id === 'r1').aConfirmar, undefined);
  assert.match(resumoAgenda(e, HOJE, 21), /⭐ Piquenique \(a confirmar\)/);
  assert.match(resumoEvento(e, e.eventos[1], HOJE), /\*Piquenique\* _\(a confirmar\)_/);
  const ics = gerarICS([e.eventos[1]], e);
  assert.match(ics, /SUMMARY:SOS Lagoa · Piquenique \(a confirmar\)/);
  assert.match(ics, /STATUS:TENTATIVE/);
  assert.ok(!gerarICS([e.eventos[2]], e).includes('TENTATIVE'));
});

test('texto da reunião inclui as ideias que surgiram nela', () => {
  const e = base();
  e.ideias = [{ id: 'i1', titulo: 'Virar APA', notas: 'Mais proteção', frente: '', origem: 'r1', status: 'nova', interessados: [], criadoEm: HOJE }];
  const t = resumoEvento(e, e.eventos[0], HOJE);
  assert.match(t, /\*Ideias que surgiram\*\n• Virar APA — Mais proteção/);
  assert.ok(!resumoEvento(e, e.eventos[1], HOJE).includes('Ideias que surgiram'));
});

test('compromisso em destaque: ignora "a confirmar" e reunião que já tem registro', () => {
  const e = base();
  e.eventos = [
    { ...e.eventos[0], id: 'hoje-feita', data: HOJE, ata: 'já aconteceu' },
    { ...e.eventos[0], id: 'talvez', data: '2026-10-16', aConfirmar: true },
    { ...e.eventos[0], id: 'firme', tipo: 'ato', data: '2026-10-17' },
  ];
  assert.equal(proximoCompromisso(e, HOJE).id, 'firme');
  assert.equal(proximoCompromisso({ ...e, eventos: [] }, HOJE), undefined);
});

test('dados iniciais do movimento: válidos, sem perda na normalização e com as datas ditadas', () => {
  const bruto = JSON.parse(readFileSync(join(raiz, 'data/inicial.json'), 'utf8'));
  const n = normalizar(bruto);
  assert.equal(n.eventos.length, bruto.eventos.length);
  assert.equal(n.encaminhamentos.length, bruto.encaminhamentos.length);
  assert.equal(n.ideias.length, bruto.ideias.length);
  assert.ok(n.encaminhamentos.every((x) => x.origem && x.frente)); // referências resolvem
  assert.ok(n.ideias.every((x) => x.origem));
  const por = (id) => n.eventos.find((x) => x.id === id);
  assert.deepEqual([por('ev-ato-17out').data, por('ev-ato-17out').hora], ['2026-10-17', '09:00']);
  assert.deepEqual([por('ev-cafezinho-20out').data, por('ev-cafezinho-20out').hora, por('ev-cafezinho-20out').destaque], ['2026-10-20', '15:00', true]);
  assert.equal(por('ev-aniversario-31out').data, '2026-10-31');
  assert.equal(por('ev-encontro-14dez').aConfirmar, true);
  assert.equal(por('ev-ato-25jan').aConfirmar, true);
  assert.ok(n.eventos.every((x) => !x.exemplo));
  // tela inicial destaca o ato de sábado, não a reunião já registrada
  assert.equal(proximoCompromisso(n, '2026-10-15').id, 'ev-ato-17out');
});

test('GTs do movimento: os quatro, em ordem, nos dados padrão e nos dados iniciais', () => {
  const nomes = ['GT de Comunicação', 'GT Técnico', 'GT de Cultura', 'GT de Mobilização'];
  assert.deepEqual(estadoInicial().frentes.map((f) => f.nome), nomes);
  const seed = normalizar(JSON.parse(readFileSync(join(raiz, 'data/inicial.json'), 'utf8')));
  assert.deepEqual(seed.frentes.map((f) => f.nome), nomes);
  assert.equal(seed.encaminhamentos[0].frente, seed.frentes[0].id); // GT de Comunicação → Cauê
  assert.equal(seed.eventos.find((x) => x.id === 'ev-ato-17out').local, 'Praia Mole');
});

test('app: versão do service worker = config; todos os arquivos do app existem', () => {
  const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
  assert.equal(sw.match(/const VERSAO = '([^']+)'/)[1], CONFIG.versao);
  const lista = sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/)[1];
  const arquivos = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
  assert.ok(arquivos.length > 10);
  for (const f of arquivos) assert.ok(existsSync(join(raiz, f)), `falta no app: ${f}`);
  // todo .js e .css do app está na lista offline
  for (const f of ['js/main.js', 'css/app.css', 'index.html', 'manifest.webmanifest']) assert.ok(arquivos.includes(f), `${f} fora do cache offline`);
});
