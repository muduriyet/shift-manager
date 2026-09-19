# Varlık Takip — Geliştirme İçin Aktarım Prompt'u

Bu repoda **Varlık Takip** modülünü, aşağıdaki onaylanmış kapsam ve sprint sırasıyla geliştir.

Önce oku:
1. `FEATURE_ASSET_TRACKING.md`
2. `docs/asset-tracking-handoff/DESIGN_SPEC.md`
3. `docs/asset-tracking-handoff/README.md`

Görseller: `docs/asset-tracking-handoff/design-gallery.html` ve `assets/00-ana-ekran.png` ile `assets/15-tarih-detay-duzenleme.png` arasındaki 16 pafta. Bir paftada birden fazla alternatif durum olabilir; ekran görüntüsünü birebir davranış spesifikasyonu kabul etme. Taslakların uygulamaya aktarımı notları ve feature dokümanı iş kurallarında önceliklidir.

## Amaç

Araç, bina/taşınmaz ve diğer varlıklara ait poliçeleri, muayene/kira kontratı gibi tarihleri ve ödeme vadelerini tek takvimden izlemek. Kullanıcı geciken ve yaklaşan işleri gün seçmeden görmeli. Menü ve başlık **Varlık Takip** olacak.

## Değişmeyecek kararlar

- Takipler varlığa bağlıdır; şube veya şirket geneli kapsamı vardır. Kişi/personel sigortası yok.
- Üç kategori: Poliçe, Tarih, Ödeme. Türler ve uygun varlık kategorileri yönetilebilir.
- Feature dokümanındaki yedi başlangıç türünü tekrar çalıştırılabilir kurulumla hazırla; kullanıcı değişikliklerini üzerine yazma.
- Yeni takipte aynı varlık/türdeki mevcut kayıtları göster; yeni dönem öner, ayrı takip oluşturmaya izin ver. Unique varlık+tür engeli koyma.
- Yalnız TL. Para birimi seçici, döviz/kur, taksit ve kısmi ödeme ekleme.
- Poliçede yeni dönem başına tek yeni zorunlu belge. Tarih/dekont tek ve isteğe bağlı.
- Prim bilgi alanıdır; ödeme üretmez. Dekont yüklemek ödendi durumu oluşturmaz.
- Kira kontratı ayrı sözleşme yönetimi değil, binaya bağlı tarih takibidir.
- Kira kontratı için ek uyarı/bildirim tarihi alanı ekleme.
- Yeni dönem önceki dönemleri/belgeleri silmez. Eski ödenmemiş vadeler yeni ödeme eklenince kapanmaz.
- Ödeme ana satırında en eski açık vade, o dönemin tutarı ve açık dönem sayısını göster. Ödendi penceresinde hedef vade/tutar açık olsun; kimlik/sürümle yalnız seçilen dönemi değiştir, başka dönemi sessizce hedefleme.
- Ödenmiş dönemde tutarı kilitle; düzeltme için ödeme geri alma → tutar düzenleme → gerekirse yeniden Ödendi akışını kullan. Not/dekont düzeltmesi ödeme geri alma gerektirmez; arşiv kilidi önceliklidir. Ödeme durumunu düzenleme içinde sessizce değiştirme.
- Açık ödemeli arşivleme engellenmez; mevcut onayda açık dönem sayısını ve listeden çıkma etkisini açıkla. Ödeme durumları değişmez; geri almada açık vadeler yeniden görünür.
- Arşivli takip ve dönemler salt okunurdur; detay/geçmiş/belge indirme açık kalır. Her takip/dönem/belge değişikliği için önce Yeniden Takibe Al gerekir. Ödenmiş tutar ve üst takip arşiv kontrollerini transaction içinde uygula; doğrudan API veya eski açık form bunları aşamaz. Varlık şube değişikliği arşivden çıkarma gerektirmez.
- Kaydedilmiş takibin varlık/tür bağlantısını UI ve sunucuda kilitle. Yanlış bağlantı arşivle/doğru takip oluştur akışıyla ele alınır. Aktif/arşivli mevcut takipleri bozacak tür uygunluğu değişikliklerini reddet.
- Şube/kapsam filtrelerini varlığın güncel kaydından türet; tüm bağlı takipler ve geçmiş dönemler bu bağlamda görünür. Önceki/yeni şube, kullanıcı ve zamanı audit'e yaz. Dönem bazlı şube raporu ekleme.
- Poliçelerde mevcut/gelecek dönem ve boşluk/çakışma ayrımı yap; yalnız en ileri bitişi göstererek boşluğu gizleme.
- Türkiye gününe göre tarih hesabı; görsellerdeki 18.09.2026'yı runtime sabitleme.
- Takipte/Arşivde yönetim durumu; süre durumu türetilir.
- Dönem iptali nedeni, geri alma, ödeme geri alma, işlem geçmişi ve optimistic concurrency gerekir.
- Private Storage ve oturumlu ortak erişim. Dosya değişiminde yeni dosya hazır olmadan eskisini silme.
- Excel hiçbir aşamada gerekli değil; eski 27/19 kayıt kabul kriterlerini kullanma.
- Kapsam dışı özellikler ve S8 otomatik olmayan öneri akışı ilk sürüme eklenmez.

## Uygulama yönü

Mevcut kodu ve varsa proje yönergelerini oku. Sales lazy-load, Onboarding ekran-local fetch ve ortak Dialog/bileşen desenlerini incele. Yeni kodda `AssetTracking` adlandırmasını kullan. Mevcut modülleri yeniden tasarlama.

S0 paketini doğrula, ardından feature dokümanındaki S1–S7 sırasını izle. Her sprint için çıkış kriterlerini doğrula ve dokümanın ilerleme bölümünü gerçek sonuçlarla güncelle. S1'de atomik veri mutasyonları, audit ve saf tarih kuralları kurulmalı; bunlar yalnız son QA sprintine bırakılmamalı.

S2'de önce araç → muayene → temel liste → kesinleşmiş yeni dönem → geçmiş akışını uçtan uca tamamla. Sonra poliçe/belge ve ödeme akışlarını geliştir. Mobil, odak ve kaydedilmemiş değişiklik korumasını her formun kendi sprintinde yap. Tarih takibinde yalnız mevcut ve kesinleşmiş bitiş/geçerlilik tarihlerini tut; planlanan randevu/çalışma veya Planlandı/Tamamlandı alanı ekleme. Yeni dönem formunda “Yeni dönemi, yenileme kesinleştikten sonra ekleyin.” açıklamasını göster. Gelecekteki kesinleşmiş son tarihi engelleme; tarih belgesi isteğe bağlı kalır, ek onay adımı getirme.

Mevcut hedef veritabanının durumunu doğrulamadan migration uygulanmış gibi davranma. Yayın ve uzak ortam değişikliklerini ilgili kullanıcı yetkisi kapsamında yap. Doküman/taslak varlığı uygulamanın tamamlandığı anlamına gelmez.

## Doğrulama

Her sprintte ilgili build ve hedefli kontrolleri çalıştır. Özellikle aynı araçta poliçe/muayene/ödeme, aynı binada DASK/vergi/kira; dönem boşluğu, eski borç, tek belge, mükerrer plaka, gün sınırları, hata/yeniden deneme, eşzamanlı düzenleme, erişim ve mobil akışları doğrula. Sonuçları kanıtlanmış kapsamıyla raporla.
