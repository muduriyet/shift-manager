import type {
  ShiftCodeKey,
  ShiftStatus, ShiftCodeDef, MonthDay, ShiftTime,
} from '../types';


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

export function monthBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${yearMonth}-01`,
    end:   `${yearMonth}-${String(last).padStart(2, '0')}`,
  };
}

export function buildMonthDays(year: number, month: number): MonthDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const n = i + 1;
    const w = (new Date(year, month, n).getDay() + 6) % 7; // Mon=0
    return { n, wIdx: w, wShort: _WD_SHORT[w], wFull: _WD_FULL[w], weekend: w >= 5 };
  });
}

// ---- Dynamic "today" values ----

export const TODAY_DATE: Date = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();
export const TODAY_DATE_STR: string = dateToStr(TODAY_DATE);
