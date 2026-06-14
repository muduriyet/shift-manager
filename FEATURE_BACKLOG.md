# Feature Backlog

Son güncelleme: 2026-06-15

Bu dosya, teknik borç dışındaki ürün geliştirme maddelerini ve karar notlarını takip eder.

## Aktif Feature Backlog

| ID | Öncelik | Başlık | Efor | Durum |
| --- | --- | --- | --- | --- |
| FEAT-001 | P1 | Excel'den aylık vardiya çizelgesi import et | L | Planlandı |

## Detaylı Maddeler

### FEAT-001 - Excel'den aylık vardiya çizelgesi import et

Öncelik: P1
Alan: Çizelge / Import
Efor: L
Durum: Planlandı

Mevcut kullanılan vardiya Excel'i uygulamaya yüklenebilmeli. Import işleminden önce kullanıcı şube, departman ve ay seçer. Excel'deki personel isimleri, personel kartındaki `Çizelge İsmi` alanı ile normalize edilerek eşleştirilir. Import sadece seçili şube/departmandaki aktif personeller ve seçili ay kapsamına uygulanır.

#### Önerilen Ekran

Feature, `Çizelge` ekranında `Excel'den İçe Aktar` butonu ile açılan bir modal/wizard olarak tasarlanacak.

Akış:

1. Şube, departman ve ay seçimi
2. Excel dosyası yükleme
3. Ön analiz ve doğrulama
4. Kullanıcı onayı
5. Import uygulama
6. Sonuç raporu

#### Ürün Kararları

- İlk sürüm dinamik Excel format algılama yapmaz.
- Import sadece uygulamanın ürettiği sabit şablon formatını destekler.
- Kullanıcı seçtiği şube/departman/ay için gerçek takvimli Excel şablonu indirebilir.
- Şablon seçilen aya göre üretilir; Şubat ve Temmuz gibi farklı aylar aynı kolon sayısını veya aynı gün dizilimini kullanmaz.
- Format hatasında kullanıcıya hatanın nedeni açıkça gösterilir ve doğru şablonu indirmesi önerilir.

#### Excel Şablonu ve Formatı

İlk sürüm sabit şablon formatını bekler:

- Personel isimleri: `B4:B...`
- Gün numaraları: `D2:...`
- Vardiya kodları: `D4:...`
- Gün kolonları seçilen ayın gün sayısına göre okunur.

Şablon üretimi:

- Şablon, kullanıcı şube/departman/ay seçtikten sonra indirilebilir.
- `B` kolonuna seçili şube/departmandaki aktif personellerin `Çizelge İsmi` değerleri yazılır.
- `D` kolonundan itibaren seçilen ayın gerçek günleri oluşturulur.
- 1. satırda gün kısaltmaları yer alır: `PT`, `S`, `Ç`, `P`, `C`, `CT`, `P`.
- 2. satırda gün numaraları yer alır.
- 4. satırdan itibaren personeller listelenir.
- Dosya adı seçilen kapsamı içermelidir. Örnek: `vardiya-sablon-umraniye-market-2026-07.xlsx`.

Ay kuralları:

- Seçilen ayın gün sayısı esas alınır.
- Şubat 28 veya artık yılda 29 gün üretilir.
- 31 günlük aylar 31 gün üretilir.
- Gün adları seçilen yıl/ayın gerçek takvimine göre hesaplanır.
- Excel'de eksik gün varsa format/takvim uyumsuzluğu olarak gösterilir.
- Excel'de fazla gün varsa fazla kolonlar yok sayılabilir; ancak kullanıcıya uyarı gösterilir.

Format doğrulama hatası örnekleri:

- `D2` hücresinden başlayan beklenen gün numaraları bulunamadı.
- `B4` kolonunda personel ismi bulunamadı.
- Seçilen ay için beklenen gün kolonları eksik.
- Dosya beklenen şablon formatında değil. Lütfen seçili şube/departman/ay için yeni şablon indirin.

#### Import Kuralları

- İsim eşleşmesi `Çizelge İsmi` üzerinden yapılır.
- İsim eşleşmesi normalize edilir: trim, büyük/küçük harf farkı, Türkçe locale karşılaştırması ve fazla boşluklar dikkate alınır.
- Sadece seçili şube/departmandaki aktif personeller kapsama alınır.
- Excel'de olmayan kapsamdaki aktif personellerin seçili ay vardiyaları silinir.
- Boş Excel hücresi, ilgili personel/gün vardiyasını siler.
- Eşleşmeyen Excel isimleri import'u bloklamaz; raporda atlandı olarak gösterilir.
- Duplicate `Çizelge İsmi` varsa import bloklanır.
- Geçersiz vardiya kodu varsa import bloklanır.
- `S`, `Ö`, `G` çalışma vardiyasıdır.
- `İ`, `Yİ`, `Üİ`, `İs` izin/off kodlarıdır.
- `S`, `Ö`, `G` saatleri mevcut uygulama sabitleriyle aynıdır:
  - `S`: 08:00-16:00
  - `Ö`: 16:00-00:00
  - `G`: 00:00-08:00
