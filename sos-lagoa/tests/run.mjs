import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { somarDias, diffDias, grade, dataCurta, dataLonga, relativo, hora, valida, deslocarMes } from '../js/datas.js';
import {
  estadoInicial, normalizar, situacaoPrazo, porPessoa, numeros, filtrarEncaminhamentos, avancarStatus,
  pendenciasParaRetomar, TODO_MUNDO, proximoCompromisso, filtrarIdeias, proximosEventos, eventosPassados, proximaReuniao, removerPessoa, renomearPessoa, mesclarInicial, exemplos, SEM_RESPONSAVEL, ordenarEncaminhamentos,
} from '../js/logica.js';
import { resumoEvento, resumoPendencias, resumoAgenda } from '../js/texto.js';
import { gerarICS } from '../js/ics.js';
import { criarStore } from '../js/store.js';
import { estavel, hash, itensLocais, planejar, aplicarMudancas, docId, partirChave, baseInicial } from '../js/sync-core.js';
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
  assert.equal(seed.encaminhamentos[0].frente, seed.frentes[0].id); // GT de Comunicação → Kauê
  assert.deepEqual(seed.encaminhamentos[0].responsaveis, ['Kauê']);
  assert.equal(seed.eventos.find((x) => x.id === 'ev-ato-17out').local, 'Praia Mole');
});

test('atualizar dados iniciais: troca o que veio da lista, mantém o que a pessoa criou e o andamento', () => {
  const seed = JSON.parse(readFileSync(join(raiz, 'data/inicial.json'), 'utf8'));
  assert.ok(seed.edicao >= 2);
  // aparelho com a edição 1 (frentes genéricas, ato sem local) + coisas da própria pessoa
  const antigo = normalizar({
    frentes: [{ id: 'f-comunicacao', nome: 'Comunicação', cor: '#3d78c4' }, { id: 'f-juridico', nome: 'Jurídico', cor: '#e0bb3a' }, { id: 'minha', nome: 'Minha frente', cor: '#e5262b' }],
    eventos: [
      { id: 'ev-ato-17out', titulo: 'Ato contra a privatização', tipo: 'ato', data: '2026-10-17', hora: '09:00', local: 'Local a confirmar', frente: 'f-juridico' },
      { id: 'ev-reuniao-ultima', titulo: 'Última reunião', tipo: 'reuniao', data: '2026-10-15', ata: 'Minha ata editada', pauta: 'Minha pauta', presentes: ['Joana'] },
      { id: 'meu-evento', titulo: 'Meu evento', tipo: 'outro', data: '2026-11-01' },
    ],
    encaminhamentos: [
      { id: 'enc-gt-comunicacao', texto: 'GT de Comunicação (antigo)', responsaveis: ['Cauê'], status: 'feito', feitoEm: '2026-10-16', frente: 'f-comunicacao', origem: 'ev-reuniao-ultima' },
      { id: 'meu-enc', texto: 'Comprar tinta', responsaveis: ['Joana'], frente: 'f-juridico' },
    ],
    ideias: [{ id: 'id-apa', titulo: 'APA', status: 'estudando', interessados: ['Joana'], origem: 'ev-reuniao-ultima' }, { id: 'minha-ideia', titulo: 'Minha ideia' }],
    pessoas: ['Cauê', 'Joana'],
  });
  const novo = mesclarInicial(antigo, seed);
  const ids = (a) => a.map((x) => x.id);
  // frentes: os 4 GTs primeiro, a própria frente depois; as genéricas antigas somem
  assert.deepEqual(novo.frentes.map((f) => f.nome), ['GT de Comunicação', 'GT Técnico', 'GT de Cultura', 'GT de Mobilização', 'Minha frente']);
  // ato ganhou Praia Mole e deixou de apontar para a frente que sumiu
  const ato = novo.eventos.find((e) => e.id === 'ev-ato-17out');
  assert.equal(ato.local, 'Praia Mole'); assert.equal(ato.frente, '');
  // registro/pauta/presenças da reunião ficam como estavam
  const reu = novo.eventos.find((e) => e.id === 'ev-reuniao-ultima');
  assert.deepEqual([reu.ata, reu.pauta, reu.presentes], ['Minha ata editada', 'Minha pauta', ['Joana']]);
  assert.ok(ids(novo.eventos).includes('meu-evento') && ids(novo.eventos).includes('ev-cafezinho-20out'));
  // tarefa da lista: texto novo, mas continua "feito"; a tarefa criada pela pessoa continua, sem a frente apagada
  const gt = novo.encaminhamentos.find((e) => e.id === 'enc-gt-comunicacao');
  assert.deepEqual([gt.status, gt.feitoEm, gt.frente === novo.frentes[0].id], ['feito', '2026-10-16', true]);
  assert.deepEqual(gt.responsaveis, ['Kauê']); // nome corrigido na lista inicial (era Cauê)
  assert.equal(novo.encaminhamentos.find((e) => e.id === 'meu-enc').frente, '');
  // ideias: andamento e "quem topa" ficam; ideia própria continua
  const apa = novo.ideias.find((i) => i.id === 'id-apa');
  assert.deepEqual([apa.status, apa.interessados], ['estudando', ['Joana']]);
  assert.ok(ids(novo.ideias).includes('minha-ideia') && ids(novo.ideias).includes('id-monitoramento'));
  assert.deepEqual(novo.pessoas, ['Joana', 'Kauê']); // 'Cauê' sumiu: foi renomeado, não duplicado
  // idempotente
  assert.deepEqual(mesclarInicial(novo, seed), novo);
});

