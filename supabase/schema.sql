-- ============================================================
-- Vardiya Yönetimi — Supabase Schema
-- Supabase Dashboard > SQL Editor'de çalıştırın
-- Sıfırdan kurulum için bu dosya tek başına yeterlidir.
-- ============================================================

-- ---- Lookup tabloları (önce bunlar; employees bunlara FK ile bağlı) ----

create table if not exists stations (
  id    serial primary key,
  name  text   not null unique
);

create table if not exists departments (
  id    serial primary key,
  name  text   not null unique,
  color text   not null default '#64748b'
);

create table if not exists roles (
  id    serial primary key,
  name  text   not null unique
);

-- Varsayılan lookup verisi (idempotent)
insert into stations (name) values ('Ümraniye'), ('Şile')
  on conflict (name) do nothing;

insert into departments (name, color) values
  ('Akaryakıt', '#1e3a8a'),
  ('Market',    '#0f766e')
  on conflict (name) do nothing;

insert into roles (name) values
  ('Pompacı'), ('Vardiya Amiri'), ('Market Görevlisi'), ('Kasiyer')
  on conflict (name) do nothing;

-- ---- Personel ----
-- station/dept/role lookup tablolarına FK (on delete restrict): bağlı personel
-- varken ilgili tanım silinemez. Durum ikili: is_active boolean.

create table if not exists employees (
  id          bigint   primary key generated always as identity,
  name        text     not null,
  shift_name  text     not null default '',
  schedule_name text   not null default '',
  station_id  integer  not null references stations(id)    on delete restrict,
  dept_id     integer  not null references departments(id) on delete restrict,
  role_id     integer  not null references roles(id)       on delete restrict,
  is_active   boolean  not null default true,
  start_date  date,
  end_date    date
);

-- ---- Vardiyalar ----
-- station/dept/role BİLEREK text (tarihsel snapshot): vardiya o günkü atamayı
-- dondurur; lookup sonradan değişse/silinse geçmiş kayıt etkilenmez.
-- emp_id FK on delete restrict: vardiyası olan personel silinemez (geçmiş korunur).
-- Uygulama silme yerine soft delete (is_active=false) kullanır.

create table if not exists shifts (
  id          bigint   primary key generated always as identity,
  emp_id      bigint   not null references employees(id) on delete restrict,
  day_index   integer  not null,
  shift_date  text,
  code        text     not null default '-',
  start_time  text     not null,
  end_time    text     not null,
  role        text     not null,
  station     text     not null,
  dept        text     not null,
  status      text     not null default 'Planlandı'
              constraint shifts_status_check check (status in ('Planlandı', 'Geldi', 'Gelmedi')),
  note        text     not null default ''
);

-- İndeksler
create index if not exists shifts_emp_id_idx    on shifts(emp_id);
create index if not exists shifts_day_index_idx on shifts(day_index);
create index if not exists shifts_date_idx      on shifts(shift_date);

-- Bir personel ayni tarihte tek vardiya alabilir. NULL/boş tarihli eski kayıtlar
-- kural dışıdır; tarihli kayıtlar aylık/haftalık/günlük ekranlarda tek hücre/tek vardiya
-- varsayımıyla çalışır.
create unique index if not exists shifts_emp_id_shift_date_unique
  on shifts(emp_id, shift_date)
  where shift_date is not null and shift_date <> '';

-- ---- Row Level Security ----
-- Auth eklendi: yalnızca giriş yapmış (authenticated) kullanıcılar erişebilir.
-- Giriş yapmamış (anon) istekler 0 satır alır / yazamaz. Politika izin verici
-- (her authenticated kullanıcı her şeyi yapabilir); şube/departman bazlı ince
-- taneli kısıtlama sonraki işe (branch-department mimarisi) bırakıldı.
--
-- ⚠️ Bu blok canlı DB'ye, kullanıcılar oluşturulduktan SONRA uygulanır (Faz 2).
-- Önce kullanıcı yokken açılırsa uygulama herkes için "boş" görünür.
-- drop policy if exists → dosya idempotent kalır (yeniden çalıştırılabilir).
alter table stations    enable row level security;
alter table departments enable row level security;
alter table roles       enable row level security;
alter table employees   enable row level security;
alter table shifts      enable row level security;

drop policy if exists "Authenticated full access" on stations;
create policy "Authenticated full access" on stations    for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on departments;
create policy "Authenticated full access" on departments for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on roles;
create policy "Authenticated full access" on roles       for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on employees;
create policy "Authenticated full access" on employees   for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on shifts;
create policy "Authenticated full access" on shifts      for all to authenticated using (true) with check (true);
