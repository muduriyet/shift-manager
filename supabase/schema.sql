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

create table if not exists shifts (
  id          bigint   primary key generated always as identity,
  emp_id      bigint   not null references employees(id) on delete cascade,
  day_index   integer  not null,
  shift_date  text,
  code        text     not null default '-',
  start_time  text     not null,
  end_time    text     not null,
  role        text     not null,
  station     text     not null,
  dept        text     not null,
  status      text     not null default 'Planlandı',
  note        text     not null default ''
);

-- İndeksler
create index if not exists shifts_emp_id_idx    on shifts(emp_id);
create index if not exists shifts_day_index_idx on shifts(day_index);
create index if not exists shifts_date_idx      on shifts(shift_date);

-- ---- Row Level Security ----
-- Geliştirme aşaması için kapalı. Production'da auth ekleyip açın.
alter table stations    disable row level security;
alter table departments disable row level security;
alter table roles       disable row level security;
alter table employees   disable row level security;
alter table shifts      disable row level security;

-- Production için örnek açık politika:
-- alter table employees enable row level security;
-- create policy "Authenticated users" on employees for all to authenticated using (true) with check (true);
-- (aynısını stations / departments / roles / shifts için tekrarlayın)
