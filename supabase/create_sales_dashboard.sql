-- ============================================================
-- Satış Dashboard — Supabase Schema (SD-01 + SD-02)
-- Supabase Dashboard > SQL Editor'de veya MCP apply_migration ile çalıştırın.
-- Idempotent: tekrar çalıştırmak güvenlidir.
-- View'lar ayrı migration'da (SD-09) eklenir.
-- ============================================================

-- ---- Import konfigürasyonları ----
-- mappings jsonb: [{ "target": <kolon>, "source": "daily"|"summary", "formula": <hücre/ifade> }]
-- is_system=true seed config doğrudan düzenlenemez/silinemez (uygulama katmanı kuralı).

create table if not exists sales_import_configs (
  id                 bigint primary key generated always as identity,
  name               text not null,
  status             text not null
                       constraint sales_import_configs_status_check
                       check (status in ('draft', 'active', 'inactive')),
  is_system          boolean not null default false,
  daily_sheet_name   text,
  summary_sheet_name text,
  mappings           jsonb not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---- Günlük satış raporları (dashboard kaynağı) ----
-- station_id/dept_id: lookup tablolarına FK (raporlama; shifts text-snapshot deseninden farklı).
-- Aynı istasyon+departman+tarih için tek satır (upsert hedefi).

create table if not exists sales_daily_reports (
  id                  bigint primary key generated always as identity,
  station_id          integer not null references stations(id),
  dept_id             integer not null references departments(id),
  report_date         date not null,

  gasoline_liters     numeric(14,2) not null,
  diesel_liters       numeric(14,2) not null,
  lpg_liters          numeric(14,2) not null,
  total_liters        numeric(14,2) not null,

  total_sales_tl      numeric(14,2) not null,
  discount_points_tl  numeric(14,2) not null,
  card_sales_tl       numeric(14,2) not null,
  cash_sales_tl       numeric(14,2) not null,
  tts_tl              numeric(14,2) not null,
  partner_tl          numeric(14,2) not null,
  gift_tl             numeric(14,2) not null,
  fault_form_tl       numeric(14,2) not null,
  company_tl          numeric(14,2) not null,
  alioglu_tl          numeric(14,2) not null,

  diesel_unit_price   numeric(10,4) not null,
  gasoline_unit_price numeric(10,4) not null,
  lpg_unit_price      numeric(10,4) not null,
  calculated_sales_tl numeric(14,2) not null,

  source_report_date  date,
  last_import_run_id  bigint,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (station_id, dept_id, report_date)
);

-- ---- Import audit (yalnızca "Uygula" ile oluşur) ----

create table if not exists sales_import_runs (
  id                    bigint primary key generated always as identity,
  sales_daily_report_id bigint references sales_daily_reports(id),
  config_id             bigint references sales_import_configs(id),
  station_id            integer not null references stations(id),
  dept_id               integer not null references departments(id),
  report_date           date not null,

  daily_file_name       text not null,
  summary_file_name     text not null,
  config_snapshot       jsonb not null,
  parsed_values         jsonb not null,
  previous_values       jsonb,
  changed_fields        jsonb,
  warnings              jsonb not null,
  status                text not null
                          constraint sales_import_runs_status_check
                          check (status in ('applied', 'failed')),
  error_message         text,
  imported_at           timestamptz not null default now()
);

-- ---- İndeksler ----
-- (station_id, dept_id, report_date) unique constraint zaten indeks sağlar.

create index if not exists sales_daily_reports_report_date_idx
  on sales_daily_reports(report_date);

create index if not exists sales_import_runs_report_date_idx
  on sales_import_runs(report_date);

create index if not exists sales_import_runs_config_id_idx
  on sales_import_runs(config_id);

-- ---- Row Level Security ----
-- Mevcut projeyle tutarlı: geliştirme aşamasında kapalı. Production'da auth + policy ekleyin.
alter table sales_import_configs disable row level security;
alter table sales_daily_reports  disable row level security;
alter table sales_import_runs    disable row level security;

-- ---- Seed system config (idempotent) ----
-- Hücre referansları docs/tmp-analysis golden dosyalarına karşı doğrulandı.

insert into sales_import_configs (name, status, is_system, daily_sheet_name, summary_sheet_name, mappings)
select
  'Standart Akaryakıt', 'active', true, null, null,
  '[
    { "target": "source_report_date", "source": "daily",   "formula": "G1" },
    { "target": "gasoline_liters",     "source": "daily",   "formula": "G3" },
    { "target": "diesel_liters",       "source": "daily",   "formula": "G4" },
    { "target": "lpg_liters",          "source": "daily",   "formula": "G5" },
    { "target": "total_sales_tl",      "source": "daily",   "formula": "C16" },
    { "target": "card_sales_tl",       "source": "daily",   "formula": "G16+G17" },
    { "target": "cash_sales_tl",       "source": "daily",   "formula": "C42" },
    { "target": "tts_tl",              "source": "daily",   "formula": "C21" },
    { "target": "partner_tl",          "source": "daily",   "formula": "C22" },
    { "target": "gift_tl",             "source": "daily",   "formula": "C23" },
    { "target": "fault_form_tl",       "source": "daily",   "formula": "C24" },
    { "target": "company_tl",          "source": "daily",   "formula": "C25" },
    { "target": "alioglu_tl",          "source": "daily",   "formula": "C26" },
    { "target": "discount_points_tl",  "source": "summary", "formula": "ARA(\"Genel Toplam\", H) + ARA(\"Genel Toplam\", I)" }
  ]'::jsonb
