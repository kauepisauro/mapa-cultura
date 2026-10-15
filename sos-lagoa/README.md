# Plataforma SOS Lagoa

Plataforma do movimento popular **SOS Lagoa** (em defesa da Lagoa da Conceição): calendário de luta, reuniões
(pauta, presença, registro), **encaminhamentos** (o quê, quem, até quando), **ideias** e **GTs**.
Site estático instalável (PWA): HTML/CSS/JS puro, sem build e sem servidor. Cores tiradas da logo do movimento.

Testar no computador: `python3 -m http.server` nesta pasta e abrir <http://localhost:8000/>.
Publicar: veja `PUBLICAR.md`.

## Como funciona
- **Reunião** → pauta, quem veio, registro e encaminhamentos. **Enviar no WhatsApp** monta o resumo pronto.
- **Encaminhamentos** → quadro (A fazer / Fazendo / Feito) ou “Quem faz o quê”; atrasados e sem responsável em destaque.
- **Ideias** → o que surgiu nas reuniões e ainda não virou ação; dá para marcar quem quer puxar e transformar em
  encaminhamento ou em data no calendário.
- **Calendário** → mês/lista, filtro por GT, “Pôr no meu calendário” (.ics). Datas **a confirmar** aparecem tracejadas; **⭐ destaque** marca datas especiais.
- **Frentes** → os GTs (Comunicação, Técnico, Cultura, Mobilização). Nome, cor, descrição e quem puxa são editáveis.
- Tudo tem o ícone de lápis para editar direto, sem abrir outra tela.

## Dados
- `data/inicial.json` carrega **uma vez**, na primeira abertura em cada aparelho (reuniões e datas já combinadas).
  Editar o arquivo só afeta aparelhos novos. Se o site for público, esse arquivo também é.
- Depois disso os dados ficam em `localStorage` **de cada aparelho** (não há banco compartilhado ainda). O compartilhamento
  hoje é pelo texto de WhatsApp e pelo backup `.json` (Ajustes → Baixar/Restaurar).
- Para todo mundo ver o mesmo em tempo real é preciso um banco online (um projeto novo e separado, em qualquer serviço gratuito).
  Todo acesso a dados passa por `js/store.js`, então dá para plugar sem mexer nas telas.

## Ao publicar uma mudança
Suba **juntos** `versao` em `js/config.js` e `VERSAO` em `sw.js` (formato `AAAA-MM-DD.N`); arquivo novo vai na lista
`ARQUIVOS` do `sw.js`. `npm test` confere isso e a lógica (datas, prazos, textos de WhatsApp, .ics, importação).
