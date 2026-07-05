-- ============================================================
-- Görev Defteri (Task Notebook) — Supabase Schema
-- Supabase Dashboard > SQL Editor'de (veya MCP apply_migration ile) çalıştırın.
-- Idempotent: yeniden çalıştırılabilir (create if not exists / drop policy if exists).
-- ============================================================

-- ---- profiles ----
-- Giriş yapan (ofis/muhasebe) kullanıcıların istemciden okunabilir dizini.
-- Tarayıcı auth.users'ı listeleyemez (service-role gerekir); atama listesi ve
-- diğer kullanıcıların ad/avatarını göstermek için bu tabloya ihtiyaç var.
-- "Ben" kimliği yine Supabase auth'tan (session.user + user_metadata) gelir.

create table if not exists profiles (
  id           uuid    primary key references auth.users(id) on delete cascade,
  username     text    not null,
  display_name text    not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Yeni auth kullanıcısı oluşunca (admin dashboard'dan açılanlar dahil) profil satırı
-- otomatik yaratılır. display_name: user_metadata.display_name → full_name → kullanıcı adı.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'display_name',
             new.raw_user_meta_data->>'full_name',
             split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mevcut (trigger'dan önce açılmış) hesaplar için tek seferlik backfill.
insert into public.profiles (id, username, display_name)
select u.id,
       split_part(u.email, '@', 1),
       coalesce(u.raw_user_meta_data->>'display_name',
                u.raw_user_meta_data->>'full_name',
                split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ---- tasks ----
-- Ortak görev/yapılacaklar panosu. assignee_id/created_by → profiles FK
-- (canlı referans; on delete set null → kullanıcı silinse görev kalır).
-- due_date nullable: null = backlog/"bir gün" (Bugün/Gecikmiş sayımına girmez).
-- Silme yerine soft-delete: archived_at doldurulur, liste archived_at is null süzer.
-- Tekrar: repeat_kind + repeat_n/unit; tamamlanınca sonraki örnek üretilir (series_id).

create table if not exists tasks (
  id          bigint  primary key generated always as identity,
  title       text    not null,
  note        text    not null default '',
  priority    text    not null default 'Orta'
              constraint tasks_priority_check check (priority in ('Yüksek', 'Orta', 'Düşük')),
  due_date    date,
  done        boolean not null default false,
  done_at     timestamptz,
  is_team     boolean not null default false,
  assignee_id uuid    references profiles(id) on delete set null,
  created_by  uuid    references profiles(id) on delete set null,
  repeat_kind text    not null default 'none'
              constraint tasks_repeat_check check (repeat_kind in ('none', 'daily', 'weekly', 'monthly', 'custom')),
  repeat_n    integer not null default 1,
  repeat_unit text    not null default 'gün'
              constraint tasks_repeat_unit_check check (repeat_unit in ('gün', 'hafta', 'ay')),
  series_id   bigint,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- İndeksler
create index if not exists tasks_assignee_id_idx on tasks(assignee_id);
create index if not exists tasks_due_date_idx    on tasks(due_date);
create index if not exists tasks_series_id_idx    on tasks(series_id);
create index if not exists tasks_active_idx       on tasks(archived_at) where archived_at is null;

-- updated_at'i her UPDATE'te sunucu tarafında tazele.
create or replace function public.touch_updated_at() returns trigger
  language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists tasks_touch_updated on tasks;
create trigger tasks_touch_updated
  before update on tasks
  for each row execute function public.touch_updated_at();

-- Trigger fonksiyonları PostgREST RPC olarak çağrılabilir olmasın (yalnız trigger
-- olarak, tetikleyen rolden bağımsız çalışırlar → execute grant'ine ihtiyaçları yok).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.touch_updated_at() from public;

-- ---- Row Level Security ----
-- schema.sql ile aynı desen: yalnızca authenticated erişebilir.
-- profiles okuma-yalnız (dizin); tasks tam erişim. İnce taneli (şube/departman)
-- kısıtlama sonraki işe bırakıldı (branch-department mimarisi).
alter table profiles enable row level security;
alter table tasks    enable row level security;

drop policy if exists "Authenticated read profiles" on profiles;
create policy "Authenticated read profiles" on profiles for select to authenticated using (true);

drop policy if exists "Authenticated full access" on tasks;
create policy "Authenticated full access" on tasks for all to authenticated using (true) with check (true);

-- ---- Başlangıç rutin seti (seed) ----
-- Yalnızca tasks boşken eklenir (idempotent). Ortak görev olarak (is_team=true,
-- assignee_id=null): migration anında gerçek profil UUID'leri bilinmiyor.
insert into tasks (title, priority, due_date, is_team, repeat_kind)
select v.title, v.priority, v.due_date, true, v.repeat_kind
from (values
  ('Günlük kasa mutabakatı',          'Yüksek', current_date,                                                     'daily'),
  ('Pompa sayaç okuma kontrolü',      'Yüksek', current_date,                                                     'daily'),
  ('POS & banka ekstresi eşleştirme', 'Orta',   current_date,                                                     'daily'),
  ('Vardiya puantaj onayı',           'Orta',   current_date + 7,                                                 'weekly'),
  ('KDV beyanname hazırlığı',         'Yüksek', date_trunc('month', current_date) + interval '1 month' - interval '1 day', 'monthly'),
  ('SGK aylık bildirge hazırlığı',    'Yüksek', date_trunc('month', current_date) + interval '1 month' - interval '1 day', 'monthly')
) as v(title, priority, due_date, repeat_kind)
where not exists (select 1 from tasks);
