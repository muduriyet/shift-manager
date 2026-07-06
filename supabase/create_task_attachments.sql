-- ============================================================
-- Görev Defteri — Dosya ekleri (Sprint 5 / GD-6)
-- Idempotent. create_task_notebook.sql'den SONRA çalıştırın.
-- Private bucket + metadata tablosu + RLS (proje-standart authenticated).
-- ============================================================

-- Private bucket (25 MB/dosya). İndirme signed URL ile (public=false).
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 26214400)
on conflict (id) do nothing;

-- Metadata. task_id nullable: taslak (henüz kaydedilmemiş görev) yüklemeleri
-- task_id=null ile durur; görev kaydında bağlanır, iptalde silinir.
create table if not exists task_attachments (
  id           bigint primary key generated always as identity,
  task_id      bigint references tasks(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  file_size    bigint not null default 0,
  mime_type    text,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists task_attachments_task_id_idx on task_attachments(task_id);

alter table task_attachments enable row level security;
drop policy if exists "Authenticated full access" on task_attachments;
create policy "Authenticated full access" on task_attachments
  for all to authenticated using (true) with check (true);

-- Storage nesneleri: yalnız bu bucket için authenticated select/insert/delete.
drop policy if exists "task-attachments read" on storage.objects;
create policy "task-attachments read" on storage.objects
  for select to authenticated using (bucket_id = 'task-attachments');

drop policy if exists "task-attachments insert" on storage.objects;
create policy "task-attachments insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-attachments');

drop policy if exists "task-attachments delete" on storage.objects;
create policy "task-attachments delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-attachments');
