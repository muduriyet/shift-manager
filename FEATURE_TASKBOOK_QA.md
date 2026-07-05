# Gorev Defteri QA Notes

Son guncelleme: 2026-07-06  
Kaynak: `FEATURE_TASKBOOK.md` incelemesi + canli preview test (`http://127.0.0.1:4173/`)  
Durum: Sprint 1-4 temel akislari canli preview'da calisiyor; S5-S6 henuz uygulanmamis.

---

## 1. Test Ortami

- Uygulama: Vite preview, `http://127.0.0.1:4173/`
- Tarayici: Codex in-app browser
- Oturum: Kullanici tarafindan giris yapildi (`admin`)
- Tarih/saat baglami: 2026-07-06, Europe/Istanbul
- Viewport:
  - Preview mevcut viewport: yaklasik tablet/genis mobil gorunum
  - Mobil kontrol: `390x720`
- Not: Browser `domSnapshot()` bu oturumda `incrementalAriaSnapshot is not a function` hatasi verdi. Test, ekran goruntuleri + read-only DOM evaluate + console loglari ile devam etti.

---

## 2. Canli Preview'da Dogrulananlar

### Sayfa sagligi

- Preview sayfasi acildi.
- Login ekrani ilk acilista dogru gorundu.
- Giris sonrasi uygulama `Vardiya Cizelgesi` ekranina dustu.
- `Gorev Defteri` menuden acildi.
- Framework overlay / blank page gorulmedi.
- Console `error` / `warn` loglari test boyunca bos geldi.

### Gorev Defteri ana ekran

Canli ekranda gorulen sayaclar:

- Acik Gorev: `6`
- Bugun Teslim: `0`
- Gecikmis: `3`
- Tamamlanan: `0`

Canli tabloda gorulen seed gorevleri:

- `Gunluk kasa mutabakati` - `Gecikti - 5 Tem` - `Gunluk` - `Yuksek`
- `Pompa sayac okuma kontrolu` - `Gecikti - 5 Tem` - `Gunluk` - `Yuksek`
- `POS & banka ekstresi eslestirme` - `Gecikti - 5 Tem` - `Gunluk` - `Orta`
- `Vardiya puantaj onayi` - `12 Tem` - `Haftalik` - `Orta`
- `KDV beyanname hazirligi` - `31 Tem` - `Aylik` - `Yuksek`
- `SGK aylik bildirge hazirligi` - `31 Tem` - `Aylik` - `Yuksek`

Sekmeler:

- `Tumu (6)`
- `Acik (6)`
- `Bugun (0)`
- `Gecikmis (3)`
- `Bu Hafta`
- `Rutinler (6)`
- `Tamamlanan (0)`

### Sekme ve arama davranisi

- `Rutinler (6)` sekmesi calisti.
- Rutinler gruplandi:
  - `Gunluk` 3 gorev
  - `Haftalik` 1 gorev
  - `Aylik` 2 gorev
- Arama alani `kasa` degeriyle filtreledi.
- Arama sonucu `Gunluk kasa mutabakati` olarak 1 goreve indi.
- Arama kutusu ve sekme state'i gorsel olarak dogru gorundu.

### Yeni gorev modal

`Gorev Ekle` ile modal acildi.

Gorulen alanlar:

- Gorev Basligi
- Oncelik
- Son Tarih
- Tekrar
- Not
- Kullanici karti: `admin`
- `Ortak Gorev` toggle
- `Iptal`
- `Kaydet`

Dogrulanan davranis:

- Bos baslikla `Kaydet` tiklandiginda validation calisti.
- Hata metni: `Gorev basligi zorunludur`
- Input `is-error` class'i aldi.
- Kayit yapilmadi.

### Gorev duzenleme modal

Mevcut gorev satiri acildi.

Gorulen alanlar/durumlar:

- Baslik: `Gorevi Duzenle`
- Gorev basligi: `Gunluk kasa mutabakati`
- Oncelik: `Yuksek`
- Son tarih: `05.07.2026`
- Tekrar: `Her gun`
- Team state: `Tum Ekip`
- `Ortak Gorev` toggle acik
- `Yorumlar` bolumu gorundu.
- Yorum bos durumu: `Henuz yorum yok.`
- Yorum inputu ve `Ekle` butonu gorundu.
- `Gorevi Arsivle`, `Iptal`, `Kaydet` butonlari gorundu.

Not:

- `Aktivite` bolumu sadece aktivite varsa render ediliyor. Acilan seed gorevde aktivite olmadigi icin ekranda gorunmedi.

### Arsivleme onayi

`Gorevi Arsivle` tiklandi.

Onay dialogu:

- Baslik: `Gorevi Arsivle`
- Metin: `Bu gorev listeden kaldirilacak. Kayit arsivde korunur, kalici olarak silinmez.`
- Butonlar: `Hayir`, `Evet, Arsivle`

Testte `Hayir` tiklandi; veri degistirilmedi.

### Mobil gorunum

`390x720` viewport ile kontrol edildi.

