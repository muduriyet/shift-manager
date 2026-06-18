-- ============================================================
-- Seed config: cash_sales_tl eşlemesini ARA() lookup'a çevir.
-- Eski: daily C42 (sabit hücre)
-- Yeni: ARA("NAKİT SATIŞ", A, C)
--   → Günlük raporda A sütununda "NAKİT SATIŞ" satırını bulup C'deki tutarı alır.
--   Sabit C42, satırlar kaydığında "...HASILAT" satırına (ör. CUMARTESİ HASILAT)
--   denk gelip yanlış/yüksek değer okuyordu. Etiket-bazlı okuma buna dayanıklıdır.
-- Sıfırdan kurulumlarda create_sales_dashboard.sql zaten yeni formülü içerir; bu dosya
-- mevcut DB'deki seed satırını günceller. Idempotent.
-- ============================================================

update sales_import_configs
set mappings = (
  select jsonb_agg(
    case when elem->>'target' = 'cash_sales_tl'
      then jsonb_set(elem, '{formula}', '"ARA(\"NAKİT SATIŞ\", A, C)"'::jsonb)
      else elem end
    order by ord
  )
  from jsonb_array_elements(mappings) with ordinality as arr(elem, ord)
),
updated_at = now()
where name = 'Standart Akaryakıt' and is_system = true;
