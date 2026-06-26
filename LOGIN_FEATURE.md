# Login Feature — Kimlik Doğrulama (Authentication)

Son güncelleme: 2026-06-27
Durum: **Faz 1 tamam** (client kodu yazıldı + yerelde doğrulandı) · **Faz 2 bekliyor** (canlı RLS + kullanıcı provisioning)

İlerleme notu:
- ✅ Faz 1: `supabase.ts` auth helper'ları, `LoginScreen.tsx` (tasarımdan port), `App.tsx` session
  gate, `Sidebar.tsx` çıkış, `schema.sql` RLS bloğu (yazıldı, canlıya UYGULANMADI). Tip kontrolü
  temiz; yerelde doğrulandı (login render, boş-alan hataları, yanlış kimlik → genel hata, Göster/Gizle).
- ✅ **Watermark görseli:** `public/coskun-petrol-watermark.png` eklendi (şeffaf zeminli beyaz logo).
  Mavi gradient üstünde yerelde doğrulandı. (Not: 314 KB / 1448×1086 — istenirse sonradan küçültülebilir.)
- ⏳ Faz 2: kullanıcı oluştur (Auto Confirm!) → deploy → canlı RLS'i Supabase MCP ile aç → doğrula.

Bu dosya, dağıtımdaki (Vercel) uygulamaya kullanıcı adı + parola ile giriş özelliği eklenmesinin
spesifikasyonunu ve uygulama adımlarını tanımlar.

---

## 1. Amaç ve Kapsam

Uygulama şu anda Vercel'de **canlı** ve Supabase'e doğrudan tarayıcıdan erişiyor. Tüm tablolarda
**RLS (Row Level Security) kapalı** ve `VITE_SUPABASE_ANON_KEY` tarayıcı paketine gömülü (tasarım
gereği herkese açık). Sonuç: **siteye ulaşan herkes tüm veritabanını okuyup yazabiliyor.** Bu özelliğin
birincil amacı bu açığı kapatmaktır.

### Bu sürümün kapsamı (IN SCOPE)
- Kullanıcı adı + parola ile giriş ekranı.
- Sadece kimliği doğrulanmış (authenticated) kullanıcılar uygulamaya erişebilir.
- 8 public tablonun tamamında RLS açık + "authenticated full access" politikası → giriş yapmamış istek
  hiçbir satır döndürmez / yazamaz.
- Oturum (session) yönetimi: kalıcı oturum, otomatik JWT yenileme (supabase-js hallediyor).
- Çıkış (sign-out) kontrolü.

### Kapsam DIŞI (deferred — sonraki işler)
- **Rol/yetki sistemi** (admin / yönetici / görüntüleyici). → Şube→Departman mimarisi ile birlikte.
- **Şube/Departman bazlı satır filtreleme (per-tenant RLS).** → `branch-department-architecture`
  kararına bağlı; temel tenant sınırı oturmadan ince taneli politika yazılmayacak.
- E-posta tabanlı parola sıfırlama / magic link / OAuth. → Senthetik e-posta nedeniyle gerekmez;
  parola sıfırlama admin tarafından dashboard'dan yapılır.
- Vercel Functions / sunucu tarafı auth. → Vite SPA + client-side Supabase Auth yeterli.
- Yeni npm paketi. → `@supabase/supabase-js` zaten kurulu.

---

## 2. Kararlar (Decisions)

| Konu | Karar | Gerekçe |
| --- | --- | --- |
| Giriş yöntemi | Kullanıcı adı + parola | Personel için e-posta UX'i gereksiz; tek alan daha basit |
| Kullanıcı adı → kimlik | **Sentetik e-posta**: `<kullanıcıadı>@coskunpetrol.com.tr` | Supabase Auth e-posta tabanlı; kullanıcı adını içeride e-postaya çeviriyoruz |
| Kayıt (sign-up) | **Kapalı** | İç araç; hesaplar admin tarafından dashboard'dan açılır |
| Enforcement | Tüm tablolarda RLS açık + `to authenticated using(true)` | Giriş ekranı tek başına kozmetiktir; gerçek koruma RLS'tir |
| Parola sıfırlama | **Yalnızca admin** (Supabase dashboard); uygulama içi değiştirme YOK | Sentetik domain → e-posta reset yok; az kişi + idari personel için admin reset yeterli |
| Oturum kalıcılığı ("Beni Hatırla") | **Her zaman hatırla** (Supabase varsayılanı, `localStorage`); kutu YOK | Kullanıcılar idari personel + kişisel/ofis makineleri; paylaşımlı terminal yok → konfor güvenlikten ağır basar |
| Hareketsizlik zaman aşımı (inactivity timeout) | **Yok** | Aynı gerekçe; idari personel güvenilir cihazlarda |
| Canlı RLS uygulaması | Supabase MCP ile, yerel testten sonra | Önce local doğrula, sonra canlıya uygula |
| Yeni bağımlılık | Yok | supabase-js yeterli |

