# Teknik Borç Backlog'u (Claude)

Bu doküman, `TECH_DEBT_BACKLOG.md`'nin **tek kullanıcılı, canlıda çalışan** gerçeğe göre
yeniden önceliklendirilmiş halidir. Uygulamayı şu an yalnızca tek kişi kullanıyor ve
hatalar kritik değil; dolayısıyla öncelik sırası "ekip/çok kullanıcı" varsayımından
"kendi verini kaybetme / kendi sayılarını yanlış görme" eksenine kaydırıldı.

Kapsam notları:
- **Test altyapısı eklenmedi** (bilinçli karar). Hiçbir kabul kriterinde "test yazılır" yok.
- **RLS / auth şimdilik ertelendi** — son ürün aşamasında ele alınacak. Gerekçe ve risk
  notu en alttaki "Ertelenenler" bölümünde.

Her madde kaynak koddaki gerçek satırla doğrulandı; `dosya:satır` referansları tıklanabilir.

## Öncelik Tanımı (solo bağlam)

- **P0:** Geri dönülemez veri kaybı. Bir yanlış tıkla geçmiş veri kalıcı silinir.
- **P1:** Güvendiğin sayılar yanlış çıkar (rapor / devam / vardiya sayımı).
- **P2:** Seni yanıltan veya sessizce bozulan küçük hatalar.
- **P3:** Ucuz iyileştirme, opsiyonel.

## Özet Backlog

| ID | Öncelik | Başlık | Efor | Karşılık |
| --- | --- | --- | --- | --- |
| C-01 | P0 | ✅ Personel silmede vardiya geçmişini koru (soft delete) | M | TD-017 |
| C-02 | P1 | ✅ Serbest saatli vardiyalar `-` koduna düşmesin | S | TD-018 |
| C-03 | P1 | ✅ Status modelini tek kaynağa indir (`Geç Kaldı` tutarsızlığı) | S | TD-015 |
| C-04 | P1 | emp/gün için tek vardiya kuralını DB'de garanti et | M | TD-002 |
| C-05 | P2 | ✅ Aktif personel yokken `emp_id = 0` ile kayıt engelle | S | TD-019 |
| C-06 | P2 | Aylık grid'deki sessiz `catch(() => {})` bloklarını görünür yap | S | TD-006 |
| C-07 | P2 | Personel güncellemede snapshot reload tutarsızlığı | M | TD-003 |
| C-08 | P3 | Vardiya modalında tarih aralığı validasyonu | S | TD-004 |
| C-09 | P3 | `xlsx`'i dinamik import'a çevir (bundle uyarısı) | S | TD-007 |
| C-10 | P3 | localStorage navigation değerlerini doğrula | S | TD-020 |
| C-11 | P3 | Env validation: bağlantı hatasını netleştir | S | TD-014 |
| C-12 | P0 | ✅ Giriş/çıkış tarihi değişiminde vardiya silinmesini durdur + pencereyi tüm görünümlerde uygula | M | (yeni) |

---

## Detaylı İş Kalemleri

### C-01 — Personel silmede vardiya geçmişini koru (soft delete)

Öncelik: P0 · Efor: M · (TD-017) · **Durum: ✅ Tamamlandı**

Uygulandı: fiziksel silme kaldırıldı; "Sil" yerine geri alınabilir "Pasife Al"
(`is_active = false`) akışı geldi. `deleteEmployee` → `setEmployeeActive(id, active)`
([db.ts](src/lib/db.ts)).

> **✅ Sıkılaştırma uygulandı: FK `cascade` → `restrict`.**
> `shifts_emp_id_fkey` artık `ON DELETE RESTRICT` (prod migration:
> `shifts_emp_id_on_delete_restrict`). Vardiyası olan personel doğrudan SQL ile bile
> silinemez — geçmiş DB seviyesinde de korunuyor. Repo `schema.sql` de güncellendi.

`shifts.emp_id` foreign key'i `on delete cascade` ile tanımlı
([supabase/schema.sql:59](supabase/schema.sql)). Bir personeli silersen o kişiye ait
**tüm geçmiş vardiyalar da kalıcı olarak silinir**. `shifts` tablosu station/dept/role'ü
bilerek tarihsel snapshot olarak tutuyor (tasarım kararı) — yani bu kayıtlar tam da
korunmak için var; cascade silme o korumayı tek tıkla yok ediyor. Geri dönüşü yok.

Önerilen çözüm:
- Personel silme akışını fiziksel `delete` yerine soft delete'e çevir: zaten var olan
  `is_active = false` kullanılsın ([employees.is_active](supabase/schema.sql)).
