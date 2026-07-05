# Görev Defteri — Ortak Görev / Yapılacaklar Takibi (Task Notebook)

Son güncelleme: 2026-07-05
Durum: **FAZ 1 TAMAMLANDI** — Sprint 1–3 tamamlandı ve uçtan uca doğrulandı (canlı DB'de). Çekirdek görev panosu + tekrarlayan rutinler canlıya hazır. Sonraki (ertelenen): S4 Yorum/Aktivite · S5 Dosya ekleri · S6 Dışa aktarma + öne çıkarma.

İlerleme notu:
- ✅ **Sprint 1 (Temel + tesisat):** `create_task_notebook.sql` (profiles + tasks + RLS + seed) canlıya uygulandı ve sertleştirildi (advisor temiz); tipler, `db.ts` veri katmanı, yönlendirme/menü + ekran iskeleti. `tsc` temiz. Doğrulandı: 6 seed rutini listelendi, tamamlandı işaretleme + tekrar üretimi (spawn-next: görev 1 → yarına yeni örnek) çalıştı; test artefaktı temizlendi.
- ✅ **Sprint 2 (Okuma panosu):** istatistik kartları, sayaçlı sekmeler, Rutinler/Bu Hafta gruplama, arama (tr-locale), kişi filtresi çipi, sayfalama, boş durum. `tsc` temiz. Doğrulandı: istatistikler (Açık 6/Bugün 3/Gecikmiş 0), sekme sayaçları, Rutinler (Günlük 3/Haftalık 1/Aylık 2) + Bu Hafta (Bugün 3/İleri 3) gruplama, arama, boş durum. (Kişi filtresi + sayfalama seed all-team & <10 olduğu için Sprint 3'te canlı test edilecek.)
- ✅ **Sprint 3 (Yazma + tekrar):** TaskModal (ekle/düzenle), başlık/öncelik/tarih/tekrar/not, Ortak Görev + Devral, arşivle (onaylı soft-delete), satır→düzenle, Görev Ekle butonu. `tsc` temiz. Doğrulandı: oluştur (kişiye atanmış), kişi filtresi çipi, düzenle (öncelik + team toggle; updated_at trigger tetiklendi), arşivle (gizlendi, kayıt korundu), sayfalama (12 görev → Sayfa 1/2 → Sonraki). Test verisi temizlendi. (Devral tek kullanıcı olduğu için canlı test edilemedi; ≥2 kullanıcıda çalışır.) → **Faz 1 canlıya hazır.**
- ⬜ **Sonraki (ertelenen):** Sprint 4 Yorum + Aktivite · Sprint 5 Dosya ekleri (Storage) · Sprint 6 Dışa aktarma + öne çıkarma.

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
- **Yorumlar + aktivite kaydı** → Sprint 4.
- **Dosya ekleri** (Supabase Storage) → Sprint 5.
- **Dışa aktarma** (Excel/PDF) → Sprint 6.
- **Kenar çubuğu görev sayacı rozeti / Dashboard "bekleyen görevler" widget'ı / gecikme bildirimi** → Sprint 6.
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

### Enine kesen doğruluk notları (build'e dahil, ayrı kalem değil)
- **Yerel saat dilimi "bugün"** — today/overdue Türkiye yerel tarihinden hesaplanır, UTC değil (gece yarısına yakın "bugün" görevinin "gecikmiş"e dönmesini engeller).
- **TR-locale arama** — `EmployeesScreen` gibi `toLocaleLowerCase('tr')` (prototip düz `.toLowerCase()` kullanıyordu; İ/ı bozulur).
- **`updated_at` auto-touch trigger** — `tasks` üzerinde (sütun var; trigger ile sunucu tarafında güncellenir).
- **`display_name` backfill** — mevcut admin-açımı hesaplar metadata'da görünen ad taşımıyor olabilir (fallback `mehmet.coskun`); düzgün adları set etmek için tek seferlik adım.

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
| GD-5 | Yorumlar + aktivite kaydı *(ertelendi)* | M | ⬜ |
| GD-6 | Dosya ekleri (Supabase Storage) *(ertelendi)* | L | ⬜ |
| GD-7 | Dışa aktarma (Excel/PDF) *(ertelendi)* | S–M | ⬜ |
| GD-8 | Öne çıkarma + kapsam (rozet, widget, bildirim, şube) *(ertelendi)* | S | ⬜ |

**GD-4 tekrar mantığı:** `setTaskDone(id, true)` içinde `repeat_kind !== 'none'` ise, örnek tamamlandı işaretlendikten (`done=true`, `done_at=now()`) sonra bir sonraki örnek eklenir — title/priority/note/assignee/team/repeat kopyalanır, `done=false`, `series_id = series_id ?? id`, `due_date =` kurala göre sonraki tarih (`daily +1g`, `weekly +7g`, `monthly +1ay`, `custom +N birim`), tamamlanan `due_date`'e (yoksa bugüne) göre. Tamamlanan örnekler **Tamamlanan** sekmesinde kalır.

---

## 6. Sprint Planı

Tek geliştirici; "sprint" = takvim değil, **teslim edilebilir artış** (efor S/M/L). Her sprint yeşil biter: `tsc -b` temiz + doğrulama adımları geçer. S1→S2→S3 sıralı (Faz 1); sonraki sprintler bağımsızdır.

| Sprint | Kalemler | Boyut | Hedef / teslim |
| --- | --- | --- | --- |
| **S1 · Temel + tesisat** | GD-0 + GD-1 | M | Tablolar + seed canlı; ekrana erişilir ve gerçek veri yüklenir |
| **S2 · Okuma panosu** | GD-2 | L | Tasarımdaki okuma-yalnız pano tam |
| **S3 · Yazma + tekrar** ➡️ *Faz 1 çıkar* | GD-3 + GD-4 | L | Tam işlevsel ortak pano; günlük rutin tamamlanınca yarınki kopya üretilir |
| S4 · İşbirliği | GD-5 | M | Yorum thread + aktivite akışı |
| S5 · Ekler | GD-6 | L | Storage bucket + RLS + `task_attachments`; yükle/listele/kaldır |
| S6 · Dışa aktarma + öne çıkarma | GD-7 + GD-8 | M | Excel/PDF; rozet, Dashboard widget, gecikme bildirimi |

**Kritik yol:** S1 → S2 → S3 onaylı ürünü verir. S1–S3, ertelenen sprintlere bağlı değildir → Faz 1 çıkıp stabil kalabilir.

---

## 7. Doğrulama (faz başına, uçtan uca)

1. **GD-0:** migration Supabase MCP ile uygulanır; `list_tables` `profiles`/`tasks` gösterir; `get_advisors` temiz; backfill her giriş kullanıcısı için bir `profiles` satırı oluşturur; **6 seed team rutini** mevcut; anon sorgu → 0 satır.
2. **Uygulama:** `npm run dev`, giriş, kenar çubuğundan **Görev Defteri** (`preview_*` ile). `tsc -b` temiz.
3. **GD-2/3:** görev oluştur (son tarihli ve tarihsiz) → liste + istatistik güncellenir; öncelik/tarih/atama düzenle; **Devral** bana atar; **Ortak Görev** team ikonu gösterir; kişi filtresi çipi; sekmeler (Bugün/Gecikmiş/Bu Hafta/Rutinler) yerel tarihe göre doğru gruplanır; arama + sayfalama; **arşivle-onay satırı gizler (`archived_at` set, satır kalır)**. Supabase'de satırlar `execute_sql` ile doğrulanır.
4. **GD-4:** günlük seed rutini tamamla → **Tamamlanan**'a geçer ve `due_date = +1 gün`, aynı `series_id` ile yeni örnek belirir; iki satır kontrol edilir.
5. **RLS:** oturumsuz istek 0 satır; oturumlu tam erişim — `auth-rls-live` ile tutarlı.

---

## 8. Dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `supabase/create_task_notebook.sql` | **yeni** — profiles + trigger/backfill + tasks + RLS + updated_at trigger + seed |
| `src/types/index.ts` | `Task`/`Profile`/`TaskPriority`/`RepeatKind`/`RepeatUnit`; `ViewId` += `'gorev'` |
| `src/lib/db.ts` | profiles + tasks CRUD (`archiveTask`, `setTaskDone` tekrarlı) + mapper'lar |
| `src/App.tsx` | profiles+tasks yükle; `currentUserId`; `case 'gorev'`; prop/handler geç |
| `src/components/layout/Sidebar.tsx` | NAV girişi |
| `src/components/tasks/TaskNotebookScreen.tsx` | **yeni** — pano (GD-1/2/3/4) |
| `src/components/modals/TaskModal.tsx` | **yeni** — ekle/düzenle diyaloğu (GD-3) |
| `src/index.css` | göreve özel sınıflar |
| `FEATURE_TASKBOOK.md` | **bu dosya** — yaşayan spec/durum |