### 2.1 Sentetik e-posta deseni

- Personele kullanıcı adı verilir: örn. `mert`.
- Veritabanında `mert@coskunpetrol.com.tr` olarak saklanır.
- Personel giriş ekranında **sadece** `mert` yazar; uygulama domaini kendisi ekler.
- `@coskunpetrol.com.tr` gerçek bir posta kutusu **değildir** — sadece kimlik anahtarıdır.
- Domain suffix tek bir yerde (helper) sabit tutulur → ileride değişirse tek nokta.
- **Kullanıcı adı kuralı:** yalnızca ASCII küçük harf/rakam/nokta (`mert`, `mehmet.coskun`) —
  **Türkçe harf/boşluk yok**. Sebep: `.toLowerCase()` locale-bağımsızdır; `İ/I/ı` beklenmedik
  karaktere dönüşüp e-posta eşleşmesini bozabilir. Hesaplar dashboard'da da bu kurala göre açılır.

> **Not:** Sentetik e-posta gerçek inbox olmadığı için e-posta doğrulama / parola sıfırlama
> akışları çalışmaz. Bu bir hata değil, bilinçli tercih: parola sıfırlama admin tarafından yapılır.

### 2.2 Oturum kalıcılığı ("Beni Hatırla")

Ayrı bir "Beni Hatırla" kutusu **eklenmeyecek**. supabase-js varsayılanı zaten oturumu `localStorage`'da
kalıcı tutar ve token'ı otomatik yeniler (`persistSession: true`, `autoRefreshToken: true`) → kullanıcı
tarayıcıyı kapatıp açsa bile **"Çıkış" diyene kadar giriş yapmış kalır**.

- **Gerekçe:** Uygulamayı kullananlar **idari personel**, kişisel/ofis makineleri kullanıyor; paylaşımlı
  istasyon terminali senaryosu yok. Bu nedenle kalıcı oturum konforu, ek güvenlik karmaşasından
  (özel storage adapter, inactivity timeout) daha değerli.
- **Hareketsizlik zaman aşımı eklenmeyecek.**
- **İleride değişirse:** Kullanım paylaşımlı terminallere kayarsa, `localStorage`↔`sessionStorage`
  arasında geçiş yapan bir "Beni Hatırla" kutusu + Supabase session timeout sonradan eklenebilir
  (bkz. §9 Sonraki İşler).

---

## 3. RLS ve Geliştirme Etkisi

Başlangıç politikası **izin verici (permissive)**:
`for all to authenticated using (true) with check (true)` = "giriş yapmış her kullanıcı her şeyi
yapabilir". Uygulama girişten sonra **her zaman bir oturuma sahip** olduğundan günlük geliştirme
deneyimi bugünküyle **birebir aynı** kalır. Satır bazlı mantık / sorgu yeniden yazımı **yok**.

- **Service role key** RLS'i tamamen baypas eder → SQL seed dosyaları ve gelecekteki admin/migration
  script'leri etkilenmez (SQL editöründe service role ile çalışır).
- Değişen tek şey: **oturumsuz** istek 0 satır alır — açığı kapatan davranış budur.
- İnce taneli RLS karmaşıklığı (şube/departman filtreleme) bu sürümde **YOK**; `branch-department-architecture`
  işine ertelendi.

---

## 4. Mimari ve Veri Akışı

```
Uygulama açılışı
  └─ getCurrentSession()
       ├─ oturum YOK  → <LoginScreen />  (veri çekilmez)
       │                   └─ signInWithUsername(username, password)
       │                        └─ supabase.auth.signInWithPassword({ email: user@domain, password })
       │                             └─ onAuthStateChange → session set → veri load()
       └─ oturum VAR  → load()  → mevcut uygulama
```

- Oturum durumu `App.tsx` içinde tutulur.
- Mevcut veri `load()` effect'i, **oturum varlığına bağlı** hale getirilir (girişten önce fetch yok).
- `onAuthStateChange` aboneliği login/logout'u reload olmadan yansıtır.

---

## 5. Uygulama Adımları (Implementation Plan)