- UI'da "Sil" yerine "Pasife al" davranışı; pasif personel listede gizlenebilir/filtrelenebilir.
- Fiziksel silme gerçekten gerekiyorsa: önce kaç vardiyanın silineceğini göster ve
  `on delete cascade` yerine `restrict` değerlendir.

Kabul kriterleri:
- Personel pasife alındığında geçmiş vardiyaları DB'de durur.
- Raporlar pasif personelin geçmiş vardiyalarını göstermeye devam eder.
- Yanlışlıkla yapılan bir işlem geçmiş veriyi kaybettirmez.

### C-02 — Serbest saatli vardiyalar `-` koduna düşmesin

Öncelik: P1 · Efor: S · (TD-018) · **Durum: ✅ Tamamlandı**

Uygulandı (seçilen yaklaşım: "Özel" çalışma kodu): yeni `Öz` (Özel) kodu eklendi ve
`WORK_CODES`'a dahil edildi — yani serbest saatli vardiyalar artık çalışma sayılıyor.
`codeFromTimes` şablon dışı geçerli saatler için `-` yerine `Öz` döner
([App.tsx](src/App.tsx)). `Öz` serbest saatlidir; bu yüzden `SHIFT_TIMES` sabit şablonlardan
(S/Ö/G) ayrıştırıldı ve `Öz`, grid hızlı-seçicisine (`ALL_CODES`) eklenmedi — modaldan özel
saatle oluşturulur. Cyan `sc-oz` rozeti + legend'de "Özel" gösterimi eklendi.

`codeFromTimes` yalnızca üç sabit şablonu tanıyor; başka her saat aralığı `-` döner
([src/App.tsx:55](src/App.tsx)). Vardiya modalı serbest saat girişine izin verdiği için
`09:00-17:00` gibi gerçek bir çalışma vardiyası `-` (boş) olarak kaydolur ve
raporlarda **çalışma sayılmaz** (`WORK_CODES` sadece S/Ö/G — [constants:19](src/constants/index.ts)).

Önerilen çözüm:
- Karar: serbest saatli vardiya desteklenecek mi?
  - Desteklenecekse `WORK_CODES`'a sayılan ayrı bir "Özel" çalışma kodu ekle.
  - Desteklenmeyecekse modalda sadece tanımlı şablonlar (S/Ö/G) seçilebilsin; serbest
    saat girişi kaldırılsın.
- `codeFromTimes` tahminini bırakıp kodu form modeline açıkça koymayı tercih et.

Kabul kriterleri:
- Çalışma saati girilen bir vardiya asla `-` koduyla kaydolmaz.
- Günlük kontrol ve raporlar özel saatli çalışmayı doğru sayar.
- Kullanıcı hangi kodla kayıt yaptığını net görür.

### C-03 — Status modelini tek kaynağa indir (`Geç Kaldı` tutarsızlığı)

Öncelik: P1 · Efor: S · (TD-015) · **Durum: ✅ Tamamlandı**

Karar: `Geç Kaldı` kullanılmıyor → modelden çıkarıldı. Tipten ([types/index.ts](src/types/index.ts)),
Badge eşlemesinden ([Badge.tsx](src/components/ui/Badge.tsx)), Reports `came` sayımından
([ReportsScreen.tsx](src/components/reports/ReportsScreen.tsx)) ve ölü `.badge-late` /
`--late-*` CSS'ten temizlendi. Prod'da `Geç Kaldı` kaydı yoktu (Geldi 22 / Gelmedi 8 /
Planlandı 473), veri göçü gerekmedi. Geçerli statüler artık tek küme: `Planlandı`, `Geldi`,
`Gelmedi` — Reports ve Daily aynı listeyi kullanıyor. DB seviyesinde de tek küme:
`shifts_status_check` constraint eklendi (migration `shifts_status_check_constraint`),
geçersiz status artık DB'de de reddedilir. schema.sql güncellendi.

`Geç Kaldı` status'u sistemde yarım bağlı ve ekranlar bu yüzden **farklı sayıyor**:
- Tip olarak geçerli: [types:21](src/types/index.ts)
- Badge stili var: [Badge.tsx:6](src/components/ui/Badge.tsx)
- Raporda "geldi" sayılıyor: [ReportsScreen.tsx:60](src/components/reports/ReportsScreen.tsx) → `'Geldi' || 'Geç Kaldı'`
- **Ama günlük ekranda "geldi" sayılmıyor:** [DailyScreen.tsx:55](src/components/daily/DailyScreen.tsx) → sadece `'Geldi'`
- Ve hiçbir yerde **seçilemiyor**: `STATUSES` listesinde yok ([constants:6](src/constants/index.ts)),
  dolayısıyla modal Select'inde ([ShiftModal.tsx:171](src/components/modals/ShiftModal.tsx)) ve
  Daily hızlı butonlarında ([DailyScreen.tsx:13-14](src/components/daily/DailyScreen.tsx)) yok.

