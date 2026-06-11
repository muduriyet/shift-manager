# Vardiya Yönetimi

İki istasyon ve dört departmanı olan bir akaryakıt işletmesi için Türkçe vardiya yönetim uygulaması.

## Teknoloji

- **Frontend:** React 18 + TypeScript (strict), Vite 5
- **Backend:** Supabase (hosted PostgreSQL, doğrudan tarayıcıdan erişim)
- **Deploy:** Vercel (SPA rewrites yapılandırıldı)

## Başlarken

### Gereksinimler

- Node.js 18+
- Supabase projesi (ücretsiz plan yeterli)

### Kurulum

```bash
npm install
```

`.env.local` dosyası oluştur:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Supabase'de tabloları oluştur:

```bash
# supabase/schema.sql dosyasını Supabase Dashboard > SQL Editor'de çalıştır
```

Uygulamayı başlat:

```bash
npm run dev
```

## Ekranlar

| Ekran | Açıklama |
|---|---|
| Vardiya Çizelgesi | Aylık/haftalık vardiya planlama grid'i |
| Personel Listesi | Personel CRUD, işe giriş/çıkış tarihleri |
| Günlük Kontrol | Günlük devam durumu takibi (varsayılan: dün) |
| Raporlar | Haftalık devam özeti, gelmeyen personel detayı |
| Ayarlar | İstasyon, departman ve vardiya saati görünümü |

## Vardiya Kodları

| Kod | Ad | Saat |
|---|---|---|
| S | Sabah | 08:00 – 16:00 |
| Ö | Öğlen | 16:00 – 00:00 |
| G | Gece | 00:00 – 08:00 |
| İ | İzin | — |
| Yİ | Yıllık İzin | — |
| Üİ | Ücretsiz İzin | — |
| İs | İstirahat | — |
| — | Boş | — |

## Proje Yapısı

```
src/
  App.tsx                        # Global state, routing
  components/
    layout/   Sidebar, TopbarMobile, ToastStack
    schedule/ ScheduleScreen, WeeklyView, MonthlyView, CodeLegend
    daily/    DailyScreen
    employees/EmployeesScreen
    reports/  ReportsScreen
    settings/ SettingsScreen
    modals/   ShiftModal, EmployeeModal
    ui/       Button, Badge, Avatar, Select, Field, Dialog, Stat, Icon, EmptyState
  lib/
    supabase.ts   Supabase istemcisi
    db.ts         Tüm DB fonksiyonları (CRUD)
  types/index.ts  TypeScript tip tanımları
  constants/      Vardiya kodları, sabitler, tarih araçları
  index.css       Tasarım token'ları ve tüm stiller
supabase/
  schema.sql      Tablo tanımları
```

## Deploy

Vercel'e bağlı bir repoda otomatik deploy çalışır. Environment variable'ları Vercel dashboard'dan ekle:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
