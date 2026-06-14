# Teknik Borç Backlog'u

Son güncelleme: 2026-06-14

Bu dosya, mevcut proje durumu ve `TECH_DEBT_BACKLOG_CLAUDE.md` üzerinden yeniden baz alınmış ana teknik borç backlog'udur. Öncelikler artık "tek kullanıcılı, canlıda çalışan" gerçek bağlama göre düzenlenmiştir: önce veri kaybı ve yanlış sayım riski, sonra görünürlük ve küçük sağlamlık işleri.

## Bağlam

- Uygulama şu anda tek kullanıcı tarafından kullanılıyor.
- Bazı eski yüksek öncelikli maddeler kodda zaten uygulanmış durumda.
- Test altyapısı, lint/format, kapsamlı RLS/auth ve büyük mimari refactor şu an aktif sprint işlerinden çıkarıldı; "Ertelenenler" bölümünde takip ediliyor.
- Supabase'e bu doküman güncellemesi sırasında herhangi bir işlem yapılmadı.

## Öncelik Tanımı

- P0: Geri dönüşsüz veri kaybı veya geçmiş operasyon kayıtlarını yok eden davranış.
- P1: Rapor, devam, vardiya veya kullanıcı kararını yanlış yönlendiren veri/doğruluk hatası.
- P2: Sessiz hata, reload tutarsızlığı veya kullanıcıyı yanıltan orta riskli davranış.
- P3: Ucuz sağlamlık, DX veya performans iyileştirmesi.

## Aktif Backlog

Aktif teknik borç maddesi kalmadı.

## Tamamlanan / Kapanan Maddeler

| ID | Öncelik | Başlık | Durum | Kanıt |
| --- | --- | --- | --- | --- |
| TD-002 | P1 | emp/gün için tek vardiya kuralını DB'de garanti et | Tamamlandı | duplicate temizliği, `shifts_emp_id_shift_date_unique` |
| TD-006 | P2 | Aylık grid'deki sessiz DB hatalarını görünür yap | Tamamlandı | `setCode` catch blokları toast'a bağlandı |
| TD-003 | P2 | Personel güncellemede snapshot reload tutarsızlığını düzelt | Tamamlandı | mevcut shift snapshot'ları local state'te değiştirilmez |
| TD-004 | P3 | Vardiya modalında istihdam tarih aralığı validasyonu ekle | Tamamlandı | `ShiftModal` ve `handleSaveShift` `isWithinEmployment` kullanır |
| TD-007 | P3 | `xlsx`'i dinamik import'a çevir | Tamamlandı | `src/lib/excel.ts` lazy import + export loading state |
| TD-020 | P3 | localStorage navigation değerlerini doğrula | Tamamlandı | `isViewId` / `isScheduleMode` guard + invalid key cleanup |
| TD-014 | P3 | Env validation ile bağlantı hatasını netleştir | Tamamlandı | Supabase env guard + kullanıcıya net hata mesajı |
| TD-017 | P0 | Personel silmede vardiya geçmişini koru | Tamamlandı | `setEmployeeActive`, soft delete, `on delete restrict` |
| TD-018 | P1 | Serbest saatli vardiyalar `-` koduna düşmesin | Tamamlandı | `Öz` kodu, `WORK_CODES`, `codeFromTimes` |
| TD-015 | P1 | Shift status tutarlılığını sağla | Tamamlandı | `ShiftStatus = Planlandı/Geldi/Gelmedi`, DB check |
| TD-019 | P2 | Aktif personel yokken `emp_id = 0` kaydını engelle | Tamamlandı | `ShiftModal` empId validation + empty state |
| TD-023 | P0 | Giriş/çıkış tarihi değişiminde vardiya silinmesini durdur | Tamamlandı | `isWithinEmployment`, delete bloğu kaldırıldı |

## Detaylı Aktif İş Kalemleri

Aktif teknik borç maddesi kalmadı.

