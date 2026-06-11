# Proje Bağlamı

## İşletme

İki istasyonlu (Ümraniye, Şile) bir akaryakıt şirketi. Her istasyonun iki departmanı var: Akaryakıt ve Market. Toplam ~26 aktif personel dört grup oluşturur.

Vardiya kontrolleri bir gün gecikmeli yapılır — 11 Haziran'ın devam kontrolü 12 Haziran'da gerçekleşir. Bu yüzden Günlük Kontrol ekranı varsayılan olarak dünü gösterir.

---

## Veri Modeli

### `employees` tablosu

| Kolon | Tip | Açıklama |
|---|---|---|
| id | bigint PK | Otomatik artan |
| name | text | Ad soyad |
| station | text | `Ümraniye` \| `Şile` |
| dept | text | `Akaryakıt` \| `Market` |
| role | text | `Pompacı` \| `Vardiya Amiri` \| `Market Görevlisi` \| `Kasiyer` |
| status | text | `Aktif` \| `Pasif` |
| team | integer | Ekip indeksi (şu an -1, gelecekte kullanılabilir) |
| codes | text[] | Kullanılmayan eski alan, boş bırakılıyor |
| default_shift | text | Kullanılmayan eski alan |
| start_date | date NULL | İşe giriş tarihi (boşsa kısıtlama yok) |
| end_date | date NULL | İşten çıkış tarihi (boşsa kısıtlama yok) |

### `shifts` tablosu

| Kolon | Tip | Açıklama |
|---|---|---|
| id | bigint PK | |
| emp_id | bigint FK | `employees.id`, CASCADE DELETE |
| shift_date | text | `YYYY-MM-DD` formatında |
| day_index | integer | 0=Pzt…6=Paz, `shift_date`'ten türetilir |
| code | text | Vardiya kodu (`S`, `Ö`, `G`, `İ`, `Yİ`, `Üİ`, `İs`, `-`) |
| start_time | text | `HH:MM`, izin kodlarında boş string |
| end_time | text | `HH:MM`, izin kodlarında boş string |
| role | text | |
| station | text | |
| dept | text | |
| status | text | `Planlandı` \| `Geldi` \| `Geç Kaldı` \| `Gelmedi` |
| note | text | |

---

## Temel Kurallar

### Tek Tablo Mimarisi

`shifts` tablosu hem haftalık hem aylık görünümün tek kaynağıdır. `employee_month_codes` tablosu artık yok.

### Boş Hücre Kuralı

**Kayıt yok = `-` (boş/atanmamış).** İzin kodları (`İ`, `Yİ`, `Üİ`, `İs`) veritabanında `start_time=''`, `end_time=''` ile açık kayıt olarak tutulur. `-` seçildiğinde varsa mevcut kayıt silinir.

### Çalışma Kodları

`WORK_CODES = ['S', 'Ö', 'G']` — sadece bu kodlar:
- Devam durumu (`Geldi`/`Gelmedi`) taşır
- Günlük Kontrol'de listelenir
- İstatistik kartlarında sayılır
- `handleSetStatus` tarafından işlenir

### Vardiya Saatleri

| Kod | Başlangıç | Bitiş |
|---|---|---|
| S — Sabah | 08:00 | 16:00 |
| Ö — Öğlen | 16:00 | 00:00 |
| G — Gece | 00:00 | 08:00 |

`codeFromTimes(start, end)` bu eşlemeyi tersine çevirir. Bilinmeyen kombinasyon → `-`.

### Personel Tarih Kısıtlamaları

`start_date` veya `end_date` doluysa:
- `setCode`: aralık dışı tarihlerde güncelleme yapmaz
- `MonthlyView`: bloke hücreler çizgili gri arka planla gösterilir, pill içeriği gizlenir
- Tekli seçim uyarısı: picker yerine kırmızı uyarı kutusu açılır
- Çoklu seçimde bloke hücreler sessizce atlanır
- Personel tarihleri güncellendiğinde aralık dışındaki mevcut vardiyalar DB'den silinir

---

## Bileşen Mimarisi

```
App.tsx
├── Global state: employees, shifts, activeMonth, mode, view
├── codesOf(empId): shifts'ten aylık kodları türetir
├── setCode(id, idx, code): aylık grid'den hücre günceller/siler
└── handleSetStatus(shiftId, status): sadece WORK_CODES için çalışır

ScheduleScreen
├── Haftalık/aylık mod seçimi
├── İstasyon/departman filtresi
└── MonthlyView | WeeklyView

MonthlyView
├── Excel tarzı çoklu hücre seçimi (mousedown → drag → mouseup → picker)
├── Uzun basış ile satır sürükleme (380ms → drag ghost)
├── Bloke hücre tespiti (activeMonth + emp.startDate/endDate)
└── GroupRows: hücre render, bloke sınıfı

DailyScreen
├── Varsayılan görünüm: dün (addDays(TODAY_DATE, -1))
└── Sadece WORK_CODES'lu vardiyaları listeler
```

---

## State Akışı

```
Supabase DB
    ↓ fetchEmployees / fetchShifts (uygulama açılışında bir kez)
App.tsx state: employees[], shifts[]
    ↓ props
ScheduleScreen → MonthlyView / WeeklyView
    ↓ setCode / onShiftClick
App.tsx → createShift / updateShift / deleteShift → Supabase
    ↓ optimistic update
shifts[] state güncellenir → re-render
```

DB yazma işlemleri iyimser değil — önce DB, sonra state güncellenir. Hata durumunda state değişmez.

---

## localStorage Kalıcılığı

| Anahtar | Değer | Açıklama |
|---|---|---|
| `vy_view` | ViewId | Son aktif ekran |
| `vy_mode` | `hafta` \| `ay` | Son aktif çizelge modu |

Personel sıra düzeni (`empOrder` MonthlyView'da) sadece oturum süresince tutulur, kalıcı değildir.

---

## Bilinen Sınırlamalar / Gelecek Adayları

- `employees.team` ve `employees.codes`/`default_shift` kolonları kullanılmıyor, DB'de kalmaya devam ediyor
- Şube → Departman iç içe kapsam yapısı (yaklaşım B) planlanıyor ancak henüz uygulanmadı
- Personel satır sırası yalnızca oturum belleğinde; backend'e kaydedilmiyor
- Raporlar ekranı statik görünüm, gerçek hesaplama yok
- Ayarlar ekranı salt okunur, yapılandırma değişiklikleri uygulanmıyor
