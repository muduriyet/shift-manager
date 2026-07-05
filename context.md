# Proje Bağlamı

## İşletme

İki istasyonlu (Ümraniye, Şile) bir akaryakıt şirketi. Her istasyonun iki departmanı var: Akaryakıt ve Market. Toplam ~26 aktif personel dört grup oluşturur.

Vardiya kontrolleri bir gün gecikmeli yapılır — 11 Haziran'ın devam kontrolü 12 Haziran'da gerçekleşir. Bu yüzden Günlük Kontrol ekranı varsayılan olarak dünü gösterir.

---

## Auth / Güvenlik

Uygulama artık Supabase Auth oturumu olmadan veri çekmez. Açılışta mevcut oturum okunur; oturum yoksa `LoginScreen` gösterilir, oturum varsa lookup/personel/vardiya/satış config verileri yüklenir. Çıkışta App belleğindeki veri temizlenir ve login ekranına dönülür.

Login ekranı kullanıcı adını sabit şirket domainiyle sentetik e-postaya çevirir:

- `usernameToEmail("mert")` → `mert@coskunpetrol.com.tr`
- Kullanıcı UI'da yalnızca kullanıcı adı ve parola girer
- Supabase Auth tarafında e-posta/parola kullanıcısı önceden oluşturulmuş olmalıdır

RLS çekirdek ve satış tablolarında açıktır. Mevcut politika modeli bilinçli olarak kaba tanelidir: `authenticated` rolündeki kullanıcılar tüm satırlara tam erişir. Şube/departman bazlı ince taneli yetkilendirme sonraki mimari adımlara bırakılmıştır.

---

## Veri Modeli

### Lookup tabloları: `stations`, `departments`, `roles`

İstasyon, departman ve görev tanımları ayrı tablolarda tutulur (`id` + `name`; `departments` ayrıca `color`). `employees` bunlara FK ile bağlıdır ve Ayarlar ekranından eklenip silinebilir (bağlı personel varsa `on delete restrict` ile silme engellenir).

### `employees` tablosu

