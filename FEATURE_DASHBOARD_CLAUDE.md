# Satış Dashboard — Backlog

İteratif tamamlanmak üzere düzenlenmiş plan. Her madde tek başına yapılabilir ve
doğrulanabilir; sıra bağımlılıkları "Bağımlılık" satırında. İşaret: `[ ]` açık,
`[~]` devam, `[x]` bitti.

## Context

`FEATURE_DASHBOARD.md`, mevcut Vardiya Yönetimi uygulamasına yeni bir **Satış
Dashboard** ekranı ekleme isteğini tanımlıyor. İhtiyaç: istasyon/departman/gün
bazında akaryakıt satış verisini iki Excel dosyasından (Günlük Rapor + Özet) içe
aktarmak, bir konfigürasyon (hücre/formül mapping) ile parse etmek, kullanıcı
onayıyla Supabase'e yazmak ve bu veriden operasyonel bir dashboard (KPI + grafik
+ tablolar) üretmek. Tasarım referansı: `docs/assets/sales-dashboard-mockup.png`
(3 sekme: Dashboard / İçe Aktar / Konfigürasyon). Mevcut açık tema, sol menü ve
tasarım sistemi korunur; yeni chart bağımlılığı eklenmez (native SVG/CSS).

### Onaylanmış kararlar

- **Excel dosyaları:** `docs/tmp-analysis/` altında sağlandı (`gunluk.xlsx`,
  `ozet.xls`, referans `dashboard.xlsx`). Seed mapping ham hücrelerden doğrulandı
  (aşağıdaki tablo). `dashboard_mapping_report.md` bozuk/geçersiz — dikkate alınmadı.
- **Migration:** `supabase/` altına idempotent `.sql` yazılır **ve** Supabase MCP
  ile remote DB'ye (`project_ref=sxogtwqlcldyydiadtdz`) uygulanır.
- **Teslimat:** Fazlı/iteratif. Faz 1 = veri katmanı + İçe Aktar + Konfigürasyon.
  Faz 2 = Dashboard sekmesi (KPI + grafik).
- `sales_daily_reports` `station_id`/`dept_id` için FK kullanır (doc kararı;
  `shifts` text-snapshot deseninden farklı, raporlama için uygun). RLS kapalı
  kalır (mevcut projeyle tutarlı). RPC anon-çağrılabilir normal fonksiyon olur.
- Tek **system seed config** eklenir; doc'taki iki isim sadece örnek (config
  istasyona kilitli değil).

---

## Kaynak Dosya Doğrulaması (ham dosyalardan okundu)

`docs/tmp-analysis/` parse edildi; seed config'in TÜM hücre referansları golden
değerleri birebir üretiyor — ek karar gerekmiyor.

- `gunluk.xlsx`: sheet'ler `Sayfa1`/`Sayfa2`/`Sayfa3` → ilk sheet `Sayfa1`.
  `ozet.xls`: tek sheet `Sheet1`. Seed'teki `daily/summary_sheet_name = NULL`
  (ilk sheet default) doğru.

| Hedef alan | Kaynak | Okunan değer |
|---|---|---|
| source_report_date | daily.G1 (serial 46143) | 2026-05-01 |
| gasoline_liters | daily.G3 | 12.963,84 |
| diesel_liters | daily.G4 | 16.794,03 |
| lpg_liters | daily.G5 | 1.386,23 |
| total_liters (türetilmiş) | G3+G4+G5 | 31.144,10 ✓ |
| total_sales_tl | daily.C16 | 2.064.817,77 ✓ |
| card_sales_tl | daily.G16+G17 | 1.317.641,72 (= C4) |
| cash_sales_tl | daily.C42 | 281.355,00 |
| tts_tl | daily.C21 | 455.881,31 |
| partner_tl | daily.C22 | 0 |
| gift_tl | daily.C23 | 6.184,29 |
| fault_form_tl | daily.C24 | 0 ✓ |
| company_tl | daily.C25 | 3.756,57 ✓ |
| alioglu_tl | daily.C26 | 0 |
| discount_points_tl | summary.N26+O26 | 9.861,11 ✓ |

