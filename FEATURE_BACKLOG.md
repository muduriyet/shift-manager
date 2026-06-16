# Feature Backlog

Son güncelleme: 2026-06-15

Bu dosya, teknik borç dışındaki ürün geliştirme maddelerini ve karar notlarını takip eder.

## Aktif Feature Backlog

| ID | Öncelik | Başlık | Efor | Durum |
| --- | --- | --- | --- | --- |
| FEAT-001 | P1 | Excel'den aylık vardiya çizelgesi import et | L | MVP tamamlandı |
| FEAT-002 | P1 | Aylık vardiya çizelgesini Excel'e export et | M | Tamamlandı |
| FEAT-003 | P2 | Çizelge grid'inde gün-seçimli sıralama | S | Tamamlandı |

## Detaylı Maddeler

### FEAT-001 - Excel'den aylık vardiya çizelgesi import et

Öncelik: P1
Alan: Çizelge / Import
Efor: L
Durum: MVP tamamlandı

Uygulama notu:

- `Çizelge` ekranına `Excel'den İçe Aktar` akışı eklendi.
- Seçilen şube/departman/ay için gerçek takvimli şablon Excel indirilebilir.
- Import öncesi Excel parse edilir, doğrulama/önizleme çıkarılır ve kullanıcı onayı alınır.
- Import uygulama aşaması frontend batch create/update/delete ile yapılır.
- Import sonrası oluşturulan, güncellenen, silinen, atlanan ve hata alan kayıtlar raporlanır.

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
- `Öz` (serbest saatli) hücreleri import'u bloklamaz; saatleri Excel temsil edemediği için o gün **mevcut kayıt korunur** (değiştirilmez), önizlemede "korundu" uyarısı gösterilir.
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

### FEAT-002 - Aylık vardiya çizelgesini Excel'e export et

Öncelik: P1
Alan: Çizelge / Export
Efor: M
Durum: Tamamlandı

Kullanıcı `Vardiya Çizelgesi` ekranından seçtiği şube, departman ve ay için mevcut vardiya çizelgesini Excel olarak indirebilmelidir. Export, son onaylanan stilli aylık formatta üretilir ve sadece seçilen kapsamı içerir.

#### Önerilen Ekran ve Akış

Feature, `Vardiya Çizelgesi` ekranındaki `Excel` dropdown menüsünden başlatılır.

Dropdown seçenekleri:

- `Excel'e Aktar`
- `Excel'den İçe Aktar`

Export akışı:

1. Kullanıcı `Excel > Excel'e Aktar` seçeneğine basar.
2. `Excel'e Aktar` modalı açılır.
3. Kullanıcı şube, departman ve ay seçer.
4. Şube, departman ve ay alanları zorunludur.
5. Şube/departman listelerinde sadece aktif personel bulunan kombinasyonlar seçilebilir.
6. Kullanıcı `Excel Oluştur` butonuna basar.
7. Sistem seçili kapsam için Excel dosyasını oluşturur ve indirir.

#### Ürün Kararları

- Export sadece aylık formatta üretilir.
- Kullanıcı hafta görünümündeyken de export modalı ay seçimiyle çalışır.
- `Tümü` seçeneği export kapsamında desteklenmez.
- Kapsamın genişleyip sistemi gereksiz yormaması için şube ve departman seçimi zorunludur.
- Personel olmayan şube/departman kombinasyonları seçilemez.
- Personel sıralaması mevcut uygulama/DB sırasıyla korunur.
- Personel kolonu önyüzdeki `Ad Soyad` bilgisini kullanır.
- Status bilgisi export'a dahil edilmez.
- Boş vardiya hücreleri boş kalır.
- İstihdam tarihi dışındaki günler boş kalır.
- Excel tek sheet olarak üretilir.
- Excel'e filtre eklenmez.

#### Excel Formatı

Export dosyası son onaylanan stilli/merge'li formatta olmalıdır:

- Başlık seçili şube/departman ve ay bilgisini içerir.
- Personel başlığı `B2:B3` olarak dikey merge edilir.
- Gün bilgileri aylık grid yapısında kalır:
  - 2. satırda gün kısaltmaları
  - 3. satırda gün numaraları
- Personel adları `B4` satırından başlar.
- Vardiya kodları gün hücrelerine yazılır.
- Sağ tarafta personel bazlı toplamlar bulunur:
  - `S`, `Ö`, `G`, `Öz`, `İ`, `Yİ`, `Üİ`, `İs`
  - `Çalışma`
  - `İzin`
  - `Toplam`
- Toplam başlıkları dikey merge edilir.
- En altta genel toplam satırı bulunur.
- Vardiya grid'i kodlara göre renklendirilir.
- Hafta sonları hafif farklı arka planla ayrıştırılır.
- Genel toplam satırı görsel olarak vurgulanır.

Dosya adı:

`vardiya-cizelgesi-{sube}-{departman}-{yyyy-mm}.xlsx`

Örnek:

`vardiya-cizelgesi-umraniye-akaryakit-2026-06.xlsx`

#### Teknik Notlar

- Export işlemi frontend'de lazy/dinamik Excel import yaklaşımıyla yapılmalıdır.
- `xlsx` paketi ilk bundle'a statik eklenmemelidir.
- Import şablonu ve export üretimi benzer takvim/helper fonksiyonlarını paylaşabilir.
- Export helper'ı UI bileşenlerinden ayrı tutulmalıdır.
- Export modalı, import modalındaki aktif personel bulunan şube/departman filtreleme mantığıyla tutarlı olmalıdır.
- Export formatı kod içinde sıfırdan stillendirilmemelidir; onaylanan Excel dosyası proje içinde template olarak tutulmalıdır.
- Template dosyası `public/templates/vardiya-export-template.xlsx` altında bulunmalıdır.
- Export sırasında template workbook paket yapısı ve `styles.xml` korunmalı; sadece `xl/worksheets/sheet1.xml` seçili kapsam verisiyle güncellenmelidir.
- Template üzerinden ilerlemek Excel corruption riskini azaltır ve ileride görsel format değişikliklerini Excel üzerinde düzenlemeyi kolaylaştırır.

#### Kabul Kriterleri

- Kullanıcı `Excel > Excel'e Aktar` ile export modalını açabilir.
- Kullanıcı şube, departman ve ay seçmeden export başlatamaz.
- Şube/departman listelerinde sadece aktif personel bulunan kapsamlar seçilebilir.
- Export sadece seçili şube/departman/ay için üretilir.
- Çıktıda personel isimleri `Ad Soyad` olarak görünür.
- Çıktıda personel bazlı kod toplamları, çalışma toplamı, izin toplamı ve toplam bulunur.
- Çıktıda genel toplam satırı bulunur.
- Excel dosyası son onaylanan stilli/merge'li formatla uyumludur.
- Excel dosyası proje içindeki template baz alınarak üretilir.
- Export dosyasında filtre bulunmaz.
- Export dosyası tek sheet olarak oluşur.
- `npm.cmd run build` başarılı geçer.

#### Riskler

- Çok kalabalık departmanlarda frontend Excel üretimi süre alabilir.
- `Öz` vardiyalarının saat detayı export'a dahil edilmez; sadece kod toplamına yansır.
- Excel stillerinin farklı Excel/LibreOffice sürümlerinde küçük görsel farklılıkları olabilir.

### FEAT-003 - Çizelge grid'inde gün-seçimli sıralama

Öncelik: P2
Alan: Çizelge / UX
Efor: S
Durum: Tamamlandı

Aylık ve haftalık çizelge grid'inde sıralamayı belirleyen "çapa gün" artık kullanıcı tarafından seçilebilir. Önceden sıralama her zaman bugüne göre sabitti; artık herhangi bir gün başlığına tıklanarak o günün vardiya koduna göre sıralama yapılabilir.

#### Davranış / Ürün Kararları

- Sıralama düzeni: `S → Ö → G → Öz → İ/Yİ/Üİ/İs → boş`, eşitlikte ada göre (mevcut `SHIFT_SORT_ORDER`).
- Tıklama hedefi: gün başlığı (haftagünü + numara). Hücre seçimi/sürükleme davranışı bozulmaz.
- Seçili gün görsel olarak işaretlenir (mavi alt çizgi + sütun tonu); bugün ayrı işaretli kalır (aylıkta mavi başlık, haftalıkta "BUGÜN" rozeti).
- Varsayılan = bugün (görüntülenen ay/haftada ise). Bugün görünmüyorsa sıralama yapılmaz, isim sırası korunur; bir güne tıklanınca sıralanır.
- Ay/hafta değişince seçim varsayılana döner; istasyon/departman filtresi değişince seçili gün korunur.
- Gün seçimi yeniden sıralar (manuel sürükle-sıra ezilir); sonrasında yine elle sürüklenebilir. Sadece sıralama çapası — güne göre filtreleme yapılmaz.
- Kapsam: aylık grid + haftalık masaüstü tablo. Mobil haftalık gün-kartı düzeni gün-merkezli olduğu için kapsam dışı.

#### Teknik Notlar

- `MonthlyView`: `sortMidx` state (varsayılan bugün veya null), `defaultOrder(..., sortMidx)`, ay değişiminde reset efekti, sıralama-günü değişiminde tüm grupları yeniden sıralayan efekt.
- `WeeklyView`: `sortIndex` state, hafta değişiminde reset efekti, seçili güne göre sıralama.
- Salt UI/state özelliği; DB'ye yazma yok.

#### Kabul Kriterleri

- Gün başlığına tıklayınca grid o günün koduna göre S→Ö→G sıralanır ve seçili gün işaretlenir.
- Bugün görünmeyen ay/haftada varsayılan sıralama yapılmaz; gün seçilince sıralanır.
- Ay/hafta değişince seçim varsayılana döner; filtre değişince korunur.
- `npm run build` başarılı geçer.