| Kolon | Tip | Açıklama |
|---|---|---|
| id | bigint PK | Otomatik artan |
| name | text | Ad soyad (UI'da gösterilen) |
| shift_name | text | Vardiya İsmi — opsiyonel kısa ad |
| schedule_name | text | Çizelge İsmi — Excel import'ta isim eşleştirmesi için |
| station_id | int FK | `stations.id` (on delete restrict) |
| dept_id | int FK | `departments.id` (on delete restrict) |
| role_id | int FK | `roles.id` (on delete restrict) |
| is_active | boolean | Aktif (true) / Pasif (false) — silme yerine soft delete |
| start_date | date NULL | İşe giriş tarihi (boşsa kısıtlama yok) |
| end_date | date NULL | İşten çıkış tarihi (boşsa kısıtlama yok) |

> Uygulama katmanı istasyon/departman/görevle **isimle** çalışır; FK id'leri okuma sırasında embedded join ile isme çözülür. `shifts` ise station/dept/role'ü bilerek **text snapshot** olarak tutar (aşağı bkz).

### `shifts` tablosu

| Kolon | Tip | Açıklama |
|---|---|---|
| id | bigint PK | |
| emp_id | bigint FK | `employees.id`, **ON DELETE RESTRICT** (vardiyası olan personel silinemez) |
| shift_date | text | `YYYY-MM-DD` formatında |
| day_index | integer | 0=Pzt…6=Paz, `shift_date`'ten türetilir |
| code | text | Vardiya kodu (`S`, `Ö`, `G`, `Öz`, `İ`, `Yİ`, `Üİ`, `İs`, `-`) |
| start_time | text | `HH:MM`, izin kodlarında boş string |
| end_time | text | `HH:MM`, izin kodlarında boş string |
| role / station / dept | text | O günkü atamanın tarihsel snapshot'ı (lookup değişse de sabit kalır) |
| status | text | `Planlandı` \| `Geldi` \| `Gelmedi` (DB check constraint ile sınırlı) |
| note | text | |

**Kısıtlar:** `unique(emp_id, shift_date)` (tarihli kayıtlar için) bir personel/gün için tek vardiyayı garanti eder; `shifts_status_check` geçersiz status değerini DB'de engeller.

### Satış tabloları

Satış Dashboard ayrı tablolar ve view'lar kullanır; vardiya tablolarını değiştirmez.

| Tablo / View | Amaç |
|---|---|
| `sales_import_configs` | Günlük/özet Excel dosyalarından hangi hücre/formüllerin okunacağını tanımlar. `is_system=true` seed config uygulama katmanında korunur. |
| `sales_daily_reports` | İstasyon + departman + tarih bazında normalize günlük satış satırı. Aynı kapsam için tek satır (`unique(station_id, dept_id, report_date)`). |
| `sales_import_runs` | Her "Uygula" aksiyonu için audit kaydı; dosya adları, config snapshot, parsed değerler, uyarılar ve değişen alanlar saklanır. |
| `sales_dashboard_daily_view` | Dashboard ve veri gezgini için günlük normalize view; kart oranı ve litre başı ortalama gibi türev alanları üretir. |
| `sales_dashboard_monthly_view` | Aylık/istasyon/departman toplamları için merkezi view. |

`apply_sales_import(payload jsonb)` RPC tek transaction içinde günlük satış raporunu insert/update eder, audit kaydı oluşturur ve `last_import_run_id` alanını günceller.

---

## Temel Kurallar

### Tek Tablo Mimarisi

`shifts` tablosu hem haftalık hem aylık görünümün tek kaynağıdır. `employee_month_codes` tablosu artık yok.

### Boş Hücre Kuralı

**Kayıt yok = `-` (boş/atanmamış).** İzin kodları (`İ`, `Yİ`, `Üİ`, `İs`) veritabanında `start_time=''`, `end_time=''` ile açık kayıt olarak tutulur. `-` seçildiğinde varsa mevcut kayıt silinir.

### Çalışma Kodları

`WORK_CODES = ['S', 'Ö', 'G', 'Öz']` — sadece bu kodlar:
- Devam durumu (`Geldi`/`Gelmedi`) taşır
- Günlük Kontrol'de listelenir
- İstatistik kartlarında sayılır
- `handleSetStatus` tarafından işlenir

### Vardiya Saatleri

| Kod | Başlangıç | Bitiş |
|---|---|---|
| S — Sabah | 08:00 | 16:00 |
| Ö — Öğlen | 16:00 | 00:00 |
| G — Gece | 00:00 | 08:00 |
| Öz — Özel | serbest | serbest |

`Öz` (Özel) serbest saatli bir çalışma vardiyasıdır: sabit şablonu yoktur, saatler vardiya kaydından gelir ve `WORK_CODES`'a dahildir. `codeFromTimes(start, end)` üç sabit şablonu kodlara çevirir; **şablon dışı geçerli saat → `Öz`**, boş saat → `-`. (`Öz` aylık grid hızlı-seçicisinde yer almaz, yalnızca modaldan özel saatle oluşturulur.)

### Personel Tarih Kısıtlamaları

İstihdam penceresi tek bir kuraldan türetilir: `isWithinEmployment(startDate, endDate, dateStr)`. `start_date` veya `end_date` doluysa:
- `setCode` ve ShiftModal: aralık dışı tarihe atama yapılamaz (modal validasyonla reddeder)
- `MonthlyView`: bloke hücreler çizgili gri arka planla gösterilir, pill içeriği gizlenir
- Haftalık / Günlük / Raporlar: aralık dışı vardiyalar gizlenir ve sayılmaz
- Tekli seçim uyarısı: picker yerine kırmızı uyarı kutusu açılır; çoklu seçimde bloke hücreler sessizce atlanır
- **Personel tarihleri güncellendiğinde aralık dışındaki vardiyalar SİLİNMEZ** — DB'de korunur, görünümlerde `isWithinEmployment` ile gizlenir (geçmiş veri kaybı önlendi)

### Personel Silme (Soft Delete)

Personel fiziksel olarak silinmez; "Pasife Al" ile `is_active = false` yapılır (DB tarafında `shifts.emp_id on delete restrict` ile geçmiş ayrıca korunur). Pasif personel çizelge/günlük/yeni-vardiya akışlarından çıkar ama geçmiş vardiyaları raporlarda görünür. Personel Listesi'nde Aktif/Pasif/Tümü filtresi vardır (varsayılan: Aktif).

---

## Bileşen Mimarisi

```
App.tsx
├── Auth gate: getCurrentSession / onAuthChange / signOut
├── Global state: stations, departments, roles, employees, shifts, salesConfigs
├── Persisted UI state: view, schedule mode
├── codesOf(empId): shifts'ten aylık kodları türetir
├── setCode(id, idx, code): aylık grid'den hücre günceller/siler
├── handleSetStatus(shiftId, status): sadece WORK_CODES için çalışır
└── SalesScreen lazy import: satış kodu yalnızca satış sekmesine girilince yüklenir

ScheduleScreen
├── Haftalık/aylık mod seçimi
├── İstasyon/departman filtresi
├── Excel dropdown → ScheduleImportModal / ScheduleExportModal
└── MonthlyView | WeeklyView

MonthlyView
├── Excel tarzı çoklu hücre seçimi (mousedown → drag → mouseup → picker)
├── Uzun basış ile satır sürükleme (380ms → drag ghost)
├── Bloke hücre tespiti (activeMonth + emp.startDate/endDate)
└── GroupRows: hücre render, bloke sınıfı

DailyScreen
├── Varsayılan görünüm: dün (addDays(TODAY_DATE, -1))
└── Sadece WORK_CODES'lu vardiyaları listeler

SalesScreen
├── Sekmeler: Dashboard / İçe Aktar / Konfigürasyon / Veri Gezgini
├── Dashboard: sales_dashboard_daily_view üzerinden KPI + grafikler
├── İçe Aktar: günlük + özet Excel dosyası, preview, uyarı/hata, apply_sales_import RPC
├── Konfigürasyon: kullanıcı config oluşturma/güncelleme; system config doğrudan düzenlenmez
└── Veri Gezgini: grafik/pivot/ham tablo ve inline satış raporu düzenleme
```

---

## State Akışı

```
Supabase DB
    ↓ getCurrentSession / onAuthChange
LoginScreen veya App shell
    ↓ oturum varsa Promise.all(fetchStations, fetchDepartments, fetchRoles, fetchEmployees, fetchShifts, fetchSalesConfigs)
App.tsx state: stations[], departments[], roles[], employees[], shifts[], salesConfigs[]
    ↓ props
ScheduleScreen → MonthlyView / WeeklyView
    ↓ setCode / onShiftClick
App.tsx → createShift / updateShift / deleteShift → Supabase
    ↓ state update
shifts[] state güncellenir → re-render

SalesScreen → SalesImportTab
    ↓ buildSalesImportPlan (client-side parse/validation)
applySalesImportPlan → apply_sales_import RPC
    ↓ satış dashboard/view verisi tekrar okunur
```

DB yazma işlemleri çoğunlukla iyimser değil — önce DB, sonra state güncellenir; hata `toast` ile gösterilir. (`handleSetStatus` iyimser günceller, hatada geri alır.)

---

## Excel Import / Export

Çizelge ekranındaki **Excel** dropdown'ı iki akış sunar (`xlsx` dinamik import ile, ana bundle dışında):

- **Excel'e Aktar (FEAT-002):** Seçili şube/departman/ay için aylık çizelgeyi stilli Excel olarak indirir. `public/templates/vardiya-export-template.xlsx` template'i baz alınır (yalnızca `sheet1.xml` üretilen veriyle değiştirilir, stiller korunur). Personel bazlı kod toplamları + genel toplam içerir. Kod: `lib/scheduleExport.ts`.
- **Excel'den İçe Aktar (FEAT-001):** Sabit şablon formatında Excel yükleyerek seçili kapsamın aylık çizelgesini günceller. İsim eşleştirmesi `employees.schedule_name` (Çizelge İsmi) üzerinden Türkçe-normalize edilerek yapılır. Yazmadan önce önizleme/doğrulama gösterilir (eşleşen, oluştur/güncelle/sil sayıları, bloklayıcı kontroller, uyarılar) ve mevcut vardiya varsa checkbox onayı gerekir. `Öz` hücreleri korunur (serbest saat Excel'de temsil edilemez). Kod: `lib/scheduleImport.ts`.

