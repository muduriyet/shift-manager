# Varlık Takip — Ekran ve Pop-up Tasarım Envanteri

Son güncelleme: 2026-09-19

Durum: **Tasarım seti hazır; uygulama kodu değil.** 16 görsel pafta, masaüstü ve mobil varyantları kapsar.

[Galeri](design-gallery.html) · [Geliştirme/sprint planı](../../FEATURE_ASSET_TRACKING.md)

## Görsel indeks

| ID | Pafta | Kapsam |
|---|---|---|
| 00 | [Ana ekran — takvim ve öncelikli işler](assets/00-ana-ekran.png) | Gecikenler, bugünkü işler, yaklaşan vadeler, ortak takvim ve varlık paneli. |
| 01 | [Takipler ve satır işlemleri](assets/01-takipler.png) | Filtreli liste, takip/arşiv seçimi ve hızlı satır işlemleri. |
| 02 | [Varlıklar ve bina detayı](assets/02-varliklar.png) | Araç, bina ve diğer varlıklar; bağlı takipler ve son işlemler. |
| 03 | [Varlık oluşturma ve düzenleme](assets/03-varlik-formlari.png) | Araç, bina, diğer varlık; mükerrer plaka, benzer bina ve şirket geneli. |
| 04 | [Poliçe oluşturma ve düzenleme](assets/04-police-formu.png) | Zorunlu tek belge, TL prim ve ilk dönem; düzenleme varyantı. |
| 05 | [Muayene, kira kontratı ve yeni dönem](assets/05-tarih-formlari.png) | Tarih takibi formları; isteğe bağlı belge ve manuel yeni dönem. |
| 06 | [Ödeme oluşturma ve ödendi kaydetme](assets/06-odeme-formlari.png) | Yeni ödeme, TL tutarı, isteğe bağlı dekont ve ödeme işaretleme. |
| 07 | [Takip türlerini yönetme](assets/07-tur-yonetimi.png) | Tür listesi, yeni tür, düzenleme ve varlık kategorileri. |
| 08 | [Poliçe detayları ve işlem geçmişi](assets/08-takip-detayi.png) | Mevcut/gelecek/geçmiş dönemler, boşluk uyarısı ve audit. |
| 09 | [Poliçe yenileme ve tarih kontrolleri](assets/09-police-yenileme.png) | Yeni poliçe dönemi, boşluk/çakışma uyarısı ve geçersiz tarih. |
| 10 | [Ödeme geçmişi ve yeni dönem](assets/10-odeme-donemleri.png) | Birden çok ödenmemiş dönem, ödenmiş ve iptal edilmiş kayıtlar. |
| 11 | [İşlem onayları](assets/11-onay-pencereleri.png) | Arşivle/geri al, dönem iptal/geri al, paid geri al, tür pasifleştir. |
| 12 | [Belge ve kayıt koruması](assets/12-belge-ve-kayit-korumasi.png) | Belge değiştir/kaldır, kaydetmeden çık ve eşzamanlı düzenleme. |
| 13 | [Boş, hata ve yükleme durumları](assets/13-bos-hata-yukleme.png) | İlk kullanım, filtre boşluğu, yükleme, yeniden deneme ve dosya hataları. |
| 14 | [Mobil ekranlar](assets/14-mobil.png) | Öncelikli işler, filtre paneli, varlık detayı ve tam ekran form. |
| 15 | [Tarih detayı ve dönem düzeltmeleri](assets/15-tarih-detay-duzenleme.png) | Kira kontratı geçmişi, tarih dönemi ve ödeme dönemi düzenleme. |

## Ekran/pencere kapsam matrisi

