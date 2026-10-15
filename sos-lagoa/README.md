# Plataforma SOS Lagoa

Plataforma do movimento popular **SOS Lagoa** (em defesa da Lagoa da Conceição): calendário de luta, reuniões
(pauta, presença, registro), **encaminhamentos** (o quê, quem, até quando), **ideias** e **GTs**.
Site estático instalável (PWA): HTML/CSS/JS puro, sem build e sem servidor. Cores tiradas da logo do movimento.

Testar no computador: `python3 -m http.server` nesta pasta e abrir <http://localhost:8000/>.
Publicado em https://sos-lagoa.web.app (Firebase Hosting; roteiro em `PUBLICAR-FIREBASE.md`). Outras opções: `PUBLICAR.md`.

## Como funciona
- **Reunião** → pauta, quem veio, registro e encaminhamentos. **Enviar no WhatsApp** monta o resumo pronto.
- **Encaminhamentos** → quadro (A fazer / Fazendo / Feito) ou “Quem faz o quê”; atrasados e sem responsável em destaque.
- **Ideias** → o que surgiu nas reuniões e ainda não virou ação; dá para marcar quem quer puxar e transformar em
  encaminhamento ou em data no calendário.
- **Calendário** → mês/lista, filtro por GT, “Pôr no meu calendário” (.ics). Datas **a confirmar** aparecem tracejadas; **⭐ destaque** marca datas especiais.
- **Frentes** → os GTs (Comunicação, Técnico, Cultura, Mobilização). Nome, cor, descrição e quem puxa são editáveis.
- Tudo tem o ícone de lápis para editar direto, sem abrir outra tela.

## Grupo em tempo real
Veja `SINCRONIZACAO.md`: todo mundo do grupo vê e edita os mesmos dados ao vivo (Firestore), por link de convite com um código secreto.

## Dados
- `data/inicial.json` carrega **uma vez**, na primeira abertura em cada aparelho (reuniões e datas já combinadas).
  Editar o arquivo só afeta aparelhos novos. Se o site for público, esse arquivo também é.
- Sem grupo, os dados ficam em `localStorage` **de cada aparelho** (compartilhar = texto de WhatsApp ou backup `.json`).
  Entrando no grupo, o mesmo conteúdo sincroniza entre todos (`js/sync.js`).

## Ao publicar uma mudança
Suba **juntos** `versao` em `js/config.js` e `VERSAO` em `sw.js` (formato `AAAA-MM-DD.N`); arquivo novo vai na lista
`ARQUIVOS` do `sw.js`. `npm test` confere isso e a lógica (datas, prazos, textos de WhatsApp, .ics, importação).