Sonuç: aynı geç gelme, Raporlar'da devam oranına dahil, Günlük'te değil.

Önerilen çözüm — ikisinden birini seç, tek kaynaktan türet:
- **Kullanılacaksa:** `STATUSES`'a `Geç Kaldı` ekle, Daily hızlı butonlarına ekle,
  Daily `came` sayımını Reports ile aynı kurala getir.
- **Kullanılmayacaksa:** tipten, Badge'den ve Reports sayımındaki `|| 'Geç Kaldı'`
  dalından temizle.

Kabul kriterleri:
- Geçerli tüm status değerleri her ekranda ya seçilebilir ya da bilinçli olarak yok.
- Günlük ve Raporlar devam sayımında aynı status kuralını uygular.

### C-04 — emp/gün için tek vardiya kuralını DB'de garanti et

Öncelik: P1 · Efor: M · (TD-002)

`shifts` tablosunda `unique(emp_id, shift_date)` yok ([schema.sql:57](supabase/schema.sql)).
Oysa kod zaten "bir personel / bir gün = tek vardiya" varsayıyor: aylık türetme
`codesOf` hücreye son eşleşeni yazıyor ([App.tsx:163-164](src/App.tsx)), `setCode`
mevcut tek kaydı buluyor ([App.tsx:175](src/App.tsx)). Yani constraint, kodun zaten
inandığı kuralı **DB'de sabitlemekten** ibaret — çift kayıt oluşursa aylık/haftalık
görünüm sessizce ayrışır.

Önerilen çözüm:
- Önce mevcut veride `(emp_id, shift_date)` çift kaydı var mı kontrol et, varsa temizle.
- `create unique index ... on shifts(emp_id, shift_date)` ekle.
- İstersen `status` için check constraint (`STATUSES` ile aynı küme) ekleyerek geçersiz
  değeri DB seviyesinde de kapat — C-03 ile birlikte düşün.

Kabul kriterleri:
- Aynı personel/gün için ikinci kayıt DB tarafından reddedilir.
- Aylık ve haftalık görünüm aynı tek-kayıt kuralını uygular.

### C-05 — Aktif personel yokken `emp_id = 0` ile kayıt engelle

Öncelik: P2 · Efor: S · (TD-019) · **Durum: ✅ Tamamlandı**

Uygulandı: `ShiftModal` aktif personel yoksa (ve düzenleme değilse) form yerine
açıklayıcı boş-durum gösterir ("Aktif personel yok…") ve Kaydet butonu pasiftir
([ShiftModal.tsx](src/components/modals/ShiftModal.tsx)). Ek olarak `validate`'e
`empId` kontrolü eklendi (savunma amaçlı) — geçersiz/0 `emp_id` payload'u onSave'e
hiç ulaşmaz; DB foreign key hatası normal akışta tetiklenmez.

Modal `empId` default'u aktif personel yoksa `0`'a düşüyor
([ShiftModal.tsx:49](src/components/modals/ShiftModal.tsx) → `... ?? employees[0]?.id ?? 0`).
Kullanıcı kaydet'e basınca DB foreign key hatası alır ve genel hata mesajı görür.

Önerilen çözüm:
- Form validasyonuna geçerli `empId` (> 0 ve listede var) kontrolü ekle.
- Seçilebilir personel yoksa kaydet butonu pasif olsun + açıklayıcı boş durum göster.

Kabul kriterleri:
- `emp_id = 0` payload'u hiç gönderilmez.
- Kullanıcı neden kayıt yapamadığını anlar.

### C-06 — Aylık grid'deki sessiz `catch(() => {})` bloklarını görünür yap

Öncelik: P2 · Efor: S · (TD-006)

`setCode` içindeki beş DB çağrısı hatayı tamamen yutuyor
([App.tsx:187,191,198,202,209](src/App.tsx)). Bu çağrılar başarı olunca state'i
güncellediği için, hata durumunda hücre sessizce **hiç değişmez** — kullanıcı "S" yazdığını
sanır, aslında kaydolmamıştır ve hiçbir uyarı yoktur.

