-- ============================================================
-- Görev Defteri — Yorumlar + Aktivite (Sprint 4 / GD-5)
-- Idempotent. RLS deseni schema.sql ile aynı (authenticated full access).
-- create_task_notebook.sql'den SONRA çalıştırın (tasks/profiles'a FK var).
-- ============================================================

-- Görev yorumları (tartışma thread'i). Görev arşivlenince yorumlar kalır;
-- görev fiziksel silinirse (cascade) birlikte gider.
create table if not exists task_comments (
  id         bigint primary key generated always as identity,
  task_id    bigint not null references tasks(id) on delete cascade,
  author_id  uuid references profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_id_idx on task_comments(task_id);

-- Görev aktivite kaydı (kim ne yaptı — oluşturdu / tamamladı / devraldı / yorum ekledi …)
create table if not exists task_activity (
  id         bigint primary key generated always as identity,
  task_id    bigint not null references tasks(id) on delete cascade,
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index if not exists task_activity_task_id_idx on task_activity(task_id);

-- ---- Row Level Security ---- (schema.sql ile aynı desen)
alter table task_comments enable row level security;
alter table task_activity enable row level security;

drop policy if exists "Authenticated full access" on task_comments;
create policy "Authenticated full access" on task_comments for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on task_activity;
create policy "Authenticated full access" on task_activity for all to authenticated using (true) with check (true);