- `Gorev Defteri` sayfasi render oldu.
- 4 istatistik karti gorundu.
- Tab bar satirlara kirilarak kullanilabilir kaldi.
- Tablo yatay scroll gerektiriyor; `.table-wrap` icinde scroll var.
- Console hatasi yoktu.

---

## 3. Bulunan Uyumsuzluklar ve Iyilestirme Notlari

### P1 - `Bu Hafta` filtresi haftayi temsil etmiyor

Canli preview bulgusu:

- `Bu Hafta` sekmesi 6 acik gorevin tamamini gosterdi.
- `31 Tem` son tarihli aylik gorevler de `Ileri Tarih` altinda gorundu.

Kod:

- `src/components/tasks/TaskNotebookScreen.tsx`
- Ilgili satir: `case 'hafta': return !t.done;`

Neden sorun:

- `FEATURE_TASKBOOK.md` dogrulama maddesinde sekmelerin `Bugun/Gecikmis/Bu Hafta/Rutinler` yerel tarihe gore dogru gruplanmasi bekleniyor.
- Kullanici "Bu Hafta" dediginde tum acik backlog/future liste degil, icinde bulunulan hafta beklenir.

Oneri:

- `Bu Hafta` filtresi: acik ve `dueDate` bugunden haftanin sonuna kadar olan gorevler.
- Gecikmis gorevlerin bu sekmede gorunup gorunmeyecegine karar verilmeli:
  - Secenek A: gecikmis + bu hafta due gorevleri.
  - Secenek B: sadece bu hafta due gorevleri, gecikmis kendi sekmesinde.
- `null` due date backlog gorevleri bu sekmeden ayrilmali veya ayri `Bir gun` kovasina alinmali.

### P1 - Tekrarlayan gorev tamamlama atomik degil

Kod:

- `src/lib/db.ts`
- `setTaskDone(task, done, actorId)` once gorevi tamamliyor, sonra tekrar gorevini ayri insert ediyor.

Risk:

- Update basarili, sonraki tekrar insert fail olursa seri kirilir.
- Ayni gorev iki kullanici tarafindan ayni anda tamamlanirsa cift sonraki tekrar olusabilir.

Oneri:

- Supabase RPC ile tek transaction:
  - gorevi done yap
  - gerekiyorsa sonraki tekrar satirini olustur
  - duplicate guard uygula
- Alternatif: unique/partial constraint ile `series_id + due_date + repeat_kind + archived_at is null` benzeri koruma.

### P1 - Aylik tekrar tarih aritmetigi ay sonlarinda sorunlu olabilir

Kod:

- `src/lib/db.ts`
- `nextDueDate()` icinde `setMonth()` kullaniliyor.

Risk:

- `31 Ocak + 1 ay` JavaScript tarih davranisiyla Mart'a tasabilir.
- Muhasebe rutinleri ay sonu oldugu icin bu onemli.

Oneri:

- Aylik tekrar icin clamp kural:
  - hedef ayin son gununu bul
  - orijinal gun hedef ayda yoksa son gune sabitle
- Ornek: `2026-01-31 + 1 ay => 2026-02-28`

### P2 - Yeni/duzenle modalinda acik assignee secimi yok

Canli preview bulgusu:

- Yeni gorev modalinda kullanici karti `admin` olarak gorundu.
- `Ortak Gorev` toggle var.
- Baska profile/person'a atama secimi gorunmedi.

Kod:

- `src/components/modals/TaskModal.tsx`
- `assigneeId` state var, ancak UI'da aktif profile selector yok.

Neden sorun:

- `FEATURE_TASKBOOK.md` kapsaminda `atanan kisi + Ortak Gorev + Devral` geciyor.
- Mevcut UI kisiye atama olusturuyor gibi gorunuyor ama sadece mevcut kullanici veya team akisi var.

Oneri:

- `profiles.filter(p => p.isActive)` ile assignee select ekle.
- Team acikken selector disable/hidden olabilir.
- Pasif eski atanmis profiller sadece display icin korunmali.

### P2 - `Rutinler` tamamlanmis tekrar gecmisini buyutebilir

Kod:

- `src/components/tasks/TaskNotebookScreen.tsx`
- `cRepeat = tasks.filter(t => t.repeatKind !== 'none').length`
- `case 'rutinler': return t.repeatKind !== 'none';`

Risk:

- Spawn-next stratejisinde tamamlanan tekrar instance'lari listede kalir.
- Zamanla `Rutinler` sekmesi tamamlanmis gecmisle kalabaliklasabilir.

Oneri:

- Varsayilan `Rutinler`: acik tekrar gorevleri.
- Tamamlanmis tekrar gecmisi icin `Tamamlanan` sekmesi veya gorev detayinda seri gecmisi.

### P2 - Kaydet/arsiv/comment pending state yok

Canli preview bulgusu:

- Modal butonlari async islem sirasinda disabled/pending state gostermiyor.

Risk:

- Cift tiklama duplicate create/update/comment tetikleyebilir.
- Ozellikle tekrar tamamlama ve yorum ekleme gibi aksiyonlarda kullanici karisikligi yaratir.

Oneri:

- `saving`, `commenting`, `archiving` state ekle.
- Butonlari pending sirasinda disable et.
- Toast veya inline progress goster.

### P2 - S5 attachment planinda draft guvenligi netlestirilmeli

Taskbook plan:

- `task_attachments.task_id` nullable olacak.
- Yeni gorevde taslak dosya `task_id=null` ile yuklenecek.

Risk:

- Genel `authenticated using(true)` RLS deseni draft attachment icin fazla genis olabilir.
- `task_id=null` satirlar owner bazli korunmazsa authenticated kullanicilar birbirinin taslak metadata/dosyasini gorebilir veya silebilir.

Oneri:

- `uploaded_by = auth.uid()` temelli RLS.
- Storage path konvansiyonu:
  - `draft/{auth.uid()}/{uuid}-{fileName}`
  - `tasks/{taskId}/{uuid}-{fileName}`
- Storage object select/insert/delete policy path ve bucket ile kisitlanmali.
- Orphan cleanup icin ileride scheduled cleanup veya admin RPC dusunulmeli.

### P2 - S6 export henuz UI'da yok

Canli preview bulgusu:

- Gorev Defteri sayfasinda `Disa Aktar` menu gorunmedi.
- Sadece `Gorev Ekle` var.

Taskbook:

- `FEATURE_TASKBOOK.md` S6 planinda Excel + browser print var.
- `DropdownButton`, `exportRowsToExcel`, `window.print()` bekleniyor.

Oneri:

- `Gorev Ekle` yanina `Disa Aktar` dropdown ekle.
- Excel export icin net karar:
  - o an filtrelenmis tum liste mi?
  - sadece aktif sayfa mi?
- Tavsiye: aktif filtrelenmis tum liste, sayfalama haric.
- Print icin `@media print` ile sidebar/topbar/action chrome gizlenmeli.

### P3 - Taskbook dosya tablosu plan/gercek ayrimini netlestirmeli

Bulgular:

- `FEATURE_TASKBOOK.md` alt bolumlerde S5/S6 "planlandi" diyor.
- Ancak dosya tablosunda `create_task_attachments.sql`, `TaskAttachment`, attachment helper'lari, export/print stilleri sanki dosya degisikligi gibi listeleniyor.

Oneri:

- Dosya tablosunda durum kolonu ekle:
  - `mevcut`
  - `planlandi`
  - `ertelendi`
- S5/S6 satirlarini acikca `planlandi` olarak isaretle.
- `src/index.css` dosyasi tabloda iki kez geciyor; tek satira indir.

### P3 - Aktivite bolumu bosken gorunmuyor

Canli preview bulgusu:

- Seed gorevde yorum yok, aktivite yok.
- `Yorumlar` bolumu gorundu.
- `Aktivite` bolumu gorunmedi.

Kod:

- `TaskModal.tsx` aktivite bolumu `editing && activity.length > 0` kosuluyla render ediliyor.

Degerlendirme:

- Bu hata degil; ancak kullanici "aktivite nerede?" diye dusunebilir.

Oneri:

- Bos aktivite state'i gosterilebilir:
  - `Henuz aktivite yok.`
- Ya da mevcut davranis taskbook'ta not edilmeli.

---

## 4. S5/S6 Icin Uygulama Onceligi

Onerilen sira:

1. `Bu Hafta` filtresini duzelt.
2. Tekrar tamamlama atomik hale getir.
3. Aylik tekrar tarih clamp kuralini ekle.
4. Assignee select ekle.
5. Pending/disabled state ekle.
6. S5 attachment migration + RLS + Storage policy.
7. S5 modal attachment UI.
8. S6 export dropdown + Excel + print CSS.
9. Taskbook dosya tablosunu plan/gercek durumuyla guncelle.

---

## 5. Testte Bilerek Yapilmayanlar

Canli veri korunmasi icin su aksiyonlar tamamlanmadi:

- Yeni gorev kaydetme
- Gorev tamamlama
- Yorum ekleme
- Arsivlemeyi onaylama
- Gorev duzenleyip kaydetme

Sadece guvenli akislari test edildi:

- Modal acma/kapama
- Bos form validation
- Arsiv onay dialogunu acma ve `Hayir` ile kapatma
- Sekme/arama gezinmesi

---

## 6. Kanit Ekran Goruntuleri

Bu oturumda olusturulan ekran goruntuleri gecici klasore kaydedildi:

- `C:\Users\mehme\AppData\Local\Temp\shift-manager-task-page.png`
- `C:\Users\mehme\AppData\Local\Temp\shift-manager-task-search.png`
- `C:\Users\mehme\AppData\Local\Temp\shift-manager-task-new-modal.png`
- `C:\Users\mehme\AppData\Local\Temp\shift-manager-task-edit-modal.png`
- `C:\Users\mehme\AppData\Local\Temp\shift-manager-task-archive.png`
- `C:\Users\mehme\AppData\Local\Temp\shift-manager-task-mobile.png`

Not: Bunlar repo artefakti degil, QA oturumu kaniti olarak gecici dosyalardir.