Önerilen çözüm:
- Bu `.catch(() => {})` bloklarını mevcut `toast(...)` mekanizmasına bağla
  (App'te `toast` zaten var — [App.tsx:108](src/App.tsx)).
- Diğer akışlarda kullanılan "Bir hata oluştu, tekrar deneyin" kalıbıyla tutarlı olsun.

Kabul kriterleri:
- Grid'de başarısız bir vardiya atama denemesi kullanıcıya görünür hata verir.
- Sessiz no-op kalmaz.

### C-07 — Personel güncellemede snapshot reload tutarsızlığı

Öncelik: P2 · Efor: M · (TD-003)

Personel düzenlenince local `shifts` state'i yeni isimlerle değiştiriliyor ama bu
**DB'ye yazılmıyor** ([App.tsx:264-266](src/App.tsx)). Ekran anında değişir, sayfa
yenilenince eski DB snapshot'ı geri gelir. (Not: snapshot'ın korunması tasarım gereği —
[schema.sql:53-55](supabase/schema.sql). Yani çözüm FK'ye normalize etmek değil.)

Önerilen çözüm — kuralı seç ve tutarlı uygula:
- Tarihsel snapshot korunacaksa: local shift state'ini hiç değiştirme (satır 264-266'yı
  kaldır), ekran reload ile aynı kalsın.
- Gelecek vardiyalar yeni atamayı yansıtsın isteniyorsa: sadece gelecek tarihli kayıtları
  DB'de de update et.

Kabul kriterleri:
- Personel güncellemesinden sonra reload ekranı değiştirmez.
- Geçmiş/gelecek kuralı net ve tutarlı.

### C-08 — Vardiya modalında tarih aralığı validasyonu

Öncelik: P3 · Efor: S · (TD-004)

Aylık grid, personelin işe giriş/çıkış tarihi dışına atama yapmayı engelliyor
([App.tsx:177-178](src/App.tsx)). Manuel "Yeni Vardiya Ekle" modalı aynı kuralı
uygulamıyor, dolayısıyla aralık dışı vardiya oluşturulabiliyor.

Önerilen çözüm:
- Ortak küçük bir `canAssignShift(employee, date)` yardımcısı çıkar; hem grid hem modal
  aynı kuralı kullansın.

Kabul kriterleri:
- Modal üzerinden aralık dışı vardiya oluşturulamaz.
- Grid ve modal aynı kuralı uygular.

### C-09 — `xlsx`'i dinamik import'a çevir

Öncelik: P3 · Efor: S · (TD-007)

`xlsx` ana bundle'a statik giriyor ([ReportsScreen.tsx:2](src/components/reports/ReportsScreen.tsx))
ve build 500 kB+ uyarısı veriyor. Sadece rapor export'unda gerekli.

Önerilen çözüm:
- Export anında `const XLSX = await import('xlsx')` ile lazy-load et.
- Butonda kısa bir loading durumu göster.

Kabul kriterleri:
- Ana JS chunk küçülür, build uyarısı azalır.
- Excel export davranışı aynı kalır.

### C-10 — localStorage navigation değerlerini doğrula

Öncelik: P3 · Efor: S · (TD-020)

`vy_view` ve `vy_mode` doğrudan cast ile okunuyor
([App.tsx:63-64](src/App.tsx)). Bozuk/eski bir değer app'i geçersiz ekranla açabilir.

Önerilen çözüm:
- Küçük `isViewId` / `isScheduleMode` guard'ları ekle; geçersizse güvenli default'a dön.

Kabul kriterleri:
- Geçersiz değer app'i boş/kırık ekranda bırakmaz, güvenli default'a düşer.

### C-11 — Env validation: bağlantı hatasını netleştir

