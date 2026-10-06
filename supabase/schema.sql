-- ═══════════════════════════════════════════════════════════════════
--  Cartografia Líquen — banco de dados (Supabase / PostgreSQL)
--  Cole este arquivo inteiro em: Supabase → SQL Editor → Run
--
--  Como funciona a curadoria:
--   • Qualquer pessoa (chave "anon") pode ENVIAR, e o envio entra como 'pendente'.
--   • O público só LÊ itens com status = 'aprovado'.
--   • Você (curadoria) aprova no Table Editor trocando status para 'aprovado'.
--   • contato_privado nunca é legível pelo público (só por você, no painel).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.pontos (
  id              text primary key default gen_random_uuid()::text,
  criado_em       timestamptz not null default now(),
  status          text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  nome            text not null check (char_length(nome) between 2 and 120),
  categoria       text not null check (char_length(categoria) between 2 and 30),
  descricao       text check (char_length(descricao) <= 1500),
  lat             double precision not null check (lat between -29 and -26),
  lng             double precision not null check (lng between -50 and -47),
  aprox           boolean not null default false,
  bairro          text check (char_length(bairro) <= 80),
  endereco        text check (char_length(endereco) <= 200),
  horario         text check (char_length(horario) <= 200),
  instagram       text check (char_length(instagram) <= 200),
  whatsapp        text check (char_length(whatsapp) <= 30),
  site            text check (char_length(site) <= 300),
  fonte           text check (char_length(fonte) <= 300),   -- link de onde veio a informação (curadoria)
  foto            text check (char_length(foto) <= 400000),   -- imagem reduzida (data URL) ou link
  foto_alt        text check (char_length(foto_alt) <= 300),  -- descrição da imagem (acessibilidade)
  tags            text[] check (cardinality(tags) <= 12),
  contato_privado text check (char_length(contato_privado) <= 200),
  tem_autorizacao boolean not null check (tem_autorizacao)
);

create table if not exists public.eventos (
  id              text primary key default gen_random_uuid()::text,
  criado_em       timestamptz not null default now(),
  status          text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  ponto_id        text,                                   -- id de um ponto (opcional)
  titulo          text not null check (char_length(titulo) between 2 and 140),
  categoria       text not null check (char_length(categoria) between 2 and 30),
  descricao       text check (char_length(descricao) <= 1500),
  data            date not null,
  inicio          text check (inicio ~ '^[0-2][0-9]:[0-5][0-9]$'),
  fim             text check (fim ~ '^[0-2][0-9]:[0-5][0-9]$'),
  repete          text not null default 'nao' check (repete in ('nao','diaria','dias_uteis','semanal','quinzenal','mensal','mensal_semana')),
  repete_ate      date,
  preco           text check (char_length(preco) <= 60),
  link            text check (char_length(link) <= 300),
  fonte           text check (char_length(fonte) <= 300),
  confirmar       text check (char_length(confirmar) <= 300), -- aviso "confirme antes de ir" (curadoria)
  lat             double precision check (lat between -29 and -26),
  lng             double precision check (lng between -50 and -47),
  local_nome      text check (char_length(local_nome) <= 140),
  foto            text check (char_length(foto) <= 400000),
  foto_alt        text check (char_length(foto_alt) <= 300),
  contato_privado text check (char_length(contato_privado) <= 200),
  tem_autorizacao boolean not null check (tem_autorizacao)
);

-- Correções e pedidos ("reivindicar este espaço") — só você lê, no painel.
create table if not exists public.sugestoes (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  tipo       text not null check (tipo in ('correcao','reivindicar','remocao')),
  alvo_id    text not null check (char_length(alvo_id) <= 80),
  mensagem   text not null check (char_length(mensagem) between 3 and 1500),
  contato    text check (char_length(contato) <= 200)
);

-- ── Segurança (RLS) ─────────────────────────────────────────────────
alter table public.pontos    enable row level security;
alter table public.eventos   enable row level security;
alter table public.sugestoes enable row level security;

drop policy if exists "publico le aprovados"  on public.pontos;
drop policy if exists "publico envia pontos"  on public.pontos;
drop policy if exists "publico le aprovados"  on public.eventos;
drop policy if exists "publico envia eventos" on public.eventos;
drop policy if exists "publico envia sugestoes" on public.sugestoes;

create policy "publico le aprovados"  on public.pontos  for select to anon using (status = 'aprovado');
create policy "publico envia pontos"  on public.pontos  for insert to anon with check (status = 'pendente');
create policy "publico le aprovados"  on public.eventos for select to anon using (status = 'aprovado');
create policy "publico envia eventos" on public.eventos for insert to anon with check (status = 'pendente');
create policy "publico envia sugestoes" on public.sugestoes for insert to anon with check (true);

-- ── Permissões por coluna: o público NÃO enxerga contato_privado/status ──
revoke all on public.pontos, public.eventos, public.sugestoes from anon, authenticated;

grant select (id, criado_em, nome, categoria, descricao, lat, lng, aprox, bairro, endereco, horario,
              instagram, whatsapp, site, fonte, foto, foto_alt, tags, status) on public.pontos to anon;
grant insert (nome, categoria, descricao, lat, lng, aprox, bairro, endereco, horario, instagram, whatsapp,
              site, foto, foto_alt, tags, contato_privado, tem_autorizacao) on public.pontos to anon;

grant select (id, criado_em, ponto_id, titulo, categoria, descricao, data, inicio, fim, repete, repete_ate,
              preco, link, fonte, confirmar, lat, lng, local_nome, foto, foto_alt, status) on public.eventos to anon;
grant insert (ponto_id, titulo, categoria, descricao, data, inicio, fim, repete, repete_ate, preco, link,
              lat, lng, local_nome, foto, foto_alt, contato_privado, tem_autorizacao) on public.eventos to anon;

grant insert (tipo, alvo_id, mensagem, contato) on public.sugestoes to anon;

create index if not exists pontos_status_idx  on public.pontos  (status);
create index if not exists eventos_status_idx on public.eventos (status, data);
