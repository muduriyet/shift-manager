# Codex Transfer Prompt

Bu repo üzerinde POS Envanteri ekranını uygulamanı istiyorum.

Önce şu paketi oku:

- `docs/pos-inventory-handoff/README.md`
- `docs/pos-inventory-handoff/pos-inventory-seed.json`
- `docs/pos-inventory-handoff/pos-inventory-dashboard-concept.png`
- `docs/pos-inventory-handoff/pos-new-record-modal-concept.png`

Bağlam:

- Kullanıcı, istasyonlardaki POS cihazlarını uygulamada takip etmek istiyor.
- Kaynak Excel: `C:/Users/mehme/OneDrive/Desktop/coskun_petrol_pos_envanteri_renkli.xlsx`
- Onaylanan yaklaşım: Excel ilk veriyi sağlar, uygulama sonrasında editable source of truth olur.
- V1 kapsamı: Dashboard + table + add/edit modal + Excel import.
- V1 tek tek cihaz seri numarası takip etmeyecek; banka/provider bazlı aggregate kayıt tutacak.
- UI dili Türkçe olmalı ve mevcut app stiline uymalı.

Önemli doğrular:

- Seed toplamları: Toplam POS `38`, Aktif `22`, Pasif `16`, Kurulum Bekleyen `4`.
- `Kurulum Bekleyen`, `Beko 430TR — Kurulum yapılacak` satırlarından türetilir ve pasif cihazların alt kümesidir.
- Yeni POS modalında `active_count + passive_count === pos_count` ve `setup_pending_count <= passive_count` validasyonu olmalı.

Uygulamaya başlamadan önce mevcut yapıyı oku:

- `src/App.tsx`
- `src/types/index.ts`
- `src/lib/db.ts`
- `src/components/layout/Sidebar.tsx`
- `src/index.css`
- Benzer ekran örnekleri: `src/components/sales/SalesScreen.tsx`, `src/components/reports/ReportsScreen.tsx`

Beklenen çıktı:

- Supabase migration/schema dosyası
- TypeScript tipleri ve DB helper fonksiyonları
- Sidebar navigation item
- `PosInventoryScreen`
- `PosInventoryModal`
- Excel import parser/preview/apply flow
- Build/test doğrulaması

