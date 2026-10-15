# SOS Lagoa — organização do movimento

App instalável (PWA) para o **SOS Lagoa**: calendário de luta, reuniões (pauta, presença, registro) e
**encaminhamentos** (o quê, quem, até quando), organizados por **frentes**. Sem build, sem servidor:
HTML/CSS/JS puro. Cores tiradas da logo (azul-noite, sol vermelho, verde-água, dourado).

Abrir localmente: `python3 -m http.server` na raiz do repositório e acessar `/sos-lagoa/`.

## Como funciona
- **Reunião** → pauta, quem veio, registro e encaminhamentos. Botão **Enviar no WhatsApp** monta o resumo pronto.
- **Encaminhamentos** → quadro (A fazer / Fazendo / Feito) ou “Quem faz o quê”; atrasados e sem responsável ficam em destaque.
- **Calendário** → mês/lista, filtro por frente, “Pôr no meu calendário” (.ics).
- **Ideias** → possibilidades que surgiram nas reuniões (“e se…”). Dá para marcar quem quer puxar e transformar em encaminhamento ou data no calendário.
- **Datas “a confirmar” e ⭐ destaque** → possibilidades aparecem no calendário com marcação tracejada; datas especiais ganham estrela.
- **Frentes** → nome, cor, descrição e quem puxa. As cinco iniciais são **sugestões genéricas**; edite à vontade.

## Dados iniciais
`data/inicial.json` é carregado **uma vez**, na primeira abertura em cada aparelho (e entra no cache offline). É onde ficam as reuniões/datas já combinadas.
Editar esse arquivo só afeta aparelhos novos; quem já abriu o app mantém os próprios dados. Atenção: se o repositório/site for público, esse arquivo também é.

## Dados
Ficam em `localStorage` **de cada aparelho** (não há banco compartilhado ainda). O compartilhamento hoje é por
texto de WhatsApp e backup `.json` (Ajustes → Baixar/Restaurar). Para todo mundo ver os mesmos dados em tempo real
é preciso um banco (ex.: Supabase) — todo acesso a dados passa por `js/store.js`, então dá para plugar sem mexer nas telas.

## Ao publicar uma mudança
Suba **juntos** `versao` em `js/config.js` e `VERSAO` em `sw.js`; arquivo novo vai na lista `ARQUIVOS` do `sw.js`.
`npm test` confere isso e a lógica (datas, prazos, textos de WhatsApp, .ics, importação).