test('tarefa "para todo mundo": vale para qualquer pessoa, tem grupo próprio e não conta como sem responsável', () => {
  const e = base();
  e.encaminhamentos.push({ id: 'todos', texto: 'Levar água', responsaveis: [], prazo: '2026-10-16', status: 'fazer', frente: '', origem: '', criadoEm: HOJE, feitoEm: '', paraTodos: true });
  assert.ok(filtrarEncaminhamentos(e, { pessoa: 'Bia' }).some((x) => x.id === 'todos'));        // aparece para qualquer pessoa
  assert.ok(filtrarEncaminhamentos(e, { pessoa: 'Zé' }).some((x) => x.id === 'todos'));
  assert.ok(!filtrarEncaminhamentos(e, { pessoa: SEM_RESPONSAVEL }).some((x) => x.id === 'todos')); // não é "sem responsável"
  assert.equal(numeros(e, HOJE).semDono, 1);                                                      // só a 'c' original
  const g = porPessoa(e, HOJE).map((x) => x.pessoa);
  assert.deepEqual(g.slice(0, 3), [SEM_RESPONSAVEL, TODO_MUNDO, 'Ana']);                         // grupos especiais primeiro
  assert.match(resumoPendencias(e, HOJE), /\*Todo mundo\*\n1\. Levar água · até sex, 16 out/);
  assert.match(resumoEvento({ ...e, eventos: [{ ...e.eventos[0], id: 'x' }] }, e.eventos[0], HOJE), /tarefa a — \*Ana\*/);
  const n = normalizar(e);
  assert.equal(n.encaminhamentos.find((x) => x.id === 'todos').paraTodos, true);
  assert.equal(n.encaminhamentos.find((x) => x.id === 'a').paraTodos, undefined);
});

test('renomear pessoa: troca em todos os lugares sem duplicar', () => {
  const e = base();
  e.pessoas = ['Ana', 'Ani']; e.eventos[0].presentes = ['Ana', 'Ani']; e.frentes[0].coordenacao = ['Ana'];
  e.ideias = [{ id: 'i', titulo: 'x', notas: '', frente: '', origem: '', status: 'nova', interessados: ['Ana'], criadoEm: '' }];
  renomearPessoa(e, 'Ana', 'Ani');
  assert.deepEqual(e.pessoas, ['Ani']);
  assert.deepEqual(e.eventos[0].presentes, ['Ani']);
  assert.deepEqual(e.frentes[0].coordenacao, ['Ani']);
  assert.deepEqual(e.ideias[0].interessados, ['Ani']);
  assert.deepEqual(e.encaminhamentos.find((x) => x.id === 'a').responsaveis, ['Ani']);
  assert.deepEqual(e.encaminhamentos.find((x) => x.id === 'b').responsaveis, ['Bia', 'Ani']);
});

