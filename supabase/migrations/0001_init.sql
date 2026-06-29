-- ============================================================================
-- Compliance Copilot - initial schema
-- Postgres + pgvector. Embedding dimension is 768 and MUST match
-- Embedding dimension is 768 and MUST match GEMINI.EMBEDDING_DIM in backend/src/constants.ts.
-- ============================================================================

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- documents: one row per uploaded PDF
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  status       text not null default 'pending'
                 check (status in ('pending', 'processing', 'ready', 'failed')),
  page_count   integer,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- chunks: retrievable text + embedding
-- ---------------------------------------------------------------------------
create table if not exists public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  content     text not null,
  page_number integer not null,
  chunk_index integer not null,
  token_count integer not null default 0,
  embedding   vector(768) not null,
  created_at  timestamptz not null default now()
);

create index if not exists chunks_document_id_idx on public.chunks (document_id, chunk_index);

-- Approximate nearest-neighbour index for cosine similarity search.
create index if not exists chunks_embedding_idx
  on public.chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- messages: chat history per document
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  citations   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists messages_document_id_idx on public.messages (document_id, created_at);

-- ---------------------------------------------------------------------------
-- summaries: one cached structured summary per document
-- ---------------------------------------------------------------------------
create table if not exists public.summaries (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null unique references public.documents (id) on delete cascade,
  obligations         jsonb not null default '[]'::jsonb,
  risks               jsonb not null default '[]'::jsonb,
  gaps                jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- match_chunks: cosine-similarity retrieval scoped to a single document.
-- Returns similarity in [0, 1] where 1 is most similar.
-- ---------------------------------------------------------------------------
create or replace function public.match_chunks (
  query_embedding vector(768),
  p_document_id   uuid,
  match_count     int default 5
)
returns table (
  id          uuid,
  content     text,
  page_number integer,
  similarity  float
)
language sql
stable
as $$
  select
    c.id,
    c.content,
    c.page_number,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.document_id = p_document_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (defense in depth; the API uses the service role).
-- Every row is scoped to its owning user.
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;
alter table public.chunks    enable row level security;
alter table public.messages  enable row level security;
alter table public.summaries enable row level security;

drop policy if exists "documents_owner" on public.documents;
create policy "documents_owner" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chunks_owner" on public.chunks;
create policy "chunks_owner" on public.chunks
  for all using (
    exists (select 1 from public.documents d where d.id = chunks.document_id and d.user_id = auth.uid())
  );

drop policy if exists "messages_owner" on public.messages;
create policy "messages_owner" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "summaries_owner" on public.summaries;
create policy "summaries_owner" on public.summaries
  for all using (
    exists (select 1 from public.documents d where d.id = summaries.document_id and d.user_id = auth.uid())
  );
