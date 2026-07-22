# Poliçe Takip Handoff Paketi

Bu paket, poliçe takip ekranı için bu konuşmada alınan kararları, Excel gözlemlerini, tasarım taslaklarını ve geliştirme yönünü başka bir Codex'e devretmek için hazırlandı.

## Konuşma Özeti

Kullanıcı, mevcutta Excel ile takip edilen firma poliçelerini uygulama içinde takip etmek ve ilgili poliçe evraklarını saklamak istiyor. Eklenen Excel dosyası:

`C:/Users/mehme/OneDrive/Desktop/COŞKUN_PETROL_POLİÇE.xlsx`

Excel yapısı:

- Tek sayfa: `Sayfa1`
- 27 poliçe satırı
- A sütunu: poliçe adı / araç / şube bilgisi
- B-D sütunları: `2024`, `2025`, `2026` yenileme tarihleri
- Dolu hücreler yenileme geçmişi olarak yorumlanmalı
- Boş yıl hücreleri silme anlamına gelmemeli; "o yıl için tarih yok / yenileme eksik" olarak gösterilmeli
- 2026 tarihi olmayan 19 satır var
- Tür dağılımı: Trafik 11, Kasko 8, Tehlikeli Madde 5, DASK 1, İşyeri/Diğer 2
- Excel satır renkleri veri kaynağı olarak kabul edilmedi; renk anlamı netleşmeden business rule yapılmamalı

Not: Önceki analiz 2026-07-06 tarihinde yapılmıştı. Uygulamada "geçmiş / yaklaşan" durumları her zaman runtime `today` değerine göre hesaplanmalı. 2026-07-22 itibarıyla Excel'deki son yenileme tarihlerinin tamamı geçmişte kalıyor.

## Tasarım Kararı

Üç ana ekran taslağı üretildi:

- A: Tablo odaklı komuta ekranı
- B: Takvim ve yenileme timeline odaklı ekran
- C: Varlık / araç portföyü odaklı ekran

Kullanıcı seçim yapmadığı için önerilen yön varsayıldı: **A - tablo odaklı komuta ekranı**.

Bu yön Excel alışkanlığına en yakın olanı: ana yüzey filtrelenebilir tablo, sağda detay paneli, evrak yükleme ve yenileme geçmişi.

## Tasarım Görselleri

Paket içindeki görseller:

- `assets/option-a-table-command-center.png`: önerilen ana ekran
- `assets/option-b-calendar-timeline.png`: takvim alternatifi
- `assets/option-c-asset-portfolio.png`: varlık portföyü alternatifi
- `assets/new-policy-modal.png`: yeni poliçe ekleme popup taslağı

## Repo Bağlamı

Uygulama mevcutta:

- React 18 + TypeScript + Vite
- Supabase Auth + PostgreSQL
- `xlsx` ile Excel import/export
- Custom CSS/UI bileşenleri

İlgili dosya desenleri:

- `src/App.tsx`: global state, auth gate, ekran routing
- `src/types/index.ts`: ortak tipler
- `src/lib/db.ts`: Supabase veri erişim fonksiyonları
- `src/index.css`: design tokens ve global component stilleri
- `src/components/layout/Sidebar.tsx`: menü tanımı
- `src/components/ui/*`: Button, Field, Select, Dialog, Tabs, Badge, EmptyState
- `src/components/sales/*`: yeni modül için iyi örnek; tablı, lazy-loaded ekran yapısı
- `supabase/schema.sql`: çekirdek tablolar
- `supabase/create_sales_dashboard.sql`: ayrı feature migration örneği

## Uygulama Planı

Yeni menü/ekran:

- `ViewId` içine `policeler` ekle
- Sidebar'a `Poliçe Takip` menüsü ekle
- `PolicyScreen` lazy-load edilsin

Önerilen veri modeli:

- `policy_assets`: araç, plaka, şube, varlık tipi
- `insurance_policies`: poliçe adı, tür, sorumlu, not, aktif/pasif
- `policy_renewals`: poliçe id, yıl, yenileme/bitiş tarihi, durum
- `policy_documents`: dosya metadata, storage path, renewal/policy ilişkisi
- `policy_import_runs`: Excel import audit kaydı

Storage:

- Supabase Storage private bucket: `policy-documents`
- UI, belge indirme için signed URL üretmeli
- Metadata DB'de, dosya binary Storage'da tutulmalı

Ana ekran:

- KPI'lar: `Süresi Geçen`, `30 Gün İçinde`, `2026 Eksik`, `Evrak Eksik`
- Filtreler: arama, şube, tür, durum, yıl
- Tablo kolonları: Poliçe, Varlık/Plaka, Tür, Son Tarih, Kalan Gün, Durum, Evrak, İşlem
- Sağ detay drawer: yenileme timeline, evraklar, upload alanı, not/sorumlu

Yeni poliçe popup:

- Görsel referans: `assets/new-policy-modal.png`
- Sol alan: poliçe adı, varlık/plaka, tür, şube, başlangıç/bitiş tarihi, sorumlu, durum, not
- Sağ alan: ilk evrak yükleme, evrak durumu, yenileme önizlemesi
- Footer: `Vazgeç`, `Kaydet`; gerekirse `Kaydet ve Evrak Ekle`

Excel import:

- İlk satırdaki yıl başlıklarını oku
- Her satırdan varlık/plaka ve poliçe türü türet
- Dolu tarih hücrelerini `policy_renewals` olarak upsert et
- Boş yıl hücrelerini silme olarak yorumlama
- Import öncesi preview göster: oluşturulacak/güncellenecek/eksik kayıtlar

## Kabul Kriterleri

- `npm run build` geçmeli
- Ekli Excel import preview'da 27 poliçe satırı görünmeli
- 2026 eksik kayıt sayısı 19 olarak yakalanmalı
- Evrak yükleme, listeleme, indirme ve silme çalışmalı
- Durum badge'leri runtime tarihe göre doğru hesaplanmalı
- Mobilde tablo yatay kaydırmalı, detay paneli full-screen drawer olmalı

## Varsayımlar

- V1'de e-posta/SMS hatırlatma yok
- Fiziksel silme yerine aktif/pasif arşivleme tercih edilmeli
- Poliçe prim bedeli Excel'de yok; v1 kapsamına alınmayacak
- Excel satır renkleri anlamlandırılmayacak
- Kullanıcı, tablo odaklı ana ekranı kabul etmiş sayılıyor