- Yeni kayıtlar `Planlandı` status ile oluşturulur.
- Mevcut kayıtta vardiya kodu aynıysa mevcut status korunur.
- Mevcut kayıtta vardiya kodu değiştiyse status `Planlandı` yapılır.

#### Mevcut Vardiya Uyarısı

Seçili şube/departman/ay kapsamında mevcut vardiya varsa kullanıcıya net uyarı gösterilir.

Önerilen metin:

> Seçili şube/departman için bu ayda mevcut vardiya kayıtları var. Devam edersen Excel'deki çizelge bu ayın kayıtlarının yerine uygulanacak. Excel'de boş olan hücreler vardiyayı silecek, Excel'de olmayan aktif personellerin bu ay kayıtları silinecek.

Kullanıcı bu uyarıyı checkbox ile onaylamadan import başlatılamaz.

#### Önizleme ve Rapor

Import öncesi önizleme:

- Eşleşen personel sayısı
- Eşleşmeyen Excel isimleri
- Duplicate `Çizelge İsmi` kayıtları
- Geçersiz vardiya kodları
- Oluşturulacak kayıt sayısı
- Güncellenecek kayıt sayısı
- Silinecek kayıt sayısı
- Eksik/fazla gün uyarıları
- Mevcut vardiya uyarısı

Import sonrası rapor:

- Oluşturulan kayıt sayısı
- Güncellenen kayıt sayısı
- Silinen kayıt sayısı
- Status'u korunan kayıt sayısı
- Kod değiştiği için `Planlandı` yapılan kayıt sayısı
- Atlanan Excel isimleri
- Hata alan kayıtlar

Örnek sonuç mesajı:

> Import tamamlandı. 124 kayıt oluşturuldu, 86 kayıt güncellendi, 12 kayıt silindi. 2 Excel satırı personel eşleşmediği için atlandı. 0 kayıt hata aldı.

#### Teknik Notlar

- Excel parse işlemi frontend'de `xlsx` dinamik import ile yapılacak.
- Export için eklenen lazy Excel yaklaşımı import için de korunacak.
- Şablon Excel üretimi de aynı ortak Excel altyapısı üzerinden yapılmalı.
- İlk sürüm frontend batch create/update/delete ile yapılabilir.
- Atomic transaction ihtiyacı doğarsa import uygulama kısmı Postgres RPC'ye taşınmalı.
- Mevcut Supabase DB'de `employees.schedule_name` kolonunun dolu olması gerekir; aksi halde eşleşme yapılamaz.

#### Kabul Kriterleri

- Kullanıcı şube, departman ve ay seçmeden Excel yükleyemez veya import başlatamaz.
- Kullanıcı seçtiği şube/departman/ay için gerçek takvimli şablon Excel indirebilir.
- Şubat, artık yıl Şubat ve 31 günlük aylar doğru gün sayısıyla şablon üretir.
- Import sadece beklenen sabit şablon formatını kabul eder.
- Format uyuşmazlığında kullanıcıya neden hata aldığı açıkça gösterilir.
- Excel yüklendiğinde kayıt yazmadan önce önizleme/doğrulama ekranı gösterilir.
- Duplicate `Çizelge İsmi` veya geçersiz kod varsa import bloklanır.
- Eşleşmeyen Excel isimleri raporda atlandı olarak görünür.
- Boş hücreler ve Excel'de olmayan kapsam personelleri için seçili ay vardiyaları silinir.
- Mevcut kod aynıysa vardiya status'u korunur.
- Kod değişirse veya yeni kayıt oluşursa status `Planlandı` olur.
- Import sonunda kullanıcıya özet rapor gösterilir.
- `npm.cmd run build` başarılı geçer.

#### Riskler

- Excel formatı değişirse parser kırılabilir.
- Dinamik format algılama bilinçli olarak kapsam dışıdır; bu risk şablon indirme ve net hata mesajlarıyla azaltılır.
- Frontend batch import sırasında ağ kesilirse kısmi başarı oluşabilir; sonuç raporu bunu görünür yapmalı.
- Çok büyük Excel dosyalarında işlem süresi uzayabilir.
- `Çizelge İsmi` alanları doldurulmadan import pratikte eşleşme üretemez.