Satış Dashboard ayrıca iki dosyalı import akışı sunar:

- **Günlük rapor + özet rapor:** `.xlsx/.xls` dosyaları seçilir, aktif import config'e göre hücre/formül değerleri okunur.
- **Preview/plan:** `buildSalesImportPlan` zorunlu alanları, birim fiyatları, kaynak rapor tarihini, mevcut kayıt farklarını ve uyarıları üretir.
- **Uygula:** `apply_sales_import` RPC tek transaction içinde upsert + audit yapar. Sistem seed config'i sıfır kurulumda `create_sales_dashboard.sql` içindedir; eski DB'ler için seed update SQL dosyaları vardır.

Ayrıntılı ürün kararları: `FEATURE_BACKLOG.md`, `FEATURE_DASHBOARD.md`, `LOGIN_FEATURE.md`.

---

## localStorage Kalıcılığı

| Anahtar | Değer | Açıklama |
|---|---|---|
| `vy_view` | ViewId | Son aktif ekran |
| `vy_mode` | `hafta` \| `ay` | Son aktif çizelge modu |
| `vy_sales_tab` | `dashboard` \| `import` \| `config` \| `explore` | Son aktif satış sekmesi |

`vy_view`, `vy_mode` ve `vy_sales_tab` okunurken guard'larla doğrulanır; bozuk/eski değer güvenli default'a düşer.

Personel sıra düzeni (`empOrder` MonthlyView'da) sadece oturum süresince tutulur, kalıcı değildir.

---

## Bilinen Sınırlamalar / Gelecek Adayları

- RLS açık ancak politika modeli geniş: her authenticated kullanıcı tüm verilere erişebilir. Şube/departman bazlı authorization henüz yok.
- `fetchShifts` açılışta tüm vardiyaları çeker; veri büyüyünce tarih-aralıklı sorguya geçilmesi planlanıyor.
- Satış dashboard verisi view üzerinden okunur; dashboard sekmesi şu an manuel refresh/yeni sekmeye girişle güncel veriyi alır, realtime yok.
- Personel satır sırası yalnızca oturum belleğinde; backend'e kaydedilmiyor
- Şube → Departman iç içe kapsam yapısı (yaklaşım B) planlanıyor ancak henüz uygulanmadı