- `card_sales_tl` için `G16+G17`, `C4` ile aynı sonucu veriyor (1.317.641,72) —
  belirsizlik yok.
- Referans `dashboard.xlsx` `Data!2:2` = bu import + manuel fiyatların
  (Dizel 71.54 / Benzin 63.62 / LPG 36.35) beklenen uçtan uca çıktısı.
  KPI/hesap formülleri: `calculated_sales_tl = dizel*motorin + benzin*benzin_litre
  + lpg*lpg ≈ 2.076.594`, `Kart Oranı = card/total = 0,638`,
  `Ortalama TL/L = total/litre = 66,30`.

---

## Backlog — Faz 1 (veri girişi uçtan uca)

### [x] SD-01 — DB şeması + seed config (migration + MCP apply)
- **Bağımlılık:** yok
- **Kapsam:** `supabase/create_sales_dashboard.sql` (idempotent, Türkçe başlık
  yorumu, `disable row level security`): `sales_import_configs`,
  `sales_daily_reports` (`unique(station_id,dept_id,report_date)`, integer FK →
  `stations(id)`/`departments(id)`), `sales_import_runs`, doc'taki indeksler.
  Seed system config (`name='Standart Akaryakıt'`, `status='active'`,
  `is_system=true`, sheet adları NULL, `mappings` jsonb = doğrulanmış seed eşlemesi;
  her giriş `{ target, source, formula }`). Idempotent seed (`where not exists`).
- **Dosyalar:** `supabase/create_sales_dashboard.sql` (yeni).
- **DoD:** MCP `apply_migration` ile uygulandı; `list_tables`/`list_migrations`
  3 tabloyu + indeksleri + seed config satırını gösteriyor; `npm.cmd run build` temiz.

### [x] SD-02 — `apply_sales_import` RPC
- **Bağımlılık:** SD-01
- **Kapsam:** `create or replace function apply_sales_import(payload jsonb) returns jsonb`.
  payload'dan scope + parsed_values + config snapshot + dosya adları + warnings +
  türetilmiş alanlar okunur → mevcut satır okunur (previous/changed) →
  `insert … on conflict (station_id,dept_id,report_date) do update` →
  `sales_import_runs` audit (`status='applied'`) → `last_import_run_id` güncellenir.
  Tek transaction; sonuç jsonb (report id + run id + action).
- **Dosyalar:** aynı migration dosyasına eklenir (veya `supabase/..._rpc.sql`).
- **DoD:** MCP `execute_sql` ile örnek payload çağrısı insert+update+audit üretiyor;
  ikinci çağrı update + changed_fields diff üretiyor.

### [x] SD-03 — Tipler + DB erişim katmanı
- **Bağımlılık:** SD-01 (tablolar), SD-02 (rpc)
- **Kapsam:** `types/index.ts`: `ViewId += 'satis'`; `SalesImportConfig`,
  `SalesConfigStatus`, `SalesMapping`, `SalesDailyReport`, `SalesImportRun`,
  `SalesImportScope`, `SalesImportPlan`. `db.ts` (snake→camel mapper deseni):
  `fetchSalesConfigs/createSalesConfig/updateSalesConfig/setSalesConfigStatus`
  (system config update/delete guard), `fetchSalesReports`, `applySalesImport`
  (ilk `.rpc()` kullanımı).
- **Dosyalar:** `src/types/index.ts`, `src/lib/db.ts`.
- **DoD:** `npm.cmd run build` temiz; fetchSalesConfigs seed config'i döndürüyor.

### [x] SD-04 — Excel parse + cell-ref reader + formül evaluator
- **Bağımlılık:** SD-03 (tipler)
- **Kapsam:** `src/lib/salesParse.ts`. `excel.ts` grid desenini kullan
  (`XLSX.read` + `sheet_to_json({header:1})`). Cell-ref reader (`"C16"`→`[row,col]`).
  Whitelist evaluator (hücre ref / sayı / `+ - * /` / parantez; SUM/IF/fonksiyon/
  sheet ref/dış dosya/metin/JS = hata). Sheet seçimi (boş→ilk, dolu→zorunlu).
  **Tarih (kritik):** `daily.G1` serial olarak okunup `XLSX.SSF.parse_date_code`
  ile yerel `YYYY-MM-DD` (cellDates JS Date kaymasını kullanma).
