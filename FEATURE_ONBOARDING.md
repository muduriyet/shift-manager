# İşe Giriş Süreçleri — Personel İşe Alım Takibi (Onboarding)

Son güncelleme: 2026-07-25
Durum: **PLANLAMA TAMAMLANDI, UYGULAMA BAŞLAMADI** — S1 sırada. Ön koşul niteliğindeki iki UI düzeltmesi canlıya alındı; şema ve ekranlar henüz yazılmadı.

İlerleme notu:
- ✅ **Ön koşul — CSS token'ları (`f47308a`):** `--late-bg/-fg/-bd/-dot` tanımlandı ve `.badge-active .dot` rengi eklendi. `Stat tone="late"` ve `<Badge status="Aktif" dot />` bu değişkenlere başvuruyordu ama tanımlı değillerdi (TD-015'te "Geç Kaldı" statüsü silinirken temizlenmiş, üç kullanım geride kalmış). Yeni ekranları açmakla kalmadı, `SettingsScreen` ve `TaskNotebookScreen`'deki mevcut iki bozukluğu da kapattı. Tarayıcıda computed style ile doğrulandı.
- ✅ **Ön koşul — `Dialog` Escape yığını (`2ec21e4`):** `Dialog` her örnek için `document`'e ayrı dinleyici ekliyordu; iki dialog açıkken tek Escape ikisini birden kapatıyordu (bugün `TaskModal` arşiv onayında yaşanıyor). Modül seviyesinde tek dinleyici + `onClose` ref yığınına geçildi. Bu özelliğin iç içe düzenleme dialog'u için zorunlu ön koşuldu; bağımsız olduğu için ayrıca gönderildi. Tarayıcıda gerçek tuş basımıyla 7 çağrı yerinin hepsi doğrulandı.
- ⬜ **S1–S8:** şema, liste, detay modal, yazma, Yeni Süreç, evrak tanımları, QA, dokümantasyon.

Bu dosya, Claude Design'da (`Shift-Manager UI Kit` → `templates/ise-giris-sureci` ve `templates/ise-giris-surecleri`) tasarlanan **İşe Giriş Süreçleri** ekranlarının canlı uygulamaya entegrasyon spesifikasyonunu ve uygulama adımlarını tanımlar. Yaşayan (living) dokümandır; her sprint tamamlandıkça güncellenir.

---

## Bağlam

Yeni personelin işe giriş süreci bugün uygulama dışında takip ediliyor. Süreç 3 aşamalı (İşe giriş maili → SGK girişi → Evrak asılları) ve 3 ayrı evrak kontrol listesi içeriyor (6 + 2 + 9 = 17 belge). Amaç: her personelin hangi aşamada olduğunu ve hangi evrakın eksik kaldığını tek ekrandan görmek.

⚠️ **Tasarımlar repoda değil** — claude.ai Design projesinde (`Shift-Manager UI Kit`, projectId `82cf4abd-0b46-43f5-9291-9485e2b4167f`). `DesignSync` aracıyla okunur:

- **İşe Giriş Süreçleri** (liste) — `templates/ise-giris-surecleri/IseGirisSurecleri.dc.html`
- **İşe Giriş Süreci** (detay) — `templates/ise-giris-sureci/IseGirisSureci.dc.html`

**Veritabanı tarafı tamamen sıfırdan** — repoda da canlı DB'de de işe giriş/evrak/aşama ile ilgili hiçbir tablo yok. Buna karşılık UI tarafı hazır: gereken 17 ikonun 17'si ve tüm bileşenler mevcut.

Mimari olarak **Görev Defteri** örnek alınıyor: liste ekranı + ağır bir detay **modal**'ı.

---

## Kilitlenen kararlar

| Konu | Karar |
|---|---|
| Navigasyon | **Modal** — sayfa değil. Uygulamada router yok, 7 ekranın hepsinde detay = `<Dialog>`. |
| Telefon / IBAN | **`onboardings` tablosuna** — süreç özelinde kalır. `employees`'e hiç dokunulmaz; hassas veri diğer ekranlara sızmaz. |
| Çalışma Türü | **Çıkarıldı.** Tüm personel tam zamanlı. Kolon açılmaz; "Görev Bilgileri" paneli 4 alan gösterir. |
| Aşama geçişi | **Stepper'daki adıma tıklayarak ileri/geri.** Yanlış işaretleme UI'dan düzeltilebilir. |
| Aşama semantiği | `stage` = **ulaşılan kilometre taşı**. `stage = 1` → "işe giriş maili atıldı", sıradaki iş SGK girişi. |
| Stepper durumları | `Tamamlandı` (k ≤ stage) · `Devam Ediyor` (k = stage+1) · `Beklemede` (k > stage+1). Tamamlanmış süreçte üçü de `Tamamlandı`. |
| Kapsam | **S1–S8.** Excel dışa aktarma yok. |
| Dosya yükleme | **Yok.** Evrak tabloları boolean toggle, ek değil. Storage bucket açılmaz. |
| Tamamlanma kuralı | `isComplete = stage >= 3` — **aşama tek belirleyici**, evrak tikleri bilgi amaçlı. Tasarımın `\|\| hepsiGeldi` dalı (mockup artefaktı) alınmıyor. |
| `Başlangıç` kolonu | `employees.start_date` — yeni kolon yok. Boşsa `—` gösterir. |
| Bekleyen personel | `employees`'te **normal, aktif** kayıt + açık `onboardings` satırı. `is_active` kullanılmaz. |
| Tamamlanma etkisi | Süreç **otomatik arşivlenir** (modal kapanışında) ve listeden düşer. Personel kaydına hiçbir yazma yapılmaz. |
| Liste kapsamı | **Yalnız açık süreçler.** Sekme yok, `Durum` kolonu yok — tablo 6 kolon. |
| Stat kartları | `Toplam Açık Süreç` (`primary`) · `Personel Evrak Bekleniyor` (`came`) · `Giriş Evrak Bekleniyor` (`late`). `plan` diye bir `StatTone` yok. |
| Yeni Süreç akışı | Pop-up **personeli oluşturur** (seçmez): Ad Soyad → Şube → Departman → Pozisyon → İşe Giriş Tarihi (isteğe bağlı). |
| Personel + süreç yazımı | Tek transaction — `create_onboarding_with_employee()` RPC. Yarım kayıt imkânsız. |
| Evrak tanımı yönetimi | İşe Giriş ekranından **modal** (`Evrak Tanımları`). Ekle + kaldır. |
| Katalog değişiminin etkisi | **Ekleme** → devam eden süreçlere de düşer. **Kaldırma** → hiçbir mevcut süreçten silinmez. **Arşivlenmiş süreçler iki yönde de dokunulmaz.** |

