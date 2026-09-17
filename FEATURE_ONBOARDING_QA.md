# İşe Giriş Süreçleri — QA Test Planı

Son güncelleme: 2026-09-17
Kapsam: `main` @ `86fe540` · Özellik spesifikasyonu: `FEATURE_ONBOARDING.md`
Durum: **Test edilmeyi bekliyor**

Bu doküman testçinin adım adım uygulayacağı senaryoları içerir. Her senaryonun
sonunda sonuç sütunu boştur; doldurulup geri gönderilmesi beklenir.

---

## 0. ⚠️ ÖNCE OKU — canlı veritabanı uyarısı

**Bu uygulamanın test ortamı yok. Tarayıcıdaki her işlem doğrudan canlı
Supabase veritabanına yazar.** Ekranda gördüğün personel, gerçek personeldir.

Üç kural:

1. **Test personelinin adı `QATest` ile başlamalı.** Örn. `QATest Ahmet Yılmaz`.
   Temizlik SQL'i bu öneke göre çalışıyor.
2. **Mevcut personelin adını, şubesini, pozisyonunu veya tarihini DEĞİŞTİRME.**
   Detay modalındaki "Personel Bilgilerini Düzenle" ve "Görev Bilgilerini
   Düzenle" gerçek `employees` kaydına yazar. Bu iki senaryoyu (D7, D8) yalnız
   kendi açtığın `QATest` personelinde uygula.
3. **Teste başlamadan ve bitirdikten sonra §6'daki sayım sorgusunu çalıştır.**
   İki sonuç aynı olmalı. Aynı değilse §6'daki temizliği uygula.

Evrak tanımı ekleme/kaldırma (F senaryoları) katalogda kalıcıdır; test evrağının
adı da `QATest` ile başlamalı.

---

## 1. Ön koşullar

| | |
|---|---|
| Ekran | Sol menü → **İşe Giriş Süreçleri** |
| Giriş | `admin` kullanıcısıyla oturum açık olmalı |
| Tarayıcı | Chrome / Safari güncel sürüm |
| Şema | Canlıda uygulanmış durumda, ek kurulum gerekmiyor |

Test sırasında **tarayıcı konsolunu açık tut** (F12 → Console). Kırmızı hata
çıkarsa ekran görüntüsüyle birlikte not al.

---

## 2. Bu davranışlar HATA DEĞİL — bilerek böyle

Testçinin boşuna kayıt açmaması için:

| Görülen | Neden böyle |
|---|---|
| `Toplam Açık Süreç` sayısı, diğer iki kartın toplamından büyük olabilir | 3. aşamadaki süreçlerin kartı yok; onlar kapanışta arşivlenene kadar listede durur |
| 9 evrak aslının hepsi işaretliyken süreç hâlâ "Aktif Süreç" | Tamamlanmayı **yalnız aşama** belirler. Evrak tikleri bilgi amaçlıdır; 3. adıma tıklanması gerekir |
| Aşamayı geri alınca evrak tikleri silinmiyor | Kasıtlı — yanlış aşama seçimi veri kaybettirmemeli |
| Katalogdan evrak kaldırılınca mevcut süreçlerden silinmiyor | Kasıtlı — işaretlenmiş bir evrak kaybolmamalı. Yalnız yeni süreçlerde görünmez |
| Katalogdan kaldırılan evrak arşivli süreçte de duruyor | Arşivlenmiş süreçler hiçbir katalog değişikliğinden etkilenmez |
| Uzun ad soyad tabloda iki satıra sarıyor | Kabul edildi; kolonlar kaymadığı sürece sorun değil |
| `Başlangıç` kolonunda `—` | Personelin işe giriş tarihi girilmemiş demektir |
| Detay modalı uzun, sayfa kayıyor | 17 evrak satırı var; modal kendi içinde kaydırılır |

---

## 3. Test senaryoları

Sonuç sütununa **G** (geçti) / **K** (kaldı) yaz. K ise not düş.