- **Dosyalar:** `src/lib/salesParse.ts` (yeni).
- **DoD:** `docs/tmp-analysis/gunluk.xlsx`+`ozet.xls` seed config ile parse →
  doğrulama tablosundaki tüm golden değerler (tarih=2026-05-01 kaymasız) çıkıyor.

### [x] SD-05 — Import plan/preview mantığı
- **Bağımlılık:** SD-04, SD-03
- **Kapsam:** `src/lib/salesImport.ts` (şablon: `scheduleImport.ts`).
  `buildSalesImportPlan({ dailyFile, summaryFile, config, scope, prices })`:
  bloklayıcılar (eksik config/dosya/fiyat, hatalı formül, eksik zorunlu mapping,
  okunamayan hücre); türetilmiş (`total_liters`, `calculated_sales_tl`); uyarılar
  (tarih≠G1, özet aralığı uyuşmazlığı, mevcut kayıt+diff); `canApply`.
  `applySalesImport(plan)` → tek RPC çağrısı.
- **Dosyalar:** `src/lib/salesImport.ts` (yeni).
- **DoD:** Golden dosyalarla `canApply=true` + doğru değerler; eksik fiyat/hatalı
  formül/yanlış sheet senaryoları bloklanıyor.

### [x] SD-06 — Routing + ekran kabuğu + Tabs
- **Bağımlılık:** SD-03 (ViewId)
- **Kapsam:** `ui/Tabs.tsx` (yeni, `.segment` desenini genişlet / `.tabs` CSS).
  `sales/SalesScreen.tsx` (3 sekme kabı). Sidebar `NAV` += `{id:'satis',
  label:'Satış Dashboard', icon:'chart'}`. `App.tsx` `switch` += `case 'satis'`;
  stations/departments + sales config state props geçişi; ilk yüklemede config'leri
  `Promise.all`'a ekle.
- **Dosyalar:** `src/components/ui/Tabs.tsx`, `src/components/sales/SalesScreen.tsx`
  (yeni); `Sidebar.tsx`, `App.tsx`, `index.css`.
- **DoD:** Sol menüden "Satış Dashboard" açılıyor, 3 sekme arası geçiş çalışıyor
  (içerikler placeholder); `npm.cmd run build` temiz.

### [x] SD-07 — Konfigürasyon sekmesi
- **Bağımlılık:** SD-03, SD-06, SD-04 (formül testi)
- **Kapsam:** `sales/SalesConfigTab.tsx`. Sol: config listesi (durum + system
  işareti). Sağ: ad, sheet adları, mapping tablosu [Hedef/Kaynak/Formül],
  `Kopyala`/`Kaydet`/`Dosyayla Test Et`, Aktif/Pasif. Tam sekme (modal değil).
  Aktivasyon kuralları (zorunlu mapping + whitelist formül); hatalı config
  kaydedilir ama `active` yapılamaz; system config düzenlenemez/silinemez (kopyala).
- **Dosyalar:** `src/components/sales/SalesConfigTab.tsx` (yeni).
- **DoD:** Seed config görünür/kopyalanabilir; yeni config kaydet/aktive et; geçersiz
  config aktive edilemiyor; "Dosyayla Test Et" golden dosyada değerleri gösteriyor.

