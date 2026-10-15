# Mapa Vivo Florianópolis — Cartografia Líquen (guia para editar)

Site estático (HTML/CSS/JS, sem build) + app instalável (PWA), publicado no GitHub Pages pela branch
`claude/great-albattani-kxi1un` (workflow `.github/workflows/pages.yml`). Todo push publica.

## A cada mudança publicada
1. Suba **juntos** `versao` em `js/config.js` e `VERSAO` em `sw.js` (formato `AAAA-MM-DD.N`). Sem isso, quem tem o
   app instalado não recebe a atualização. `npm test` falha se ficarem diferentes ou se faltar arquivo do app.
2. Rode `npm test` (lógica de agenda/recorrência/ICS/vídeo) e confira no navegador (`python3 -m http.server`).
3. Novo arquivo JS/CSS que o app precisa offline → acrescente na lista `ARQUIVOS` do `sw.js`.

## Dados (`data/seed.json`)
- Só lugares/eventos **reais, com `fonte`** (link). Nada inventado; exemplos de teste usam `"exemplo": true`.
- Dia/horário incompleto ou de fonte antiga → campo `confirmar` com o motivo (aparece “confirme antes de ir”).
- Coordenadas incertas → `"aprox": true`.
- Repetições: `nao`, `diaria`, `dias_uteis`, `dias_semana` (+ `dias_semana: [0..6]`), `semanal`, `quinzenal`,
  `mensal`, `mensal_semana`. Sem `inicio` = dia todo. Exposições de vários dias aparecem em “Em cartaz”.
- Pode podar eventos que já passaram.
- **Neutralidade:** não incluir atos de campanha eleitoral/partidária (projeto cultural público, possível verba de edital). Atos de movimentos sociais não partidários entram, com fonte.

## Tom e estética (decisões do autor)
- Nome: **“Mapa Vivo Florianópolis”** (cabeçalho: “Mapa Vivo” + “Florianópolis”). “Cartografia Líquen” é a realizadora, citada em Sobre → Contato e no rodapé. Recorte: Grande Florianópolis; piloto: Lagoa.
- Texto sóbrio: nada de gírias “descoladas” (“rolê”, “rola hoje”, “galera”) nem emojis em avisos. Usar “Acontece hoje”, “eventos”.
- Estética “herbário de líquens”: papel osso, nanquim fino, rótulos em mono (DM Mono), títulos em serifa
  (Instrument Serif — o autor ainda pode trocar a fonte), cores de líquen. Nada infantil/“adesivo”.
- Mapa-base vetorial (OpenFreeMap) com estilo próprio em `js/estilo-mapa.js`: sem ícones (picos/“triângulos”, comércios).
  Plano B automático para raster OSM (`CONFIG.tiles`). O território-piloto não aparece no mapa (`territorioPiloto: null`).
- O mapa não vende nem faz propaganda pessoal; divulgação vai pelo Instagram @zona.liquen.

## Pendências conhecidas
- Banco de colaborações: Supabase (`supabase/schema.sql`, keep-alive em `manter-banco-ativo.yml`) ou alternativa
  sem pausa (planilha Google) — decisão do autor. Sem banco, roda em modo demonstração.
- Fotos (tools/otimizar_foto.py, crédito + descrição obrigatórios, autorização de imagem) e vídeos (YouTube/Vimeo).
- Domínio próprio (refazer QR codes e cartaz em `divulgacao/` se mudar o endereço).

## SOS Lagoa (`sos-lagoa/`)
App separado do Mapa Vivo (organização de reuniões/encaminhamentos do movimento SOS Lagoa). Tem `sw.js`, `versao` e testes próprios —
siga `sos-lagoa/README.md`. Não misturar com `js/`/`sw.js` da raiz. Cores e identidade vêm da logo do movimento, não da estética “herbário”.