## Önerilen Uygulama Sırası

Aktif teknik borç maddesi kalmadı. Yeni maddeler oluşursa bu bölüm yeniden sıralanacak.

## Ertelenenler

Bu maddeler yanlış olduğu için değil, mevcut solo/canlı kullanım bağlamında aktif önceliği düşük olduğu için ertelendi.

| Eski ID | Başlık | Not |
| --- | --- | --- |
| TD-001 | Supabase RLS ve yetkilendirme modeli | Son ürün aşamasında ele alınmalı. Anon key ile public tablo riski sürüyor. |
| TD-005 | Sınırsız vardiya yüklemeyi tarih aralıklı sorguya çevir | Veri büyüyene kadar bekleyebilir. |
| TD-008 | Supabase generated types kullan | Tek geliştiricide getiri düşük; şema değişiklikleri artarsa geri alınmalı. |
| TD-009 | `App.tsx` state ve veri işlemlerini hook/reducer'lara böl | Büyük refactor; aktif hata çözümü değil. |
| TD-010 | Test altyapısı kur | Bilinçli olarak kapsam dışı bırakıldı. |
| TD-011 | Tarih/saat kolonlarını ve enumları güçlendir | Status check geldi; tarih/time tipi ve `day_index` temizliği ertelendi. |
| TD-012 | Genel a11y ve klavye kullanılabilirliği | Tek kullanıcı bağlamında ertelendi. |
| TD-013 | Migration disiplinini repoya taşı | Ekip/çok ortam ihtiyacı artarsa önemli hale gelir. |
| TD-016 | Lint ve format altyapısı kur | Ekip/review faydası yüksek; solo bağlamda bekletildi. |
| TD-021 | Custom Select erişilebilirliğini iyileştir | TD-012 ile birlikte ertelendi. |
| TD-022 | Aylık grid sıralama davranışını netleştir | Kullanıcı rahatsızlığı oluşursa ele alınmalı. |

## Kapanan Maddelerin Doğrulama Notları

### TD-002 - emp/gün için tek vardiya kuralını DB'de garanti et

Durum: Tamamlandı

- Remote Supabase'de mevcut duplicate kontrol edildi; Ahmet Uzun için 2026-06-28 tarihinde iki kayıt vardı.
- Migration `enforce_unique_shift_per_employee_day` ile eski duplicate kayıt temizlendi; en yüksek id'li mevcut görünümle uyumlu kayıt korundu.
- `shifts_emp_id_shift_date_unique` partial unique index eklendi: `emp_id + shift_date`, `shift_date is not null and shift_date <> ''`.
- `supabase/schema.sql` snapshot'ı aynı index'i içeriyor.
- Frontend duplicate constraint hatasını kullanıcı dostu mesajla gösteriyor.

### TD-006 - Aylık grid'deki sessiz DB hatalarını görünür yap

Durum: Tamamlandı

- `App.tsx` içindeki `setCode` akışında kalan sessiz `.catch(() => {})` blokları kaldırıldı.
- Vardiya create/update/delete hataları mevcut toast mekanizmasına bağlandı.
- Unique constraint hatası özel olarak "Bu personel için seçili tarihte zaten vardiya var" mesajını gösteriyor.

### TD-003 - Personel güncellemede snapshot reload tutarsızlığını düzelt

Durum: Tamamlandı

- Seçenek A uygulandı: `shifts.station`, `shifts.dept`, `shifts.role` tarihsel snapshot olarak korunur.
- Personel güncellemesinden sonra mevcut vardiyaları local state'te yeni station/dept/role ile değiştiren blok kaldırıldı.
- Yeni vardiyalar güncel personel atamasını kullanmaya devam eder; geçmiş vardiyalar reload öncesi/sonrası aynı görünür.

### TD-004 - Vardiya modalında istihdam tarih aralığı validasyonu ekle

Durum: Tamamlandı