| Akış | Açıldığı yer | Görsel | Başarı / kapanış davranışı |
|---|---|---|---|
| Ana takvim ve sağ panel | Menü → Varlık Takip | 00 | İşler varsayılan görünür; gün seçimi gerekmez. |
| Takip listesi / arşiv | Takipler | 01 | Aynı tablo Takipte/Arşivde filtresiyle kullanılır. Arşivde detay/geçmiş/belge indirme açıktır; değişiklik eylemleri yerine Yeniden Takibe Al sunulur. |
| Varlık listesi ve detayı | Varlıklar veya kayıt bağlantısı | 02 | Aynı varlığın farklı kategorilerdeki takiplerini gösterir. |
| Yeni araç / düzenle | Yeni Varlık veya Düzenle | 03 | Mükerrer plaka engel; başarılı yeni varlık çağıran formda seçilir. |
| Yeni bina / düzenle | Yeni Varlık veya Düzenle | 03 | Benzer ad/adres uyarısı engel değildir. |
| Diğer varlık / şirket geneli | Yeni Varlık veya Düzenle | 03 | Şirket geneli seçilince şube zorunluluğu kalkar. |
| Yeni poliçe | Yeni Takip → Poliçe | 04 | İlk dönem ve tek zorunlu belgeyle kaydedilir. |
| Benzer takip uyarısı | Yeni Takip → varlık ve tür seçimi | 04/05/06 form içi yeni varyant; henüz çizilmedi | Aynı varlık/türdeki takipler ad/durum/son dönemle gösterilir. Mevcut takibe yeni dönem veya ayrı takip sunulur; arşivden sessiz geri alma ve form kaybı yok. |
| Poliçe / dönem düzenle | Detay veya satır işlemi | 04 | Var olan kayıt düzeltilir; yeni dönem yaratılmaz. |
| Yeni muayene | Yeni Takip → Tarih | 05 | Son tarih zorunlu; dosya olmadan kaydedilebilir. |
| Yeni kira kontratı bitişi | Yeni Takip → Tarih | 05 | Bina seçilir; kiracı, kira tutarı ve taksit alanı yok. |
| Yeni tarih dönemi | Tarih satırı → Yenile | 05 | Yenileme kesinleştikten sonra yeni son tarih girilir; önceki dönem korunur. Randevu/planlanan çalışma alanı yoktur. |
| Yeni ödeme | Yeni Takip → Ödeme | 06 | İlk durum Ödenmedi; TL tutarı ve vade zorunlu. |
| Ödendi kaydet | Ödeme satırı / detay | 06 | Varlık/takip, hedef vade ve tutar pencerede görünür; yalnız seçilen dönem kapanır. Ana satır en eski açık dönemi hedefler. |
| Tür kataloğu | Türleri Yönet | 07 | Kategori/aktiflik filtresi; yedi hazır başlangıç türü, yeni tür ve düzenleme. |
| Yeni tür | Türleri Yönet → Yeni Tür | 07 | Ad, kategori, en az bir uygun varlık kategorisi. |
| Tür düzenle | Tür satırı | 07 | Kullanılmış kategori kilitli; aktif/arşivli bağlı takibi bozacak uygunluk daraltması engellenir ve kullanım açıklanır. |
| Türü etkinleştir | Türleri Yönet → Pasif | 07'nin katalog varyantı | Aynı satır bileşeninde Etkinleştir; kalıcı silme yok. |
| Poliçe detay / dönem geçmişi | Poliçe satırı | 08 | Mevcut, gelecek ve geçmiş dönemleri ayırır. |
| İşlem geçmişi | Detay → İşlem geçmişi | 08 | Kullanıcı, zaman ve eski/yeni değerler; salt okunur. |
| Poliçe yenile | Yenile / Yeni dönem | 09 | Yeni tarihler ve yeni belge; eski dönem korunur. |
| Dönem boşluğu / çakışması | Poliçe yenile/düzenle | 09 | Uyarı; tarihler otomatik değişmez. |
| Geçersiz tarih | Her ilgili tarih formu | 09 | Bloklayıcı alan hatası; kaydet devre dışı. |
| Ödeme geçmişi | Ödeme satırı | 10 | Her ödenmemiş dönem ayrı; paid/cancel geçmişi görünür. |
| Yeni ödeme dönemi | Ödeme detayı → Yeni Dönem | 10 | Önceki ödenmemiş dönemleri kapatmaz. |
| Takibi arşivle | Satır işlemleri | 11 | Açık ödeme varsa aynı onayda sayı ve listeden çıkma etkisi gösterilir. Arşivleme engellenmez; dönem/belge ve ödeme durumu korunur. |
| Yeniden takibe al | Arşiv satırı | 11 | Aktif listeye döner; vadeler güncel tarihle hesaplanır. |
| Dönemi iptal et | Dönem işlemleri | 11 | Neden zorunlu; hesaplardan çıkar, geçmişte kalır. |
| Dönem iptalini geri al | İptal dönem | 11 | Önceki ödeme durumu korunarak tekrar hesaba katılır. |
| Ödendi bilgisini geri al | Ödenmiş dönem | 11 | Ödenmedi yapılır; dekont korunur, audit yazılır. |
| Türü pasife al | Tür işlemleri | 11 | Yeni seçimlerden çıkar; mevcut takipler etkilenmez. |
| Belgeyi değiştir | Dönem belgesi | 12 | Yeni dosya hazır olmadan mevcut dosya kaldırılmaz. |
| İsteğe bağlı belgeyi kaldır | Tarih/dekont dosyası | 12 | Dönem korunur. Poliçe için bu işlem sunulmaz. |
| Kaydetmeden çık | Kirli form X/Escape/Vazgeç | 12 | Düzenlemeye Dön veya Kaydetmeden Çık. |
| Eşzamanlı düzenleme | Sürüm çakışması | 12 | Taslak korunur; güncel kaydı incele; zorla üzerine yazma yok. |
| İlk kullanım | Varlık yok | 13 | Yeni Varlık çağrısı. |
| Filtre boşluğu | Arama/filtre sonucu yok | 13 | Filtreleri Temizle çağrısı; ilk kullanım mesajı gösterilmez. |
| Yükleme | Liste sorgusu | 13 | Skeleton; sahte sıfır KPI üretilmez. |
| Okuma hatası | Liste sorgusu başarısız | 13 | Tekrar Dene. |
| Dosya yükleme / doğrulama hatası | Belge alanı | 13 | İlerleme/yeniden deneme; eski dosya veya form korunur. |
| Kayıt hatası | Mutasyon başarısız | 13 | Girdiler kalır, yeniden deneme sunulur. |
| Mobil iş listesi | Mobil Varlık Takip | 14 | Öncelikli kartlar; aylık takvim alternatif görünüm. |
| Mobil filtre | Filtreler düğmesi | 14 | Panel; Temizle/Uygula. |
| Mobil varlık detayı | Varlık seçimi | 14 | Tablo yerine takip kartları. |
| Mobil form | Yeni Takip / Düzenle | 14 | Tam ekran, kayan gövde ve erişilebilir alt eylemler. |
| Tarih / kontrat detayı | Tarih satırı | 15 | Tek belge, tarih, dönem geçmişi; ayrı sözleşme modülü yok. |
| Tarih dönemi düzeltme | Dönemi Düzenle | 15 | Seçili dönemi değiştirir. Yeni dönem oluşturmaz. |
| Ödeme dönemi düzeltme | Dönemi Düzenle | 15 | Ödenmişse tutar kilitlidir; düzeltme için önce ödeme geri alınır. Not/dekont düzeltmesi ödeme durumunu değiştirmez. Arşivde önce Yeniden Takibe Al gerekir. |