### A — Liste ekranı

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| A1 | Sol menüden İşe Giriş Süreçleri'ni aç | Ekran açılır, başlık "İşe Giriş Süreçleri" | |
| A2 | Hiç süreç yokken ekrana bak | "Açık işe giriş süreci yok" mesajı, tablo ve alt sayaç görünmez | |
| A3 | Üstteki 3 karta bak | Toplam Açık Süreç · Personel Evrak Bekleniyor · Giriş Evrak Bekleniyor | |
| A4 | Tablo başlıklarını kontrol et | Personel · Şube · Süreç Adımı · Evrak · Başlangıç (+ok ikonu) | |
| A5 | 1. aşamadaki bir sürecin Evrak kolonuna bak | `n/6` ve altında `Personel Evrak` | |
| A6 | 2. aşamadaki bir sürecin Evrak kolonuna bak | `n/2` ve altında `Giriş Evrak` | |
| A7 | Süreç Adımı kolonundaki çubuğa bak | 1. aşamada 1, 2. aşamada 2 segment yeşil | |
| A8 | Arama kutusuna personel adının bir parçasını yaz | Eşleşen satırlar kalır, footer sayısı güncellenir | |
| A9 | **Türkçe arama:** adında `İ` geçen bir personeli küçük `i` ile ara | Eşleşmeli (ör. `İnce` → `ince` yazarak bulunmalı) | |
| A10 | Pozisyon adıyla ara (ör. `pompacı`) | O pozisyondaki personeller listelenir | |
| A11 | Şube filtresinden bir şube seç | Yalnız o şubenin süreçleri kalır, footer güncellenir | |
| A12 | Eşleşmeyen bir metin ara (ör. `zzzz`) | "Sonuç bulunamadı" mesajı — A2'dekinden **farklı** metin | |
| A13 | Tarayıcı penceresini daralt (< 1100px) | Stat kartları 2 kolona iner, tablo kendi içinde yatay kayar, sayfa yatay kaymaz | |

### B — Yeni Süreç

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| B1 | **Yeni Süreç** butonuna bas | "Yeni İşe Giriş Süreci" penceresi açılır | |
| B2 | Alanları say | Ad Soyad, Şube, Departman, Pozisyon, İşe Giriş Tarihi | |
| B3 | Ad Soyad boşken Kaydet'e bas | "Ad Soyad alanı zorunludur" | |
| B4 | `QA` yazıp Kaydet | "Ad Soyad en az 3 karakter olmalıdır" | |
| B5 | `QATestTekKelime` yazıp Kaydet | "Lütfen ad ve soyadı birlikte girin (ör. Ahmet Yılmaz)" | |
| B6 | `QATest Ahmet Yılmaz`, şube/departman/pozisyon seç, tarih gir, Kaydet | Pencere kapanır, **detay modalı doğrudan açılır** | |
| B7 | Açılan detayın başlığına ve alt satırına bak | Başlık `QATest Ahmet Yılmaz`, alt satır `Pozisyon • Şube Şubesi • Departman` | |
| B8 | Detayı kapat, listeye bak | Yeni süreç listede, `Başlangıç` kolonunda girdiğin tarih | |
| B9 | **Sayfayı YENİLEMEDEN** Personel Listesi'ne geç, `QATest` ara | Yeni personel orada, şube/departman/pozisyon doğru | |
| B10 | Yeni Süreç → tarih alanını boş bırakarak kaydet | Kayıt oluşur, listede `Başlangıç` = `—` | |
| B11 | Yeni Süreç → İptal'e bas | Hiçbir kayıt oluşmaz | |

### C — Detay modalı (okuma)

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| C1 | Listede bir satıra tıkla | Detay modalı açılır | |
| C2 | Üstteki meta şeride bak | İşe Giriş Tarihi · Oluşturulma Tarihi · Oluşturan (avatarlı) | |
| C3 | 1. aşamadaki bir süreçte adım rozetlerine bak | 1️⃣ Tamamlandı · 2️⃣ **Devam Ediyor** · 3️⃣ Beklemede | |
| C4 | 2. aşamadaki bir süreçte bak | 1️⃣2️⃣ Tamamlandı · 3️⃣ Devam Ediyor | |
| C5 | Evrak kartlarını ve satır sayılarını say | Personel Evrak **6** · Giriş Evrak **2** · Evrak Aslı **9** | |
| C6 | Giriş Evrak kartının sütun başlıklarına bak | `GÖNDERİLDİ` / `GÖNDERİLMEDİ` (diğer ikisinde `GELDİ`/`GELMEDİ`) | |
| C7 | Evrak Aslı satırlarına bak | Evrak adının altında soluk açıklama (ör. "T.C. kimlik kartı aslı") | |
| C8 | Sağ raydaki üç kartı kontrol et | Personel Bilgileri · Görev Bilgileri · Notlar | |
| C9 | Notu olmayan bir süreçte Notlar kartına bak | "Henüz not eklenmemiş." | |
| C10 | Alttaki bilgi kutusuna bak | Mavi **Bilgilendirme** kutusu | |