test('service worker: assume sozinho e lista inicial vem da rede', () => {
  const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
  assert.match(sw, /skipWaiting\(\)/);
  assert.match(sw, /inicial\.json/);
});

// ---------- sincronização em grupo (simulação de aparelhos com um "grupo" em memória) ----------
function grupoFake() { return new Map(); } // chave -> {json} | {apagado:true}
function aparelho(estado) { return { estado, base: new Map() }; }
// manda mudanças locais para o grupo (o que o app faz depois de cada edição)
function empurrar(dev, grupo) {
  const p = planejar({ local: itensLocais(dev.estado), base: dev.base });
  p.novaBase.forEach((v, k) => dev.base.set(k, v));
  for (const { k, json } of p.enviar) grupo.set(k, json === null ? { apagado: true } : { json });
}
// recebe do grupo: 1ª vez olha tudo; depois só as chaves dadas (o que mudou)
function puxar(dev, grupo, chaves) {
  const p = planejar({ local: itensLocais(dev.estado), base: dev.base, remoto: grupo, chaves });
  p.novaBase.forEach((v, k) => dev.base.set(k, v));
  aplicarMudancas(dev.estado, p.aplicar);
  for (const { k, json } of p.enviar) grupo.set(k, json === null ? { apagado: true } : { json });
}
const mini = (extra = {}) => normalizar({
  frentes: [{ id: 'f1', nome: 'GT X', cor: '#3d78c4' }],
  eventos: [{ id: 'e1', titulo: 'Ato', tipo: 'ato', data: '2026-10-17', local: 'Praia Mole' }],
  encaminhamentos: [{ id: 't1', texto: 'Cartaz', responsaveis: ['Ana'], frente: 'f1' }],
  ...extra,
});
const copia = (x) => JSON.parse(JSON.stringify(x));

test('sync: estável e hash — mesmo item, mesmo texto, qualquer ordem de chaves', () => {
  assert.equal(estavel({ b: 1, a: [2, { d: 1, c: 2 }] }), estavel({ a: [2, { c: 2, d: 1 }], b: 1 }));
  assert.equal(hash('abc'), hash('abc'));
  assert.notEqual(hash('abc'), hash('abd'));
  assert.equal(docId('eventos/e 1/x'), 'eventos:e%201%2Fx');
  assert.deepEqual(partirChave('pessoas/Ana/B'), { colecao: 'pessoas', id: 'Ana/B' });
});

test('sync: primeiro aparelho sobe tudo; segundo (com os mesmos dados iniciais) recebe sem sobrescrever o grupo', () => {
  const grupo = grupoFake();
  const a = aparelho(mini());
  puxar(a, grupo); // 1ª conexão de A: grupo vazio, sobe tudo
  assert.equal(grupo.size, 4); // frente + evento + tarefa + pessoa Ana
  // A edita o local do ato
  a.estado.eventos[0].local = 'Praia Mole (estacionamento)';
  empurrar(a, grupo);
  // B abre pela 1ª vez com os dados iniciais ORIGINAIS (local antigo) e entra no grupo
  const b = aparelho(mini());
  puxar(b, grupo);
  assert.equal(b.estado.eventos[0].local, 'Praia Mole (estacionamento)'); // o grupo vence
  assert.equal(JSON.parse(grupo.get('eventos/e1').json).local, 'Praia Mole (estacionamento)'); // e não foi sobrescrito
});