Arşiv listesi, pasif türler, farklı varlık detayları ve mobil kategori formları aynı bileşenlerin veri/başlık varyantlarıdır; yeni bir sayfa veya bağımsız tasarım sistemi değildir. Standart tarih seçici, Select ve dosya seçim pencereleri mevcut UI/native platform davranışını kullanır. Dosya indirme signed URL üzerinden tarayıcıda açılır/indirilir; ayrı uygulama içi PDF editörü/evrak arşivi yapılmaz.

## Ortak etkileşim kuralları

- Zorunlu alanlar `*` ile işaretlenir; hata alanın yanında gösterilir. Boş/geçersiz zorunlu alan kaydı engeller.
- Ödeme tutarı TL sabit ekidir. Kullanıcı para birimi seçemez.
- Kaydet/düzenle/yenile aynı işlem değildir: düzenle mevcut dönemi değiştirir, yenile yeni dönem ekler.
- Poliçe belgesi zorunlu ve tek; diğer kategori belgesi/dekontu isteğe bağlı ve tektir.
- Upload alanındaki seçilmiş geçici dosyayı kaldırmak, var olan kalıcı belgeyi silmek değildir. Yeni dosya başarısızsa eskisi korunur.
- Belge değiştirme penceresinde eski ve yeni dosyanın birlikte gösterilmesi, döneme iki belge eklemek anlamına gelmez.
- İç içe pencere açılınca üstteki pencere odak alır; Escape yalnız en üsttekini kapatır. Dönüşte önceki alan/çağırıcı odağı geri gelir.
- Kaydedilmemiş değişiklik uyarısı X, Escape, Vazgeç ve uygulama içi görünüm değişiminde aynı davranışı kullanır.
- Sunucu yazımı sürerken tekrar gönderim ve kapatma engellenir. Hata durumunda metin ve seçilen dosya mümkün olduğu sürece korunur.
- Oturum sona ermişse başarı gösterilmez; uygulamanın auth gate'i kullanılır.
- Belirsiz ağ yanıtı veya sürüm çakışması, çift dönem yaratmadan/başkasının kaydını ezmeden ele alınır.
- Audit kendi sekmesinde salt okunurdur; dönem geçmişinden farklıdır.
- Durum yalnız renkle anlatılmaz: ikon, metin ve kategori etiketi birlikte bulunur.
- Ödeme ana satırı en eski açık vade ve o dönemin tutarını, yanında “N açık ödeme”yi gösterir. Döneme özel işlem penceresi seçimi sabit tutar; başarı yalnız o dönemi değiştirir, diğer açık dönemleri korur.
- Açık ödemeli arşiv onay metni: “Bu takipte N ödenmemiş dönem var. Arşivleme bunları ödenmiş saymaz; aktif listelerden kaldırır.” Mevcut Vazgeç/Arşivle düğmeleri kullanılır; ikinci onay açılmaz.
- Ödenmiş dönem tutarı salt okunur gösterilir: “Tutarı değiştirmek için önce Ödendi bilgisini geri alın.” Mevcut geri alma akışı kullanılır; tutar düzenlemesi otomatik olarak yeniden Ödendi yapmaz. Not/dekont için ödeme geri alınmaz; ancak arşiv kilidi bütün değişikliklerden önce uygulanır.
- Arşiv detayında “Bu takip arşivde. Değişiklik yapmak için yeniden takibe alın.” açıklaması ve Yeniden Takibe Al eylemi bulunur. Düzenleme, yeni dönem, ödeme/geri alma, dönem iptal/geri alma ve belge yazma eylemleri sunulmaz. Detay/geçmiş/belge görüntüleme ve indirme açıktır. Geri alma başka bir işlemi otomatik başlatmaz; varlığın şube/kapsam düzenlemesi etkilenmez.
- Kaydedilmiş takipte varlık/tür salt okunurdur. Yardımcı metin: “Varlık ve tür kayıttan sonra değiştirilemez. Yanlış bağlantı için takibi arşivleyip yeni takip oluşturun.” Ad/sorumlu/not ve dönem düzeltmeleri açık kalır.
- Varlık şube düzenlemesinde yardımcı metin: “Bağlı takipler güncel şubede görünür; önceki şube işlem geçmişinde korunur.” Aktif/arşivli takip ve geçmiş dönemler güncel varlık kapsamını izler; dönem bazlı şube raporu yoktur.
- Kira kontratı yalnız bitiş tarihiyle takip edilir; ayrıca uyarı tarihi alanı sunulmaz.
- Tarih takibi mevcut ve kesinleşmiş bitiş/geçerlilik tarihlerini tutar. Planlanan randevu/çalışma veya Planlandı/Tamamlandı alanı yoktur. Yeni dönem yardımcı metni: “Yeni dönemi, yenileme kesinleştikten sonra ekleyin.” İsteğe bağlı işlem tarihi gerçekleşen işlemdir; gelecekteki kesinleşmiş son tarih geçerlidir. Ek onay veya zorunlu belge adımı eklenmez.

