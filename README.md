# Mapa cultural vivo — Cartografia Líquen

Mapa colaborativo e gratuito de lugares, coletivos e eventos culturais: **capoeira, ateliês, artes visuais,
festas, rap/hip-hop, samba, movimentos sociais, cultura popular, teatro, música, foto/cinema, espaços e memória**.
Qualquer pessoa sugere pontos e eventos; a curadoria confere antes de publicar.
Território-piloto: **Lagoa da Conceição**, expandindo para toda a Ilha e a Grande Florianópolis.

Sem build, sem framework: HTML + CSS + JavaScript (módulos ES) + [Leaflet](https://leafletjs.com) (já incluído em `vendor/`).
Funciona em qualquer hospedagem estática.

## O que o mapa faz

| Para quem quer saber o que acontece | Para quem faz a cultura |
|---|---|
| **Acontece hoje**: o que está em andamento e o que vem hoje | **Colaborar**: cadastre lugar ou evento em 2 minutos |
| **Agenda** por período (hoje, amanhã, fim de semana, 7/30 dias) e “só grátis” | Eventos com **data, horário e repetição** (semanal, quinzenal, mensal) |
| Filtro por categoria + busca | Foto reduzida no próprio aparelho + **descrição da imagem** (acessibilidade) |
| **Perto de mim** (geolocalização) | **Sugerir correção / “este espaço é seu?”** em cada ficha |
| Salvar no calendário (`.ics`) e compartilhar o evento (WhatsApp) | Link direto para cada ficha (`#/ponto/ID`) e para o formulário (`#/colaborar`) — ótimo para QR code |
| **Rede de líquen**: liga os pontos entre si | Contato privado visível **só** para a curadoria |
| Modo dia/noite, instalável no celular (PWA) | Licença aberta (CC BY-SA 4.0, configurável) |

## Rodar no seu computador

```bash
npm test                      # testes da lógica de agenda/recorrência (Node 20+)
python3 -m http.server 8000   # ou: npx serve .
# abra http://localhost:8000
```

Sem banco configurado, o site roda em **modo demonstração**: usa `data/seed.json` e os envios ficam só no navegador de quem
enviou, com botão para mandar à curadoria por WhatsApp/e-mail.

### Dados do `data/seed.json`
São **lugares e eventos reais pesquisados em 06/10/2026**, cada evento com link da `fonte`. Itens com `"confirmar"` têm
dia/horário vindos de reportagens antigas (rodas e batalhas recorrentes) e aparecem com o aviso *“confirme antes de ir”*.
Eventos recorrentes **não são verificados semana a semana**: peça aos coletivos que confirmem a própria agenda.
Para criar dados de teste, use `"exemplo": true` (aparecem com o selo “exemplo”).
Tipos de repetição: `nao`, `diaria`, `dias_uteis`, `semanal`, `quinzenal`, `mensal` (mesmo dia), `mensal_semana` (ex.: 1º sábado).
Evento sem `inicio` é tratado como “dia todo”.

## Colocar no ar com colaboração de verdade (≈ 15 min, grátis)

### 1. Banco de dados (Supabase)
1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. **SQL Editor → New query**: cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e rode.
3. **Project Settings → API**: copie a *Project URL* e a chave **anon / public**.
4. Cole em `js/config.js`:
   ```js
   supabaseUrl: 'https://xxxx.supabase.co',
   supabaseAnonKey: 'eyJ...',   // a chave anon é pública por desenho; a segurança vem das regras (RLS) do schema.sql
   ```

A chave **anon** só consegue: *ler* itens `aprovado` (sem `contato_privado`) e *inserir* itens `pendente`. Nada além disso.

> **Plano gratuito do Supabase:** o projeto é **pausado após ~1 semana sem uso** (os dados ficam guardados, mas o site para de
> receber e mostrar colaborações até alguém reativar no painel). O workflow `.github/workflows/manter-banco-ativo.yml` faz uma
> consulta leve duas vezes por semana para evitar isso. O GitHub desativa agendamentos de repositórios **sem nenhuma atividade
> por 60 dias**: se isso acontecer, reative em Actions. Para dispensar tudo isso, o plano pago do Supabase (Pro) não pausa.
> Limites do plano gratuito: 500 MB de banco, 5 GB de tráfego por mês.

### 2. Site (GitHub Pages)
Envie o repositório ao GitHub, em **Settings → Pages → Source: GitHub Actions**. O workflow `.github/workflows/pages.yml`
roda os testes e publica a cada push em `main`. Domínio próprio: Settings → Pages → Custom domain.

### 3. Curadoria (aprovar o que chega)
**Supabase → Table Editor → `pontos` / `eventos`** → filtre `status = pendente`, confira os dados e o contato privado,
troque `status` para **`aprovado`** (ou `rejeitado`). Aparece no mapa na próxima visita de qualquer pessoa.
Correções e pedidos de “este espaço é meu” caem na tabela `sugestoes`.
Para cadastrar vários pontos de uma vez: *Table Editor → Insert → Import data from CSV* (use `status = aprovado`).

### 4. Personalizar (`js/config.js`)
Nome, contatos da curadoria (WhatsApp/e-mail para o modo demo), limites e centro do mapa, território-piloto,
licença e créditos do edital (`mostrarCreditosEdital: true` só depois de contemplado).
Categorias e cores: `js/categorias.js` (basta adicionar um item).

## Fotos e vídeos

**Fotos** (ex.: ensaio fotográfico do projeto):
1. Rode `python3 tools/otimizar_foto.py caminho/foto.jpg nome-do-lugar` (precisa de `pip install pillow`). O script corrige a
   rotação, **apaga os metadados (inclusive GPS)** e gera `fotos/nome-do-lugar.jpg` (ficha) e `fotos/nome-do-lugar-mini.jpg` (lista).
2. No `data/seed.json` (ou na tabela `pontos`), preencha no lugar: `foto`, `foto_mini`, `foto_alt` (**descrição da imagem**, obrigatória
   para acessibilidade) e `foto_credito` (aparece sobre a imagem: “Foto: Nome”).
3. Só publique imagens de pessoas com **autorização de uso de imagem** (Anexo da proposta) e com o crédito de quem fotografou.

**Vídeos:** publique no YouTube ou Vimeo e cole o link em `video` (mais `video_titulo` e `video_credito`). Ele só carrega quando a
pessoa clica (sem cookies de terceiros antes disso). Prefira vídeos **legendados** (a proposta exige). Também funciona arquivo
`.mp4` hospedado no site (`"video": "videos/roda.mp4"`) com legenda `.vtt` em `video_legenda`; mantenha os arquivos pequenos.
Quem colabora pelo formulário também pode enviar foto (com descrição e crédito) e link de vídeo.

## Fazer as pessoas usarem de fato

- **Cartaz pronto para imprimir** em `divulgacao/cartaz-colaborar-A4.pdf` (com QR code do formulário). Os QR codes em SVG (`qr-colaborar.svg`, `qr-mapa.svg`) apontam para `https://kauepisauro.github.io/mapa-cultura/`; se você usar domínio próprio, gere outros e refaça o cartaz.
- Peça a cada coletivo mapeado para **cadastrar a própria agenda** (eventos recorrentes cobrem a rotina inteira com um cadastro).
- O botão de compartilhar em cada evento já gera a mensagem pronta para WhatsApp — o mapa vira o jeito mais fácil de divulgar.
- Poste o “Acontece hoje” nas redes; `#/agenda` abre direto na agenda.
- Ao mapear, **peça a anuência** do coletivo (modelo do Anexo XI): o formulário já traz a caixa de autorização.

## Estrutura

```
index.html            página única
css/style.css         identidade visual (zine/risografia)
js/config.js          ← configuração
js/categorias.js      categorias, cores e ícones
js/store.js           dados: Supabase (REST) ou seed; envios e pendentes
js/eventos.js         recorrência, status “rolando agora”, janelas de tempo
js/utils.js           datas, links, .ics
js/mapa.js            Leaflet: pinos, clusters, rede de líquen, território-piloto
js/painel.js          HTML de cards, agenda e ficha
js/contribuir.js      formulários de colaboração
js/main.js            estado, filtros, rotas, bottom-sheet
supabase/schema.sql   tabelas + regras de segurança
data/seed.json        dados de demonstração
tests/run.mjs         testes (node --test)
```

## Créditos técnicos e licenças

- Mapas: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), tiles padrão do OpenStreetMap
  (gratuito, sem chave; veja a [política de uso](https://operations.osmfoundation.org/policies/tiles/)). Para tráfego alto,
  troque `CONFIG.tiles` por um provedor com chave (MapTiler, Stadia) ou hospede seus tiles.
- Leaflet (BSD-2) e Leaflet.markercluster (MIT) em `vendor/`. Fontes: Fraunces e Hanken Grotesk (Google Fonts, OFL).
- Busca de endereço: Nominatim (OpenStreetMap), apenas por ação da pessoa usuária.
- Conteúdo colaborativo: licença configurada em `CONFIG.licenca`.
