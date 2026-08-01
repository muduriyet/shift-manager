import type {
  ShiftCodeKey,
  ShiftStatus, ShiftCodeDef, MonthDay, WeekDay, ShiftTime,
} from '../types';

export const STATUSES: ShiftStatus[] = ['Planlandı', 'Geldi', 'Gelmedi'];

export const SHIFT_CODES: Record<ShiftCodeKey, ShiftCodeDef> = {
  'S':  { key: 'S',  label: 'Sabah',       start: '08:00', end: '16:00', cls: 'sc-s',    work: true },
  'Ö':  { key: 'Ö',  label: 'Öğlen',       start: '16:00', end: '00:00', cls: 'sc-o',    work: true },
  'G':  { key: 'G',  label: 'Gece',        start: '00:00', end: '08:00', cls: 'sc-g',    work: true },
  'Öz': { key: 'Öz', label: 'Özel',                                      cls: 'sc-oz',   work: true },
  'İ':  { key: 'İ',  label: 'İzin',          cls: 'sc-i',     off: true },
  'Yİ': { key: 'Yİ', label: 'Yıllık İzin',  cls: 'sc-yi',    off: true },
  'Üİ': { key: 'Üİ', label: 'Ücretsiz İzin', cls: 'sc-ui',   off: true },
  'İs': { key: 'İs', label: 'İstirahat',     cls: 'sc-is',    off: true },
  '-':  { key: '-',  label: 'Boş',           cls: 'sc-empty', off: true, empty: true },
};

// 'Öz' (Özel) serbest saatli bir çalışma kodudur: sabit şablonu yoktur, saatler
// vardiya kaydından gelir. Çalışma sayıldığı için WORK_CODES'a dahildir ama grid
// hızlı-seçicisinde (ALL_CODES) yer almaz — modaldan özel saatle oluşturulur.
export const WORK_CODES: ShiftCodeKey[] = ['S', 'Ö', 'G', 'Öz'];
export const ALL_CODES: ShiftCodeKey[] = ['S', 'Ö', 'G', 'İ', 'Yİ', 'Üİ', 'İs', '-'];

// Sabit saatli hazır şablonlar (modal/ayarlardaki şablon butonları bunları kullanır).
const TEMPLATE_CODES: ShiftCodeKey[] = ['S', 'Ö', 'G'];

export const SHIFT_TIMES: ShiftTime[] = TEMPLATE_CODES.map(k => ({
  id: k as ShiftCodeKey,
  start: SHIFT_CODES[k].start!,
  end: SHIFT_CODES[k].end!,
  label: SHIFT_CODES[k].label,
}));

export function shiftById(id: ShiftCodeKey): ShiftTime {
  return SHIFT_TIMES.find(s => s.id === id) ?? SHIFT_TIMES[0];
}

// İstihdam penceresi: verilen tarih personelin giriş/çıkış aralığında mı?
// Tüm görünümler (aylık/haftalık/günlük/rapor) ve atama kuralı bunu tek kaynak olarak kullanır.
export function isWithinEmployment(
  startDate: string | null,
  endDate: string | null,
  dateStr: string,
): boolean {
  if (startDate && dateStr < startDate) return false;
  if (endDate   && dateStr > endDate)   return false;
  return true;
}

// Çalışma aralığı verilen dönemle kesişiyor mu. Kesişmiyorsa personelin o
// dönemde tek bir günü bile yoktur; çizelgede satır açmak yalnızca tamamı
// taralı, vardiya girilemeyen boş bir satır üretir.
// start/end boş olan personel (tarihi girilmemiş) her dönemde görünür kalır.
export function isEmployedInRange(
  startDate: string | null,
  endDate: string | null,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (startDate && startDate > rangeEnd)   return false;
  if (endDate   && endDate   < rangeStart) return false;
  return true;
}


// ---- Date utilities ----

const _WD_FULL  = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const _WD_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const MONTH_NAMES       = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
export const MONTH_SHORT_NAMES = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const _MONTH_SHORT  = MONTH_SHORT_NAMES;

export function getMonday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun, 1=Mon…
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function addDays(d: Date, n: number): Date {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

export function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---- Ay (YYYY-MM) yardımcıları ----
// Vardiyalar sunucudan ay ay çekilir; aşağıdakiler bir tarih aralığının hangi
// aylara denk geldiğini bulmak için kullanılır.

export function yearMonthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${yearMonth}-01`,
    end:   `${yearMonth}-${String(last).padStart(2, '0')}`,
  };
}

// Aralığın kapsadığı tüm ayları sırayla döndürür ('2026-06' → '2026-07' …).
export function monthsInRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const months: string[] = [];
  let cur = yearMonthOf(startDate);
  const last = yearMonthOf(endDate);
  while (cur <= last) {
    months.push(cur);
    cur = addMonths(cur, 1);
  }
  return months;
}

export function buildWeekDays(weekStart: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      key:     _WD_FULL[i],
      short:   _WD_SHORT[i],
      date:    `${d.getDate()} ${_MONTH_SHORT[d.getMonth()]}`,
      dateStr: dateToStr(d),
      n:       d.getDate(),
      weekend: i >= 5,
    };
  });
}

export function buildMonthDays(year: number, month: number): MonthDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const n = i + 1;
    const w = (new Date(year, month, n).getDay() + 6) % 7; // Mon=0
    return { n, wIdx: w, wShort: _WD_SHORT[w], wFull: _WD_FULL[w], weekend: w >= 5 };
  });
}

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

// ---- Dynamic "today" values ----

export const TODAY_DATE: Date = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();
export const TODAY_DATE_STR: string = dateToStr(TODAY_DATE);

// ---- Current week ----

export const THIS_WEEK_START: Date = getMonday(TODAY_DATE);
export const WEEK_DAYS: WeekDay[]  = buildWeekDays(THIS_WEEK_START);
export const TODAY_INDEX: number   = WEEK_DAYS.findIndex(d => d.dateStr === TODAY_DATE_STR);
export const WEEK_LABEL: string    = `${WEEK_DAYS[0].n} – ${WEEK_DAYS[6].n} ${getMonthLabel(THIS_WEEK_START.getFullYear(), THIS_WEEK_START.getMonth())}`;
export const TODAY_LABEL: string   = `${_WD_FULL[(TODAY_DATE.getDay() + 6) % 7]}, ${TODAY_DATE.getDate()} ${MONTH_NAMES[TODAY_DATE.getMonth()]} ${TODAY_DATE.getFullYear()}`;

// ---- Current month ----

export const MONTH_DAYS: MonthDay[] = buildMonthDays(TODAY_DATE.getFullYear(), TODAY_DATE.getMonth());
export const MONTH = {
  name:   getMonthLabel(TODAY_DATE.getFullYear(), TODAY_DATE.getMonth()),
  short:  _MONTH_SHORT[TODAY_DATE.getMonth()],
  days:   MONTH_DAYS,
  todayN: TODAY_DATE.getDate(),
};
export const TODAY_N: number    = TODAY_DATE.getDate();
export const TODAY_MIDX: number = MONTH_DAYS.findIndex(d => d.n === TODAY_N);
