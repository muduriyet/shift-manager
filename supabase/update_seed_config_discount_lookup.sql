-- ============================================================
-- Seed config: discount_points_tl eşlemesini ARA() lookup'a çevir.
-- Eski: summary N26+O26 (sabit hücre)
-- Yeni: ARA("Genel Toplam", H) + ARA("Genel Toplam", I)
--   → Özet'te B sütununda "Genel Toplam" satırını bulup H+I toplar (satır kaymalarına dayanıklı).
-- Sıfırdan kurulumlarda create_sales_dashboard.sql zaten yeni formülü içerir; bu dosya
-- mevcut DB'deki seed satırını günceller. Idempotent.
-- ============================================================

update sales_import_configs
set mappings = (
  select jsonb_agg(
    case when elem->>'target' = 'discount_points_tl'
      then jsonb_set(elem, '{formula}', '"ARA(\"Genel Toplam\", H) + ARA(\"Genel Toplam\", I)"'::jsonb)
      else elem end
    order by ord
  )
  from jsonb_array_elements(mappings) with ordinality as arr(elem, ord)
),
updated_at = now()
where name = 'Standart Akaryakıt' and is_system = true;
