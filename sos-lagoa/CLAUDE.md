# Plataforma SOS Lagoa (guia para editar)

Site estático (HTML/CSS/JS, sem build) + app instalável (PWA) do movimento SOS Lagoa. Projeto **independente**:
não compartilha código, dados, banco, conta nem repositório com nenhum outro projeto.

## A cada mudança publicada
1. Suba **juntos** `versao` em `js/config.js` e `VERSAO` em `sw.js` (`AAAA-MM-DD.N`). Sem isso quem tem o app instalado não atualiza.
2. Rode `npm test` e confira no navegador (`python3 -m http.server`).
3. Arquivo novo que o app precisa offline → acrescente em `ARQUIVOS` no `sw.js`.

## Dados
- `data/inicial.json` carrega uma vez por aparelho. É público: só o que o movimento aceita divulgar. Nada inventado:
  dúvida vira “a confirmar” (`aConfirmar`), não data firme.
- Não incluir atos de campanha eleitoral/partidária.

## Identidade
- Nome: **Plataforma SOS Lagoa**. Cores da logo (azul-noite, sol vermelho, verde-água, dourado). Texto sóbrio, em português.
- Termos: “GT” = grupo de trabalho (Comunicação, Técnico, Cultura, Mobilização); no código/telas ainda se chama “frente”.