where not exists (
  select 1 from sales_import_configs where name = 'Standart Akaryakıt' and is_system = true
);

-- ============================================================
-- SD-02 — apply_sales_import RPC
-- FE preview tamamlandıktan sonra kullanıcı onayıyla çağrılır.
-- Tek transaction: upsert + audit + last_import_run_id.
-- ============================================================

create or replace function apply_sales_import(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_station_id  integer := (payload->>'station_id')::integer;
  v_dept_id     integer := (payload->>'dept_id')::integer;
  v_report_date date    := (payload->>'report_date')::date;
  v_config_id   bigint  := nullif(payload->>'config_id', '')::bigint;
  r jsonb := coalesce(payload->'report', '{}'::jsonb);
  v_existing  sales_daily_reports%rowtype;
  v_previous  jsonb := null;
  v_newrow    jsonb;
  v_changed   jsonb := null;
  v_report_id bigint;
  v_run_id    bigint;
  v_action    text;
begin
  -- 1. Mevcut satır
  select * into v_existing
  from sales_daily_reports
  where station_id = v_station_id and dept_id = v_dept_id and report_date = v_report_date;

  if found then
    v_action   := 'update';
    v_previous := to_jsonb(v_existing);
  else
    v_action := 'insert';
  end if;

  -- 2. Upsert
  insert into sales_daily_reports as t (
    station_id, dept_id, report_date,
    gasoline_liters, diesel_liters, lpg_liters, total_liters,
    total_sales_tl, discount_points_tl, card_sales_tl, cash_sales_tl,
    tts_tl, partner_tl, gift_tl, fault_form_tl, company_tl, alioglu_tl,
    diesel_unit_price, gasoline_unit_price, lpg_unit_price, calculated_sales_tl,
    source_report_date, updated_at
  ) values (
    v_station_id, v_dept_id, v_report_date,
    (r->>'gasoline_liters')::numeric, (r->>'diesel_liters')::numeric, (r->>'lpg_liters')::numeric, (r->>'total_liters')::numeric,
    (r->>'total_sales_tl')::numeric, (r->>'discount_points_tl')::numeric, (r->>'card_sales_tl')::numeric, (r->>'cash_sales_tl')::numeric,
    (r->>'tts_tl')::numeric, (r->>'partner_tl')::numeric, (r->>'gift_tl')::numeric, (r->>'fault_form_tl')::numeric, (r->>'company_tl')::numeric, (r->>'alioglu_tl')::numeric,
    (r->>'diesel_unit_price')::numeric, (r->>'gasoline_unit_price')::numeric, (r->>'lpg_unit_price')::numeric, (r->>'calculated_sales_tl')::numeric,
    nullif(r->>'source_report_date', '')::date, now()
  )
  on conflict (station_id, dept_id, report_date) do update set
    gasoline_liters     = excluded.gasoline_liters,
    diesel_liters       = excluded.diesel_liters,
    lpg_liters          = excluded.lpg_liters,
    total_liters        = excluded.total_liters,
    total_sales_tl      = excluded.total_sales_tl,
    discount_points_tl  = excluded.discount_points_tl,
    card_sales_tl       = excluded.card_sales_tl,
    cash_sales_tl       = excluded.cash_sales_tl,
    tts_tl              = excluded.tts_tl,
    partner_tl          = excluded.partner_tl,
    gift_tl             = excluded.gift_tl,
    fault_form_tl       = excluded.fault_form_tl,
    company_tl          = excluded.company_tl,
    alioglu_tl          = excluded.alioglu_tl,
    diesel_unit_price   = excluded.diesel_unit_price,
    gasoline_unit_price = excluded.gasoline_unit_price,
    lpg_unit_price      = excluded.lpg_unit_price,
    calculated_sales_tl = excluded.calculated_sales_tl,
    source_report_date  = excluded.source_report_date,
    updated_at          = now()
  returning id into v_report_id;

  -- 3. changed_fields diff (yalnızca update)
  select to_jsonb(t.*) into v_newrow from sales_daily_reports t where t.id = v_report_id;
  if v_previous is not null then
    select jsonb_object_agg(o.key, jsonb_build_object('old', o.value, 'new', v_newrow->o.key))
      into v_changed
    from jsonb_each(v_previous) o
    where o.value is distinct from (v_newrow->o.key)
      and o.key not in ('id', 'created_at', 'updated_at', 'last_import_run_id');
  end if;

  -- 4. Audit kaydı
  insert into sales_import_runs (
    sales_daily_report_id, config_id, station_id, dept_id, report_date,
    daily_file_name, summary_file_name, config_snapshot, parsed_values,
    previous_values, changed_fields, warnings, status, imported_at
  ) values (
    v_report_id, v_config_id, v_station_id, v_dept_id, v_report_date,
    coalesce(payload->>'daily_file_name', ''), coalesce(payload->>'summary_file_name', ''),
    coalesce(payload->'config_snapshot', '{}'::jsonb),
    coalesce(payload->'parsed_values', '{}'::jsonb),
    v_previous, v_changed,
    coalesce(payload->'warnings', '[]'::jsonb),
    'applied', now()
  ) returning id into v_run_id;

  -- 5. last_import_run_id
  update sales_daily_reports set last_import_run_id = v_run_id where id = v_report_id;

  return jsonb_build_object(
    'report_id', v_report_id,
    'run_id', v_run_id,
    'action', v_action,
    'changed_fields', coalesce(v_changed, '{}'::jsonb)
  );
end;
$$;

grant execute on function apply_sales_import(jsonb) to anon, authenticated;