### A. Veritabanı — Supabase (gerçek koruma)
1. **Kullanıcıları aç:** Authentication → Users → personel hesapları `kullanıcıadı@coskunpetrol.com.tr`
   e-posta + parola ile oluştur.
   - ⚠️ **"Auto Confirm User" mutlaka işaretli olmalı.** İşaretlenmezse e-posta "doğrulanmamış"
     kalır ve giriş `Email not confirmed` hatası verir; sentetik domain doğrulama linki alamaz.
   - Kullanıcı adları **ASCII küçük harf** (bkz. §2.1 kuralı).
2. **Kayıt kapat:** Auth → Providers → Email → "Enable sign-ups" kapat.
3. **RLS aç + politika** — **8 public tablo**: çekirdek 5 (`stations`, `departments`, `roles`,
   `employees`, `shifts`) → `supabase/schema.sql`; satış 3 (`sales_import_configs`,
   `sales_daily_reports`, `sales_import_runs`) → `supabase/create_sales_dashboard.sql`. Her ikisi de
   güncellendi **ve** canlı DB'ye Supabase MCP ile uygulanacak:
   ```sql
   alter table <tablo> enable row level security;
   create policy "Authenticated full access" on <tablo>
     for all to authenticated using (true) with check (true);
   ```

### B. Auth yardımcıları — `src/lib/supabase.ts`
4. İnce sarmalayıcılar ekle:
   - `const AUTH_EMAIL_DOMAIN = 'coskunpetrol.com.tr';`
   - `usernameToEmail(username): string` → `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
   - `emailToUsername(email): string` → `@domain` kısmını soyar (UI'da göstermek için)
   - `signInWithUsername(username, password)`
   - `signOut()`
   - `getCurrentSession()`
   - `onAuthChange(cb)` (supabase `onAuthStateChange` re-export)

### C. Giriş ekranı — `src/components/auth/LoginScreen.tsx` (YENİ)

**Görsel kaynak:** Ekran claude.ai/design'da tasarlandı — proje `82cf4abd-0b46-43f5-9291-9485e2b4167f`,
`templates/giris/Giris.dc.html`. `.dc.html` çalışan kod değil; gerçek `src/components/ui` kit'iyle
(Field/Input, Button, Icon) + `index.css` token'larıyla **sadık port** olarak yeniden yazılacak.

5. Tasarımdan port edilecek görünüm:
   - Tam ekran **animasyonlu mavi gradient** arka plan (`giris-bg` keyframe).
   - Ortada **buzlu cam (glassmorphism)** kart (`backdrop-filter: blur`, yarı saydam beyaz, yumuşak
     gölge), girişte hafif `giris-card-in` animasyonu. max-width ~404px.
   - Alanlar: **Kullanıcı Adı** (`Input`), **Şifre** (`Input`) + yanında **Göster/Gizle** toggle'ı.
   - Submit → `signInWithUsername`; boş alanda Türkçe hata ("Kullanıcı adınızı girin" / "Şifrenizi girin").
   - Hatalı kimlikte **tek genel mesaj**: "Kullanıcı adı veya şifre hatalı." (hangisinin yanlış olduğu
     ayrılmaz — güvenlik). Supabase'in İngilizce hatası ("Invalid login credentials") bu mesaja çevrilir.
   - **"Şifremi unuttum" linki YOK**; yerine küçük not: "Şifrenizi unuttuysanız yöneticinize başvurun."
   - **Yükleniyor** durumu: butonda spinner + "Giriş yapılıyor…"; başarıda "Giriş başarılı!…" + check ikonu.
   - Enter ile gönderme.
   - Altta **Coşkun Petrol watermark** görseli (`public/`'ten).
   - **"Beni hatırla" yok** — tasarımdan da kaldırıldı (2026-06-27), §2.2 kararıyla uyumlu.

### D. Oturum kapısı — `src/App.tsx`
6. `session` state ekle.
   - Mount'ta `getCurrentSession()` + `onAuthChange` aboneliği.
   - Render mantığı:
     - oturum kontrol ediliyor → mevcut "Yükleniyor…" ekranı
     - oturum yok → `<LoginScreen />`
     - oturum var → mevcut `load()` çalışır, uygulama render edilir.
   - Mevcut `load()` effect'i oturum varlığına bağlanır (girişten önce fetch yok).
   - **Oturum ortada düşerse** (`onAuthStateChange` → `SIGNED_OUT`; token yenileme başarısız):
     bellekteki `employees/shifts/...` temizlenir ve login ekranına dönülür (eski verinin
     bir an görünmesini engeller).

### E. Çıkış kontrolü — `src/components/layout/Sidebar.tsx`
7. `<aside>` içine `<nav>` altına bir alt bölüm (footer):
   - Kullanıcı adı gösterilir (`session.user.email` → `emailToUsername`).
   - "Çıkış" butonu → `signOut()`.
   - `Sidebar`'a `username` ve `onSignOut` props eklenir; `App.tsx`'ten geçilir.

### F. Doğrulama (Verify)
8. `npm run dev`:
   - (a) çıkış yapılmış → giriş ekranı görünür; DB hiçbir şey döndürmez.
   - (b) yanlış parola → hata mesajı.
   - (c) doğru giriş → veri yüklenir, uygulama açılır.
   - (d) çıkış → giriş ekranına döner.
9. Yerel test geçince: canlı DB'de RLS'i Supabase MCP ile aç, kullanıcıları oluştur, redeploy.

---

## 6. Etkilenecek Dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `supabase/schema.sql` | RLS aç + 5 çekirdek politika |
| `supabase/create_sales_dashboard.sql` | RLS aç + 3 satış tablosu politikası |
| `src/lib/supabase.ts` | Auth yardımcıları + domain sabiti |
| `src/components/auth/LoginScreen.tsx` | **YENİ** giriş ekranı (claude.ai/design `templates/giris`'ten port) |
| `public/coskun-petrol-watermark.png` | **YENİ** — tasarım projesinden indirilecek watermark görseli |
| `public/coskun-petrol-logo.png` | **YENİ** — tasarım projesinden indirilecek logo (kullanılırsa) |
| `src/App.tsx` | Oturum kapısı; `load()` oturuma bağlanır |
| `src/components/layout/Sidebar.tsx` | Kullanıcı adı + Çıkış butonu |

Yaklaşık: 1 yeni bileşen + 2 görsel + 3 mevcut dosyada düzenleme + SQL. Yeni paket yok, Vercel Functions yok.

---

## 7. Güvenlik Notları

- **RLS olmadan giriş ekranı kozmetiktir.** İkisi aynı değişiklikte yapılmalı; aksi halde JS'i baypas
  eden biri anon key ile DB'ye erişmeye devam eder.
- Anon key'in tarayıcı paketinde herkese açık olması **beklenen** durumdur; koruma RLS'tedir.
- Yeni OAuth gizli anahtarı **yok** → ek Vercel env değişkeni gerekmez (mevcut
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` yeterli).
- Sentetik e-posta domaini gerçek posta kutusu olmadığından magic link/şifre sıfırlama gönderilmez;
  parola yönetimi admin'dedir.

