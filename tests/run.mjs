import test from 'node:test';
import assert from 'node:assert/strict';
import { addDias, addMeses, toISO, fromISO, rotuloDia, hora, linkWhatsapp, linkInstagram, gerarICS, norm, distanciaKm, recorrenciaTexto } from '../js/utils.js';
import { expandir, statusOcorrencia, janela, ehGratis } from '../js/eventos.js';

test('datas: soma de dias atravessa mês/ano e DST', () => {
  assert.equal(addDias('2026-12-30', 3), '2027-01-02');
  assert.equal(addDias('2026-10-18', 1), '2026-10-19');
  assert.equal(addDias('2026-02-28', 1), '2026-03-01');
  assert.equal(addMeses('2026-01-31', 1, 31), '2026-02-28');
  assert.equal(addMeses('2026-01-31', 2, 31), '2026-03-31');
});

test('rótulos e formatos', () => {
  assert.equal(rotuloDia('2026-10-06', '2026-10-06'), 'Hoje');
  assert.equal(rotuloDia('2026-10-07', '2026-10-06'), 'Amanhã');
  assert.equal(rotuloDia('2026-10-09', '2026-10-06'), 'Sexta');
  assert.equal(hora('19:00'), '19h');
  assert.equal(hora('21:30'), '21h30');
  assert.equal(norm('Ateliê Ação'), 'atelie acao');
});

test('links', () => {
  assert.equal(linkWhatsapp('(48) 99999-1234'), 'https://wa.me/5548999991234');
  assert.equal(linkWhatsapp('+55 48 99999-1234'), 'https://wa.me/5548999991234');
  assert.equal(linkWhatsapp('123'), '');
  assert.equal(linkInstagram('@arredaboi'), 'https://instagram.com/arredaboi');
});

test('expandir: evento único', () => {
  const evs = [{ id: 'a', data: '2026-10-10', inicio: '19:00' }];
  assert.equal(expandir(evs, '2026-10-06', '2026-10-12').length, 1);
  assert.equal(expandir(evs, '2026-10-11', '2026-10-12').length, 0);
});

test('expandir: semanal gera todas as ocorrências e respeita repete_ate', () => {
  const ev = { id: 'r', data: '2026-09-03', inicio: '18:00', repete: 'semanal' }; // quinta
  const out = expandir([ev], '2026-10-06', '2026-10-31');
  assert.deepEqual(out.map((o) => o.data), ['2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29']);
  assert.equal(out[0].key, 'r@2026-10-08');
  const ate = expandir([{ ...ev, repete_ate: '2026-10-15' }], '2026-10-06', '2026-10-31');
  assert.deepEqual(ate.map((o) => o.data), ['2026-10-08', '2026-10-15']);
});

test('expandir: quinzenal e mensal', () => {
  const q = expandir([{ id: 'q', data: '2026-10-01', repete: 'quinzenal' }], '2026-10-06', '2026-11-30');
  assert.deepEqual(q.map((o) => o.data), ['2026-10-15', '2026-10-29', '2026-11-12', '2026-11-26']);
  const m = expandir([{ id: 'm', data: '2026-08-31', repete: 'mensal' }], '2026-10-01', '2026-12-31');
  assert.deepEqual(m.map((o) => o.data), ['2026-10-31', '2026-11-30', '2026-12-31']);
});

test('expandir: ordena por data e hora e ignora sem data', () => {
  const out = expandir([
    { id: '1', data: '2026-10-07', inicio: '21:00' },
    { id: '2', data: '2026-10-07', inicio: '09:00' },
    { id: '3' },
  ], '2026-10-06', '2026-10-08');
  assert.deepEqual(out.map((o) => o.id), ['2', '1']);
});

test('status da ocorrência', () => {
  const agora = new Date(2026, 9, 6, 20, 0); // 06/10 20:00
  const oc = (data, inicio, fim) => ({ data, inicio, fim });
  assert.equal(statusOcorrencia(oc('2026-10-06', '19:00', '21:00'), agora), 'agora');
  assert.equal(statusOcorrencia(oc('2026-10-06', '21:30', '23:00'), agora), 'depois');
  assert.equal(statusOcorrencia(oc('2026-10-06', '10:00', '12:00'), agora), 'encerrado');
  assert.equal(statusOcorrencia(oc('2026-10-07', '10:00'), agora), 'futuro');
  // vira a noite: começou ontem 22h, termina 04h; agora 01:00
  const madrugada = new Date(2026, 9, 6, 1, 0);
  assert.equal(statusOcorrencia(oc('2026-10-05', '22:00', '04:00'), madrugada), 'agora');
  assert.equal(statusOcorrencia(oc('2026-10-05', '22:00', '04:00'), agora), 'encerrado');
  // sem fim: assume 2h
  assert.equal(statusOcorrencia(oc('2026-10-06', '19:00'), agora), 'agora');
});

test('janelas', () => {
  // 06/10/2026 é terça
  assert.deepEqual(janela('hoje', '2026-10-06'), ['2026-10-06', '2026-10-06']);
  assert.deepEqual(janela('fds', '2026-10-06'), ['2026-10-09', '2026-10-11']);
  assert.deepEqual(janela('fds', '2026-10-09'), ['2026-10-09', '2026-10-11']); // sexta
  assert.deepEqual(janela('fds', '2026-10-10'), ['2026-10-10', '2026-10-11']); // sábado
  assert.deepEqual(janela('fds', '2026-10-11'), ['2026-10-11', '2026-10-11']); // domingo
  assert.deepEqual(janela('7d', '2026-10-06'), ['2026-10-06', '2026-10-12']);
});

test('grátis', () => {
  assert.ok(ehGratis({}));
  assert.ok(ehGratis({ preco: 'Grátis' }));
  assert.ok(ehGratis({ preco: 'gratuito' }));
  assert.ok(!ehGratis({ preco: 'R$ 20' }));
});

test('ICS: campos, escape, virada de noite e recorrência', () => {
  const ics = gerarICS({ key: 'x@2026-10-09', titulo: 'Roda; de, samba', data: '2026-10-09', inicio: '22:00', fim: '02:00', repete: 'semanal' }, { local: 'Centro, Florianópolis' });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART:20261009T220000/);
  assert.match(ics, /DTEND:20261010T020000/);
  assert.match(ics, /SUMMARY:Roda\; de\\, samba/);
  assert.match(ics, /RRULE:FREQ=WEEKLY/);
  assert.match(ics, /\r\n/);
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75));
});

test('geo e recorrência em texto', () => {
  const d = distanciaKm({ lat: -27.6, lng: -48.5 }, { lat: -27.6, lng: -48.4 });
  assert.ok(d > 9 && d < 10.5);
  assert.equal(recorrenciaTexto({ data: '2026-10-08', repete: 'semanal' }), 'Toda quinta');
  assert.equal(recorrenciaTexto({ data: '2026-10-10', repete: 'semanal' }), 'Todo sábado');
  assert.equal(recorrenciaTexto({ data: '2026-10-10' }), '');
});
