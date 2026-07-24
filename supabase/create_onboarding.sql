-- ============================================================
-- İşe Giriş Süreçleri (Onboarding) — Supabase Schema
-- Bağımlılıklar: schema.sql (employees) + create_task_notebook.sql
--   (profiles, public.touch_updated_at()). Bu iki dosyadan SONRA çalıştırın.
-- Supabase Dashboard > SQL Editor'de (veya MCP apply_migration ile) çalıştırın.
-- Idempotent: yeniden çalıştırılabilir (create if not exists / drop policy if exists).
--
-- Mevcut hiçbir tabloya dokunulmaz — tek bir alter table yok. Özelliği tamamen
-- kaldırmak için dosya sonundaki "Geri alma" bloğuna bakın.
-- ============================================================

-- ---- Evrak kataloğu ----
-- 3 evrak seti: personel (işe alım kopyaları) / giris (SGK'ya gönderilenler) /
-- asil (muhasebeye gelen orijinaller). Aynı evrak birden fazla sette BİLEREK yer
-- alır (kopya vs. asıl). Süreç açılırken satırlar onboarding_docs'a kopyalanır;
-- katalog sonradan değişse geçmiş süreçler etkilenmez.
-- Silme yerine soft delete (is_active=false) kullanılır.

create table if not exists onboarding_doc_defs (
  id          bigint   primary key generated always as identity,
  doc_set     text     not null
              constraint onboarding_doc_defs_set_check check (doc_set in ('personel', 'giris', 'asil')),
  name        text     not null,
  description text     not null default '',
  sort_order  smallint not null default 0,
  is_active   boolean  not null default true
);

create unique index if not exists onboarding_doc_defs_set_name_unique
  on onboarding_doc_defs(doc_set, name);

insert into onboarding_doc_defs (doc_set, name, description, sort_order) values
  ('personel', 'Kimlik Kartı',              '', 1),
  ('personel', 'Öğrenim/Mezuniyet Belgesi', '', 2),
  ('personel', 'Adli Sicil Kaydı',          '', 3),
  ('personel', 'Yerleşim Yeri Kaydı',       '', 4),
  ('personel', 'Nüfus Kayıt Örneği',        '', 5),
  ('personel', 'Muvafakatname',             '', 6),
  ('giris',    'SGK Giriş Bildirgesi',      '', 1),
  ('giris',    'İş Sözleşmesi',             '', 2),
  ('asil',     'Kimlik Kartı',              'T.C. kimlik kartı aslı',              1),
  ('asil',     'Öğrenim/Mezuniyet Belgesi', 'Öğrenim durumunu gösteren belge aslı', 2),
  ('asil',     'Adli Sicil Kaydı',          'Adli sicil belgesi aslı',              3),
  ('asil',     'Yerleşim Yeri Kaydı',       'İkametgâh belgesi aslı',               4),
  ('asil',     'Nüfus Kayıt Örneği',        'Nüfus kayıt örneği aslı',              5),
  ('asil',     'SGK Giriş Bildirgesi',      'SGK işe giriş bildirgesi (aslı)',      6),
  ('asil',     'İş Sözleşmesi',             'İmzalanmış iş sözleşmesi aslı',        7),
  ('asil',     'Taahhütname',               'İmzalanmış taahhütname aslı',          8),
  ('asil',     'Fotoğraf',                  'Vesikalık fotoğraf',                   9)
on conflict (doc_set, name) do nothing;

-- ---- Süreç ----
-- stage = ULAŞILAN kilometre taşı (1: mail atıldı, 2: SGK yapıldı, 3: asıllar geldi).
-- 3. aşama terminaldir; süreç orada tamamlanmış sayılır ve arşivlenir.
-- phone/iban bilinçli olarak burada, employees'te değil: employees her girişte
-- filtresiz çekilip tüm ekranlara prop olarak geçiyor (bkz. db.ts EMP_SELECT).

create table if not exists onboardings (
  id          bigint   primary key generated always as identity,
  employee_id bigint   not null references employees(id) on delete restrict,
  stage       smallint not null default 1
              constraint onboardings_stage_check check (stage between 1 and 3),
  phone       text     not null default '',
  iban        text     not null default '',
  notes       text     not null default '',
  archived_at timestamptz,
  created_by  uuid     references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists onboardings_employee_id_idx on onboardings(employee_id);
create index if not exists onboardings_active_idx      on onboardings(archived_at) where archived_at is null;

-- Bir personelin aynı anda tek AÇIK süreci olabilir. Arşivlenmiş eski süreçler
-- kural dışıdır → işten çıkıp tekrar giren personele yeni süreç açılabilir.
create unique index if not exists onboardings_employee_active_unique
  on onboardings(employee_id) where archived_at is null;

-- ---- Sürece kopyalanmış evrak satırları ----
-- Katalogdan bağımsız yaşar: bir evrak katalogdan kaldırılsa da buradaki satır
-- (ve işaretli durumu) korunur.

create table if not exists onboarding_docs (
  id            bigint   primary key generated always as identity,
  onboarding_id bigint   not null references onboardings(id) on delete cascade,
  doc_set       text     not null
                constraint onboarding_docs_set_check check (doc_set in ('personel', 'giris', 'asil')),
  name          text     not null,
  description   text     not null default '',
  sort_order    smallint not null default 0,
  is_done       boolean  not null default false,
  updated_at    timestamptz not null default now()
);

create index if not exists onboarding_docs_onboarding_id_idx on onboarding_docs(onboarding_id);

create unique index if not exists onboarding_docs_unique
  on onboarding_docs(onboarding_id, doc_set, name);

-- ---- Trigger: süreç açılınca evrak listesini materyalize et ----
-- Uygulama tek insert atar; 17 satırın oluşması aynı transaction içinde
-- veritabanının garantisidir. Yarım (evraksız) süreç oluşamaz.

create or replace function public.seed_onboarding_docs() returns trigger
  language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  insert into public.onboarding_docs (onboarding_id, doc_set, name, description, sort_order)
  select new.id, d.doc_set, d.name, d.description, d.sort_order
  from public.onboarding_doc_defs d
  where d.is_active
  on conflict (onboarding_id, doc_set, name) do nothing;
  return new;
end; $$;

drop trigger if exists onboardings_seed_docs on onboardings;
create trigger onboardings_seed_docs
  after insert on onboardings
  for each row execute function public.seed_onboarding_docs();

drop trigger if exists onboardings_touch_updated on onboardings;
create trigger onboardings_touch_updated
  before update on onboardings
  for each row execute function public.touch_updated_at();

drop trigger if exists onboarding_docs_touch_updated on onboarding_docs;
create trigger onboarding_docs_touch_updated
  before update on onboarding_docs
  for each row execute function public.touch_updated_at();

-- Trigger fonksiyonu PostgREST RPC olarak çağrılabilir olmasın.
revoke execute on function public.seed_onboarding_docs() from public;

-- ---- RPC: personel + süreç, tek transaction ----
-- "Yeni Süreç" akışı personeli de oluşturuyor. İki insert ayrı ayrı çağrılsaydı
-- ikincisi patladığında geriye süreci olmayan bir personel kalırdı — ve akışta
-- personel seçici olmadığı için o kişiye UI'dan süreç açmanın yolu yok.
-- employee_id de döner: yeni personelin App state'ine girmesi buna bağlı
-- (liste satırı ad/pozisyonu employees dizisinden eşleştiriyor).

create or replace function public.create_onboarding_with_employee(
  p_name text, p_station_id integer, p_dept_id integer,
  p_role_id integer, p_start_date date, p_created_by uuid
) returns table (onboarding_id bigint, employee_id bigint)
  language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_emp bigint; v_onb bigint;
begin
  insert into public.employees (name, station_id, dept_id, role_id, start_date)
  values (p_name, p_station_id, p_dept_id, p_role_id, p_start_date)
  returning id into v_emp;

  insert into public.onboardings (employee_id, created_by)
  values (v_emp, p_created_by)
  returning id into v_onb;

  return query select v_onb, v_emp;
end; $$;

grant execute on function public.create_onboarding_with_employee(text, integer, integer, integer, date, uuid) to authenticated;

-- ---- RPC: katalog tanımı ekle + devam eden süreçlere yay ----
-- Ekleme yayılır, kaldırma yayılmaz. Asimetri kasıtlı: her iki yön de veri
-- kaybetmeyen tarafı seçiyor. Arşivlenmiş süreçlere iki yönde de dokunulmaz.

create or replace function public.add_onboarding_doc_def(
  p_doc_set text, p_name text, p_description text
) returns bigint
  language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_id bigint; v_order smallint;
begin
  select coalesce(max(sort_order), 0) + 1 into v_order
  from public.onboarding_doc_defs where doc_set = p_doc_set;

  -- Daha önce kaldırılmış aynı isimli tanım varsa yeniden aktifleşir.
  insert into public.onboarding_doc_defs (doc_set, name, description, sort_order)
  values (p_doc_set, p_name, coalesce(p_description, ''), v_order)
  on conflict (doc_set, name) do update
    set is_active = true, description = excluded.description
  returning id into v_id;

  insert into public.onboarding_docs (onboarding_id, doc_set, name, description, sort_order)
  select o.id, d.doc_set, d.name, d.description, d.sort_order
  from public.onboardings o, public.onboarding_doc_defs d
  where o.archived_at is null and d.id = v_id
  on conflict (onboarding_id, doc_set, name) do nothing;

  return v_id;
end; $$;

grant execute on function public.add_onboarding_doc_def(text, text, text) to authenticated;

-- ---- Liste görünümü ----
-- security_invoker: view'ı sorgulayan rolün RLS'i uygulanır (definer değil).
-- phone/iban/notes BİLİNÇLİ olarak yok: liste tüm açık süreçleri çekiyor,
-- IBAN oraya konsaydı her ekran açılışında toplu hâlde belleğe inerdi.
-- Detay için db.ts'teki fetchOnboarding(id) doğrudan tabloya gider.
-- Personel bilgisi (ad/pozisyon/şube) de yok; istemci employees dizisinden eşler.

create or replace view onboarding_list_view with (security_invoker = true) as
select
  o.id,
  o.employee_id,
  o.stage,
  o.archived_at,
  o.created_by,
  o.created_at,
  o.updated_at,
  (count(*) filter (where d.doc_set = 'personel' and d.is_done))::int as personel_done,
  (count(*) filter (where d.doc_set = 'personel'))::int               as personel_total,
  (count(*) filter (where d.doc_set = 'giris'    and d.is_done))::int as giris_done,
  (count(*) filter (where d.doc_set = 'giris'))::int                  as giris_total,
  (count(*) filter (where d.doc_set = 'asil'     and d.is_done))::int as asil_done,
  (count(*) filter (where d.doc_set = 'asil'))::int                   as asil_total
from onboardings o
left join onboarding_docs d on d.onboarding_id = o.id
group by o.id;

grant select on onboarding_list_view to anon, authenticated;

-- ---- Row Level Security ----
-- Ev standardı: her tabloda tek politika, yalnız authenticated, tam erişim.
-- İnce taneli (şube/departman) kısıtlama sonraki işe bırakıldı.

alter table onboarding_doc_defs enable row level security;
alter table onboardings         enable row level security;
alter table onboarding_docs     enable row level security;

drop policy if exists "Authenticated full access" on onboarding_doc_defs;
create policy "Authenticated full access" on onboarding_doc_defs for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on onboardings;
create policy "Authenticated full access" on onboardings         for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on onboarding_docs;
create policy "Authenticated full access" on onboarding_docs     for all to authenticated using (true) with check (true);

-- ============================================================
-- Geri alma (özelliği tamamen kaldırmak):
--
--   drop view     if exists onboarding_list_view;
--   drop function if exists public.create_onboarding_with_employee(text,integer,integer,integer,date,uuid);
--   drop function if exists public.add_onboarding_doc_def(text,text,text);
--   drop function if exists public.seed_onboarding_docs();
--   drop table    if exists onboarding_docs, onboardings, onboarding_doc_defs;
--
-- Mevcut hiçbir tabloya dokunulmadığı için bu kadarı yeterli.
-- ============================================================
