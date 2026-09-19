# Varlık Takip — Poliçe, Tarih ve Ödeme Yönetimi

Son güncelleme: 2026-09-19

Durum: **PLANLANDI — uygulama geliştirmesi başlamadı.** Tasarım referansları ve sprint planı hazır. Bu dokümandaki tablolar, fonksiyonlar ve bileşenler hedef yapıdır; mevcut veya canlıya uygulanmış kabul edilmemelidir.

## 1. Amaç ve kaynaklar

Araç, bina/taşınmaz ve diğer varlıklara ait poliçeleri, önemli tarihleri ve ödemeleri ortak bir ekrandan izlemek. Kullanıcı ekranı öncelikle geciken ve son tarihi yaklaşan işleri görmek için açar. Takvimden gün seçmeden bu işler görünmelidir.

- [Tasarım galerisi](docs/asset-tracking-handoff/design-gallery.html)
- [Ekran ve pencere envanteri](docs/asset-tracking-handoff/DESIGN_SPEC.md)
- [Handoff özeti](docs/asset-tracking-handoff/README.md)
- [Geliştirme aktarım prompt'u](docs/asset-tracking-handoff/CODEX_PROMPT.md)
- [Üretim yönergeleri ve görsel manifesti](docs/asset-tracking-handoff/design-manifest.json)

Karar önceliği: kullanıcının bu dokümana işlenen kararları → bu spesifikasyon → tasarım envanteri → görseller. Görsellerdeki örnek veri, etiket hatası veya buton rengi yeni iş kuralı oluşturmaz. Eski poliçe görselleri yalnız `assets/legacy/` altında tarihsel referanstır.

## 2. Kilitlenen ürün kararları

| Konu | Karar |
|---|---|
| Adlandırma | Menü/ekran **Varlık Takip**, doküman `FEATURE_ASSET_TRACKING.md`. |
| Ana yön | Handoff'taki B yaklaşımı: öncelikli işler + aylık takvim + seçili kayıt/varlık detayı. |
| Görünümler | Takvim, Takipler, Varlıklar. |
| Varlıklar | Araç, Bina/Taşınmaz, Diğer; ortak varlık kaydına birden fazla takip bağlanabilir. |
| Kapsam | Bir şube veya şirket geneli. Şirket geneli sahte bir şube kaydı değildir. |
| Kişiler | Kişi varlığı, personel bağlantısı ve kişilere yapılan sağlık/hayat/ferdi kaza poliçeleri yok. |
| Takip kategorileri | Poliçe, Tarih, Ödeme. Kategoriler sabit; içlerindeki türler yönetilebilir. |
| Dinamik türler | Tür adı ve uygulanabileceği varlık kategorileri ekrandan yönetilir. Kullanılmış türün kategorisi değişmez. |
| Hazır türler | Trafik sigortası, kasko, muayene, DASK, emlak vergisi, kira kontratı ve kira ödemesi başlangıçta hazırdır; pasifleştirilebilir, yeni tür eklenebilir. |
| Benzer takip | Aynı varlık ve aynı türde mevcut takip varsa uyarılır; mevcut takibe yeni dönem veya ayrı takip seçilebilir. Kesin engel değildir. |
| Takip bağlantıları | Kaydedilmiş takibin varlık ve türü sabittir. Yanlış bağlantı arşivle/doğru takip oluştur akışıyla düzeltilir. |
| Şube değişikliği | Tüm bağlı takipler filtrelerde varlığın güncel kapsam/şubesini izler; önceki kapsam/şube işlem geçmişinde korunur. Dönem bazlı şube raporu yoktur. |
| Yenileme | Aynı takibe yeni dönem eklenir. Geçmiş dönem ve belgeleri korunur. Aynı yılda birden çok dönem olabilir. |
| Para | Yalnız TL; para birimi seçici, kur veya döviz hesabı yok. Gösterim `24.000,00 TL`. |
| Poliçe belgesi | Her dönemde tek, zorunlu belge. Yeni dönem yeni belge ister. |
| Tarih/ödeme belgesi | Dönem başına en fazla tek, isteğe bağlı belge/dekont. |
| Evrak listesi | Kontrol listesi, belge şablonu ve Evrak Eksik KPI'ı yok. |
| Poliçe primi | İsteğe bağlı dönem bilgisi; otomatik borç veya ödeme kaydı oluşturmaz. |
| Ödemeler | Tutar, son ödeme tarihi, ödendi bilgisi; isteğe bağlı ödeme tarihi ve dekont. Kısmi ödeme/taksit yok. |
| Ödeme hedefi | Ana satır en eski açık vade ve açık ödeme sayısını gösterir. Ödendi işlemi vadesi/tutarı gösterilen tek döneme uygulanır. |
| Ödenmiş tutar | Tutar kilitlidir. Düzeltme sırası: Ödendi bilgisini geri al → tutarı düzelt → gerekiyorsa yeniden Ödendi. Not/dekont düzeltmesi ödeme geri alma gerektirmez. |
| Açık ödemeyle arşiv | İzin verilir; mevcut onay penceresi açık dönem sayısını ve aktif listeden çıkma etkisini açıklar. Ödeme durumu değişmez. |
| Arşivde işlem | Takip ve dönemleri salt okunurdur; detay/geçmiş/belge görüntüleme ve indirme açıktır. Değişiklik için önce Yeniden Takibe Al gerekir. Varlığın şube değişikliği bu kilitten etkilenmez. |
| Kira kontratı | İlgili bina altında Tarih takibi: bitiş tarihi, not, isteğe bağlı tek kontrat belgesi. Ayrı sözleşme modeli ve otomatik kira ödeme üretimi yok. |
| Ek uyarı tarihi | Yok. Kira kontratının bitişi ekranda izlenir; ayrı bildirim/uyarı tarihi veya buna yönelik ek takip akışı eklenmez. |
| Tarih takibinin anlamı | Yalnız mevcut ve kesinleşmiş bitiş/geçerlilik tarihleri tutulur. Planlanan randevu/çalışmalar ve Planlandı/Tamamlandı iş akışı yoktur. |
| Yönetim durumu | Takipte / Arşivde. Süre durumları tarihten hesaplanır; formdan seçilmez. |
| İşlem geçmişi | Kullanıcı, zaman, işlem ve değişen bilgiler kaydedilir; kullanıcı tarafından değiştirilemez. |
| Erişim | Giriş yapan tüm kullanıcılar tüm kayıtları görüntüler/düzenler. Şube filtresi yetkilendirme değildir. |
| Bildirim | Ekran içi sayaç ve renkler. E-posta/SMS, menü sayacı ve Görev Defteri bağlantısı yok. |
| Excel | Yalnız ilk ürün görüşmesinde örnek olarak paylaşılmıştır. Import, preview, audit tablosu, 27/19 kayıt doğrulaması yok. |

Ayrıca ilk sürümde hafta/gün takvimi, ayrı evrak arşivi, finansal toplam dashboard'u, serbest alan/form oluşturucu, kilometre bazlı bakım, banka/muhasebe entegrasyonu bulunmaz.

## 3. Varlık ve takip formları

### Varlık

| Kategori | Alanlar |
|---|---|
| Araç | Zorunlu görünen ad ve plaka; isteğe bağlı marka/model. |
| Bina/Taşınmaz | Zorunlu görünen ad; isteğe bağlı adres/bağımsız bölüm açıklaması. |
| Diğer | Zorunlu görünen ad; isteğe bağlı tanımlayıcı kod. |

Ortak alanlar: kapsam (şube/şirket geneli), şube kapsamındaysa zorunlu mevcut şube seçimi, isteğe bağlı not. Şube adları mevcut `stations` kayıtlarından gelir. Sorumlu seçimi mevcut ofis kullanıcıları `profiles` üzerinden yapılır; sigortalı kişi anlamına gelmez.

Plaka karşılaştırmasında boşluk ve harf biçimi normalize edilir; aynı plakanın ikinci varlığı oluşturulamaz. Bina için ad/adres benzerliği uyarıdır, kesin engel değildir. Gerçekte farklı taşınmazlar aynı ada sahip olabilir. Tür eşleşmesini bozacak varlık kategorisi değişikliği, bağlı takipler varken engellenir; ad, adres, not ve şube değiştirilebilir.

Varlığın kapsamı/şubesi değiştiğinde aktif ve arşivli tüm bağlı takipler ile dönemlerin liste/filtre bağlamı varlığın güncel kapsamından türetilir. Takip veya dönemler için ayrı şube kopyası tutulmaz; toplu geçmiş kayıt taşıması yapılmaz. A şubesinden B şubesine geçen varlığın eski dönemleri de B kapsamındaki takip detayında bulunur. Önceki/yeni kapsam ve şube, değiştiren kullanıcı ve zaman aynı işlemde audit'e kaydedilir; şirket geneline geçiş de aynı kurala tabidir. Bu değişiklik tarih, tutar, ödeme veya arşiv durumunu değiştirmez. İlk sürümde “o dönemde hangi şubedeydi” raporu yoktur.

### Takip ve dönem

| Alan | Poliçe | Tarih | Ödeme |
|---|---|---|---|
| Takip adı, varlık, tür | Zorunlu | Zorunlu | Zorunlu |
| Tarih | Başlangıç ve bitiş zorunlu | Son geçerlilik/bitiş zorunlu | Son ödeme zorunlu |
| Ek tarih | — | İşlem tarihi isteğe bağlı | Ödeme tarihi isteğe bağlı |
| Tutar | Prim isteğe bağlı | Yok | Tutar zorunlu |
| Diğer bilgiler | Poliçe no, şirket, acente isteğe bağlı | Yok | Ödendi/ödenmedi |
| Belge | Tek belge zorunlu | Tek belge isteğe bağlı | Tek dekont isteğe bağlı |
| Sorumlu ve not | İsteğe bağlı | İsteğe bağlı | İsteğe bağlı |

TL değerleri kuruş hassasiyetinde saklanır; kayan nokta toplama ile para hesabı yapılmaz. Negatif tutar reddedilir; boş prim ile sıfır prim farklıdır. Formlar Türkçe sayı girişini kabul eder. Bitiş başlangıçtan önce olamaz. Eksik zorunlu alan kaydı engeller. Yeni takip formunda kategori değişiminde alakasız önceki form alanları payload'a taşınmaz.

Yeni ödeme ilk olarak **Ödenmedi** açılır. Dekont eklemek ödeme durumunu değiştirmez. Ödendi işaretlemek yalnız kayıt durumudur; bankada ödeme/transfer gerçekleştirmez. Ödeme durumunu değiştirme, dönem alanlarını düzenlemeden ayrı işlemdir.

İlk kayıt sonrasında takibin varlık ve tür kimlikleri, dolayısıyla takip kategorisi değiştirilemez. Düzenleme formunda bu bilgiler salt okunur gösterilir; kilit sunucuda da uygulanır. Takip adı, sorumlu, not ve kategoriye uygun dönem bilgileri mevcut doğrulamalarla düzenlenebilir. Yanlış varlık/türle açılan takip arşivlenir ve doğru bağlantıyla yeni takip oluşturulur; eski dönemler/belgeler taşınmaz veya yeniden yorumlanmaz. Arşivleme açık ödemeyi kapatmaz ve yeni takibi otomatik oluşturmaz.

Yeni varlık, takip formundaki `+ Yeni varlık` üzerinden eklenebilir. Başarıda üstteki form korunur ve yeni varlık seçilir. Alt pencere iptal edilirse üst form kaybolmaz. Türler `Türleri Yönet` üzerinden yönetilir; kategori alanları dışında özel form tasarlanmaz.

### Hazır türler ve benzer takip uyarısı

| Başlangıç türü | Takip kategorisi | Uygun varlık |
|---|---|---|
| Trafik sigortası | Poliçe | Araç |
| Kasko | Poliçe | Araç |
| Muayene | Tarih | Araç |
| DASK | Poliçe | Bina/Taşınmaz |
| Emlak vergisi | Ödeme | Bina/Taşınmaz |
| Kira kontratı | Tarih | Bina/Taşınmaz |
| Kira ödemesi | Ödeme | Bina/Taşınmaz |

Başlangıç türleri otomatik takip veya dönem oluşturmaz. Kurulum yeniden çalıştığında türler çoğalmaz; kullanıcının değiştirdiği ad/uygunluk veya pasifleştirme kararı üzerine yazılmaz. Diğer varlıklar için kullanıcı uygun dinamik türü oluşturabilir.

Türün uygun varlık kategorileri düzenlenirken aktif veya arşivli herhangi bir bağlı takibi uyumsuz kılacak kategori kaldırma işlemi engellenir; hangi varlık kategorisinin kullanımda olduğu açıklanır. Yeni uygun kategori eklenebilir. Kullanılmış türün takip kategorisi değişmez; pasifleştirme mevcut takipleri geçersiz kılmaz. Bu kurallar sunucuda da uygulanır.

Yeni takip formunda varlık ve tür seçildiğinde aynı varlık/tür kimliğine bağlı takipler aranır; ad benzerliği üzerinden kesin eşleştirme yapılmaz. Mevcut takip adı, Takipte/Arşivde durumu ve son dönem bilgisi inline gösterilir. Takipteki kayıt için **Mevcut takibe yeni dönem ekle**, ayrı kayıt gerektiğinde **Ayrı takip olarak devam et** sunulur. Arşivdeki kayıt için önce detaya ve mevcut geri alma akışına yönlendirilir; sessizce geri alınmaz. Uyarı kayıt oluşturmayı kesin engellemez; varlık+tür için unique kısıtı eklenmez. Formdan başka akışa geçişte girilen bilgiler sessizce kaybedilmez; kaydedilmemiş değişiklik koruması uygulanır. Bu kontrol, aynı isteğin tekrar gönderilmesini önleyen idempotency kuralından ayrıdır.

## 4. Tarih, dönem ve ödeme hesabı

### Ortak

`today` Türkiye (`Europe/Istanbul`) takvim günüdür. Tarihler `date`/`YYYY-MM-DD` olarak taşınır; tarih farkı için saat veya UTC gece yarısı kullanılmaz. Ekran gün değişiminde ve tekrar odaklandığında hesapları yeniler. Görsellerin referans günü 18.09.2026'dır; bu tarih uygulamada sabitlenmez.

- Son tarih < bugün: **Vadesi Geçen**.
- Son tarih = bugün: **Bugün**.
- Bugünden 1–30 gün sonrası: **Yaklaşıyor**.
- 31 gün ve sonrası: takip açık, fakat yaklaşan sayacının dışında.
- İptal dönemler ve arşivli takipler açık vade hesaplarına katılmaz.
- Sayaçlar varlık adedini değil açık vade adedini sayar. Aynı varlığa ait farklı takipler ayrı sayılır.

### Poliçe

Mevcut, geçmiş ve ileri tarihli dönemler ayrılır. Yalnız maksimum bitiş tarihini seçmek yasaktır: bu, yenilemeler arasındaki boşluğu gizleyebilir.

İptal edilmemiş dönemleri başlangıca göre sırala; örtüşen veya gün bazında bitişin ertesi günü başlayan dönemler aynı kesintisiz grupta değerlendirilir. Bugünü içeren grubun sonu yenileme vadesidir. Böylece geçerli ardıl dönem varsa önceki bitiş yeniden uyarı üretmez. Bugünü içeren dönem yoksa son geçmiş dönemin bitişi gecikmiş kalır; gelecekteki ayrı bir dönem aradaki boşluğu kapatmış sayılmaz. Henüz başlamamış ve geçmiş dönemi olmayan poliçe “Henüz başlamadı” bilgisiyle gösterilir, kendi bitişi takvime alınır.

Dönemler arasındaki boşluk ve çakışma detayda ve yeni dönem formunda uyarılır; kullanıcı girdisi otomatik düzeltilmez. Bitişin başlangıçtan önce olması bloklayıcı hatadır; boşluk/çakışma ise inceleme uyarısıdır. Bu model gün bazlı kayıt takibidir; belgenin saat bazlı kapsamını değerlendirmez.

Örnek: mevcut dönem 30.09.2026'da bitip yenisi 10.10.2026'da başlıyorsa 01–09 Ekim boşluğu görünür kalır. Yeni kaydın ilerideki bitişi bu uyarıyı bastırmaz.

### Tarih takibi

İptal edilmemiş dönemlerden son tarihi en ileri olan güncel dönem açık vadeyi oluşturur. Muayene ve kira kontratı bu modeli kullanır. Önceki dönemler detayda korunur. Yeni dönem tarihi kullanıcı tarafından girilir; otomatik bir/yıl/ay eklenmez.

İlk kayıt mevcut ve kesinleşmiş son geçerlilik/bitiş tarihidir. Yeni dönem yalnız yenileme kesinleştiğinde eklenir: muayene tamamlanıp yeni geçerlilik tarihi belli olduğunda veya sözleşme yenilenip yeni bitiş kesinleştiğinde. Mevcut dönemin son gününü beklemek gerekmez. Gelecekteki kesinleşmiş bitiş tarihi geçerlidir; randevu tarihi veya tahmini yenileme tarihi yeni dönem değildir. Planlanan randevu ve çalışmalar tutulmaz; Planlandı/Tamamlandı alanı, randevu takvimi veya planı tamamlama işlemi eklenmez. Tarih formundaki isteğe bağlı işlem tarihi gerçekleşen işlemi ifade eder, randevu alanı değildir.

Yeni tarih dönemi formunda yardımcı metin: **“Yeni dönemi, yenileme kesinleştikten sonra ekleyin.”** Bu bilgi kullanıcı beyanıdır; belge isteğe bağlı kalır ve ek onay/kanıt yükleme adımı getirilmez. En ileri son tarih kuralı bu kesinleşmiş dönemlere uygulanır; önceki dönemler geçmişte korunur.

### Ödeme

Her iptal edilmemiş, ödenmemiş dönem ayrı açık vadedir. Yeni ödeme dönemi, eski ödenmemiş dönemi kapatmaz. Ödendi kaydı aktif uyarılardan çıkar ama geçmişte kalır. Geri alma, ödeme durumunu ödenmedi yapar ve ödeme tarihini temizler; önceki değer işlem geçmişinde, dekont ise dönemde korunur.

Takip ana satırında en eski açık dönemin vadesi ve o dönemin tutarı, yanında **“N açık ödeme”** bilgisi gösterilir; tutar toplam borç gibi sunulmaz. Aynı vadeli dönemler sabit bir ikincil sıralamayla ayrılır. Ana satırdaki **Ödendi** işlemi bu gösterilen dönemi hedefler; detay/takvimde belirli dönemden açılan işlem ise seçilen dönemi hedefler. Pencere varlık/takip adını, hedef vade ve tutarı açıkça gösterir. İstek belirli dönem kimliği ve sürümüyle gönderilir; işlem sırasında başka dönem otomatik seçilmez. Hedef dönem değişmiş/ödenmiş/iptal edilmişse mevcut çakışma kuralı uygulanır. Başarı yalnız bu dönemi kapatır; sonraki açık vade ve sayı yenilenir. Açık dönem yoksa Ödendi eylemi sunulmaz. Takvim/sayaçlarda her açık dönem ayrı sayılmaya devam eder.

Ödemeler için tutar zorunludur; taksit, kısmi tahsilat, bakiye veya poliçe priminden borç üretimi yapılmaz. Kira ödemesi istenirse varlığa ayrıca Ödeme takibi eklenir; kontrattan otomatik üretilmez.

Ödenmiş dönemin tutarı düzenleme formunda salt okunurdur; sunucu da tutar değişikliğini reddeder. Yardımcı metin: **“Tutarı değiştirmek için önce Ödendi bilgisini geri alın.”** Düzeltme sırası mevcut geri alma işlemi → tutar düzenleme → gerekiyorsa yeniden Ödendi işlemidir; düzenleme formu ödeme durumunu sessizce geri almaz veya yeniden ödenmiş yapmaz. Her adım ayrı audit kaydıdır. Not ve dekont düzeltmeleri ödeme durumunu geri almadan yapılabilir; tek belge kuralı korunur. Arşivli takipte bu istisna uygulanmaz: önce takip yeniden açılmalıdır. Ödeme geri alındığında ödeme tarihi temizlenir, mevcut dekont korunur; tutar değişikliği banka işlemi veya yeni dekont üretmez.

### İptal ve arşiv

- Dönem iptali zorunlu neden ister; fiziksel silme yapmaz. Dönem ve belgesi korunur, hesaplardan çıkar.
- İptali geri alma eski dönem bilgilerini geri dahil eder; ödeme önceden ödenmişse ödenmiş kalır.
- Geçerli dönem kalmazsa takip listesinde “Geçerli dönem yok” gösterilir ve yeni dönem işlemi sunulur; sahte tarih üretilmez.
- Arşivleme tüm takibi açık listelerden çıkarır. Yeniden takibe alma güncel tarihle hesapları yeniler.
- Arşivlenmiş takip ve dönemleri salt okunurdur. Detay, dönem/işlem geçmişi ve belgeler görüntülenebilir, belgeler indirilebilir. Takip/dönem düzenleme, yeni dönem, ödeme işaretleme/geri alma, dönem iptal/geri alma ve belge ekleme/değiştirme/kaldırma için önce **Yeniden Takibe Al** gerekir. Arşiv görünümünde değişiklik eylemleri sunulmaz; açıklama ve Yeniden Takibe Al eylemi gösterilir. Yeniden açma yalnız arşiv durumunu değiştirir; ardından kullanıcının istediği işlem ayrıca yapılır. Bağlı varlığın şube/kapsam değişikliği engellenmez ve güncel kapsam kuralı devam eder.
- İptal edilmemiş ödenmemiş dönem varsa mevcut arşiv onayında güncel sayıyla **“Bu takipte N ödenmemiş dönem var. Arşivleme bunları ödenmiş saymaz; aktif listelerden kaldırır.”** açıklaması gösterilir. Vazgeç/Arşivle seçenekleri korunur; arşivleme engellenmez ve ek bir onay penceresi açılmaz. Ödeme durumları ve belgeler korunur; geri almada hâlâ açık olan dönemler liste/sayaçlara yeniden dahil olur.
- Tür pasifleştirme yalnız yeni seçimleri engeller. Mevcut kayıtların verileri ve geçmişi değişmez.

## 5. Ekran ve pencere sözleşmesi

Görsel bağlantıları ve durum listesi [DESIGN_SPEC.md](docs/asset-tracking-handoff/DESIGN_SPEC.md) içindedir.

**Takvim:** üç sayaç, ortak filtreler, solda öncelikli işler, ortada aylık takvim, seçili kayıt için sağ detay. Kullanıcı gün seçmeden iş listesi görünür. Başlangıçta güncel ay açılır. Takvim ayı gezintisi yalnız takvim aralığını değiştirir; “gelecek 30 gün” listesinin anlamı bugüne göre kalır.

**Takipler:** Takipte/Arşivde seçimi; arama, şube, varlık, kategori, tür, durum filtreleri; satırdan detay, düzenle, yeni dönem, arşiv işlemleri. Poliçede görünen tutar prim, ödemede dönem tutarıdır; tabloda bu ayrım açıklanır. Tarihte tutar gösterilmez.

**Varlıklar:** arama, şube ve varlık kategorisi filtreleri; ad/plaka, tür, şube, açık takip ve en acil süre bilgisi. Varlık detayında bağlı takipler ve son işlemler. Bütün kişiler erişebildiğinden şube bir veri filtresidir. Şirket geneli ayrı filtrelenebilir; “Tümü” bütün kapsamları içerir.

Ortak filtreler kalıcı veri kapsamını belirler; süre sekmeleri bunun üzerine uygulanır. Kategori değişince uyumsuz tür/varlık seçimi temizlenir. TR-locale arama kullanılır. İlk kullanım boşluğu, filtre sonucu boşluğu ve yükleme hatası farklı durumlar olarak gösterilir. Hata halinde sıfır veri varmış gibi ekran oluşturulmaz.

Modallar: başlık, etiketli alanlar, X, Vazgeç ve eylemi açıklayan birincil buton. İlk hataya odaklanılır; `aria-modal`, erişilebilir başlık, odak yakalama ve kapatınca odağı çağıran düğmeye iade etme uygulanır. Escape yalnız üst pencereyi kapatır; mevcut Dialog yığını yeniden kullanılır. Kaydedilmemiş değişiklikte “Düzenlemeye Dön / Kaydetmeden Çık” sorulur. Kayıt sürerken çift gönderim ve pencereyi kapatma engellenir.

Mobilde öncelikli iş kartları başlangıç görünümüdür; İşler/Takvim seçimiyle aylık takvime geçilir. Filtreler panelde; detay ve formlar tam ekranda açılır. Dokunma hedefleri en az 44px, düzenlenebilir alanlar en az 16px; form gövdesi kayar, kaydet/vazgeç alt bölümde erişilebilir kalır.

## 6. Teknik tasarım (uygulanacak)

Mevcut React/TypeScript/Vite ve Supabase kullanılacak. `AssetTrackingScreen`, `src/components/asset-tracking/` altında lazy-load edilir. `ViewId`, ekran doğrulama listesi ve Sidebar'a `varliktakip` eklenir. Veri yükleme ekran içinde yapılır; modül hatası uygulamanın giriş yüklemesini bloke etmez.

Planlanan migration: `supabase/create_asset_tracking.sql`. Çekirdek `stations` ve `profiles` kullanılır; personel, vardiya veya satış iş modeli değiştirilmez.

| Planlanan tablo | Sorumluluk |
|---|---|
| `assets` | Varlık kategorisi, ad, normalize plaka, kategoriye özel bilgiler, şube veya şirket geneli. |
| `asset_tracking_types` | Tür adı, sabit kategori, izin verilen varlık kategorileri, aktif/pasif. |
| `asset_tracks` | Varlık/tür ilişkisi, takip adı, sorumlu, not, arşiv, sürüm. |
| `asset_track_periods` | Kategoriye bağlı tarihler ve TL tutarı, poliçe bilgileri, ödeme durumu, iptal nedeni/durumu, sürüm. |
| `asset_documents` | Döneme bağlı tek belge metadata'sı, Storage yolu, dosya adı/boyutu/türü, yükleyen ve zaman. |
| `asset_activity` | Kullanıcı, zaman, işlem, hedef kayıt ve önceki/yeni değerler. Salt okunur geçmiş. |

Türün kategori/varlık uygunluğu, normalize plaka eşsizliği, kategoriye bağlı zorunluluklar, belge tekilliği ve tarih/tutar doğrulaması backend'de de uygulanır. Yıla göre unique dönem kısıtı konmaz. TL tutarları `numeric(...,2)` ile saklanır; para birimi kolonu gerekmez.

TypeScript arayüzleri: `Asset`, `AssetTrackingType`, `AssetTrack`, kategoriye göre ayrılan `AssetTrackPeriod`, `AssetDocument`, `AssetActivity`, liste/özet sonuçları. Kategoriye göre ayrılmış form girdileri alakasız alanların gönderilmesini önler.

Veri arayüzleri: varlık/tür CRUD; filtreli takip ve detay okuma; ilk dönemle takip oluşturma; dönem ekleme/düzenleme; paid/undo; cancel/restore; archive/restore; belge upload/replace/remove/download; işlem geçmişi. Birden fazla satırın birlikte değiştiği mutasyonlar RPC transaction'ı ve aynı transaction'da audit yazımı kullanır. İstemci kullanıcı kimliği audit kaynağı sayılmaz; actor oturumdan sunucuda belirlenir.

Her düzenlenebilir kayıt sürümle korunur: beklenen sürüm değişmişse işlem yazmadan reddedilir. UI, kullanıcının taslağı ile güncel kaydı karşılaştırır; sessiz üzerine yazma veya otomatik force-save yoktur. Yeniden denenen oluşturma işlemleri için idempotency anahtarı kullanılır. Yalnız buton disable etmek yeterli değildir.

Ödenmiş tutar ve arşiv kilitleri yalnız UI davranışı değildir. İlgili yazma işleminde güncel ödeme durumu ve üst takibin arşiv durumu sunucuda transaction içinde doğrulanır; doğrudan API isteği veya önceden açılmış form kuralları aşamaz. Takip arşivlendikten sonra gelen dönem/belge değişikliği reddedilir; yeni dosya mevcut metadata'ya bağlanmaz ve geçici dosya mevcut hata/temizlik akışını izler. Dönem sürümü değişmemiş olsa bile üst takip arşiv kontrolü atlanmaz. Arşivden çıkarma işlemi bu kilidin izin verilen takip mutasyonudur.

Tarih hesapları saf yardımcı fonksiyonlarda tutulur; sayaç, takvim ve liste aynı türetimi kullanır. Büyük listeler paginated okunur; sayaçlar yalnız görüntülenen sayfadan hesaplanmaz.

### Belge saklama ve hata davranışı

- Private `asset-documents`; yalnız oturumlu erişim, signed URL ile indirme. Dosya yolu kullanıcıdan serbestçe alınmaz, bağlı dönemin metadata'sından çözülür.
- PDF/JPG/PNG, en fazla 10 MB; istemci ve sunucu/Storage sınırları birlikte uygulanır. Dosya adı tekillik için kullanılmaz; benzersiz yol üretilir.
- Yeni kayıt için dosya geçici hazırlanır; takip+dönem+metadata transaction ile bağlanır. Başarısız transaction dosya temizliği ve yeniden deneme akışına girer. Kullanıcıya sahte başarı gösterilmez.
- Belge değiştirmede yeni dosya doğrulanıp metadata değişmeden eski dosya kaldırılmaz. Eski dosyanın sonradan temizlenmesi başarısızsa temizlik yeniden denenebilir olarak izlenir.
- Poliçe belgesinde bağımsız kaldırma yoktur. Tarih/dekont kaldırma onaylıdır; kayıt ve dönem korunur.
- İptal/arşiv belgeyi fiziksel silmez. Audit'e binary belge veya signed URL yazılmaz; dosya kimliği/adı ve işlemi yeterlidir.

## 7. Sprint planı

Sprint süreleri takvim günü taahhüdü değildir; aşağıdaki sıra bağımlılığa göre teslim kapılarıdır. Her sprintte ilgili `npm run build` ve hedefli kontroller yapılır. Henüz uygulama sprinti tamamlanmış değildir.

İlk çalışan teslim, araç oluşturma → muayene takibi → listede görüntüleme → kesinleşmiş yeni dönem ekleme → geçmişi inceleme akışıdır. Mobil düzen, klavye/odak davranışı ve kaydedilmemiş değişiklik koruması her formun kendi sprintinde yapılır; S6 bunların ilk geliştirmesi değil bütünleşik doğrulamasıdır.

| Sprint | Bağımlılık | Teslim | Çıkış kriteri |
|---|---|---|---|
| S0 — Spesifikasyon/tasarım | — | Bu doküman, handoff, görseller, galeri ve pencere envanteri. | Kapsam tutarlı; taslak sapmaları işaretli; isimler güncel. |
| S1 — Veri ve kurallar | S0 | Migration, RLS/Storage, atomik yazma/audit, sürüm/idempotency, tarih hesapları, hazır türler. | Kategori/tek belge/plaka kuralları, yetki ve geri alma doğrulanır; yarım kayıt yok; tür kurulumu tekrar çalışabilir. |
| S2 — İlk çalışan akış | S1 | Önce araç → muayene → temel takip listesi → kesinleşmiş yeni dönem → geçmiş; ardından bina/diğer ve tür yönetimi. | Akış masaüstü/mobil çalışır; veri kaybı koruması ve benzer takip uyarısı hazır; varlık/tür kuralları doğrulanır; planlanan işlem alanları yoktur. |
| S3 — Poliçe/ödeme ve belgeler | S2 | Poliçe ve ödeme formları, ilk dönem/düzenleme, dosya işlemleri, detay ve ödeme işaretleme. | Poliçe belgesiz oluşmaz; isteğe bağlı dosyalar ve ödeme durumu çalışır; mobil/form korumaları hazır; hata mevcut veriyi bozmaz. |
| S4 — Takvim/listeler | S3 | Ortak takvim, sayaçlar, filtreler, Takipler ve varlık bağlı takipleri. | Farklı kategoriler ve kira kontratı birlikte görünür; filtre/sayaç tutarlı. |
| S5 — Yenileme/ödeme | S4 | Yeni dönem, ileri tarihli poliçe, boşluk/çakışma, hızlı paid/undo. | Eski dönemler korunur; boşluk ve eski ödenmemiş dönemler gizlenmez. |
| S6 — Düzeltme/bütünleştirme | S5 | Cancel/restore, archive/restore ve tüm kategorilerin işlem geçmişi; form korumaları, concurrency, mobil ve erişilebilirlik bütünleşik kontrolü. | Hatalar geri alınabilir; sessiz veri ezilmez; bütün önemli işlemler mobilde çalışır. |
| S7 — QA/yayın | S6 | Uçtan uca kontroller, hata senaryoları, build, migration/yayın yönergesi. | Kabul senaryoları geçer; hedef veritabanı ve uygulama doğrulanır. |
| S8 — Sonraki aşama | S7, ayrı uygulama kararı | Önceki bilgileri kopyalayan, yeni tarihi kullanıcıya onaylatan dönem önerisi. | Otomatik dönem/borç üretmez. İlk sürüm görsellerinde vaat edilmez. |

## 8. Kabul ve doğrulama senaryoları

1. Aynı araçta trafik, kasko, muayene ve ödeme; aynı binada DASK, vergi ve kira kontratı; diğer varlıkta tarih takibi.
2. Dinamik tür/uygunluk; pasifleştirme mevcut takipleri etkilemez. Kişi kategorisi sunulmaz.
3. `34 abc 123` ile `34ABC123` ikinci araç oluşturamaz. Benzer bina ayrı taşınmazsa kullanıcı devam edebilir.
4. Poliçe zorunlu tek belge ister; tarih ve ödeme belgesiz kaydedilir. Dekont upload paid durumunu değiştirmez.
5. Yeni dönem eski prim, poliçe no ve dosyayı korur. Geçmiş belge yeni döneme taşınmaz.
6. Bitişten ertesi gün başlayan ardıl dönem eski vade uyarısını kapatır; 9 günlük boşluk gizlenmez; overlap uyarılır; ters tarih engellenir.
7. Yeni ödeme dönemi eski ödenmemiş vadeyi kapatmaz. Paid/undo, tarih ve dekont davranışı doğrudur. İptal/restore önceki paid durumunu korur.
8. Dün, bugün, +30 ve +31 gün; Türkiye gece yarısı ve sekmeye geri dönme; arşiv/iptal/paid hariç tutma.
9. Tek takip birden fazla açık ödeme vadesi üretebilir; KPI sayfalama boyutundan etkilenmez.
10. Arşivle/geri al, dönem iptal nedeni/geri al, hiç geçerli dönem kalmaması ve audit kayıtları.
11. Upload başarısızlığı, DB başarısızlığı, dosya değişimi sırasında hata, 10 MB sınırı, desteklenmeyen tür, indirme hatası.
12. İki sekmede düzenleme, çift gönderim, belirsiz ağ yanıtından sonra aynı oluşturma işlemini yeniden deneme.
13. Kaydedilmemiş form, iç içe Yeni Varlık, Escape'in yalnız üst pencereyi kapatması; klavye/odak ve mobil alt eylemler.
14. Oturumsuz veritabanı/Storage erişimi engelli; oturumlu farklı ofis kullanıcıları ortak kayıtlara erişebilir; audit aktörü taklit edilemez.
15. Build başarılı; mevcut vardiya/personel/satış/görev/işe giriş ekranlarında temel gezinme bozulmaz.
16. Yedi başlangıç türü doğru kategori/uygunlukla hazırdır; tekrar kurulum kayıtları çoğaltmaz ve kullanıcı değişikliklerini geri almaz.
17. Aynı varlık/türde uyarı mevcut takibi gösterir; yeni dönem yönlendirmesi ve bilinçli ayrı takip oluşturma çalışır. Arşivdeki kayıt sessizce etkinleşmez; form girdileri sessizce kaybolmaz.
18. Kira kontratında ek uyarı tarihi alanı yoktur; bitiş tarihi mevcut liste/takvim kurallarıyla görünür.
19. Tarih takibinde randevu/planlanan çalışma ve Planlandı/Tamamlandı alanları yoktur. Yeni dönem formu kesinleşmiş yenileme açıklamasını gösterir; yeni son tarih esas alınırken eski dönem geçmişte korunur. Gelecekteki kesinleşmiş son tarih engellenmez; belge isteğe bağlı kalır.
20. Aynı takipte eylül/ekim açıkken ana satır eylül vadesini, onun tutarını ve “2 açık ödeme”yi gösterir. Eylül ödendi işlemi yalnız eylülü kapatır; ekim ve “1 açık ödeme” görünür. Detaydan ekim seçildiyse yalnız ekim kapanır; eski eylül açık kalır. Eşzamanlı değişiklikte başka dönem sessizce hedeflenmez.
21. İki açık dönemle arşiv onayı sayıyı ve etkisini açıklar; vazgeç veri değiştirmez. Arşiv ödeme durumunu değiştirmeden aktif sayaçtan çıkarır; geri alma açık vadeleri güncel tarihle geri getirir.
22. Kaydedilmiş takibin varlık/tür değişikliği UI ve sunucuda reddedilir; ad/sorumlu/not ve dönem düzeltmeleri çalışır. Tür uygunluğu aktif veya arşivli bağlı takibi bozacak şekilde daraltılamaz.
23. A → B şube değişiminde aktif/arşivli takip ve eski dönemlere B filtresinden ulaşılır; A filtresinden çıkılır. Önceki/yeni şube, kullanıcı ve zaman audit'te kalır; ödeme/tarih verisi değişmez. Şirket geneline geçiş aynı davranışı izler.
24. Ödenmiş 10.000 TL dönem doğrudan 15.000 TL yapılamaz; UI ve sunucu kilidi doğrulanır. Geri alma → tutar düzeltme sonrasında dönem ödenmedi kalır; yeniden Ödendi ayrı işlemdir. Not/dekont düzeltmesi ödeme durumunu değiştirmez; audit adımları korunur.
25. Arşivde takip/dönem değişiklikleri ve belge yazma işlemleri UI/API üzerinden engellenir; detay/geçmiş/belge indirme çalışır. Arşivlenmeden önce açılmış form da kaydedilemez. Yeniden Takibe Al sonrasında normal kurallar uygulanır; ödenmiş tutar kilidi sürer. Varlık şube değişikliği arşivden çıkarma gerektirmez.

Salt doküman/görsel hazırlığı için uygulama testlerinin geçmiş olduğu iddia edilmez. Bu kontroller ilgili uygulama sprintlerinde çalıştırılır; tarih ve transaction senaryoları için anlamlı hedefli testler gerekir.

## 9. Yayın ve ilerleme

Yayın sırası: migration/Storage → yetki ve atomik yazma doğrulaması → uygulama yayını → gerçek ortamda temel akış kontrolü. Migration idempotent olmalı; mevcut modüllerin tablolarını değiştirmemeli. Kullanıcı verisi içermeyen test kayıtları kontrollü hazırlanır. Veri oluştuktan sonra tabloları düşürmek bir geri alma yöntemi değildir; önce UI erişimi kaldırılıp veriler korunur.

- [x] S0: Tasarım seti, spesifikasyon ve link doğrulaması tamamlandı.
- [ ] S1–S7: Uygulama sprintleri tamamlandı.
- [ ] Canlı migration ve uygulama yayını yapıldı.

Bu durum kutuları yalnız gerçek doğrulama sonrasında güncellenir.

19.09.2026 tasarım teslim doğrulaması: 16 PNG dosyası, görsel boyutları, kaynak kopyalarının bütünlüğü, yerel doküman/görsel bağlantıları ve galeri JavaScript sözdizimi kontrol edildi. Tarayıcı güvenlik politikası yerel HTML açılışını engellediğinden galeri etkileşimleri tarayıcıda doğrulanamadı. Uygulama build'i ve gerçek veri testleri bu dokümantasyon tesliminde çalıştırılmadı.
