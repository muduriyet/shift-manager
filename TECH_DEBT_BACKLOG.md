# Teknik Borç Backlog'u

Bu doküman, mevcut Vardiya Yönetimi uygulaması için teknik borçları önceliklendirilmiş iş kalemlerine böler. Amaç, güvenlik ve veri bütünlüğü risklerini önce kapatmak, ardından bakım kolaylığı, performans ve test güvenini artırmaktır.

## Öncelik Tanımı

- P0: Canlı kullanımda veri güvenliği veya veri bütünlüğü riski.
- P1: Kullanıcı akışlarını etkileyen hata, ölçeklenebilirlik veya bakım riski.
- P2: Geliştirici verimliliği, kalite veya orta vadeli performans iyileştirmesi.
- P3: Temizlik, dokümantasyon veya daha düşük riskli iyileştirme.

## Özet Backlog

| ID | Öncelik | Başlık | Alan | Efor |
| --- | --- | --- | --- | --- |
| TD-001 | P0 | Supabase RLS ve yetkilendirme modeli | Güvenlik | L |
| TD-002 | P0 | Vardiya veri bütünlüğü kısıtları | Veritabanı | M |
| TD-003 | P1 | Personel güncellemesinde vardiya snapshot tutarsızlığı | Veri modeli | M |
| TD-004 | P1 | Tarih aralığı validasyonunu tekilleştir | İş kuralları | M |
| TD-005 | P1 | Sınırsız vardiya yüklemeyi tarih aralıklı sorguya çevir | Performans | L |
| TD-006 | P1 | Hata yönetimi ve kullanıcı geri bildirimi | Güvenilirlik | M |
| TD-007 | P1 | Büyük bundle: XLSX'i lazy-load et | Performans | S |
| TD-008 | P2 | Supabase generated types kullan | TypeScript | M |
| TD-009 | P2 | App.tsx state ve veri işlemlerini hook/reducer'lara böl | Mimari | L |
| TD-010 | P2 | Test altyapısı kur | Kalite | L |
| TD-011 | P2 | Tarih/saat kolonlarını ve enumları güçlendir | Veritabanı | M |
| TD-012 | P2 | A11y ve klavye kullanılabilirliği | UX | M |
| TD-013 | P3 | Migration disiplinini repoya taşı | DevOps | M |
| TD-014 | P3 | Dokümantasyon ve ortam doğrulama | DX | S |
| TD-015 | P1 | Shift status tutarlılığını sağla | İş kuralları | S |
| TD-016 | P2 | Lint ve format altyapısı kur | DX | S |
| TD-017 | P1 | Personel silmede vardiya geçmişini koru | Veri bütünlüğü | M |
| TD-018 | P1 | Serbest saatli vardiyaların kod davranışını düzelt | İş kuralları | S |
| TD-019 | P1 | Aktif personel yokken vardiya oluşturmayı engelle | Validasyon | S |
| TD-020 | P3 | localStorage navigation değerlerini doğrula | Sağlamlık | S |
| TD-021 | P2 | Custom Select erişilebilirliğini iyileştir | UX | M |
| TD-022 | P3 | Aylık grid sıralama davranışını netleştir | UX | S |

## Detaylı İş Kalemleri

### TD-001 - Supabase RLS ve yetkilendirme modeli

Öncelik: P0  
Alan: Güvenlik  
Efor: L

Mevcut durumda public tablolarda RLS kapalı. Browser tarafındaki anon key ile tablolar okunabilir ve değiştirilebilir durumda. Bu geliştirme aşamasında hızlı ilerletir, ancak canlı kullanım için kritik güvenlik borcudur.

Önerilen çözüm:
- Uygulamaya Supabase Auth veya başka bir oturum modeli ekle.
- `stations`, `departments`, `roles`, `employees`, `shifts` için RLS aç.
- Okuma/yazma politikalarını rol veya işletme kapsamına göre tanımla.
- Yönetici ve normal kullanıcı izinlerini ayır.