### [ ] SD-08 — İçe Aktar sekmesi (uçtan uca)
- **Bağımlılık:** SD-05, SD-02, SD-06, SD-07
- **Kapsam:** `sales/SalesImportTab.tsx` (`ScheduleImportModal` UX'i tam sekme).
  İstasyon/Departman/Tarih (`Select`, station→dept filtre), aktif config dropdown,
  3 fiyat input (`Field`/`Input`), iki dosya yükleme, preview (parse değerleri +
  uyarılar + eski/yeni diff + `Uygula`). `Uygula` → RPC.
- **Dosyalar:** `src/components/sales/SalesImportTab.tsx` (yeni).
- **DoD:** Golden dosyalarla import → `sales_daily_reports` satırı + audit yazılıyor;
  tekrar import update + diff; preview değerleri golden ile eşleşiyor.

---

## Backlog — Faz 2 (dashboard)

### [ ] SD-09 — Dashboard view'ları
- **Bağımlılık:** SD-01 (+ SD-08 ile veri)
- **Kapsam:** `sales_dashboard_daily_view` (günlük normalize + satır türetmeleri),
  `sales_dashboard_monthly_view` (`date_trunc('month',report_date)` + station/dept
  bazında KPI: Toplam Satış, Toplam Litre, Kart Oranı=Σcard/Σtotal,
  Ortalama TL/L=Σtotal/Σliter).
- **Dosyalar:** migration `.sql` (yeni veya mevcut dosyaya ekle) + MCP apply.
- **DoD:** View'lar import edilen golden satır için KPI'ları doğru döndürüyor
  (Kart Oranı≈0,638, TL/L≈66,30).

### [ ] SD-10 — Native grafik bileşenleri
- **Bağımlılık:** yok (saf bileşen)
- **Kapsam:** `sales/charts/LineChart.tsx` (`<polyline>`),
  `sales/charts/BarChart.tsx` (`<rect>`); renkler `index.css` token'larından.
- **Dosyalar:** `src/components/sales/charts/{LineChart,BarChart}.tsx` (yeni).
- **DoD:** Örnek veriyle render; responsive; `npm.cmd run build` temiz.

### [ ] SD-11 — Dashboard sekmesi
- **Bağımlılık:** SD-09, SD-10, SD-06
- **Kapsam:** `sales/SalesDashboardTab.tsx`. Filtreler (İstasyon/Departman/Ay/
  opsiyonel gün). KPI kartları (`ui/Stat.tsx`) monthly view'dan. Tablolar (günlük
  özet, yakıt litre — `.tbl`/`.table-wrap`). Grafikler (Günlük Toplam Satış line,
  Ödeme Dağılımı bar, Günlük Litre Trendleri line).
- **Dosyalar:** `src/components/sales/SalesDashboardTab.tsx` (yeni).
- **DoD:** Dashboard mockup'a yakın render; KPI/tablo/grafik DB değerleriyle eşleşiyor;
  dev server + preview ile görsel doğrulama; `npm.cmd run build` temiz.

---

## Reuse haritası

| İhtiyaç | Reuse |
|---|---|
| Excel grid okuma | `src/lib/excel.ts` (`XLSX.read` + `sheet_to_json({header:1})`) |
| İçe aktar UX/plan deseni | `src/components/modals/ScheduleImportModal.tsx`, `src/lib/scheduleImport.ts` |
| İsim/değer normalize | `src/constants/index.ts` (`normalizeScheduleName`, `dateToStr`) |
| DB query/mapper deseni | `src/lib/db.ts` |
| KPI kartı | `src/components/ui/Stat.tsx` |
| Filtre/dropdown + station→dept filtre | `src/components/ui/Select.tsx`, EmployeesScreen/ImportModal |
| Form alan + validasyon | `src/components/ui/Field.tsx` |
| Buton/badge/empty | `ui/Button.tsx`, `ui/Badge.tsx`, `ui/EmptyState.tsx` |
| Renk/spacing token | `src/index.css` `:root` |

## Genel "bitti" kriteri

- Her madde sonunda `npm.cmd run build` (tsc + vite) temiz.
- Faz 1 kabul: golden dosyalar import edildiğinde `sales_daily_reports` satırı +
  `sales_import_runs` audit, doğrulama tablosundaki değerlerle birebir; tekrar
  import update akışı + diff çalışır; bloklayıcı senaryolar (yanlış sheet / hatalı
  formül / eksik fiyat / eksik dosya) engellenir.
- Faz 2 kabul: view'lar beklenen aylık/günlük KPI'ları döndürür; dashboard
  kartları/tabloları/grafikleri DB değerleriyle eşleşir; mockup ile görsel uyum.