<a id="taslaklarin-uygulamaya-aktarimi"></a>
## Taslakların uygulamaya aktarımı

Görseller yerleşim ve hiyerarşi referansıdır; pixel-perfect canlı uygulama iddiası değildir. Üretim aracı bazı küçük metin/renk ayrıntılarını farklılaştırmıştır. Aşağıdaki kararlar uygulamada bağlayıcıdır:

1. **03 paftası:** Diğer varlık altındaki yardımcı metin **“Bağlı takipler korunur.”** olmalıdır; rasterda küçük harf bozulması vardır. Şirket geneli mesajı erişim kısıtı değil veri kapsamıdır.
2. **14 paftası:** Üst ve alt görünüm sekmeleri birlikte tekrarlanmış. Mobil uygulamada **tek alt görünüm navigasyonu** kullan; başlık ve İşler/Takvim iç görünümü kalır. Tam ekran form/filtrede alt navigasyon gizlenir. Desktop sekmeleri üsttedir.
3. **Renkler:** Bazı paftalarda Bugün amber, bazılarında mavi; Ödendi işaretle bazen yeşildir. Uygulamada Bugün mavi, Yaklaşıyor amber, Vadesi Geçen kırmızı, tamamlanmış durum yeşil; birincil eylemler mevcut navy button tokenını kullanır.
4. **01 paftası:** “Tüm kayıtlar” temizlenebilir filtre değildir; aktif bir filtre yokken bu çip gösterilmez. Arşivle/Pasife al için çöp kutusu yerine arşiv/pasif ikonları kullan.
5. **09 paftası:** Yan paneller bağımsız durum örnekleridir. Gerçek formda boşluk ve çakışma inline uyarıdır; geçerli veriyle kaydet mümkündür. Ters tarih ve eksik zorunlu dosya engeldir.
6. **04/06/10/15 paftaları:** Birden çok modal yan yana çizilmesi bir tasarım karşılaştırmasıdır. Normal kullanımda tek ana form açılır; yalnız iç içe yeni varlık veya onay akışında ikinci dialog olabilir.
7. **Sayaç ve tarihler:** Örnekler 18.09.2026'ya göredir. Süreler, tutarlar, dosya adları ve kayıt adetleri seed/veri kaynağı veya acceptance fixture değildir.
8. Not kutularındaki `0/500` göstergesi yalnız çizim ayrıntısıdır; 500 karakter yeni bir ürün kuralı olarak alınmaz. Mevcut UI tokenları ve okunaklı Türkçe metinler esas alınır.
9. Başlıklar ve görsel kenarındaki “Tasarım taslağı” pafta açıklamaları canlı ürün içine taşınmaz.
10. Ödeme tarihi isteğe bağlıdır; görselde dolu olması onu zorunlu yapmaz. Kira kontratında para/karşı taraf alanı eklenmez.
11. Takip ve dönem iptal/restore sırasında liste ve sayaçlar aynı türetimden yenilenir. İptal edilen dönemin dosyası geçmişte kalır.
12. Aynı UI kabuğunu yeni kütüphane ile değiştirme; mevcut Button, Field, Select, Dialog, Tabs, Badge ve CSS tokenları uygulanır. Erişilebilirlik eksikleri özellik kapsamındaki ortak bileşen kullanımlarında giderilir.
13. Sonradan onaylanan ödeme hedefi/sayısı, açık ödemeli arşiv uyarısı, varlık/tür kilidi, tür uygunluğu engeli ve şube değişikliği açıklamaları yukarıdaki yazılı sözleşmeye göre uygulanır. Mevcut raster paftalar bu ayrıntıların tamamını göstermeyebilir; bu güncellemede görseller yeniden üretilmedi.

