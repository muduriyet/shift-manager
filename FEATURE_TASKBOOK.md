# Görev Defteri — Ortak Görev / Yapılacaklar Takibi (Task Notebook)

Son güncelleme: 2026-07-06
Durum: **TÜM SPRINTLER TAMAMLANDI (S1–S6 + S4.5); GD-8 ERTELENDİ** — Görev Defteri canlıya hazır: çekirdek pano, tekrarlayan rutinler, yorum/aktivite, QA sertleştirme (H1–H6), dosya ekleri (Storage), Excel dışa aktarma. Öne çıkarma (rozet/widget/bildirim, GD-8) kullanıcı kararıyla **ertelendi**. QA kaynağı: `FEATURE_TASKBOOK_QA.md` (Codex, 2026-07-06).

İlerleme notu:
- ✅ **Sprint 1 (Temel + tesisat):** `create_task_notebook.sql` (profiles + tasks + RLS + seed) canlıya uygulandı ve sertleştirildi (advisor temiz); tipler, `db.ts` veri katmanı, yönlendirme/menü + ekran iskeleti. `tsc` temiz. Doğrulandı: 6 seed rutini listelendi, tamamlandı işaretleme + tekrar üretimi (spawn-next: görev 1 → yarına yeni örnek) çalıştı; test artefaktı temizlendi.
- ✅ **Sprint 2 (Okuma panosu):** istatistik kartları, sayaçlı sekmeler, Rutinler/Bu Hafta gruplama, arama (tr-locale), kişi filtresi çipi, sayfalama, boş durum. `tsc` temiz. Doğrulandı: istatistikler (Açık 6/Bugün 3/Gecikmiş 0), sekme sayaçları, Rutinler (Günlük 3/Haftalık 1/Aylık 2) + Bu Hafta (Bugün 3/İleri 3) gruplama, arama, boş durum. (Kişi filtresi + sayfalama seed all-team & <10 olduğu için Sprint 3'te canlı test edilecek.)
- ✅ **Sprint 3 (Yazma + tekrar):** TaskModal (ekle/düzenle), başlık/öncelik/tarih/tekrar/not, Ortak Görev + Devral, arşivle (onaylı soft-delete), satır→düzenle, Görev Ekle butonu. `tsc` temiz. Doğrulandı: oluştur (kişiye atanmış), kişi filtresi çipi, düzenle (öncelik + team toggle; updated_at trigger tetiklendi), arşivle (gizlendi, kayıt korundu), sayfalama (12 görev → Sayfa 1/2 → Sonraki). Test verisi temizlendi. (Devral tek kullanıcı olduğu için canlı test edilemedi; ≥2 kullanıcıda çalışır.) → **Faz 1 canlıya hazır.**
- ✅ **Sprint 4 (İşbirliği):** yorum thread'i + aktivite akışı (düzenle diyaloğunda). `task_comments` + `task_activity` tabloları + RLS; oluştur/tamamla/düzenle/devral/yorum aksiyonları loglanır. `tsc` temiz. Doğrulandı: yorum ekleme → yorum kartı (ad/avatar/göreli zaman) + "yorum ekledi" aktivitesi (canlı; test verisi temizlendi).
- ✅ **Sprint 4.5 (QA sertleştirme):** H1 aylık ay-sonu clamp, H2 Bu Hafta = bu hafta due, H3 tekrar duplicate guard (partial unique index — canlıya uygulandı), H4 Rutinler yalnız açık, H5 buton pending/disabled, H6 boş aktivite satırı. `tsc` temiz. Doğrulandı: H1 (`31 Oca +1ay → 28 Şub`, node) + H3 (index mevcut); H2/H4/H5/H6 kod tamam, görsel pass login bekliyor.
- ✅ **Sprint 5 (Ekler):** görev dosyaları (Supabase Storage, private, 25 MB). Yükleme **anında** Storage'a; yeni görevde taslak (task_id=null) → kaydedince bağlanır, iptalde silinir; indirme signed URL ile. `tsc` temiz. Doğrulandı (canlı): upload → signed URL → link → remove uçtan uca (RLS insert/read/delete), Dosya Ekleri UI render; test verisi temizlendi.
- ✅ **Sprint 6 (Dışa aktarma):** Dışa Aktar butonu → **yalnız Excel** (o an filtrelenmiş liste; `exportRowsToExcel`). PDF/yazdırma yok. `tsc` temiz; canlı: buton render + tıklama hatasız. GD-8 öne çıkarma **ertelendi**.

Bu dosya, Claude Design'da (`Shift-Manager UI Kit` → `templates/gorev-defteri`) tasarlanan **Görev Defteri** ekranının canlı uygulamaya entegrasyon spesifikasyonunu ve uygulama adımlarını tanımlar. Yaşayan (living) dokümandır; her sprint tamamlandıkça güncellenir.

---

## 1. Amaç ve Kapsam

Görev Defteri, **giriş yapan ofis (muhasebe) ekibi** için ortak bir yapılacaklar / rutin takip panosudur. Buradaki kişiler `employees` tablosundaki saha/vardiya personelinden **farklıdır** — bunlar uygulamaya giriş yapan idari kullanıcılardır. Tasarım, backend'i olmayan (yalnız state) çalışan bir React prototipidir; bu doküman onu gerçek, çok kullanıcılı, Supabase destekli bir panoya dönüştürür.

### Bu sürümün kapsamı — Faz 1 (IN SCOPE)
- Görev CRUD: oluştur / düzenle / **arşivle** (soft-delete) + tamamlandı işaretleme.
- Liste: sekmeler (Tümü · Açık · Bugün · Gecikmiş · Bu Hafta · Rutinler · Tamamlanan), arama, kişi filtresi, sayfalama (10/sayfa), boş durum.
- İstatistik kartları: Açık Görev · Bugün Teslim · Gecikmiş · Tamamlanan.
- Öncelik (Yüksek/Orta/Düşük), son tarih (opsiyonel — boş = "bir gün"/backlog), atanan kişi + **Ortak Görev** (team) + **Devral**.
- **Tekrarlayan görevler:** günlük/haftalık/aylık/özel; tamamlanınca **bir sonraki tekrar otomatik üretilir** (spawn-next).
- Yeni `tasks` + `profiles` tabloları, tümünde RLS açık (`authenticated`).

### Kapsam DIŞI (ertelendi — sonraki sprintler)
- ~~Yorumlar + aktivite kaydı~~ → ✅ Sprint 4'te eklendi.
- **Dosya ekleri** (Supabase Storage) → **Sprint 5 (planlandı — bu doküman §3/§5).**
- **Dışa aktarma** (yalnız Excel; PDF/yazdırma yok) → **Sprint 6 (planlandı).**
- **Kenar çubuğu rozeti / Dashboard widget / gecikme bildirimi (GD-8)** → **ertelendi** (kullanıcı kararı: S6 yalnız export). Genel Dashboard ekranı henüz yok; sentetik e-posta ile e-posta bildirimi teslim edilemez.
- **Şube/Departman bazlı görev kapsamı + ince taneli RLS** → `branch-department-architecture` kararına bağlı; RLS şimdilik proje standardı `authenticated using(true)`.
- Test altyapısı / birim test kalemi eklenmez (proje tercihi).

---

## 2. Kararlar (Decisions)

| # | Karar | Gerekçe |
| --- | --- | --- |
| D1 | **Kimlik = Supabase auth; dizin = `profiles` tablosu.** "Ben" (Devral, yorum/aktivite yazarı) `session.user` / `auth.getUser()` + `user_metadata.display_name`'den gelir. Küçük, authenticated-okunabilir `profiles` tablosu (auth uid → görünen ad) trigger ile otomatik dolar; atama listesi ve diğer kullanıcıların ad/avatarını besler. | Tarayıcı `auth.users`'ı listeleyemez (service-role gerekir). Paralel bir auth icat edilmez — kimlikte tek kaynak Supabase. |
| D2 | **Atanan = `profiles`'a FK** (`assignee_id uuid`, nullable). `employees` değil (o saha personeli), serbest metin değil. | Canlı pano (tarihsel snapshot değil); FK temiz ad/avatar ve gerçek "ben" karşılaştırması verir. `station-dept-fk-vs-text` ile tutarlı. |
| D3 | **Gerçek `due_date date`, nullable.** `today`/`overdue`/etiket render'da (yerel TR tarihine göre) türetilir. `null` = backlog/"bir gün"; Bugün/Gecikmiş istatistiklerine **girmez**. | Tekrar + gecikme matematiği gerçek tarih ister; nullable gerçek bir backlog kovası verir. |
| D4 | **Faz 1 kapsamı = çekirdek pano + tekrar otomatik yeniden açılma.** Yorum+aktivite, dosya ekleri, dışa aktarma ertelendi. | Rutinler ekibin asıl değeri; gerisi eklemeli ve izole. |
| D5 | **Tekrar = spawn-next.** Tekrarlayan görev tamamlanınca o örnek "tamamlandı" kalır (Tamamlanan'da görünür) **ve bir sonraki örnek eklenir** (`due_date` kurala göre ilerler, `series_id` ile bağlanır). | "Bugünün rutini yapıldı" izini korur, taze bir örnek açılır. |
| D6 | **Silme = arşivleme (soft-delete).** `archived_at timestamptz`; "sil" bunu doldurur ve satırı gizler; liste sorguları `archived_at is null` süzer. Kalıcı silme yok. | Muhasebe için denetim dostu; `employees` `is_active` desenini yansıtır. |
| D7 | **Başlangıç rutin seti seed** (idempotent — yalnız `tasks` boşken). **Ortak görev** olarak (`is_team=true`, `assignee_id=null`), çünkü migration anında gerçek profil UUID'leri bilinmiyor. | Pano ilk günden faydalı; team sahipliği kullanıcı id'si gömmeyi önler. |
| D8 | **Ertelendi (şimdi yapılmaz):** şube/kategori kapsamı, per-branch ince taneli RLS, kenar çubuğu sayacı + Dashboard widget, gecikme bildirimi. RLS proje standardı kalır. | `auth-rls-live` ve LOGIN_FEATURE'ın ince taneli RLS ertelemesiyle uyumlu. Tasarım `station`/`category`'yi zaten göstermiyor. |
| D9 (S5) | **Dosya yükleme = anında Storage'a** (belleğe değil). `task_attachments.task_id` **nullable** → taslak yüklemeler; görev kaydedilince `task_id` bağlanır, diyalog kaydedilmeden kapanırsa taslak dosyalar (Storage nesnesi + satır) **silinir**. | Kullanıcı kararı: oluştururken de dosya eklenebilsin, belleği şişirmeden doğrudan kalıcı olsun. Ani tarayıcı kapanışında nadir orphan → sonradan temizlik işi (kabul edilir). |
| D10 (S5) | **Storage bucket private, 25 MB/dosya.** İndirme kısa ömürlü **signed URL** ile. | Finansal belgeler herkese açık olmamalı. Free plan: 1 GB depolama + 5 GB/ay egress dahil; aşımda ücret değil kota. 25 MB üst sınır kotayı korur. |
| D11 (S6) | **Export = yalnız Excel (filtrelenmiş liste).** PDF/yazdırma **yok** (kullanıcı kararı). Yeni bağımlılık yok (`xlsx` + `exportRowsToExcel` mevcut). GD-8 (rozet/widget/bildirim) ertelendi. | En düşük efor; tasarımdaki "PDF olarak yazdır" kaldırıldı — uygulama PDF çıktısı vermez. |
| D12 (S4.5) | **Bu Hafta = yalnız bu hafta due.** Açık + `dueDate` bugün→hafta sonu (Pzt–Paz). Gecikmiş kendi sekmesinde; backlog (null due) hariç. | Codex QA: "Bu Hafta" tüm açık listeyi gösteriyordu. Kullanıcı kararı. |
| D13 (S4.5) | **Aylık tekrar ay-sonu clamp.** Hedef ayda gün yoksa ayın son gününe sabitle (`31 Oca +1ay → 28 Şub`). | `setMonth` taşması ay-sonu muhasebe rutinlerini bozuyordu. |
| D14 (S4.5) | **Rutinler yalnız açık** tekrar görevleri; tamamlananlar **Tamamlanan**'da. | Spawn-next geçmişi Rutinler sekmesini şişirmesin. |
| D15 (S4.5) | **Tekrar duplicate guard:** `tasks(series_id, due_date)` partial unique index (açık & arşivsiz); `setTaskDone` `23505`'i yutar. | Eşzamanlı tamamlamada çift sonraki tekrarı önler. |
| D16 (S5) | **Ekler = private bucket + proje-standart RLS** (`authenticated using(true)`), owner-bazlı değil. Ayrıca **assignee seçici eklenmedi** (self/Ortak Görev/Devral korunur). | Küçük güvenli ekip; uygulamayla tutarlı. Kullanıcı kararları. |

### Enine kesen doğruluk notları (build'e dahil, ayrı kalem değil)
- **Yerel saat dilimi "bugün"** — today/overdue Türkiye yerel tarihinden hesaplanır, UTC değil (gece yarısına yakın "bugün" görevinin "gecikmiş"e dönmesini engeller).
- **TR-locale arama** — `EmployeesScreen` gibi `toLocaleLowerCase('tr')` (prototip düz `.toLowerCase()` kullanıyordu; İ/ı bozulur).
- **`updated_at` auto-touch trigger** — `tasks` üzerinde (sütun var; trigger ile sunucu tarafında güncellenir).
- **`display_name` backfill** — mevcut admin-açımı hesaplar metadata'da görünen ad taşımıyor olabilir (fallback `mehmet.coskun`); düzgün adları set etmek için tek seferlik adım.
- **Boş aktivite (H6)** — düzenle diyaloğunda Aktivite bölümü boşsa "Henüz aktivite yok." gösterilir; uygulama içi oluşturulan görevler zaten "görevi oluşturdu" kaydı alır (yalnız SQL-seed görevler boş başlar).

---

## 3. Veri Modeli

Migration: `supabase/create_task_notebook.sql`. RLS deseni `schema.sql` ile aynı (`for all to authenticated using(true) with check(true)`); okuma-yalnız `profiles` için `for select to authenticated`.

```sql
-- profiles: giriş yapan (ofis) kullanıcıların istemciden okunabilir dizini
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  display_name text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email,'@',1),
    coalesce(new.raw_user_meta_data->>'display_name',
             new.raw_user_meta_data->>'full_name',
             split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- mevcut hesaplar için tek seferlik backfill
insert into public.profiles (id, username, display_name)
select u.id, split_part(u.email,'@',1),
       coalesce(u.raw_user_meta_data->>'display_name',
                u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1))
from auth.users u on conflict (id) do nothing;

alter table profiles enable row level security;
drop policy if exists "Authenticated read profiles" on profiles;
create policy "Authenticated read profiles" on profiles
  for select to authenticated using (true);

-- tasks
create table if not exists tasks (
  id          bigint primary key generated always as identity,
  title       text not null,
  note        text not null default '',
  priority    text not null default 'Orta'
              constraint tasks_priority_check check (priority in ('Yüksek','Orta','Düşük')),
  due_date    date,                        -- null = backlog / "bir gün"
  done        boolean not null default false,
  done_at     timestamptz,
  is_team     boolean not null default false,
  assignee_id uuid references profiles(id) on delete set null,
  created_by  uuid references profiles(id) on delete set null,
  repeat_kind text not null default 'none'
              constraint tasks_repeat_check check (repeat_kind in ('none','daily','weekly','monthly','custom')),
  repeat_n    integer not null default 1,
  repeat_unit text not null default 'gün'
              constraint tasks_repeat_unit_check check (repeat_unit in ('gün','hafta','ay')),
  series_id   bigint,                      -- tekrar örneklerini gruplar
  archived_at timestamptz,                 -- soft-delete (D6)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table tasks enable row level security;
drop policy if exists "Authenticated full access" on tasks;
create policy "Authenticated full access" on tasks
  for all to authenticated using (true) with check (true);

-- updated_at'i taze tut
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists tasks_touch_updated on tasks;
create trigger tasks_touch_updated before update on tasks
  for each row execute function public.touch_updated_at();

-- başlangıç rutinleri seed (team-owned), yalnız tasks boşken (idempotent)
insert into tasks (title, priority, due_date, is_team, repeat_kind)
select v.title, v.priority, v.due_date, true, v.repeat_kind
from (values
  ('Günlük kasa mutabakatı',          'Yüksek', current_date,                                            'daily'),
  ('Pompa sayaç okuma kontrolü',      'Yüksek', current_date,                                            'daily'),
  ('POS & banka ekstresi eşleştirme', 'Orta',   current_date,                                            'daily'),
  ('Vardiya puantaj onayı',           'Orta',   current_date + 7,                                        'weekly'),
  ('KDV beyanname hazırlığı',         'Yüksek', date_trunc('month', current_date) + interval '1 month - 1 day', 'monthly'),
  ('SGK aylık bildirge hazırlığı',    'Yüksek', date_trunc('month', current_date) + interval '1 month - 1 day', 'monthly')
) as v(title, priority, due_date, repeat_kind)
where not exists (select 1 from tasks);
```

Öncelik/tekrar check değerleri Türkçe — proje konvansiyonu (`'Planlandı'`, `'Aktif'`, `'Geldi'`…) ile uyumlu.

### Yorumlar + aktivite (`supabase/create_task_collab.sql`, S4)

Görev başına yorum thread'i ve "kim ne yaptı" aktivite kaydı. Görev arşivlenince kalır; fiziksel silinirse cascade ile gider. RLS deseni tasks ile aynı (`for all to authenticated`).

```sql
create table if not exists task_comments (
  id         bigint primary key generated always as identity,
  task_id    bigint not null references tasks(id) on delete cascade,
  author_id  uuid references profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create table if not exists task_activity (
  id         bigint primary key generated always as identity,
  task_id    bigint not null references tasks(id) on delete cascade,
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,   -- 'görevi oluşturdu', 'yorum ekledi', 'tamamlandı olarak işaretledi' …
  created_at timestamptz not null default now()
);
-- her ikisinde: enable row level security + "Authenticated full access" (for all)
```

Aktivite **istemci tarafında** loglanır (`logTaskActivity`, best-effort — ana aksiyonu bloklamaz): oluştur / tamamla / yeniden aç / düzenle (team·devral·güncelle) / yorum ekle.

### Dosya ekleri (`supabase/create_task_attachments.sql`, S5 — planlandı)

Private `task-attachments` bucket (25 MB/dosya) + metadata tablosu. `task_id` **nullable**: taslak (henüz kaydedilmemiş görev) yüklemeleri `task_id=null` ile durur, kayıtta bağlanır, iptalde silinir. İndirme kısa ömürlü signed URL ile.

```sql
-- private bucket (25 MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 26214400)
on conflict (id) do nothing;

create table if not exists task_attachments (
  id           bigint primary key generated always as identity,
  task_id      bigint references tasks(id) on delete cascade,   -- null = taslak
  storage_path text not null,
  file_name    text not null,
  file_size    bigint not null default 0,
  mime_type    text,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists task_attachments_task_id_idx on task_attachments(task_id);
alter table task_attachments enable row level security;
-- "Authenticated full access" (for all) — tasks ile aynı desen
-- + storage.objects: authenticated select/insert/delete where bucket_id='task-attachments'
```

**db.ts (S5):** `uploadAttachment(taskId|null, file, uploadedBy)` (Storage'a yükle + satır) · `linkAttachments(ids, taskId)` (taslak→görev) · `fetchAttachments(taskId)` · `attachmentSignedUrl(path)` · `removeAttachment(id, path)` (Storage nesnesi + satır).

### TypeScript tipleri (`src/types/index.ts`)
`snake_case` (DB) ↔ `camelCase` (TS) eşlemesi `Employee`/`Shift` desenini izler.

```ts
export type TaskPriority = 'Yüksek' | 'Orta' | 'Düşük';
export type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type RepeatUnit = 'gün' | 'hafta' | 'ay';

export interface Profile {
  id: string;            // auth uid (uuid)
  username: string;
  displayName: string;
  isActive: boolean;
}

export interface Task {
  id: number;
  title: string;
  note: string;
  priority: TaskPriority;
  dueDate: string | null;      // YYYY-MM-DD
  done: boolean;
  doneAt: string | null;
  isTeam: boolean;
  assigneeId: string | null;   // profiles.id
  createdBy: string | null;
  repeatKind: RepeatKind;
  repeatN: number;
  repeatUnit: RepeatUnit;
  seriesId: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  authorId: string | null;   // profiles.id
  body: string;
  createdAt: string;
}

export interface TaskActivity {
  id: number;
  taskId: number;
  actorId: string | null;    // profiles.id
  action: string;            // 'görevi oluşturdu', 'yorum ekledi', …
  createdAt: string;
}
```

`ViewId` union'ına `'gorev'` eklenir.

---

## 4. Mimari ve Entegrasyon Noktaları (kodda doğrulandı)

- **Yönlendirme** — `src/App.tsx` durum makinesi (`view: ViewId`, `localStorage`'a yazılır). `ViewId`'a `'gorev'` + switch'e `case 'gorev':`.
- **Kenar çubuğu** — `src/components/layout/Sidebar.tsx` `NAV` dizisine `{ id: 'gorev', label: 'Görev Defteri', icon: 'checkSquare' }`.
- **Mevcut kullanıcı** — `session.user.id` (uuid) + `session.user.user_metadata?.display_name`; fallback `emailToUsername(session.user.email)`. Ekrana `currentUserId` + `profiles` geçilir.
- **UI bileşenleri** — gereken **13 bileşenin tamamı** `src/components/ui/` altında zaten var (Icon/Avatar/Button/Stat/Tabs/Dialog/Field/Select/EmptyState/Badge/DropdownButton; Input/Textarea/**SearchInput** → `Field.tsx`). Gerekli ikon adları + Stat tonları (`primary/late/absent/came`) mevcut. Tasarımın inline stilleri + `x-import`'ı, bu bileşenler + `src/index.css` sınıflarıyla **gerçek React olarak yeniden yazılır** — `.dc.html` bir spec, kopyalanacak kod değil.
- **Veri katmanı** — `src/lib/db.ts` per-entity deseni: row arayüzü + `toX()` mapper, `snake_case`↔`camelCase`, `if (error) throw error`.

---

## 5. Backlog

| ID | Başlık | Efor | Durum |
| --- | --- | --- | --- |
| GD-0 | Veri temeli — migration, RLS, seed, tipler, db.ts | M | ✅ |
| GD-1 | Yönlendirme + ekran iskeleti + veri yükleme | S | ✅ |
| GD-2 | Görev panosu (okuma) — istatistik, sekmeler, gruplama, arama, filtre, sayfalama | L | ✅ |
| GD-3 | Ekle/Düzenle/Arşivle + tamamlandı (yazma) | L | ✅ |
| GD-4 | Tekrarlayan görev otomatik yeniden açılma (spawn-next) | M | ✅ |
| GD-5 | Yorumlar + aktivite kaydı | M | ✅ |
| H1 | Aylık/`ay` tekrar ay-sonu clamp (`nextDueDate`) | S | ✅ |
| H2 | Bu Hafta = bu hafta due (filtre + gruplama) | S | ✅ kod |
| H3 | Tekrar duplicate guard (partial unique index + `23505` yut) | S | ✅ |
| H4 | Rutinler yalnız açık (filtre + sayaç) | S | ✅ kod |
| H5 | Kaydet/Ekle/Arşivle pending-disabled state | S | ✅ kod |
| H6 | Boş aktivite "Henüz aktivite yok." satırı | S | ✅ kod |
| GD-6 | Dosya ekleri (private Storage 25 MB; taslak-bağla/temizle; signed URL) | L | ✅ |
| GD-7 | Dışa aktarma — yalnız Excel (filtrelenmiş) | S | ✅ |
| GD-8 | Öne çıkarma (rozet/widget/bildirim, şube) | S | ⬜ ertelendi (kullanıcı kararı) |

**GD-4 tekrar mantığı:** `setTaskDone(id, true)` içinde `repeat_kind !== 'none'` ise, örnek tamamlandı işaretlendikten (`done=true`, `done_at=now()`) sonra bir sonraki örnek eklenir — title/priority/note/assignee/team/repeat kopyalanır, `done=false`, `series_id = series_id ?? id`, `due_date =` kurala göre sonraki tarih (`daily +1g`, `weekly +7g`, `monthly +1ay`, `custom +N birim`), tamamlanan `due_date`'e (yoksa bugüne) göre. Tamamlanan örnekler **Tamamlanan** sekmesinde kalır.

**GD-5 yorum/aktivite:** düzenle diyaloğu açılınca `fetchComments` + `fetchActivity` yüklenir. Yorum eklenince `task_comments`'a yazılır **ve** "yorum ekledi" aktivitesi loglanır. Diğer aksiyonlar (`createTask` → "görevi oluşturdu"; `setTaskDone` → "tamamlandı olarak işaretledi"/"görevi yeniden açtı"; düzenle → team/devral/güncelle) `logTaskActivity` ile en iyi çaba (best-effort) loglanır — aktivite yazımı başarısız olsa bile ana işlem bloklanmaz.

**GD-6 dosya ekleri (S5):** dosya seçilince **anında** Storage'a yüklenir + `task_attachments` satırı yazılır (yeni görevde `task_id=null` taslak). **Kaydet** → taslaklar `task_id`'ye bağlanır; **İptal/kapat** → taslak dosyalar (Storage nesnesi + satır) silinir. Düzenlemede yüklemeler doğrudan bağlıdır; **kaldır** → hemen silinir. İndirme private bucket'tan kısa ömürlü signed URL ile. Not: ani tarayıcı kapanışı taslak orphan bırakabilir → ileride basit temizlik işi.

**GD-7 dışa aktarma (S6):** `Dışa Aktar` butonu → **yalnız Excel.** O an filtrelenmiş/görünen liste `exportRowsToExcel` ile `.xlsx` (Görev / Atanan / Öncelik / Son Tarih / Durum / Tekrar). **PDF/yazdırma yok** (kullanıcı kararı) — `window.print`/`@media print` **eklenmez**. Tek aksiyon olduğundan `DropdownButton` yerine düz buton yeterli.

---

## 6. Sprint Planı

Tek geliştirici; "sprint" = takvim değil, **teslim edilebilir artış** (efor S/M/L). Her sprint yeşil biter: `tsc -b` temiz + doğrulama adımları geçer. S1→S2→S3 sıralı (Faz 1); sonraki sprintler bağımsızdır.

| Sprint | Kalemler | Boyut | Hedef / teslim |
| --- | --- | --- | --- |
| ✅ **S1 · Temel + tesisat** | GD-0 + GD-1 | M | Tablolar + seed canlı; ekrana erişilir ve gerçek veri yüklenir |
| ✅ **S2 · Okuma panosu** | GD-2 | L | Tasarımdaki okuma-yalnız pano tam |
| ✅ **S3 · Yazma + tekrar** ➡️ *Faz 1 çıktı* | GD-3 + GD-4 | L | Tam işlevsel ortak pano; günlük rutin tamamlanınca yarınki kopya üretilir |
| ✅ **S4 · İşbirliği** | GD-5 | M | Yorum thread + aktivite akışı |
| ⬜ S5 · Ekler | GD-6 | L | Private Storage bucket + RLS + `task_attachments`; anında yükle, taslak→bağla / iptalde temizle, signed URL indir/kaldır |
| ⬜ S6 · Dışa aktarma | GD-7 | S–M | Excel (filtrelenmiş) + tarayıcı yazdırma. GD-8 (öne çıkarma) ertelendi |

**Kritik yol:** S1 → S2 → S3 onaylı ürünü verir. S1–S3, ertelenen sprintlere bağlı değildir → Faz 1 çıkıp stabil kalabilir.

---

## 7. Doğrulama (faz başına, uçtan uca)

1. **GD-0:** migration Supabase MCP ile uygulanır; `list_tables` `profiles`/`tasks` gösterir; `get_advisors` temiz; backfill her giriş kullanıcısı için bir `profiles` satırı oluşturur; **6 seed team rutini** mevcut; anon sorgu → 0 satır.
2. **Uygulama:** `npm run dev`, giriş, kenar çubuğundan **Görev Defteri** (`preview_*` ile). `tsc -b` temiz.
3. **GD-2/3:** görev oluştur (son tarihli ve tarihsiz) → liste + istatistik güncellenir; öncelik/tarih/atama düzenle; **Devral** bana atar; **Ortak Görev** team ikonu gösterir; kişi filtresi çipi; sekmeler (Bugün/Gecikmiş/Bu Hafta/Rutinler) yerel tarihe göre doğru gruplanır; arama + sayfalama; **arşivle-onay satırı gizler (`archived_at` set, satır kalır)**. Supabase'de satırlar `execute_sql` ile doğrulanır.
4. **GD-4:** günlük seed rutini tamamla → **Tamamlanan**'a geçer ve `due_date = +1 gün`, aynı `series_id` ile yeni örnek belirir; iki satır kontrol edilir.
5. **GD-5 (yorum/aktivite):** görevi düzenle → yorum yaz + **Ekle** → yorum kartı (ad/avatar/göreli zaman) belirir ve **Aktivite**'ye "yorum ekledi" düşer; `task_comments`/`task_activity` satırları `execute_sql` ile doğrulanır.
6. **RLS:** oturumsuz istek 0 satır; oturumlu tam erişim — `auth-rls-live` ile tutarlı.
7. **GD-6 (S5):** yeni görevde dosya seç → Storage'a yüklenir (taslak, `task_id=null`); **Kaydet** → dosya göreve bağlanır ve indirme (signed URL) çalışır. Ayrı bir yeni görevde dosya seç → **İptal** → taslak dosya silinir (Storage nesnesi + satır 0). Düzenlemede **kaldır** → hemen silinir. Storage + `task_attachments` `execute_sql`/panelde doğrulanır.
8. **GD-7 (S6):** bir filtre uygula → **Dışa Aktar** → inen `.xlsx` yalnız filtrelenmiş satırları içerir. (PDF/yazdırma yok.)

### Sprint 4.5 (QA sertleştirme) doğrulama
9. **H1:** 31'inde due aylık görevi tamamla → sonraki örnek hedef ayın son günü (`31 Oca → 28 Şub`) olur — satır kontrol.
10. **H2:** Bu Hafta yalnız Bugün/Yarın/bu hafta kalanını gösterir; `31 Tem` ve gecikmişler görünmez.
11. **H3:** index uygulandıktan sonra aynı rutini iki sekmede hızlı tamamla → tam olarak tek sonraki örnek.
12. **H4:** günlük rutini tamamla → Rutinler'den çıkar, Tamamlanan'da görünür; Rutinler sayacı düşer.
13. **H5:** Kaydet/Ekle'ye hızlı çift tık → tek görev/yorum oluşur.
14. **H6:** seed görevi aç → "Henüz aktivite yok." görünür.

---

## 8. Dosyalar

| Dosya | Değişiklik | Durum |
| --- | --- | --- |
| `supabase/create_task_notebook.sql` | profiles + trigger/backfill + tasks + RLS + updated_at trigger + seed | mevcut (S1) |
| `supabase/create_task_collab.sql` | task_comments + task_activity + RLS | mevcut (S4) |
| `supabase/harden_task_recurrence.sql` | `tasks(series_id, due_date)` partial unique index | mevcut (S4.5) |
| `supabase/create_task_attachments.sql` | `task-attachments` bucket (private, 25 MB) + `task_attachments` tablosu + RLS (storage.objects dahil) | mevcut (S5) |
| `src/types/index.ts` | `Task`/`Profile`/… + `TaskComment`/`TaskActivity`; `TaskAttachment`; `ViewId` += `'gorev'` | mevcut; `TaskAttachment` planlandı (S5) |
| `src/lib/db.ts` | tasks/profiles CRUD + yorum/aktivite; ay-sonu clamp (H1) + tekrar guard (H3); dosya ekleri (S5) + mapper'lar | mevcut; H1/H3 + ekler planlandı |
| `src/lib/excel.ts` | `exportRowsToExcel` GD-7'de yeniden kullanılır | mevcut |
| `src/App.tsx` | veri yükle; `currentUserId`; `case 'gorev'`; handler'lar; düzenlemede aktivite loglar | mevcut |
| `src/components/layout/Sidebar.tsx` | NAV girişi | mevcut |
| `src/components/tasks/TaskNotebookScreen.tsx` | pano (GD-1/2/3/4); Bu Hafta/Rutinler düzeltmesi (H2/H4); Dışa Aktar (GD-7) | mevcut; H2/H4 + export planlandı |
| `src/components/modals/TaskModal.tsx` | ekle/düzenle (GD-3) + yorum/aktivite (GD-5); pending (H5) + boş aktivite (H6); dosya ekleri (GD-6) | mevcut; H5/H6 + ekler planlandı |
| `src/index.css` | göreve özel sınıflar | mevcut |
| `FEATURE_TASKBOOK.md` | yaşayan spec/durum | bu dosya |
