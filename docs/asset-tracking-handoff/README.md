# Varlık Takip — Handoff ve Tasarım Paketi

Son güncelleme: 2026-09-19

Bu paket araç, bina/taşınmaz ve diğer varlıkların poliçe, tarih ve ödeme takibi için hazırlanmıştır. **Uygulama henüz geliştirilmedi; tasarım ve geliştirme planı hazırlandı.**

## Başlangıç

1. [Geliştirme dokümanı ve sprint planı](../../FEATURE_ASSET_TRACKING.md)
2. [Tüm tasarımları aç](design-gallery.html)
3. [Ekran ve pop-up envanteri](DESIGN_SPEC.md)
4. [Geliştirme prompt'u](CODEX_PROMPT.md)
5. [Görsel manifesti ve tam üretim yönergeleri](design-manifest.json)

## Kesinleşen kapsam

- Ekran/menü adı **Varlık Takip**; ana doküman `FEATURE_ASSET_TRACKING.md`.
- Ana yaklaşım **B: takvim + öncelikli işler**; Takipler ve Varlıklar görünümleriyle desteklenir.
- Araç, bina/taşınmaz, diğer varlıklar; bir şube veya şirket geneli.
- Dinamik Poliçe / Tarih / Ödeme türleri; varlık kategorilerine göre uygunluk.
- Yedi hazır başlangıç türü; aynı varlık/türde mevcut takibe yeni dönem eklemeyi öneren, ayrı takibe izin veren uyarı.
- Poliçede tek zorunlu belge, tarih/ödemede tek isteğe bağlı belge/dekont.
- Prim ve ödeme yalnız TL. Döviz seçimi ve kur hesabı yok.
- Kira kontratı, binaya bağlı tarih takibidir; bitiş, not ve isteğe bağlı belge tutulur.
- Kira kontratı için ayrıca uyarı tarihi alanı yoktur.
- Yenilemeler dönem olarak korunur. Ödeme dönemleri ayrı ayrı ödenmiş/ödenmemiş izlenir.
- Arşivle/geri al, dönem iptal/geri al, işlem geçmişi ve veri kaybı korumaları.
- Ödeme satırında en eski açık vade ve açık dönem sayısı; Ödendi penceresinde belirli dönemin vade/tutarı. İşlem yalnız o dönemi kapatır.
- Ödenmiş tutar kilitlidir; düzeltmek için önce ödeme geri alınır, tutar düzeltilir ve gerekiyorsa yeniden Ödendi yapılır. Not/dekont düzeltmek için ödeme geri alınmaz.
- Açık ödemeli takip arşivlenebilir; mevcut onay penceresi sayıyı ve aktif listeden çıkma etkisini açıklar. Ödemeler kapanmaz.
- Arşivde takip/dönemler salt okunurdur; detay, geçmiş ve belge indirme açıktır. Değişiklik için önce Yeniden Takibe Al gerekir; varlığın şube değişikliği bundan etkilenmez.
- Kaydedilmiş takibin varlık/türü değişmez; tür uygunluğu mevcut aktif/arşivli takipleri bozacak şekilde daraltılamaz.
- Şube filtreleri varlığın güncel şubesini esas alır; önceki/yeni şube ve değişiklik bilgisi işlem geçmişinde korunur. Dönem bazlı şube raporu yoktur.
- Tüm giriş yapan kullanıcılar ortak erişir; belgeler private Storage'dadır.

## Kapsam dışında

Kişi varlıkları ve kişiye yapılan poliçeler, Excel import/export, taksit/kısmi ödeme, banka/muhasebe entegrasyonu, otomatik kira/prim borcu, e-posta/SMS, belge kontrol listesi, ayrı evrak arşivi, mali toplam dashboard'u, hafta/gün takvimi, kilometre bazlı bakım.

Başlangıçta paylaşılan Excel yalnız örnek poliçe türlerini anlatıyordu. Dosya bir veri göçü kaynağı değildir. 27 poliçe / 19 eksik kayıt sayıları, 2026 Eksik kartı ve import audit gereksinimleri geçerli değildir.

## Tasarım dosyaları

Galeri, **16 güncel görsel paftayı** içerir. Dosyalar `assets/00-...` ile `assets/15-...` arasında sıralıdır. Oluşturma/düzenleme/uyarı varyantları aynı paftada yan yana olabilir; uygulamada aynı anda açılmaları beklenmez.

Örnek verinin referans tarihi **18.09.2026**'dır. Runtime tarihleri sabitlenmez. Görseller Imagegen'in yerleşik aracıyla üretilmiş planlama referanslarıdır; etkileşimli uygulama değildir. Metin, renk ve iş kuralı için [uyarlama notlarını](DESIGN_SPEC.md#taslaklarin-uygulamaya-aktarimi) okuyun.

`assets/legacy/` eski poliçe A/B/C taslaklarını ve yeni poliçe görselini korur. Bunlar güncel tasarım değildir; eski Excel, kişiler, döviz veya çoklu belge öğeleri uygulanmaz.

## Repo entegrasyonu

- `AssetTrackingScreen`, `src/components/asset-tracking/`, `ViewId = varliktakip`.
- Migration hedefi `supabase/create_asset_tracking.sql`.
- Private Storage bucket hedefi `asset-documents`.
- React/TypeScript, mevcut UI bileşenleri, şube ve ofis kullanıcıları tekrar kullanılır.
- Ekran-local veri yükleme; modül hatası uygulamanın giriş yüklemesini bloke etmez.

Sprintler ve kabul kriterleri ana feature dokümanında tutulur. Bu paketin hazırlanmış olması SQL'in çalıştırıldığı veya özelliğin canlı olduğu anlamına gelmez.

İlk çalışan teslim araç → muayene → liste → kesinleşmiş yeni dönem → geçmiş akışıdır; mobil ve form korumaları ilgili formlarla birlikte geliştirilir. Tarih takibinde yalnız mevcut ve kesinleşmiş bitiş/geçerlilik tarihleri tutulur; planlanan randevu/çalışma veya Planlandı/Tamamlandı akışı yoktur. Yeni dönem yenileme kesinleştikten sonra eklenir. Benzer takip uyarısının yazılı etkileşim tanımı günceldir; mevcut 16 paftada bu varyant henüz çizilmemiştir.