test('sync: edição de um aparece no outro; itens diferentes não se atrapalham', () => {
  const grupo = grupoFake();
  const a = aparelho(mini()); puxar(a, grupo);
  const b = aparelho(mini()); puxar(b, grupo);
  a.estado.eventos[0].titulo = 'Ato na Praia Mole';            // A mexe no evento
  b.estado.encaminhamentos[0].status = 'feito';                  // B mexe na tarefa, ao mesmo tempo
  empurrar(a, grupo); empurrar(b, grupo);
  puxar(a, grupo, new Set(grupo.keys())); puxar(b, grupo, new Set(grupo.keys()));
  for (const d of [a, b]) {
    assert.equal(d.estado.eventos[0].titulo, 'Ato na Praia Mole');
    assert.equal(d.estado.encaminhamentos[0].status, 'feito');
  }
});

test('sync: novo item criado por um aparece no outro; apagar também (e não ressuscita)', () => {
  const grupo = grupoFake();
  const a = aparelho(mini()); puxar(a, grupo);
  const b = aparelho(mini()); puxar(b, grupo);
  a.estado.ideias.push(normalizar({ eventos: [], ideias: [{ id: 'i1', titulo: 'APA' }] }).ideias[0]);
  empurrar(a, grupo); puxar(b, grupo, new Set(grupo.keys()));
  assert.deepEqual(b.estado.ideias.map((i) => i.id), ['i1']);
  // B apaga a reunião; A recebe e a reunião some lá também
  b.estado.eventos = [];
  empurrar(b, grupo);
  assert.deepEqual(grupo.get('eventos/e1'), { apagado: true });
  puxar(a, grupo, new Set(grupo.keys()));
  assert.equal(a.estado.eventos.length, 0);
  // um aparelho novo, que ainda tem o evento nos dados iniciais, NÃO traz a reunião de volta
  const c = aparelho(mini()); puxar(c, grupo);
  assert.equal(c.estado.eventos.length, 0);
  assert.deepEqual(grupo.get('eventos/e1'), { apagado: true });
});

test('sync: conflito no MESMO item — o último a salvar vence, e todos terminam iguais', () => {
  const grupo = grupoFake();
  const a = aparelho(mini()); puxar(a, grupo);
  const b = aparelho(mini()); puxar(b, grupo);
  a.estado.eventos[0].local = 'Lagoa';
  b.estado.eventos[0].local = 'Praia Mole II';
  empurrar(a, grupo);            // A salva primeiro
  puxar(b, grupo, new Set(grupo.keys())); // B recebe antes de salvar: o grupo vence (versão de A)
  assert.equal(b.estado.eventos[0].local, 'Lagoa');
  // agora B edita de novo, já em cima da versão certa, e salva por último
  b.estado.eventos[0].local = 'Praia Mole II'; empurrar(b, grupo);
  puxar(a, grupo, new Set(grupo.keys()));
  assert.equal(a.estado.eventos[0].local, 'Praia Mole II');
  assert.equal(b.estado.eventos[0].local, 'Praia Mole II');
});

test('sync: edição feita sem internet é enviada na volta, se o grupo não mexeu naquele item', () => {
  const grupo = grupoFake();
  const a = aparelho(mini()); puxar(a, grupo);
  const b = aparelho(mini()); puxar(b, grupo);
  // A fica offline e edita o evento; enquanto isso B edita OUTRO item
  a.estado.eventos[0].hora = '08:30';
  b.estado.encaminhamentos[0].status = 'fazendo'; empurrar(b, grupo);
  // A volta: 1ª "olhada" no grupo inteiro (como no início da conexão)
  puxar(a, grupo);
  assert.equal(JSON.parse(grupo.get('eventos/e1').json).hora, '08:30');      // edição offline chegou ao grupo
  assert.equal(a.estado.encaminhamentos[0].status, 'fazendo');                // e A recebeu a de B
});