## Tasarım teslim kontrolü

- [x] Ana takvim + Takipler + Varlıklar.
- [x] Araç/bina/diğer varlık oluşturma ve düzenleme.
- [x] Poliçe/tarih/ödeme oluşturma ve dönem düzenleme.
- [x] Tür kataloğu ve tür formları.
- [x] Dönem yenileme, boşluk/çakışma ve işlem geçmişi.
- [x] Ödeme geçmişi, ödendi ve geri alma.
- [x] Arşiv/iptal/pasifleştirme ve geri alma onayları.
- [x] Belge, kaydetmeden çık ve sürüm çakışması pencereleri.
- [x] Boş/yükleniyor/hata durumları.
- [x] Mobil iş listesi, filtre, detay ve form örnekleri.
- [ ] Sonradan onaylanan benzer takip uyarısının görsel varyantı (yazılı davranış tanımlı).
- [ ] Sonradan netleşen ödeme/arşiv ve düzenleme kurallarının raster paftalara uyarlanması (yazılı davranış tanımlı).
- [ ] Uygulama bileşenleri yazıldı ve gerçek veriyle doğrulandı.

Görseller yerleşik `image_gen.imagegen` aracıyla üretildi. Tam promptlar ve düzeltme yönergeleri `design-manifest.json` içinde, nihai PNG'ler bu projede bulunur.