Kabul kriterleri:
- Anon kullanıcı doğrudan tablo yazamaz.
- Giriş yapmamış kullanıcı app verisine erişemez.
- Yetkisiz kullanıcı başka işletme/kapsam verisini okuyamaz.
- CRUD akışları yeni politikalarla çalışır.

### TD-002 - Vardiya veri bütünlüğü kısıtları

Öncelik: P0  
Alan: Veritabanı  
Efor: M

`setCode` bir personel ve tarih için tek vardiya varsayıyor, ancak veritabanında bunu garanti eden unique constraint yok. Aynı personel/gün için birden fazla kayıt oluşursa aylık görünüm ilk eşleşmeye göre davranır, haftalık görünüm ise birden fazla vardiya gösterebilir.

Önerilen çözüm:
- Ürün kararını netleştir: Bir personel bir günde tek vardiya mı alabilir?
- Tek vardiya ise `unique(emp_id, shift_date)` constraint ekle.
- Birden fazla vardiya desteklenecekse aylık hücre modeli ve `setCode` davranışı buna göre yeniden tasarla.
- `code`, `status`, `day_index` için check constraint ekle.

Kabul kriterleri:
- Aynı personel/gün için beklenmeyen çift kayıt oluşmaz.
- Çakışmalı kayıt ekleme kullanıcıya anlaşılır hata verir.
- Aylık ve haftalık görünüm aynı veri kuralını uygular.

### TD-003 - Personel güncellemesinde vardiya snapshot tutarsızlığı

Öncelik: P1  
Alan: Veri modeli  
Efor: M

`shifts` tablosu `station`, `dept`, `role` değerlerini tarihsel snapshot olarak saklıyor. Ancak personel düzenlenince frontend mevcut vardiyaların local state değerlerini yeni personel bilgileriyle değiştiriyor; bu değişiklik Supabase'e yazılmıyor. Sonuç: ekran anlık olarak değişiyor, reload sonrası eski DB snapshot değerleri geri geliyor.

Önerilen çözüm:
- Ürün kuralını seç:
  - Tarihsel snapshot korunacaksa local shift state güncellenmemeli.
  - Gelecek vardiyalar yeni atamaya taşınacaksa sadece gelecek tarihli shift kayıtları DB'de update edilmeli.
- Kullanıcıya "geçmiş vardiyalar korunur / gelecek vardiyalar güncellenir" davranışı net gösterilmeli.

Kabul kriterleri:
- Personel güncellemesinden sonra reload ile ekran davranışı değişmez.
- Geçmiş ve gelecek vardiya kuralı tutarlı uygulanır.
- İlgili akış için test eklenir.

### TD-004 - Tarih aralığı validasyonunu tekilleştir

Öncelik: P1  
Alan: İş kuralları  
Efor: M

Aylık grid, personelin işe giriş/çıkış tarihleri dışındaki hücrelerde atamayı engelliyor. Ancak manuel "Yeni Vardiya Ekle" modalı aynı kuralı zorunlu olarak uygulamıyor.

Önerilen çözüm:
- Ortak bir `canAssignShift(employee, date)` iş kuralı oluştur.
- MonthlyView, ShiftModal ve DB write öncesinde aynı kuralı kullan.
- Var olan tarih dışı kayıtlar için rapor veya temizlik script'i hazırla.

Kabul kriterleri:
- Modal üzerinden tarih dışı vardiya oluşturulamaz.
- Grid ve modal aynı hata mesajını verir.
- Kural için unit test vardır.

### TD-005 - Sınırsız vardiya yüklemeyi tarih aralıklı sorguya çevir

Öncelik: P1  
Alan: Performans  
Efor: L

Uygulama açılışta tüm `shifts` kayıtlarını yüklüyor. Veri büyüdükçe açılış süresi, bellek kullanımı ve render maliyeti artar. Rapor ve takvim ekranları aslında belirli tarih aralıklarıyla çalışıyor.