test('sync: ao entrar no grupo, o que a pessoa editou ANTES (em relação à lista inicial) não é sobrescrito', () => {
  const inicial = mini();
  const baseSeed = baseInicial(inicial);
  const grupo = grupoFake();
  puxar(aparelho(copia(inicial)), grupo); // grupo criado a partir da lista inicial (como o do movimento)

  // Ana editou o evento e criou uma tarefa sem estar no grupo; agora entra
  const ana = aparelho(copia(inicial)); ana.base = new Map(baseSeed);
  ana.estado.eventos[0].local = 'Lagoa (editado antes de entrar)';
  ana.estado.encaminhamentos.push(normalizar({ eventos: [], encaminhamentos: [{ id: 'nova', texto: 'Minha tarefa' }] }).encaminhamentos[0]);
  puxar(ana, grupo);
  assert.equal(JSON.parse(grupo.get('eventos/e1').json).local, 'Lagoa (editado antes de entrar)'); // a edição dela subiu
  assert.ok(grupo.has('encaminhamentos/nova'));                                                         // e a tarefa nova também

  // Bia entra sem ter editado nada: recebe o que a Ana fez
  const bia = aparelho(copia(inicial)); bia.base = new Map(baseSeed);
  puxar(bia, grupo);
  assert.equal(bia.estado.eventos[0].local, 'Lagoa (editado antes de entrar)');
  assert.ok(bia.estado.encaminhamentos.some((t) => t.id === 'nova'));

  // Carla também editou o MESMO item antes de entrar, mas o grupo já tem a versão da Ana: o grupo vence (sem apagar o do grupo)
  const carla = aparelho(copia(inicial)); carla.base = new Map(baseSeed);
  carla.estado.eventos[0].local = 'Outro lugar';
  puxar(carla, grupo);
  assert.equal(carla.estado.eventos[0].local, 'Lagoa (editado antes de entrar)');
  assert.equal(JSON.parse(grupo.get('eventos/e1').json).local, 'Lagoa (editado antes de entrar)');
});

test('sync: aplicar do grupo ignora lixo e coleções desconhecidas', () => {
  const e = mini();
  aplicarMudancas(e, [{ k: 'estranha/x', json: '{}' }, { k: 'eventos/zz', json: 'não é json' }, { k: 'eventos/ee', json: '"texto"' }, { k: 'pessoas/Zé', json: '{"nome":"Zé"}' }]);
  assert.equal(e.eventos.length, 1);
  assert.ok(e.pessoas.includes('Zé'));
  aplicarMudancas(e, [{ k: 'pessoas/Zé', json: null }]);
  assert.ok(!e.pessoas.includes('Zé'));
});

test('sync: store avisa gravações (inclusive silenciosas) e aplica remoto sem disparar o envio', () => {
  const mem = new Map();
  const st = criarStore({ getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) });
  let grav = 0; let ui = 0;
  st.assinarGravacao(() => grav++); st.assinar(() => ui++);
  st.atualizar((e) => e.pessoas.push('Ana'), { silencioso: true });
  assert.deepEqual([grav, ui], [1, 0]);   // digitação: grava e sincroniza, sem redesenhar
  st.atualizar((e) => e.pessoas.push('Bia'));
  assert.deepEqual([grav, ui], [2, 1]);
  st.aplicarRemoto((e) => e.pessoas.push('Caio'));
  assert.deepEqual([grav, ui], [2, 2]);   // veio do grupo: redesenha, mas não manda de volta
  assert.ok(st.estado.pessoas.includes('Caio'));
});

test('segurança: o código do grupo NUNCA fica escrito no repositório (grupo-padrao.js vazio) e não aparece em nenhum arquivo', () => {
  const g = readFileSync(join(raiz, 'js/grupo-padrao.js'), 'utf8');
  assert.match(g, /export const GRUPO_PADRAO = '';/);
  // nenhum "código de grupo" (20+ letras/números) colado em arquivos de código
  for (const f of ['js/main.js', 'js/sync.js', 'js/firebase-config.js', 'data/inicial.json', 'README.md', 'SINCRONIZACAO.md', 'PUBLICAR-FIREBASE.md', 'CLAUDE.md']) {
    const t = readFileSync(join(raiz, f), 'utf8');
    assert.ok(!/[?&]g=[a-z0-9]{16,}/i.test(t), `${f} tem um link de convite com código`);
  }
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