Öncelik: P3 · Efor: S · (TD-014)

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` eksik/yanlışsa hata sadece genel
yükleme hatası olarak görünüyor ([src/lib/supabase.ts:4-5](src/lib/supabase.ts)).

Önerilen çözüm:
- Client oluşturmadan önce env değerlerini kontrol et; eksikse net bir konsol/ekran mesajı ver.

Kabul kriterleri:
- Eksik env durumunda "neyin eksik olduğu" açıkça anlaşılır.

### C-12 — Giriş/çıkış tarihi değişiminde vardiya silinmesini durdur + pencereyi tüm görünümlerde uygula

Öncelik: P0 · Efor: M · (yeni) · **Durum: ✅ Tamamlandı**

C-01 ile aynı sınıftan ikinci bir veri kaybı: bir personel düzenlenip **giriş veya çıkış
tarihi** girildiğinde, o aralığın dışına düşen geçmiş vardiyalar
`handleSaveEmployee` içinde **fiziksel olarak siliniyordu** (`deleteShift`,
eski [App.tsx](src/App.tsx) satırları). Mevcut bir personele tarih eklemek/düzeltmek bile
geçmişi uçuruyordu.

Seçilen çözüm (Seçenek 1): **veriyi koru, istihdam penceresini her yerde tutarlı uygula.**

Uygulananlar:
- `handleSaveEmployee`'deki silme bloğu kaldırıldı; artık hiçbir vardiya silinmiyor.
- Ortak kural eklendi: `isWithinEmployment(startDate, endDate, dateStr)`
  ([constants/index.ts](src/constants/index.ts)) — tek kaynak.
- Pencere dışı vardiyalar artık şu görünümlerin hepsinde **gizleniyor/sayılmıyor**
  ama DB'de duruyor:
  - Aylık: `blocked` hücre ([MonthlyView.tsx](src/components/schedule/MonthlyView.tsx)) — zaten vardı, ortak kurala bağlandı.
  - Haftalık + istatistik: `filteredShifts` ([ScheduleScreen.tsx](src/components/schedule/ScheduleScreen.tsx)).
  - Günlük: `rows` ([DailyScreen.tsx](src/components/daily/DailyScreen.tsx)).
  - Raporlar: `employed` ([ReportsScreen.tsx](src/components/reports/ReportsScreen.tsx)).
- Atama kuralı (`setCode`) da aynı ortak fonksiyonu kullanıyor.

Sonuç: çıkış tarihi verilen personelin satırı çizelgede o tarihte temizce biter; öncesi
durur; hiçbir geçmiş kayıt kaybolmaz; aylık/haftalık/günlük/rapor aynı pencereyi uygular.

Kabul kriterleri:
- Giriş/çıkış tarihi değiştirmek hiçbir vardiyayı silmez.
- Pencere dışı vardiyalar dört görünümde de tutarlı şekilde gizlenir/sayılmaz.
- Tarih aralığı genişletilince eski (gizlenmiş) vardiyalar tekrar görünür — çünkü hâlâ DB'de.

---

## Önerilen Uygulama Sırası

Hepsi küçük; sırayla, her birini tek tek doğrulayarak ilerlenebilir.

1. **Önce ucuz doğruluk düzeltmeleri:** C-03 → C-02 → C-05
2. **Veri güvenliği:** C-01 (soft delete) → C-04 (unique constraint)
3. **Görünürlük/tutarlılık:** C-06 → C-07
4. **Opsiyonel cilalar:** C-09 → C-08 → C-10 → C-11

---

## Ertelenenler (son ürün aşamasında)

Bu maddeler yanlış olduğu için değil, **şu anki solo + canlı** bağlamda değeri düşük
olduğu için ertelendi.

### RLS / yetkilendirme (orijinal TD-001)
Son ürün aşamasında ele alınacak (kullanıcının kararı). Bilinçli risk notu: anon key
public JS bundle içinde olduğu için tablolar şu an internetten yazılabilir durumda — risk
başka bir kullanıcı değil, açık Supabase örneklerini tarayan **botlar**. En kötü senaryo:
bir botun `shifts` tablosunu boşaltması. Son ürüne geçerken en ucuz koruma: tek hesaplı
bir login + tablolarda `enable row level security` ve `for all to authenticated using (true)`.

### Performans (orijinal TD-005)
`fetchShifts` açılışta tüm kayıtları çekiyor ([db.ts:199](src/lib/db.ts)). Veri küçükken
sorun değil; tablo büyüyüp açılış yavaşlamaya başlarsa tarih aralıklı sorguya
(`fetchShifts({ start, end })`) geç. Şimdilik beklet.

### Bilinçli olarak kapsam dışı (solo gerçeği)
Tek kullanıcı ve "hata kritik değil" koşulunda değeri düşük olanlar:
- Test altyapısı (orijinal TD-010) — istenmedi.
- Supabase generated types (TD-008), App.tsx refactor (TD-009), lint/format (TD-016):
  ekip/review faydası; tek geliştiricide getiri düşük.
- A11y / screen reader (TD-012, TD-021): ikinci kullanıcı yok.
- Migration disiplini (TD-013), DB tip sıkılaştırma (TD-011), aylık sıralama netleştirme
  (TD-022): orta vadeli cila.

> Not (TD-011 ile ilgili küçük kazanç): `shifts.day_index` aslında gereksiz —
> `toShift` onu zaten `shift_date`'ten türetiyor ([db.ts:124](src/lib/db.ts)). İstenirse
> kolon tamamen düşürülebilir.
