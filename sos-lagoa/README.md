# SOS Lagoa — organização do movimento

App instalável (PWA) para o **SOS Lagoa**: calendário de luta, reuniões (pauta, presença, registro) e
**encaminhamentos** (o quê, quem, até quando), organizados por **frentes**. Sem build, sem servidor:
HTML/CSS/JS puro. Cores tiradas da logo (azul-noite, sol vermelho, verde-água, dourado).

Abrir localmente: `python3 -m http.server` na raiz do repositório e acessar `/sos-lagoa/`.

## Como funciona
- **Reunião** → pauta, quem veio, registro e encaminhamentos. Botão **Enviar no WhatsApp** monta o resumo pronto.
- **Encaminhamentos** → quadro (A fazer / Fazendo / Feito) ou “Quem faz o quê”; atrasados e sem responsável ficam em destaque.
- **Calendário** → mês/lista, filtro por frente, “Pôr no meu calendário” (.ics).
- **Frentes** → nome, cor, descrição e quem puxa. As cinco iniciais são **sugestões genéricas**; edite à vontade.

## Dados
Ficam em `localStorage` **de cada aparelho** (não há banco compartilhado ainda). O compartilhamento hoje é por
texto de WhatsApp e backup `.json` (Ajustes → Baixar/Restaurar). Para todo mundo ver os mesmos dados em tempo real
é preciso um banco (ex.: Supabase) — todo acesso a dados passa por `js/store.js`, então dá para plugar sem mexer nas telas.

## Ao publicar uma mudança
Suba **juntos** `versao` em `js/config.js` e `VERSAO` em `sw.js`; arquivo novo vai na lista `ARQUIVOS` do `sw.js`.
`npm test` confere isso e a lógica (datas, prazos, textos de WhatsApp, .ics, importação).