Önerilen çözüm:
- Aktif ay/hafta/rapor aralığına göre `fetchShifts({ start, end })` ekle.
- Ekranlar arası geçişte gerekli aralıkları cache'le.
- Aylık görünümde `codesOf` için `empId + date` lookup map kullan.
- Gerekirse React Query/SWR benzeri data cache katmanı ekle.

Kabul kriterleri:
- App açılışında tüm tarih geçmişi çekilmez.
- Büyük veri setinde aylık grid render süresi kabul edilebilir kalır.
- Rapor export'u sadece seçili aralık verisiyle çalışır.

### TD-006 - Hata yönetimi ve kullanıcı geri bildirimi

Öncelik: P1  
Alan: Güvenilirlik  
Efor: M

Bazı DB hataları sessizce yutuluyor; özellikle aylık grid `setCode` içindeki `catch(() => {})` blokları kullanıcıya bilgi vermiyor. Bazı işlemler ise optimistic update yapıyor ama tutarlı rollback her yerde yok.

Önerilen çözüm:
- Ortak `handleDbError` veya toast yardımcı fonksiyonu ekle.
- Sessiz catch bloklarını anlamlı geri bildirimle değiştir.
- Optimistic update kullanılan yerlerde rollback standardı oluştur.
- Supabase hata kodlarını kullanıcı dostu mesajlara map et.

Kabul kriterleri:
- Ağ/izin/constraint hataları kullanıcıya görünür.
- Başarısız grid ataması sessiz kalmaz.
- Optimistic update başarısız olursa UI eski haline döner.

### TD-007 - Büyük bundle: XLSX'i lazy-load et

Öncelik: P1  
Alan: Performans  
Efor: S

Build çıktısında ana JS chunk 500 kB üstü uyarı veriyor. `xlsx` sadece rapor export sırasında gerekli, ancak şu an ana bundle'a dahil ediliyor.

Önerilen çözüm:
- `ReportsScreen` içinde `xlsx` import'unu dinamik import'a çevir.
- Export butonunda loading state göster.
- Build çıktısını tekrar kontrol et.

Kabul kriterleri:
- Ana JS chunk boyutu düşer.
- Excel export davranışı aynı kalır.
- Build uyarısı azalır veya kabul edilebilir seviyeye iner.

### TD-008 - Supabase generated types kullan

Öncelik: P2  
Alan: TypeScript  
Efor: M

`db.ts` içinde Supabase sonuçları manuel interface ve cast ile map ediliyor. Şema değişiklikleri TypeScript tarafından yakalanmayabilir.

Önerilen çözüm:
- Supabase Database type üret.
- `createClient<Database>()` kullan.
- `EmpRow`, `ShiftRow` gibi manuel tipleri azalt.
- Select stringlerini mümkün olduğunca typed helper'larla sınırla.

Kabul kriterleri:
- DB kolon adı değişirse TypeScript hatası üretir.
- `as unknown as` cast sayısı azalır.
- CRUD fonksiyonları typed Supabase client kullanır.

### TD-009 - App.tsx state ve veri işlemlerini hook/reducer'lara böl

Öncelik: P2  
Alan: Mimari  
Efor: L

`App.tsx` veri yükleme, navigation, CRUD, business rule, modal state ve toast yönetimini tek dosyada topluyor. Bu ileride değişiklik yapmayı zorlaştırır.

Önerilen çözüm:
- `useLookups`, `useEmployees`, `useShifts`, `useToast` gibi hook'lara böl.
- Shift atama mantığını ayrı servis/hook'a taşı.
- Modal form tiplerini ortak dosyaya al.
- Büyük refactor yerine ekran ekran ilerle.

Kabul kriterleri:
- `App.tsx` daha çok composition ve routing sorumluluğunda kalır.
- CRUD ve business rule fonksiyonları test edilebilir hale gelir.
- Var olan kullanıcı akışları değişmez.

### TD-010 - Test altyapısı kur

Öncelik: P2  
Alan: Kalite  
Efor: L

