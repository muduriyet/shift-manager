-- ============================================================
-- Vardiya Yönetimi — Supabase Schema
-- Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================================

create table if not exists employees (
  id            bigint       primary key generated always as identity,
  name          text         not null,
  phone         text         not null default '',
  station       text         not null,
  dept          text         not null,
  role          text         not null,
  status        text         not null default 'Aktif',
  team          integer      not null default -1,
  codes         text[]       not null default '{}',
  default_shift text         not null default 'İ'
);

create table if not exists shifts (
  id          bigint   primary key generated always as identity,
  emp_id      bigint   not null references employees(id) on delete cascade,
  day_index   integer  not null,
  code        text     not null default '-',
  start_time  text     not null,
  end_time    text     not null,
  role        text     not null,
  station     text     not null,
  dept        text     not null,
  status      text     not null default 'Planlandı',
  note        text     not null default ''
);

-- Gerçek tarih sütunu (migration — mevcut DB'de çalıştırın)
alter table shifts add column if not exists shift_date text;

-- Mevcut seed verisini tarih bilgisiyle güncelle
-- (Seed sırasında dayIndex 0-6 = 8-14 Haziran 2026 arası)
update shifts set shift_date =
  case day_index
    when 0 then '2026-06-08'
    when 1 then '2026-06-09'
    when 2 then '2026-06-10'
    when 3 then '2026-06-11'
    when 4 then '2026-06-12'
    when 5 then '2026-06-13'
    when 6 then '2026-06-14'
  end
where shift_date is null;

-- İndeksler
create index if not exists shifts_emp_id_idx   on shifts(emp_id);
create index if not exists shifts_day_index_idx on shifts(day_index);
create index if not exists shifts_date_idx      on shifts(shift_date);

-- ---- Migration: employee_month_codes → shifts (run once if table exists) ----
-- Her kodlanmış günü shifts tablosuna taşır; İ ve - kayıt gerektirmez.
do $$
declare
  r   record;
  i   int;
  c   text;
  sd  text;
  dw  int;
  st  text;
  en  text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_name = 'employee_month_codes'
  ) then return; end if;

  for r in
    select e.id as emp_id, e.station, e.dept, e.role,
           mc.year_month, mc.codes
    from employee_month_codes mc
    join employees e on e.id = mc.emp_id
  loop
    for i in 1..array_length(r.codes, 1) loop
      c := r.codes[i];
      if c = 'İ' or c = '-' then continue; end if;
      sd := r.year_month || '-' || lpad(i::text, 2, '0');
      dw := (extract(dow from sd::date)::int + 6) % 7;
      case c
        when 'S'  then st := '08:00'; en := '16:00';
        when 'Ö'  then st := '16:00'; en := '00:00';
        when 'G'  then st := '00:00'; en := '08:00';
        else           st := '';      en := '';
      end case;
      if not exists (
        select 1 from shifts where emp_id = r.emp_id and shift_date = sd
      ) then
        insert into shifts
          (emp_id, day_index, shift_date, code, start_time, end_time, role, station, dept, status, note)
        values
          (r.emp_id, dw, sd, c, st, en, r.role, r.station, r.dept, 'Planlandı', '');
      end if;
    end loop;
  end loop;
end;
$$;

drop table if exists employee_month_codes;

-- Row Level Security
-- Geliştirme aşaması için kapalı. Production'da auth ekleyip açın.
alter table employees disable row level security;
alter table shifts    disable row level security;

-- Production için örnek açık politika:
-- alter table employees enable row level security;
-- create policy "Authenticated users" on employees for all to authenticated using (true) with check (true);
-- alter table shifts enable row level security;
-- create policy "Authenticated users" on shifts for all to authenticated using (true) with check (true);