- `ShiftModal` validasyonu seçili personel ve tarih için `isWithinEmployment(...)` kontrolü yapar.
- `handleSaveShift` aynı kuralı savunma katmanı olarak tekrar uygular.
- Grid ve manuel modal artık istihdam penceresi dışı vardiya oluşturmayı aynı kuralla engeller.

### TD-007 - `xlsx`'i dinamik import'a çevir

Durum: Tamamlandı

- Statik `xlsx` import'u `ReportsScreen` içinden kaldırıldı.
- Ortak `exportRowsToExcel(...)` helper'ı `xlsx` paketini sadece export anında lazy import eder.
- Export butonu işlem sırasında loading state gösterir ve tekrar tıklamayı engeller.

### TD-020 - localStorage navigation değerlerini doğrula

Durum: Tamamlandı

- `vy_view` sadece bilinen `ViewId` değerlerinden biriyse state'e alınır.
- `vy_mode` sadece `hafta` veya `ay` ise state'e alınır.
- Geçersiz/eski localStorage değerleri silinir ve uygulama güvenli default olan `cizelge` / `ay` ile açılır.

### TD-014 - Env validation ile bağlantı hatasını netleştir

Durum: Tamamlandı

- Supabase client oluşturulmadan önce `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` doğrulanır.
- Eksik env değerlerinde console ve kullanıcı ekranı değişken adlarını açıkça gösterir.
- Hatalı URL formatında Supabase client oluşturulmaz; uygulama genel beyaz ekran yerine tanılayıcı bağlantı hatası gösterir.

### TD-017 - Personel silmede vardiya geçmişini koru

Durum: Tamamlandı

- Fiziksel silme akışı kaldırılmış; `setEmployeeActive(id, active)` ile soft delete kullanılıyor.
- UI "Sil" yerine "Pasife Al / Aktif Et" akışına geçmiş.
- `supabase/schema.sql` içinde `shifts.emp_id` artık `on delete restrict`.

### TD-018 - Serbest saatli vardiyalar `-` koduna düşmesin

Durum: Tamamlandı

- `ShiftCodeKey` içine `Öz` eklendi.
- `WORK_CODES` artık `Öz` kodunu çalışma vardiyası sayıyor.
- `codeFromTimes` şablon dışı geçerli saatlerde `-` yerine `Öz` döndürüyor.

### TD-015 - Shift status tutarlılığını sağla

Durum: Tamamlandı

- Geçerli status kümesi `Planlandı`, `Geldi`, `Gelmedi` olarak sadeleşmiş.
- `Geç Kaldı` type/rapor modelinden çıkarılmış.
- `schema.sql` içinde `shifts_status_check` constraint var.

### TD-019 - Aktif personel yokken `emp_id = 0` kaydını engelle

Durum: Tamamlandı

- `ShiftModal` `empId <= 0` için validasyon yapıyor.
- Aktif personel yoksa empty state gösteriliyor ve Kaydet butonu pasif.

### TD-023 - Giriş/çıkış tarihi değişiminde vardiya silinmesini durdur

Durum: Tamamlandı

- Personel tarih aralığı değişince vardiya silen blok kaldırılmış.
- Ortak `isWithinEmployment(...)` kuralı eklenmiş.
- Aylık, haftalık, günlük ve rapor akışları istihdam penceresini aynı kaynaktan uyguluyor.

## Risk Notları

- RLS/auth ertelenmiş olsa da anon key public JS bundle içindedir. Son ürün aşamasına geçerken bu risk tekrar ele alınmalı.
- `unique(emp_id, shift_date)` artık var; ileride bu constraint'e çarpan manuel/import akışları kullanıcı dostu ele alınmalı.
- Vardiya snapshot'ları korunur; gelecek vardiyaları yeni atamaya taşıma istenirse ayrı ürün özelliği olarak tasarlanmalı.
- Excel export akışları manuel doğrulanmalı; ortak helper ileride yeni Excel çıktıları için tekrar kullanılabilir.