---

## Personel yaşam döngüsü — kritik netleştirme

**Tasarımın varsaydığı model bu uygulamada yok.** Tasarım şunu yazıyor:

> *"Bu süreç tamamlandığında personel kaydı aktif hale gelecek ve bordro sistemine dahil edilecektir."*

Bu, personelin önce bir bekleme havuzunda durduğu bir modeli anlatıyor. Öyle bir havuz yok ve `is_active` bu iş için kullanılamaz:

- Canlı veride 41 personelin 2'si pasif; **ikisinin de `end_date`'i dolu** — yani `is_active = false` pratikte *işten ayrıldı* demek.
- Pasife alınan personel dört yerden **komple kayboluyor**: Çizelge ([ScheduleScreen.tsx:95](src/components/schedule/ScheduleScreen.tsx#L95)), yeni vardiya ([ShiftModal.tsx:94](src/components/modals/ShiftModal.tsx#L94)), Excel dışa aktarma ([scheduleExport.ts:83](src/lib/scheduleExport.ts#L83)) ve **Excel içe aktarma eşleşmesi** ([scheduleImport.ts:140](src/lib/scheduleImport.ts#L140)).
- Buna karşılık Günlük Kontrol ve Raporlar `is_active`'e **hiç bakmıyor** — tutarsız davranış riski.
- Kolon `boolean not null`; üçüncü durum için yer yok.

**Doğru mekanizma zaten var: `start_date`.** `isWithinEmployment()` ([constants/index.ts:42](src/constants/index.ts#L42)) başlangıç öncesi günlere atamayı engelliyor ve çizelgede taralı gösteriyor.

### Benimsenen model

1. Personel **bu ekranda oluşturulur** — "Yeni Süreç" pop-up'ı hem `employees` satırını hem süreci tek transaction'da açar. Personel Listesi'nden eklemek de çalışmaya devam eder.
2. Oluşturulan personel **normal ve aktif**tir. Bekleme havuzu yok; işe giriş süreci `employees` satırına *iliştirilmiş* bir takip kaydıdır.
3. "Süreci tamamlanmamış personel" = açık (`archived_at is null`) süreci olan personel. **Türetilmiş bilgi, yeni kolon yok.**
4. Süreç tamamlandığında **personel kaydına hiçbir yazma olmaz** — yalnız sürecin kendisi arşivlenir.
5. Evrak beklerken personelin çalışıyor olması normaldir; evrak süreci ile çalışma durumu bağımsız.

### Tamamlanma → arşivleme, modal kapanışında

`isComplete()` true olur olmaz değil, **detay modalı kapanırken** kontrol edilir. Sebebi: kullanıcı modal içindeyken aşamayı serbestçe ileri-geri alabilmeli. Anında arşivlenseydi yanlış bir tık süreci listeden düşürür ve UI'dan geri dönüş kalmazdı.

### Tasarım metni düzeltilecek

| Durum | Yeni metin |
|---|---|
| Bekliyor (mavi) | **Bilgilendirme** — "Evrak asılları muhasebeye ulaştığında 3. adımı işaretleyin; süreç o zaman tamamlanır." |
| Tamamlandı (yeşil) | **Süreç Tamamlandı** — "Tüm adımlar tamamlandı, evrak asılları muhasebeye teslim edildi." |

---

## 1. Veritabanı

### Değişiklik yüzeyi

**Yeni (hepsi `supabase/create_onboarding.sql` içinde):**

| Nesne | Tür |
|---|---|
| `onboarding_doc_defs` | tablo — evrak kataloğu, 17 satır seed |
| `onboardings` | tablo — sürecin kendisi |
| `onboarding_docs` | tablo — sürece kopyalanmış evrak satırları |
| `onboarding_list_view` | view — liste ekranını tek sorguda besler |
| `seed_onboarding_docs()` | function + trigger — süreç açılınca 17 evrağı kopyalar |
| `create_onboarding_with_employee()` | RPC — personel + süreç, tek transaction; `onboarding_id` + `employee_id` döner |
| `add_onboarding_doc_def()` | RPC — katalog tanımı + açık süreçlere yayılım, tek transaction |
| 2 × `touch_updated_at` | trigger (mevcut fonksiyon) |

**Mevcutta değişen: HİÇBİR ŞEY.** Tek bir `alter table` yok, tek bir mevcut kolonun anlamı değişmiyor. `employees` / `stations` / `departments` / `roles` / `profiles` sadece okunur. `shifts` / `tasks` / satış tablolarına dokunulmuyor. Storage bucket'ı açılmıyor.

### Tablolar

Bağımlılık: `schema.sql` (employees) + `create_task_notebook.sql` (`profiles`, `public.touch_updated_at()` — [tanım](supabase/create_task_notebook.sql#L90)).

**`onboarding_doc_defs`** — evrak kataloğu. `doc_set text CHECK in ('personel','giris','asil')`, `name`, `description`, `sort_order`, `is_active`. Unique `(doc_set, name)`. 17 satır `on conflict do nothing` ile seed edilir.

**`onboardings`** — süreç. `employee_id → employees on delete restrict`, `stage smallint default 1 CHECK between 1 and 3`, `phone text default ''`, `iban text default ''`, `notes text default ''`, `archived_at`, `created_by uuid → profiles on delete set null`, `created_at`, `updated_at`. Kısmi unique index: bir personelin aynı anda **tek açık süreci** olabilir (`where archived_at is null`).

> Not: Yeni Süreç akışı her seferinde yeni personel oluşturduğu için bu kısıt şu an UI'dan tetiklenemez — kasıtlı bir emniyet ağı olarak duruyor.

`phone` / `iban` bilinçli olarak burada, `employees`'te değil: [fetchEmployees](src/lib/db.ts#L154) filtresiz `EMP_SELECT` çekiyor ve giriş anındaki `Promise.all` içinde çalışıyor — orada duran her kolon, ihtiyacı olmayan **her ekrana** prop olarak geçer.

**`onboarding_docs`** — sürece kopyalanmış evrak satırları. `onboarding_id → onboardings on delete cascade`, `doc_set`, `name`, `description`, `sort_order`, `is_done boolean default false`, `updated_at`. Unique `(onboarding_id, doc_set, name)`.

**Seed trigger** — `seed_onboarding_docs()`: `after insert on onboardings`, katalogdaki **aktif** satırları kopyalar.

**Snapshot garantisi.** `onboarding_docs` satırları kopyalandığı için katalogdan bağımsız yaşarlar. Arşivlenmiş bir sürecin evrak listesi katalog ne olursa olsun **değişemez** — "geçmiş kayıtlar etkilenmesin" garantisi mimarinin kendisinden geliyor.

RLS: üç tabloya da ev standardı tek politika — `for all to authenticated using (true) with check (true)`.

### RPC — `create_onboarding_with_employee(...)`

```sql
create or replace function public.create_onboarding_with_employee(
  p_name text, p_station_id integer, p_dept_id integer,
  p_role_id integer, p_start_date date, p_created_by uuid
) returns table (onboarding_id bigint, employee_id bigint)
  language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_emp bigint; v_onb bigint;
begin
  insert into public.employees (name, station_id, dept_id, role_id, start_date)
  values (p_name, p_station_id, p_dept_id, p_role_id, p_start_date) returning id into v_emp;

  insert into public.onboardings (employee_id, created_by)
  values (v_emp, p_created_by) returning id into v_onb;

  return query select v_onb, v_emp;
end; $$;

grant execute on function public.create_onboarding_with_employee(text, integer, integer, integer, date, uuid) to authenticated;
```

⚠️ **`employee_id` de dönmek zorunda.** Sadece `onboarding_id` dönerse yeni personel App'in `employees` state'ine giremez — liste satırı adı/pozisyonu o diziden eşleştiriyor, yani yeni açılan süreç hem listede hem detayda **boş render eder**. `Employee` istemcide kurulamaz da: `toEmployee` şube/departman/görev adlarını embedded join'den çözüyor. Akış: RPC → `employee_id` → `fetchEmployee(id)` → `onEmployeeSaved(employee)`.

`shift_name` / `schedule_name` insert'te yok — ikisi de `not null default ''`, insert geçer. Bedeli için §7 Risk 10.

### RPC — `add_onboarding_doc_def(p_doc_set, p_name, p_description)`

Katalog ekleme iki iş yapıyor: tanımı yaz **ve** devam eden süreçlere düşür. Tek transaction olmalı.

```sql
create or replace function public.add_onboarding_doc_def(
  p_doc_set text, p_name text, p_description text
) returns bigint
  language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_id bigint; v_order smallint;
begin
  select coalesce(max(sort_order), 0) + 1 into v_order
  from public.onboarding_doc_defs where doc_set = p_doc_set;

  -- Daha önce kaldırılmış aynı isimli tanım varsa yeniden aktifleşir.
  insert into public.onboarding_doc_defs (doc_set, name, description, sort_order)
  values (p_doc_set, p_name, coalesce(p_description, ''), v_order)
  on conflict (doc_set, name) do update
    set is_active = true, description = excluded.description
  returning id into v_id;

  -- Devam eden süreçlere de ekle; arşivlenmişlere ASLA dokunma.
  insert into public.onboarding_docs (onboarding_id, doc_set, name, description, sort_order)
  select o.id, d.doc_set, d.name, d.description, d.sort_order
  from public.onboardings o, public.onboarding_doc_defs d
  where o.archived_at is null and d.id = v_id
  on conflict (onboarding_id, doc_set, name) do nothing;

  return v_id;
end; $$;

grant execute on function public.add_onboarding_doc_def(text, text, text) to authenticated;
```

**Kaldırma RPC istemiyor** — tek satır: `update onboarding_doc_defs set is_active = false where id = ?`. Hiçbir `onboarding_docs` satırına dokunulmaz.

**Simetri kasıtlı olarak bozuk:** ekleme yayılır, kaldırma yayılmaz. Her iki yön de veri kaybetmeyen tarafı seçiyor.

### View

**`onboarding_list_view`** — `with (security_invoker = true)`: `id, employee_id, stage, archived_at, created_by, created_at, updated_at` + `count(*) filter (...)` ile altı sayaç (`personel_done/total`, `giris_done/total`, `asil_done/total`). `grant select ... to anon, authenticated`.

⚠️ **View `phone` / `iban` / `notes` taşımaz — kasıtlı.** Konsaydı `fetchOnboardings()` ekran açılışında tüm açık süreçlerin IBAN'ını belleğe indirirdi. Detay için ayrı okuma: `fetchOnboarding(id)`.

⚠️ **View personel bilgisi de taşımaz.** Ad, pozisyon, şube ve `start_date` istemci tarafında `employees` dizisinden `employeeId` ile eşleştirilir.

### Geri alma

```sql
drop view     if exists onboarding_list_view;
drop function if exists public.create_onboarding_with_employee(text,integer,integer,integer,date,uuid);
drop function if exists public.add_onboarding_doc_def(text,text,text);
drop function if exists public.seed_onboarding_docs();
drop table    if exists onboarding_docs, onboardings, onboarding_doc_defs;
```

Mevcut hiçbir tabloya dokunulmadığı için bu kadarı yeterli.

### Neden bu şekilde

- **jsonb değil iki tablo:** iki kullanıcı aynı sürecin farklı evraklarını işaretlediğinde jsonb read-modify-write birbirini eziyor; satır bazlı `update ... where id` çakışmaz.
- **Katalog + trigger, TS'te sabit liste değil:** yeni evrak eklemek deploy değil `insert` olur.
- **`stage smallint`:** tüm kurallar sıralı karşılaştırma (`>= k`). "Enum yok" kuralı PostgreSQL enum *tipi* içindir; adlandırılmış CHECK korunuyor.
- **employee'ye FK, text snapshot değil:** `shifts` geçmiş bir olguyu dondurduğu için snapshot kullanıyor; işe giriş süreci ise *yaşayan bir kişi* hakkında.

### Evrak kataloğu (birebir, tasarımdan)

| set | # | ad |
|---|---|---|
| `personel` | 1–6 | Kimlik Kartı · Öğrenim/Mezuniyet Belgesi · Adli Sicil Kaydı · Yerleşim Yeri Kaydı · Nüfus Kayıt Örneği · Muvafakatname |
| `giris` | 1–2 | SGK Giriş Bildirgesi · İş Sözleşmesi |
| `asil` | 1–9 | Kimlik Kartı · Öğrenim/Mezuniyet Belgesi · Adli Sicil Kaydı · Yerleşim Yeri Kaydı · Nüfus Kayıt Örneği · SGK Giriş Bildirgesi · İş Sözleşmesi · Taahhütname · Fotoğraf |

`asil` setindeki 9 kaydın `description` değerleri tasarımda var (ör. "T.C. kimlik kartı aslı") — korunur ve Evrak Aslı tablosunda ad altında soluk alt satır olarak gösterilir.

---

## 2. Tipler + veri katmanı

Bu repoda **tip üretimi yok** — her tablo için üç şey elle yazılır.

### `src/types/index.ts`
- `ViewId` union'a `| 'isegiris'`
- Yeni blok: `OnboardingStage = 1|2|3`, `OnboardingDocSet = 'personel'|'giris'|'asil'`, `Onboarding` (view alanları + 6 sayaç), `OnboardingDetail = Onboarding & { phone, iban, notes }`, `OnboardingDoc`
- **`Employee` arayüzü değişmiyor.**

### `src/lib/db.ts`

`EMP_SELECT`, `EmpRow`, `toEmployee`, `createEmployee`, `updateEmployee` — **hiçbirine dokunulmuyor.**

Üç dar personel okuyucu/yazıcı eklenir (`setEmployeeActive` desenini izler):
- `fetchEmployee(id)` — RPC'den dönen `employee_id` ile tek personeli çeker
- `updateEmployeeName(id, name)`
- `updateEmployeeAssignment(id, { stationId, deptId, roleId, startDate })`

Üçü de `.select(EMP_SELECT).single()` → `toEmployee` döndürür.

⚠️ **`Employee` tipinde `stationId`/`deptId`/`roleId` YOK** — `toEmployee` id'leri düşürüp yalnız adları tutuyor. "Görev Bilgilerini Düzenle" dialog'u **ad → id ters eşlemesi** yapmalı. Desen: [App.tsx:370-372](src/App.tsx#L370).

Yeni onboarding bölümü: `OnboardingRow`/`toOnboarding`, `OnboardingDocRow`/`toOnboardingDoc`, ve
`fetchOnboardings()` (view) · `fetchOnboarding(id)` (tablo, `phone`/`iban`/`notes` dahil) · `fetchOnboardingDocs(id)` · `setOnboardingStage(id, stage)` · `setOnboardingContact(id, { phone, iban })` · `setOnboardingNotes(id, notes)` · `setOnboardingDocDone(docId, done)` · `archiveOnboarding(id)`

Evrak kataloğu: `fetchDocDefs()` · `addDocDef(docSet, name, description)` → RPC · `removeDocDef(id)`.

```ts
export async function createOnboardingWithEmployee(form: {
  name: string; stationId: number; deptId: number; roleId: number;
  startDate: string | null;
}, createdBy: string | null): Promise<{ onboardingId: number; employeeId: number }>
```

Okumalar **view**'a, yazmalar **tablolara** gider.

### `src/lib/onboarding.ts` (yeni, saf — React/supabase yok)

- `STAGES` — 3 aşama, her biri `{ n, title, short, statLabel, icon }`:

  | alan | örnek (1. aşama) | nerede |
  |---|---|---|
  | `title` | `İşe Giriş Maili Atıldı` | stepper başlığı (`${n}. ${title}`) |
  | `short` | `İşe giriş maili atıldı` | liste `Süreç Adımı` kolonu |
  | `statLabel` | `Personel Evrak Bekleniyor` | stat kartı — *ulaşılan* değil, **şu an toplanan** seti anlatır |

- `stepStatus(o, k)` → `'tamam' | 'devam' | 'bekleme'`:
  ```ts
  if (isComplete(o))     return 'tamam';   // 3. aşamada üçü de tamam
  if (k <= o.stage)      return 'tamam';
  if (k === o.stage + 1) return 'devam';
  return 'bekleme';
  ```
- `DOC_SETS` — 3 set, her biri `{ id, stage, title, doneCol, notDoneCol, doneLabel, notDoneLabel }`. "Gönderildi/Gönderilmedi" farkı buradan gelir.
- Türetmeler: `activeDocSet(stage)` · `docCount(o, set)` · `allOriginalsReceived(o)` · `isComplete(o)`

```ts
isComplete(o) = o.stage >= 3
```

**Aşama tek belirleyici; evrak tikleri bilgi amaçlı.** İki sonucu var, ikisi de kasıtlı:
- **3. aşama terminaldir.** O aşamaya geçen süreç tamamlanır ve modal kapanışında arşivlenir.
- **`allOriginalsReceived(o)` tamamlanmada kullanılmaz** ama silinmiyor: Evrak Aslı kartının altındaki yeşil `Tüm evrak asılları teslim alındı` satırını sürüyor — "hepsi geldi, artık 3. adıma basabilirsin" sinyali.

**Tasarımın formülünden kasıtlı sapma.** Tasarımda `s3tamam = asamaIdx >= 2 || hepsiGeldi` yazıyor; oradaki `asama` gerçek veri değil, tasarımcının önizleme için elle çevirdiği bir prop.

---

## 3. Bileşenler

| Dosya | Sorumluluk |
|---|---|
| `src/lib/onboarding.ts` | saf sabitler + türetmeler |
| `src/components/onboarding/OnboardingScreen.tsx` | liste ekranı; kendi verisini ve kendi modal'larını sahiplenir |
| `src/components/modals/OnboardingModal.tsx` | detay modal'ı; iç içe düzenleme dialog'unu barındırır |
| `src/components/modals/OnboardingCreateModal.tsx` | "Yeni Süreç" — personel oluşturma formu |
| `src/components/modals/OnboardingDocDefsModal.tsx` | "Evrak Tanımları" — katalog yönetimi |

### Veri yükleme: ekran-yerel fetch (`alive` guard)

Görev Defteri global App state kullanıyor ama burada **ekran-yerel** tercih ediliyor: [App.tsx:186-215](src/App.tsx#L186) tüm uygulamayı tek `Promise.all` arkasında bloke ediyor; onboarding sorgusu patlarsa login komple kilitlenir. Desen: [SalesExploreTab.tsx:38-52](src/components/sales/SalesExploreTab.tsx#L38).

`employees` / `stations` / `departments` / `roles` App'ten prop gelir. `onEmployeeSaved` callback'i kritik — hem yeni oluşturulan hem düzenlenen personel App state'ine akmalı:

```tsx
onEmployeeSaved={e => setEmployees(prev =>
  prev.some(x => x.id === e.id) ? prev.map(x => x.id === e.id ? e : x) : [...prev, e]
)}
```

### Liste ekranı

Yalnız açık süreçler gösterildiği için tasarımın sekmeleri ve `Durum` kolonu düşüyor. Yapı: `page-head` → `stat-grid` → `card` (SearchInput + şube Select) → `table-wrap`/`tbl` veya `EmptyState` → footer. Tablo markup referansı: [EmployeesScreen.tsx:97-143](src/components/employees/EmployeesScreen.tsx#L97).

**Stat kartları:**

| Kart | Sayı | tone |
|---|---|---|
| `Toplam Açık Süreç` | tümü | `primary` |
| `Personel Evrak Bekleniyor` | `stage === 1` | `came` |
| `Giriş Evrak Bekleniyor` | `stage === 2` | `late` |

⚠️ **`tone` değerleri `StatTone`'dan seçilmeli** — [Stat.tsx:4](src/components/ui/Stat.tsx#L4): `'primary' | 'came' | 'late' | 'absent'`. **`plan` diye bir tone YOK** (o `Badge`'in `badge-plan` sınıfı, farklı tablo); kullanılırsa `tsc` patlar.

**3. aşama için kart yok** — o aşamaya geçen süreç tamamlanıp arşivleniyor. Arşivleme modal kapanışında olduğundan geçici olarak listede stage 3 satırı bulunabilir; yani `Toplam Açık Süreç` ≥ diğer iki kartın toplamı, eşitlik garanti değil.

**Tablo — 6 kolon:** `Personel` · `Şube` · `Süreç Adımı` · `Evrak` · `Başlangıç` · chevron

`Süreç Adımı` ulaşılan son kilometre taşını gösterir (`STAGES[stage].short`). Bir ara "Sırada: …" denendi ve **geri alındı**: yanındaki `Evrak` kolonu zaten şu an toplanan seti gösteriyor, ikisi yan yana çelişiyordu. Solda **nerede olduğun**, sağda **şu an ne topladığın**. `Devam Ediyor` rozeti yalnız detaydaki stepper'da yaşıyor.

- `.stat-grid` `repeat(4,1fr)` ([index.css:164](src/index.css#L164)) — 3 kart için override gerekir. ⚠️ **Inline `style` ile yapılırsa responsive kırılır:** [index.css:609](src/index.css#L609) (`max-width:1100px`) ve [index.css:630](src/index.css#L630) inline stile yenilir. `DailyScreen.tsx:108` bu hatayı zaten taşıyor — kopyalanmamalı. Doğrusu: `index.css`'e `.stat-grid-3` sınıfı eklemek.
- Tasarımın hex'leri yerine **token**: `#10b981`→`--came-dot`, `#e2e8f0`→`--border`, `#047857`→`--came-fg`, `#b45309`→`--late-fg`.
- **Arama alanları:** personel `name` + `role`. `toLocaleLowerCase('tr')` **iki tarafta** (aksi halde `İş`/`iş` eşleşmez).
- `fetchOnboardings()` `.is('archived_at', null)` filtreliyor.
- EmptyState iki durumu ayırmalı: hiç açık süreç yok vs filtre sonucu boş. Desen: [EmployeesScreen.tsx:84-94](src/components/employees/EmployeesScreen.tsx#L84).
- v1'de sayfalama yok.

### Detay modal

`Dialog width={980}`, gövde `gridTemplateColumns: '1fr 320px'` (sağ ray), 900px altında tek kolona iner.

**İki kaynağı birlikte çeker.** Listeden gelen satır bir `Onboarding` — view'dan geldiği için `phone`/`iban`/`notes` içermiyor:

```ts
useEffect(() => {
  if (!process) return;
  let alive = true;
  Promise.all([fetchOnboarding(process.id), fetchOnboardingDocs(process.id)])
    .then(([d, docs]) => { if (alive) { setDetail(d); setDocs(docs); } })
    .catch(() => {});
  return () => { alive = false; };
}, [process]);
```

Toggle'lar iyimser lokal state + `setOnboardingDocDone`; liste **modal kapanışında bir kez** yenilenir.

Stepper adımları **tıklanabilir** — `setOnboardingStage(id, k)` (ileri ve geri serbest). Aşamayı geri almak evrak işaretlerini **silmez**.

**Üç durumlu rozet** — `stepStatus(o, k)` sürer:

| Durum | Rozet | Daire |
|---|---|---|
| `tamam` | `Tamamlandı` — Badge `status="Geldi"` | dolu yeşil `#059669`, beyaz ikon, halka `#d1fae5` |
| `devam` | `Devam Ediyor` — Badge `status="Aktif"` `dot` | beyaz zemin, `--late-fg` kenarlık ve ikon |
| `bekleme` | `Beklemede` — Badge `status="Planlandı"` | beyaz zemin, `--border` kenarlık |

**Kapanışta arşivleme — üç kapanış yolunun hepsi.** `Dialog` X butonu, Escape ve backdrop ile kapanıyor; üçü de aynı `onClose` prop'una gidiyor. `isComplete()` kontrolü ve `archiveOnboarding(id)` **ekranın `onClose` handler'ında** olmalı.

### İç içe düzenleme dialog'u

`OnboardingModal.tsx` içinde lokal bileşen. İki mod:

- **`Personel Bilgilerini Düzenle`** → Ad Soyad, Telefon, IBAN. Ad `updateEmployeeName` ile `employees`'e, telefon/IBAN `setOnboardingContact` ile `onboardings`'e. Bu ekran personeli oluşturduğu için yazım hatasını da düzeltebilmeli.
- **`Görev Bilgilerini Düzenle`** → Şube, Departman, Pozisyon, İşe Giriş Tarihi → `updateEmployeeAssignment`.

**Tasarımdan iki bilinçli sapma:**
1. Şube/Departman/Pozisyon düz `Input` değil `Select` — bunlar FK kolonu, serbest metin yazılamaz.
2. Detay tasarımının sol üstündeki `Geri` butonu çıkarılıyor — sayfa varsayımıyla çizilmişti; modalda karşılığı X, Escape ve backdrop.

---

## 4. Wiring

**4 dosyada 4 küçük dokunuş** (ikisi App.tsx'te):

1. [types/index.ts:23](src/types/index.ts#L23) — `ViewId` += `| 'isegiris'`
2. [App.tsx:69](src/App.tsx#L69) — `VIEW_IDS` += `'isegiris'` (`'gorev'` sonrası)
3. [App.tsx](src/App.tsx) — import + `switch`'e `case 'isegiris'` (props: `employees`, `stations`, `departments`, `roles`, `currentUserId`, `onEmployeeSaved`, `onToast`)
4. [Sidebar.tsx](src/components/layout/Sidebar.tsx#L10) — `NAV` dizisine `{ id: 'isegiris', label: 'İşe Giriş Süreçleri', icon: 'userCheck' }`, `'gorev'` satırından hemen sonra

Yeni App state yok, login `Promise.all`'ına ekleme yok.

---

## 5. Sprintler

**S1 — Şema + veri katmanı + boş ekran**
`create_onboarding.sql` uygulanır; tipler; `db.ts` satır/mapper/fetch fonksiyonları; `src/lib/onboarding.ts`; nav + `VIEW_IDS` + switch + stub ekran.

**S2 — Liste ekranı (okuma)**
3 Stat kartı, SearchInput, şube Select, 6 kolonlu tablo, 3 segmentli aşama çubuğu, adıma göre değişen paydalı `n/m` evrak kolonu, iki durumlu EmptyState, footer.

**S3 — Detay modal (okuma)**
Stepper, 3 salt-okunur evrak tablosu, sağ ray, not (okuma), iki bilgi kutusu, yeşil tamamlanma satırı. *(Dialog Escape düzeltmesi `2ec21e4` ile ayrıca gönderildi.)*

**S4 — Detay modal (yazma) + otomatik arşivleme**
Evrak toggle'ları, stepper'dan aşama değiştirme, not kaydetme, iki iç içe düzenleme dialog'u, kapanışta `isComplete()` → `archiveOnboarding` + liste yenileme.

**S5 — Yeni Süreç + elle arşivleme**

`OnboardingCreateModal` (`Dialog width={440}`, footer `İptal` + `Kaydet`):

| # | Alan | Tip | Not |
|---|---|---|---|
| 1 | Ad Soyad | `Input` | Zorunlu. Doğrulama [EmployeeModal.tsx:23-37](src/components/modals/EmployeeModal.tsx#L23)'den kopyalanır. |
| 2 | Şube | `Select` | Zorunlu. |
| 3 | Departman | `Select` | Zorunlu. |
| 4 | Pozisyon | `Select` | Zorunlu (`role_id not null`). |
| 5 | İşe Giriş Tarihi | `Input type="date"` | İsteğe bağlı. Boşsa liste `—` gösterir. |

**Kaydet akışı:** `createOnboardingWithEmployee(...)` → `{ onboardingId, employeeId }` → `fetchEmployee(employeeId)` → `onEmployeeSaved(employee)` → detay modalı açılır.

`Select`'te `disabled` prop'u yok ve `stations`/`departments` bağımsız lookup tabloları — Şube seçimi Departman'ı kilitlemez. Varsayılanlar listelerin ilk elemanı.

Elle arşivleme: tamamlanmadan iptal edilen süreçler için onay dialog'lu `archiveOnboarding`.

**S6 — Evrak Tanımları modalı**

Liste ekranının üstünde `Evrak Tanımları` butonu → `OnboardingDocDefsModal`. Üç bölüm, her set için bir başlık. Desen: [SettingsScreen.tsx:41-124](src/components/settings/SettingsScreen.tsx#L41) handler'ları, satır içi ekleme JSX'i 126'dan itibaren.

**Onay metinleri farklı olmalı:**

| İşlem | Mesaj |
|---|---|
| Ekleme | *"«Sağlık Raporu» eklendi — devam eden 4 sürece de düştü."* |
| Kaldırma | *"«Muvafakatname» kaldırılacak. Mevcut süreçlerden silinmez, yalnız bundan sonra açılacak süreçlerde görünmez."* |

**S7 — QA sertleştirme**
Sınır durumları (boş lookup tabloları, uzun ad soyad, 40+ açık süreç), hata yolları (RPC 500, ağ kopması), eşzamanlılık (iki sekme), Dialog yığını, Türkçe metin denetimi.

**S8 — Dokümantasyon**
Bu dosya güncellenir; [context.md](context.md)'deki veri modeli tablosuna 3 yeni tablo, [README.md](README.md)'deki ekran listesine yeni satır eklenir.

---

## 6. Doğrulama

**S1** — Elle bir süreç insert et → `select count(*) from onboarding_docs where onboarding_id = 1` **17** dönmeli; `onboarding_list_view` `0/6, 0/2, 0/9` göstermeli. Nav'da öğe görünmeli, `vy_view=isegiris` ile reload ekrana düşmeli.

**S2** — 1. ve 2. aşamada karışık evrak durumlarında 4 süreç seed et. Kontrol: stat sayıları aşama dağılımına uyuyor mu, segment sayısı `stage`'e uyuyor mu, evrak paydası 6/2 değişiyor mu, tamam olan yeşil eksik olan kehribar mı, `İş`↔`iş` araması eşleşiyor mu. Elle `stage = 3` yapılan süreç listede **kalmalı**; `archived_at` doldurulan **düşmeli**. Pencereyi 1100px altına daralt → kartlar 2 kolona inmeli.

**S3** — Satır tıklaması modal açıyor mu; **sağ raydaki Telefon/IBAN/Notlar dolu geliyor mu** (`fetchOnboarding(id)` kanıtı); 17 evrak doğru sette ve sırada mı. **Stepper üç durumu da göstermeli:** `stage = 1` süreçte 1️⃣ Tamamlandı · 2️⃣ Devam Ediyor · 3️⃣ Beklemede.

**S4** — Aşama 2'deyken 9/9 Evrak Aslı işaretle → yeşil satır çıkmalı **ama süreç tamamlanmamalı**. 3. adıma tıkla → `Süreç Tamamlandı`; modal açıkken 2'ye geri dön → tekrar `Bilgilendirme` (anında arşivlemediğimizin kanıtı). Tekrar 3'e al ve kapat → listeden düşmeli. IBAN düzenle → `onboardings` satırında kalıcı. Pozisyon/Ad düzenle → Personel Listesi anında göstermeli. Aşamayı 3'ten 1'e çek → tikler **durmalı**.

**S5** — 5 alanı doldur → Kaydet. `employees` 1, `onboardings` 1, `onboarding_docs` **17** satır. **En kritik kontrol:** kayıttan hemen sonra hem liste satırında hem detayda ad/pozisyon/şube **dolu** gelmeli — boşsa `fetchEmployee` → `onEmployeeSaved` zinciri kopuktur.

**Atomiklik testi:** RPC'yi geçersiz `role_id` ile çağır → **hiçbir satır** yazılmamalı.

**Kapanış yolu testi:** süreci tamamla, üç yolla kapat (X · Escape · backdrop) — **üçünde de** arşivlenmeli.

**S6** — İki açık + bir arşivli süreç hazırla. `Sağlık Raporu` ekle → açık süreçlerin `asil` seti 9→10, **arşivli değişmemeli**. `Muvafakatname` kaldır → hiçbir mevcut süreçten satır silinmemeli. Kaldırdığını tekrar ekle → hata vermemeli.

**Yaşam döngüsü regresyonu (S4 sonrası, zorunlu):** süreci tamamla → `select is_active, start_date, end_date from employees where id = ?` **değişmemiş** olmalı.

Her sprint sonunda `npm run build` temiz geçmeli.

---

## 7. Riskler

1. ~~**`Dialog` Escape düzeltmesi**~~ — **kapandı**, `2ec21e4`. 7 çağrı yerinin hepsi tarayıcıda test edildi.
2. **SQL, kod deploy'undan önce uygulanmalı** — yoksa `fetchOnboardings` 404 verir. Ekran-yerel fetch sayesinde hata bu ekranla sınırlı kalır.
3. **Rol/yetki modeli yok.** RLS her yerde `for all to authenticated using (true)` — giriş yapan herkes IBAN'ı okuyabilir. `onboardings`'te tutmak bunu *çözmüyor*, sadece sıcak yoldan çıkarıyor.
4. **Telefon süreç-yerel, kişi-yerel değil.** Süreci biten personelin telefonuna ulaşmak için arşivlenmiş kayda bakmak gerekir; tekrar işe alımda yeniden girilir.
5. **Türkçe küçültme.** `toLocaleLowerCase('tr')` iki tarafa da uygulanmalı; evrak adları `İ`/`Ö`/`Ğ` dolu.
6. **Aşamada last-write-wins.** İki kullanıcı eşzamanlı ilerletirse kilit yok.
7. **`on delete restrict`** — süreci olan personel hard-delete edilemez. `shifts` ile tutarlı, ama `employees` üzerinde yeni bir kısıt.
8. **İkon seti kapalı** — `Icon.tsx`'te `mail`/`file`/`shield` yok. Stepper `inbox` / `userCheck` / `clipboard` kullanıyor.
9. **Mükerrer personel riski.** Yeni Süreç akışı personeli her zaman **oluşturur**, hiç aramaz. `name` üzerinde unique kısıt yok. Hafifletme: pop-up'ta aynı isimli aktif personel varsa uyarı göstermek.
10. **Yeni personel Excel çizelge içe aktarmasında eşleşmez.** RPC `schedule_name = ''` bırakıyor; [scheduleImport.ts:293](src/lib/scheduleImport.ts#L293) eşleştirmeyi `scheduleName` üzerinden yapıyor. Personel Listesi'nden Çizelge İsmi girilene kadar bu böyle kalır.
11. **`stage` tabanı 1** — süreç açılır açılmaz 1. adım `Tamamlandı` görünür ve UI'dan geri alınamaz. Varsayım: süreci zaten mail atıldığında açıyorsun.
12. **Arşivden geri dönüş yolu yok.** Yanlışlıkla tamamlanan bir süreç ancak SQL ile geri alınabilir (`update onboardings set archived_at = null where id = ?`).

---

## Kritik dosyalar

- `supabase/create_onboarding.sql` (tek SQL dosyası — mevcut şemaya dokunulmuyor)
- `src/lib/onboarding.ts` · [src/lib/db.ts](src/lib/db.ts) · [src/types/index.ts](src/types/index.ts)
- `src/components/onboarding/OnboardingScreen.tsx` · `src/components/modals/OnboardingModal.tsx` · `src/components/modals/OnboardingCreateModal.tsx` · `src/components/modals/OnboardingDocDefsModal.tsx`
- [src/App.tsx](src/App.tsx) · [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)
