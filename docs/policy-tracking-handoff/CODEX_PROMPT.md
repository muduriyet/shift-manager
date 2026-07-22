# Başka Codex İçin Hazır Prompt

Bu repo üzerinde poliçe takip modülünü geliştirmeye devam et. Önce şu paketi oku:

`docs/policy-tracking-handoff/README.md`

Görsel referanslar:

- `docs/policy-tracking-handoff/assets/option-a-table-command-center.png`
- `docs/policy-tracking-handoff/assets/new-policy-modal.png`

Amaç: Mevcut React/Vite/Supabase uygulamasına "Poliçe Takip" ekranı eklemek. Kullanıcı, firma poliçelerini Excel yerine uygulama üzerinden takip etmek ve poliçe evraklarını saklamak istiyor.

Önemli kararlar:

- Ana ekran tablo odaklı olacak.
- Yeni poliçe popup tasarımı `new-policy-modal.png` referans alınacak.
- Excel dosyası kaynak/veri göçü aracı olacak: `C:/Users/mehme/OneDrive/Desktop/COŞKUN_PETROL_POLİÇE.xlsx`
- Boş yıl hücreleri silme anlamına gelmeyecek.
- Evraklar Supabase Storage private bucket içinde saklanacak; metadata PostgreSQL'de tutulacak.
- Mevcut UI sistemini kullan: `Button`, `Field`, `Select`, `Dialog`, `Tabs`, `Badge`, `EmptyState`, global CSS tokenları.

Uygulama yaklaşımı:

1. Repo yapısını oku ve mevcut Sales modülü desenini referans al.
2. Supabase migration dosyası ekle: poliçe asset, policy, renewal, document, import audit tabloları ve storage/RLS notları.
3. `src/types/index.ts` içine poliçe tiplerini ekle.
4. `src/lib/db.ts` içine poliçe CRUD, renewal, document metadata ve import fonksiyonlarını ekle.
5. `src/components/policies/PolicyScreen.tsx` ve gerekli alt bileşenleri oluştur.
6. `src/App.tsx` ve `src/components/layout/Sidebar.tsx` içine yeni ekran routing/nav ekle.
7. Excel import parser/preview oluştur.
8. UI'ı görsellerdeki yoğun, tablo odaklı admin tasarıma yakın uygula.
9. `npm run build` ile doğrula.

Kabul kriterleri:

- Poliçe takip menüsü görünür.
- Ana ekran KPI + filtre + tablo + detay drawer yapısında çalışır.
- Yeni poliçe modalı görsel referansa uygun, form validasyonlu ve mevcut design system ile tutarlı olur.
- Excel import preview, ekli dosyadaki 27 poliçeyi doğru algılar.
- Evrak upload/list/download/delete akışı için UI ve Supabase metadata katmanı hazır olur.
- Build hatasız geçer.
