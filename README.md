# Vardiya Yönetimi

İki istasyonlu (Ümraniye, Şile), her istasyonda iki departmanlı (Akaryakıt, Market) bir akaryakıt işletmesi için Türkçe operasyon uygulaması.

Uygulama vardiya çizelgesi, personel yönetimi, günlük devam kontrolü, raporlar ve akaryakıt satış dashboard'unu tek arayüzde toplar. Giriş Supabase Auth üzerinden kullanıcı adı + parola ile yapılır.

## Teknoloji

- **Frontend:** React 18 + TypeScript (strict), Vite 5
- **Backend:** Supabase Auth + hosted PostgreSQL
- **Güvenlik:** Supabase RLS açık; authenticated kullanıcılar için tam erişim politikaları
- **Grafikler:** Recharts
- **Excel:** `xlsx` ile çizelge import/export ve satış raporu import'u
- **Deploy:** Vercel (SPA rewrites yapılandırıldı)

## Başlarken

### Gereksinimler

- Node.js 18+
- Supabase projesi
- En az bir Supabase Auth kullanıcısı

### Kurulum

```bash
npm install
```

`.env.local` dosyası oluştur:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Supabase'de şemayı oluştur:

```text
Supabase Dashboard > SQL Editor'de sırayla çalıştır:
1. supabase/schema.sql
2. supabase/create_sales_dashboard.sql
3. supabase/create_sales_dashboard_views.sql
```

Supabase Auth'ta kullanıcı oluştur:

- Login ekranı kullanıcı adını sentetik e-postaya çevirir: `<kullanici>@coskunpetrol.com.tr`
- Örnek: `mert` kullanıcı adı için Auth e-postası `mert@coskunpetrol.com.tr`
- Parola Supabase Auth kullanıcısında tanımlanan paroladır

Mevcut eski veritabanları için opsiyonel migration dosyaları:

- `supabase/add_employee_shift_schedule_names.sql`
- `supabase/update_seed_config_cash_lookup.sql`
- `supabase/update_seed_config_discount_lookup.sql`

Uygulamayı başlat:

```bash
npm run dev
```

## Ekranlar

| Ekran | Açıklama |
|---|---|
| Giriş | Supabase Auth kullanıcı adı/parola girişi, oturum kontrolü ve çıkış |
| Vardiya Çizelgesi | Aylık/haftalık planlama grid'i + Excel içe/dışa aktarım |
| Personel Listesi | Personel CRUD, işe giriş/çıkış tarihleri, soft delete (Aktif/Pasif filtre) |
| Günlük Kontrol | Günlük devam durumu takibi (varsayılan: dün) |
| Raporlar | Devam oranı, departman bazlı devam, gelmeyen personel + Excel export |
| Satış Dashboard | Günlük/özet satış Excel import'u, import konfigürasyonu, KPI/grafikler ve veri gezgini |
| Ayarlar | İstasyon, departman, görev ekle/sil ve vardiya saatleri |

## Vardiya Kodları

| Kod | Ad | Saat |
|---|---|---|
| S | Sabah | 08:00 - 16:00 |
| Ö | Öğlen | 16:00 - 00:00 |
| G | Gece | 00:00 - 08:00 |
| Öz | Özel | serbest saat |
| İ | İzin | - |
| Yİ | Yıllık İzin | - |
| Üİ | Ücretsiz İzin | - |
| İs | İstirahat | - |
| - | Boş | - |

## Proje Yapısı

```text
src/
  App.tsx                        # Auth gate, global state, ekran yönlendirme
  components/
    auth/     LoginScreen
    layout/   Sidebar, TopbarMobile, ToastStack
    schedule/ ScheduleScreen, WeeklyView, MonthlyView, CodeLegend
    daily/    DailyScreen
    employees/EmployeesScreen
    reports/  ReportsScreen
    sales/    SalesScreen, import/config/dashboard/explore sekmeleri, chart bileşenleri
    settings/ SettingsScreen
    modals/   ShiftModal, EmployeeModal, ScheduleImportModal, ScheduleExportModal
    ui/       Button, Badge, Avatar, Select, Field, Dialog, Stat, Icon, EmptyState, DropdownButton
  lib/
    supabase.ts        Supabase istemcisi + Auth yardımcıları
    db.ts              Tüm DB fonksiyonları, satış RPC çağrısı
    excel.ts           Ortak lazy xlsx export yardımcısı
    scheduleImport.ts  Excel'den çizelge import (parse, doğrulama, plan)
    scheduleExport.ts  Çizelgeyi template'li Excel'e export
    salesParse.ts      Satış Excel formül/hücre parse katmanı
    salesImport.ts     Satış import planı + apply_sales_import RPC akışı
    salesExplore.ts    Satış veri gezgini dönüşümleri
  types/index.ts       TypeScript tip tanımları
  constants/           Vardiya kodları, sabitler, tarih araçları
  index.css            Tasarım token'ları ve tüm stiller
public/
  templates/vardiya-export-template.xlsx
  coskun-petrol-watermark.png
supabase/
  schema.sql                         Çekirdek vardiya/personel şeması + RLS
  create_sales_dashboard.sql         Satış tabloları, seed config, RPC + RLS
  create_sales_dashboard_views.sql   Satış dashboard view'ları
```

## Deploy

Vercel'e bağlı bir repoda otomatik deploy çalışır. Environment variable'ları Vercel dashboard'dan ekle:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Canlı ortamda Supabase Auth kullanıcılarının oluşturulduğundan ve SQL dosyalarının hedef Supabase projesinde çalıştırıldığından emin olun.