Projede otomatik test görünmüyor. Tarih hesapları, shift kodları, personel tarih aralığı ve attendance raporları hata üretmeye yatkın alanlar.

Önerilen çözüm:
- Vitest + React Testing Library kur.
- Tarih yardımcıları ve business rules için unit test ekle.
- Monthly grid shift atama ve employee date range için component test ekle.
- Kritik akışlar için Playwright smoke test ekle.

Kabul kriterleri:
- `npm test` veya eşdeğer script vardır.
- En azından tarih, shift assignment, employee update ve report rate hesapları testlidir.
- CI/build öncesi test çalıştırılabilir.

### TD-011 - Tarih/saat kolonlarını ve enumları güçlendir

Öncelik: P2  
Alan: Veritabanı  
Efor: M

`shift_date`, `start_time`, `end_time`, `code`, `status` text olarak tutuluyor. Bu esnek ama veri hatalarına açık.

Önerilen çözüm:
- `shift_date` için `date` tipine geçiş planı hazırla.
- `start_time` ve `end_time` için `time` tipi değerlendir.
- `code` ve `status` için check constraint veya Postgres enum kullan.
- `day_index` türetilmiş veri olduğu için generated column veya uygulama tarafında tamamen derive etme seçeneklerini değerlendir.

Kabul kriterleri:
- Geçersiz tarih/saat/status DB seviyesinde engellenir.
- Mevcut veriler migration öncesi doğrulanır.
- Frontend mapper'ları yeni tipe uyarlanır.

### TD-012 - A11y ve klavye kullanılabilirliği

Öncelik: P2  
Alan: UX  
Efor: M

Uygulamada çok sayıda custom button, select, dialog ve grid etkileşimi var. Klavye navigasyonu, focus yönetimi ve aria etiketleri sistematik olarak garanti edilmiyor.

Önerilen çözüm:
- Dialog için focus trap ve Escape davranışını doğrula.
- Icon-only butonlara erişilebilir isim ekle.
- Monthly grid seçim/picker davranışını klavyeyle kullanılabilir hale getir.
- Form hata mesajlarını inputlarla ilişkilendir.

Kabul kriterleri:
- Temel akışlar klavye ile tamamlanabilir.
- Modal açıldığında focus doğru yere gider ve kapanınca geri döner.
- Axe/Playwright a11y kontrolünde kritik hata yoktur.

### TD-013 - Migration disiplinini repoya taşı

Öncelik: P3  
Alan: DevOps  
Efor: M

Repoda tek `supabase/schema.sql` var; remote projede migration geçmişi var ama yerel migration dosyaları görünmüyor. Bu, schema geçmişini takip etmeyi ve ekip çalışmasını zorlaştırır.

Önerilen çözüm:
- Supabase CLI yapısı ekle veya mevcut remote migrationları repoya dök.
- Yeni schema değişiklikleri için `supabase/migrations` kullanılmalı.
- `schema.sql` snapshot olarak tutulacaksa üretim yöntemi dokümante edilmeli.

Kabul kriterleri:
- Yeni DB değişiklikleri migration dosyasıyla PR'a girer.
- Local ve remote schema farkı kontrol edilebilir.
- README kurulum adımları migration akışını anlatır.

### TD-014 - Dokümantasyon ve ortam doğrulama

Öncelik: P3  
Alan: DX  
Efor: S

Supabase env değerleri eksik veya hatalı olduğunda hata sadece yükleme ekranında genel bağlantı hatası olarak görünüyor.

Önerilen çözüm:
- Env validation helper ekle.
- Eksik env için geliştirme ortamında net console/error mesajı göster.
- README'e local setup, build, Supabase bağlantı kontrolü ve güvenlik notlarını ekle.

Kabul kriterleri:
- Eksik `VITE_SUPABASE_URL` veya key durumunda açık hata alınır.
- Yeni geliştirici README ile projeyi ayağa kaldırabilir.
- Güvenlik uyarısı ve RLS notu dokümante edilir.