### D — Detay modalı (yazma)

> D7 ve D8'i **yalnız kendi açtığın QATest personelinde** uygula.

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| D1 | Personel Evrak'ta bir evrağın `Geldi` rozetine tıkla | Rozet yeşile döner, kalınlaşır | |
| D2 | Aynı evrağın `Gelmedi` rozetine tıkla | Kırmızıya döner | |
| D3 | Modalı kapat, tekrar aç | İşaretler korunmuş | |
| D4 | Evrak Aslı'nda **9 evrağın hepsini** `Geldi` yap | Kartın altında yeşil "Tüm evrak asılları teslim alındı" satırı çıkar | |
| D5 | Aynı anda üstteki rozete ve bilgi kutusuna bak | **Hâlâ "Aktif Süreç" ve mavi kutu** — süreç tamamlanmadı | |
| D6 | Stepper'da **3. adıma** tıkla | Üç adım da Tamamlandı, rozet "Tamamlandı", kutu yeşile döner | |
| D7 | **2. adıma** geri tıkla | Tekrar "Aktif Süreç" ve mavi kutu; **evrak tikleri durur** | |
| D8 | Notlar kartındaki kalem ikonuna bas, metin yaz, Kaydet | Not görünür; modalı kapatıp açınca hâlâ orada | |
| D9 | Personel Bilgileri'ndeki kalem → Telefon ve IBAN gir, Kaydet | Sağ rayda görünür | |
| D10 | Aynı pencerede Ad Soyad'ı değiştir, Kaydet | Modal başlığı **anında** güncellenir | |
| D11 | Görev Bilgileri'ndeki kalem → Pozisyon değiştir, Kaydet | Sağ ray ve modal alt başlığı güncellenir | |
| D12 | Modalı kapat, Personel Listesi'ne geç (**sayfa yenilemeden**) | D10 ve D11'deki değişiklikler orada da görünür | |

### E — Arşivleme

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| E1 | 1. veya 2. aşamadaki bir süreci aç, alttaki **Süreci İptal Et**'e bas | Onay penceresi, içinde personelin adı | |
| E2 | **Vazgeç**'e bas | Hiçbir şey olmaz, detay açık kalır | |
| E3 | Tekrar dene, **Evet, İptal Et**'e bas | Modal kapanır, süreç listeden düşer | |
| E4 | Bir süreci 3. adıma al, sonra **Escape** ile kapat | Süreç listeden düşer (otomatik arşivlendi) | |
| E5 | Yeni bir süreçte tekrarla, bu kez **X butonuyla** kapat | Yine listeden düşer | |
| E6 | Yeni bir süreçte tekrarla, bu kez **pencerenin dışına tıklayarak** kapat | Yine listeden düşer | |
| E7 | 3. adıma alınmış bir süreci aç | **"Süreci İptal Et" butonu görünmez** (zaten tamamlanmış) | |

### F — Evrak Tanımları

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| F0 | Hazırlık: 1 açık süreç aç, bir de süreç açıp 3. adıma alıp kapatarak arşivle | İki farklı durumda süreç hazır | |
| F1 | **Evrak Tanımları** butonuna bas | Pencere açılır, üç bölüm: 6 / 2 / 9 evrak | |
| F2 | Evrak Aslı bölümünde **Evrak Ekle** → `QATest Sağlık Raporu` + açıklama → Kaydet | Listeye eklenir, sayı 10'a çıkar, "devam eden N sürece de düştü" mesajı | |
| F3 | Pencereyi kapat, **açık** süreci aç, Evrak Aslı'nı say | **10 satır**, yeni evrak işaretsiz | |
| F4 | Yeni bir süreç aç (Yeni Süreç ile), Evrak Aslı'nı say | **10 satır** | |
| F5 | Evrak Tanımları → `QATest Sağlık Raporu` satırındaki çöp kutusuna bas | Onay penceresi: "Mevcut süreçlerden silinmez…" | |
| F6 | Kaldır'a bas | Listeden düşer, sayı 9'a iner | |
| F7 | F3'teki **açık süreci** tekrar aç, Evrak Aslı'nı say | **Hâlâ 10 satır** — kaldırma mevcut süreci etkilemedi | |
| F8 | **Yeni** bir süreç aç, Evrak Aslı'nı say | **9 satır** — yeni süreç kaldırılanı almadı | |
| F9 | Evrak Tanımları → aynı adı farklı açıklamayla tekrar ekle | Hata vermez, listeye döner, **yeni açıklama** görünür | |
| F10 | Satır içi ekleme açıkken **Escape**'e bas | Yalnız ekleme iptal olur, **pencere açık kalır** | |

