-- ============================================================
-- Satış Dashboard — View'lar (SD-09)
-- Dashboard KPI/grafik datasını merkezi hesaplar.
-- Supabase Dashboard > SQL Editor veya MCP apply_migration ile çalıştırın.
-- ============================================================

-- ---- Günlük normalize view (satır bazında türetmeler) ----
-- security_invoker: view sorgulayan rolün izinleriyle çalışır (definer değil).
create or replace view sales_dashboard_daily_view with (security_invoker = true) as
select
  r.id,
  r.station_id,
  s.name as station_name,
  r.dept_id,
  d.name as dept_name,
  r.report_date,
  (date_trunc('month', r.report_date))::date as month,
  r.gasoline_liters,
  r.diesel_liters,
  r.lpg_liters,
  r.total_liters,
  r.total_sales_tl,
  r.card_sales_tl,
  r.cash_sales_tl,
  r.tts_tl,
  r.partner_tl,
  r.gift_tl,
  r.fault_form_tl,
  r.company_tl,
  r.alioglu_tl,
  r.discount_points_tl,
  r.diesel_unit_price,
  r.gasoline_unit_price,
  r.lpg_unit_price,
  r.calculated_sales_tl,
  case when r.total_sales_tl <> 0 then round(r.card_sales_tl / r.total_sales_tl, 4) else 0 end as card_ratio,
  case when r.total_liters  <> 0 then round(r.total_sales_tl / r.total_liters, 4)  else 0 end as avg_tl_per_liter
from sales_daily_reports r
join stations s    on s.id = r.station_id
join departments d on d.id = r.dept_id;

-- ---- Aylık KPI view (ay + istasyon + departman bazında toplamlar) ----
create or replace view sales_dashboard_monthly_view with (security_invoker = true) as
select
  (date_trunc('month', r.report_date))::date as month,
  r.station_id,
  s.name as station_name,
  r.dept_id,
  d.name as dept_name,
  count(*)                     as day_count,
  sum(r.total_sales_tl)        as total_sales_tl,
  sum(r.total_liters)          as total_liters,
  sum(r.gasoline_liters)       as gasoline_liters,
  sum(r.diesel_liters)         as diesel_liters,
  sum(r.lpg_liters)            as lpg_liters,
  sum(r.card_sales_tl)         as card_sales_tl,
  sum(r.cash_sales_tl)         as cash_sales_tl,
  sum(r.tts_tl)                as tts_tl,
  sum(r.partner_tl)            as partner_tl,
  sum(r.gift_tl)               as gift_tl,
  sum(r.fault_form_tl)         as fault_form_tl,
  sum(r.company_tl)            as company_tl,
  sum(r.alioglu_tl)            as alioglu_tl,
  sum(r.discount_points_tl)    as discount_points_tl,
  sum(r.calculated_sales_tl)   as calculated_sales_tl,
  case when sum(r.total_sales_tl) <> 0 then round(sum(r.card_sales_tl) / sum(r.total_sales_tl), 4) else 0 end as card_ratio,
  case when sum(r.total_liters)  <> 0 then round(sum(r.total_sales_tl) / sum(r.total_liters), 4)  else 0 end as avg_tl_per_liter
from sales_daily_reports r
join stations s    on s.id = r.station_id
join departments d on d.id = r.dept_id
group by (date_trunc('month', r.report_date))::date, r.station_id, s.name, r.dept_id, d.name;

grant select on sales_dashboard_daily_view   to anon, authenticated;
grant select on sales_dashboard_monthly_view to anon, authenticated;