### TD-015 - Shift status tutarlılığını sağla

Öncelik: P1  
Alan: İş kuralları  
Efor: S

`ShiftStatus` tipi `Geç Kaldı` değerini içeriyor ve rapor hesapları bu durumu gelmiş kabul ediyor. Ancak UI'daki `STATUSES` listesinde `Geç Kaldı` seçeneği yok. Bu, veritabanında veya geçmiş kayıtlarda bulunan bir status değerinin kullanıcı tarafından seçilememesine ve durum modelinin dağınık kalmasına neden olur.

Önerilen çözüm:
- Status değerleri için tek kaynak oluştur.
- `STATUSES`, `ShiftStatus`, badge görünümü, rapor hesabı ve Supabase check/enum kararını aynı modelden türet.
- `Geç Kaldı` ürün akışında kullanılacaksa modal ve günlük kontrol ekranına ekle.
- Kullanılmayacaksa type, rapor hesabı ve DB değerleri temizlenerek modelden çıkar.

Kabul kriterleri:
- Tüm geçerli status değerleri UI'da tutarlı şekilde seçilebilir veya bilinçli olarak modelden çıkarılmıştır.
- Raporlar ve badge bileşenleri aynı status listesini kullanır.
- Geçersiz status değeri frontend ve DB seviyesinde engellenir.

### TD-016 - Lint ve format altyapısı kur

Öncelik: P2  
Alan: DX  
Efor: S

Projede TypeScript build var, ancak lint/format standardı görünmüyor. Bu durum kullanılmayan kod, hook dependency hataları, tutarsız format ve review sırasında gereksiz stil tartışmalarına yol açabilir.

Önerilen çözüm:
- ESLint'i React + TypeScript kurallarıyla ekle.
- Prettier veya seçilecek formatter standardını tanımla.
- `npm run lint`, `npm run format:check` ve gerekiyorsa `npm run format` scriptlerini ekle.
- Hook dependency ve accessibility kurallarını mümkün olduğunca otomatik yakala.

Kabul kriterleri:
- Lint komutu temiz çalışır.
- Format kontrolü tekrarlanabilir sonuç verir.
- Yeni PR'larda temel React/TypeScript hataları build beklenmeden yakalanır.

### TD-017 - Personel silmede vardiya geçmişini koru

Öncelik: P1  
Alan: Veri bütünlüğü  
Efor: M

`shifts.emp_id` foreign key'i `on delete cascade` ile tanımlı. Bu nedenle bir personel silindiğinde o personele ait geçmiş vardiyalar da kalıcı olarak silinir. Operasyonel raporlar, geçmiş devam kayıtları ve denetim ihtiyacı için bu veri kaybı risklidir.

Önerilen çözüm:
- Ürün kararını netleştir: Personel gerçekten silinebilir mi, yoksa pasife alma mı kullanılmalı?
- Personel silmeyi soft delete / `is_active = false` akışına çevir.
- Eğer fiziksel silme kalacaksa kullanıcıya kaç vardiyanın silineceğini açıkça göster.
- DB tarafında `on delete cascade` yerine `restrict` veya arşivleme stratejisi değerlendir.

Kabul kriterleri:
- Yanlışlıkla personel silme geçmiş vardiya verisini kaybettirmez.
- Silme/pasife alma davranışı UI'da açıkça anlatılır.
- Raporlar pasif personelin geçmiş vardiyalarını doğru gösterebilir.

### TD-018 - Serbest saatli vardiyaların kod davranışını düzelt

Öncelik: P1  
Alan: İş kuralları  
Efor: S

`codeFromTimes` sadece üç sabit vardiya saatini tanıyor. Shift modalında kullanıcı serbest saat seçebildiği için `09:00-17:00` gibi özel saatler `-` koduna düşebilir. Bu kayıtler günlük kontrol ve raporlarda çalışma vardiyası sayılmayabilir.