---

## 8. Riskler ve Kenar Durumlar

- **Auto-confirm atlanırsa giriş kilitlenir:** kullanıcı "Auto Confirm" olmadan oluşturulursa
  `Email not confirmed` ile giriş yapılamaz ve sentetik domain doğrulama linki alamaz → dashboard'dan
  manuel onay gerekir. Provisioning'de mutlaka işaretle.
- **Mevcut canlı kullanım kesintisi:** RLS açılınca giriş yapmamış oturumlar veri göremez. Canlı RLS
  geçişi, kullanıcılar oluşturulduktan sonra yapılmalı (yoksa uygulama "boş" görünür).
- **Service role script'leri:** seed/migration script'leri service role ile çalıştığından etkilenmez;
  ama anon key ile DB'ye giden herhangi bir yardımcı script artık 0 satır alır (mevcutta yok).
- **StrictMode çift effect:** `onAuthChange` aboneliği cleanup ile düzgün kaldırılmalı (dev'de çift
  mount).
- **Önbellekteki eski oturum:** localStorage'daki süresi dolmuş token → supabase-js otomatik yeniler;
  yenileme başarısızsa `onAuthStateChange` `SIGNED_OUT` döndürür → giriş ekranı.

---

## 9. Sonraki İşler (bu özellikten sonra)

- Rol/yetki katmanı (admin/yönetici/görüntüleyici) — Şube→Departman mimarisi ile.
- Per-branch/per-department RLS politikaları (`auth.uid()` tabanlı) — tenant sınırı oturunca.
- "Beni Hatırla" kutusu + oturum/inactivity timeout — yalnızca kullanım paylaşımlı terminallere kayarsa.
- Uygulama içi "Şifre Değiştir" (`updateUser`, e-posta gerektirmez) — kullanıcı sayısı artarsa veya
  self-service istenirse.