### G — Kenar durumlar

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| G1 | Detay aç → Personel Bilgileri kalemine bas → **Escape** | Yalnız düzenleme penceresi kapanır, detay açık kalır | |
| G2 | Tekrar Escape | Detay kapanır | |
| G3 | `QATest` + çok uzun bir isimle (50+ karakter) süreç aç | Tabloda iki satıra sarar, **diğer kolonlar kaymaz**, sayfa yatay kaymaz | |
| G4 | *(SQL bilenler için)* Açık süreci olan bir personele ikinci süreç eklemeyi dene:<br>`insert into onboardings (employee_id) values (<id>);` | Veritabanı reddeder (unique index ihlali). Arayüzden bu durum oluşamaz — Yeni Süreç her zaman yeni personel açar | |
| G5 | Test boyunca tarayıcı konsolunu izle | Kırmızı hata **olmamalı** | |

---

## 4. Ekran görüntüsü istenenler

Şu durumların ekran görüntüsünü ekle:

- Liste ekranı, en az 3 farklı aşamada süreç görünürken
- Detay modalı, stepper üç durumu da gösterirken (1. aşamadaki bir süreç)
- Evrak Aslı kartı, 9/9 işaretli ve yeşil satır çıkmışken
- Evrak Tanımları penceresi
- Bulduğun her hata

---

## 5. Bulgu bildirimi

Her bulgu için:

| Alan | Örnek |
|---|---|
| Senaryo no | D5 |
| Beklenen | Süreç tamamlanmamalı |
| Gerçekleşen | Rozet "Tamamlandı"ya döndü |
| Tekrar üretme | Evrak Aslı'nda 9 evrağı sırayla işaretle |
| Öncelik | P1 veri kaybı/yanlış veri · P2 işlev bozuk · P3 görsel/metin |
| Ekran görüntüsü | var/yok |
| Konsol hatası | varsa tam metin |

---

## 6. Sayım ve temizlik

**Teste başlamadan önce** çalıştır, sonucu not et:

```sql
select (select count(*) from employees)                      as personel,
       (select count(*) from onboardings)                    as surec,
       (select count(*) from onboarding_doc_defs where is_active) as katalog;
```

**Test bittikten sonra** aynı sorguyu çalıştır. Sayılar başlangıçtakiyle
aynı değilse aşağıdaki temizliği uygula:

```sql
-- 1) QATest süreçleri (evrak satırları cascade ile gider)
delete from onboardings
where employee_id in (select id from employees where name like 'QATest%');

-- 2) QATest personelleri
delete from employees where name like 'QATest%';

-- 3) QATest evrak tanımları
delete from onboarding_doc_defs where name like 'QATest%';

-- 4) Testte arşivlenen GERÇEK süreçler varsa geri al
--    (yalnız test sırasında sen arşivlediysen; id'yi kendin belirle)
-- update onboardings set archived_at = null where id = <id>;

-- 5) Doğrula
select (select count(*) from employees)                      as personel,
       (select count(*) from onboardings)                    as surec,
       (select count(*) from onboarding_doc_defs where is_active) as katalog,
       (select count(*) from employees where name like 'QATest%') as kalan_test;
```

`kalan_test` **0** olmalı ve ilk üç sayı teste başlarkenki değerlerle eşleşmeli.

---

## 7. Test sonucu özeti

Testçi doldurur:

| | |
|---|---|
| Test tarihi | |
| Testi yapan | |
| Tarayıcı / sürüm | |
| Toplam senaryo | 69 |
| Geçen | |
| Kalan | |
| P1 bulgu | |
| P2 bulgu | |
| P3 bulgu | |
| Başlangıç sayımı (personel/süreç/katalog) | |
| Bitiş sayımı | |
| Temizlik uygulandı mı | |