Önerilen çözüm:
- Serbest saatli vardiya desteklenecek mi karar ver.
- Desteklenecekse `Özel` veya benzeri ayrı bir çalışma kodu ekle.
- Desteklenmeyecekse modalda sadece tanımlı vardiya şablonları seçilebilir olsun.
- `codeFromTimes` yerine açık shift code seçimini form modeline ekle.

Kabul kriterleri:
- Çalışma vardiyası olan özel saatler `-`/boş koduyla kaydedilmez.
- Günlük kontrol ve raporlar özel saatli çalışma vardiyalarını doğru sayar.
- Kullanıcı hangi kodla kayıt oluşturduğunu net görür.

### TD-019 - Aktif personel yokken vardiya oluşturmayı engelle

Öncelik: P1  
Alan: Validasyon  
Efor: S

Yeni vardiya modalında aktif personel bulunamazsa `empId` değeri `0` olabiliyor. Form validasyonu personel seçimini kontrol etmediği için kullanıcı kaydetmeye bastığında DB foreign key hatası alır ve genel hata mesajı görür.

Önerilen çözüm:
- Shift form validasyonuna geçerli `empId` kontrolü ekle.
- Aktif personel yoksa "Yeni Vardiya Ekle" akışını disabled yap veya açıklayıcı empty state göster.
- Modal açıldığında personel listesi boşsa kaydet butonu pasif olsun.

Kabul kriterleri:
- Aktif personel yokken invalid `emp_id = 0` payload gönderilmez.
- Kullanıcı neden vardiya oluşturamadığını anlaşılır şekilde görür.
- DB constraint hatası normal kullanıcı akışında tetiklenmez.

### TD-020 - localStorage navigation değerlerini doğrula

Öncelik: P3  
Alan: Sağlamlık  
Efor: S

`vy_view` ve `vy_mode` localStorage değerleri doğrudan TypeScript type cast ile okunuyor. localStorage bozulursa veya eski bir değer kalırsa app geçersiz navigation state ile açılabilir.

Önerilen çözüm:
- `isViewId` ve `isScheduleMode` guard fonksiyonları ekle.
- Geçersiz localStorage değerinde güvenli varsayılana dön.
- Gerekirse bozuk değeri localStorage'dan temizle.

Kabul kriterleri:
- Geçersiz `vy_view` değeri app'i boş veya kırık ekranda bırakmaz.
- Geçersiz `vy_mode` değeri otomatik olarak `ay` veya seçilen default değere döner.
- Guard fonksiyonları unit test ile doğrulanır.

### TD-021 - Custom Select erişilebilirliğini iyileştir

Öncelik: P2  
Alan: UX  
Efor: M

Custom Select bileşeninde seçenekler `div` olarak render ediliyor; listbox/option rolleri, klavye navigasyonu ve aria ilişkileri eksik. Bu TD-012'nin somut bir alt işidir ve form kullanılabilirliğini doğrudan etkiler.

Önerilen çözüm:
- Select için `button + listbox + option` aria modelini uygula veya native select/headless erişilebilir bir bileşene geç.
- Arrow key, Enter, Escape ve focus davranışlarını ekle.
- Seçili değer ve hata durumunu screen reader'a duyur.

Kabul kriterleri:
- Select sadece klavye ile açılıp seçenek değiştirilebilir.
- Screen reader seçili değer, açık/kapalı durum ve option listesini okuyabilir.
- Form hata durumları ilgili select ile ilişkilidir.

### TD-022 - Aylık grid sıralama davranışını netleştir

Öncelik: P3  
Alan: UX  
Efor: S

Aylık grid ilk sıralamayı bugünün vardiya koduna göre yapıyor, ancak vardiya kodları değiştikçe `empOrder` otomatik yeniden hesaplanmıyor. Bu davranış manuel sıralamayı korumak için iyi olabilir; fakat kullanıcı otomatik sıralama bekliyorsa belirsizdir.

Önerilen çözüm:
- Ürün kararını netleştir: sıralama manuel mi, otomatik mi, yoksa kullanıcı seçimi mi?
- Manuel sıralama korunacaksa UI'da bu davranışı netleştir ve gerekirse reset/sırala butonu ekle.
- Otomatik sıralama istenecekse ilgili vardiya değişimlerinde `empOrder` güncelleme kuralı tasarla.

Kabul kriterleri:
- Kullanıcı sıralamanın neden değiştiğini veya değişmediğini anlayabilir.
- Manuel reorder ile otomatik sort birbirini beklenmedik şekilde ezmez.
- Filtre ve ay değişimlerinde sıralama tutarlı davranır.

## Önerilen Uygulama Sırası

### Sprint 0 - Güvenlik ve veri bütünlüğü

1. TD-001 Supabase RLS ve yetkilendirme modeli
2. TD-002 Vardiya veri bütünlüğü kısıtları
3. TD-003 Personel güncellemesinde vardiya snapshot tutarsızlığı
4. TD-017 Personel silmede vardiya geçmişini koru

### Sprint 1 - Güvenilirlik ve performans

1. TD-004 Tarih aralığı validasyonunu tekilleştir
2. TD-015 Shift status tutarlılığını sağla
3. TD-018 Serbest saatli vardiyaların kod davranışını düzelt
4. TD-019 Aktif personel yokken vardiya oluşturmayı engelle
5. TD-006 Hata yönetimi ve kullanıcı geri bildirimi
6. TD-007 Büyük bundle: XLSX'i lazy-load et
7. TD-005 Sınırsız vardiya yüklemeyi tarih aralıklı sorguya çevir

### Sprint 2 - Bakım kolaylığı

1. TD-008 Supabase generated types kullan
2. TD-016 Lint ve format altyapısı kur
3. TD-021 Custom Select erişilebilirliğini iyileştir
4. TD-009 App.tsx state ve veri işlemlerini hook/reducer'lara böl
5. TD-010 Test altyapısı kur

### Sprint 3 - Sağlamlaştırma

1. TD-011 Tarih/saat kolonlarını ve enumları güçlendir
2. TD-012 A11y ve klavye kullanılabilirliği
3. TD-020 localStorage navigation değerlerini doğrula
4. TD-022 Aylık grid sıralama davranışını netleştir
5. TD-013 Migration disiplinini repoya taşı
6. TD-014 Dokümantasyon ve ortam doğrulama

## Hızlı Kazanımlar

- `xlsx` dinamik import'a alınarak ana bundle küçültülebilir.
- `catch(() => {})` blokları kullanıcıya toast dönecek hale getirilebilir.
- `ShiftStatus` ve `STATUSES` aynı kaynakta birleştirilebilir.
- Aktif personel yoksa vardiya kaydetme butonu devre dışı bırakılabilir.
- localStorage değerleri guard fonksiyonlarıyla doğrulanabilir.
- `npm run lint` ve format kontrolü eklenerek review kalitesi artırılabilir.
- Personel güncellemesindeki shift snapshot davranışı netleştirilebilir.
- Env validation eklenerek bağlantı hataları daha anlaşılır yapılabilir.

## Riskli Alanlar

- RLS açmak, doğru policy yazılmadan uygulanırsa uygulamanın tüm veri erişimini keser.
- Vardiya unique constraint'i eklemeden önce mevcut çift kayıtlar kontrol edilmelidir.
- Personel silme davranışı değiştirilmeden önce geçmiş vardiya raporlarının nasıl korunacağı netleştirilmelidir.
- Serbest saatli vardiyalar düzeltilmeden önce mevcut `code = '-'` kayıtlarının gerçekten boş mu yoksa özel vardiya mı olduğu incelenmelidir.
- `shift_date` tip değişimi yapılmadan önce tüm mevcut kayıtların ISO tarih formatında olduğu doğrulanmalıdır.
- Büyük state refactor'u test olmadan yapılırsa aylık grid davranışında regresyon riski yüksektir.
