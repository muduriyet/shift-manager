// Veri Gezgini — esnek metrik/kırılım toplama motoru (VG-01). Saf mantık.
// Kaynak: SalesDailyView satırları. Tarih aralığı + istasyon/departman filtresi,
// rowDim (X/satır) ve opsiyonel colDim (seri/pivot kolon) ile gruplama.
// ÖNEMLİ: oran metrikleri (kart oranı, TL/L) grupta Σpay/Σpayda ile YENİDEN hesaplanır,
// günlük oranların ortalaması alınmaz.

import type { SalesDailyView } from '../types';

export type MetricKey =
  | 'total_sales_tl' | 'total_liters'
  | 'gasoline_liters' | 'diesel_liters' | 'lpg_liters'
  | 'card_sales_tl' | 'cash_sales_tl' | 'tts_tl' | 'company_tl' | 'gift_tl'
  | 'discount_points_tl' | 'partner_tl' | 'fault_form_tl' | 'alioglu_tl'
  | 'calculated_sales_tl'
  | 'card_ratio' | 'avg_tl_per_liter' | 'diff_sales';

type MetricFormat = 'tl' | 'liter' | 'percent';
type MetricAgg = 'sum' | 'ratio' | 'diff';
type NumKey = keyof SalesDailyView;

export interface MetricDef {
  key: MetricKey;
  label: string;
  agg: MetricAgg;
  field?: NumKey; // sum
  num?: NumKey;   // ratio pay / diff eksilen
  den?: NumKey;   // ratio payda / diff çıkan
  format: MetricFormat;
}

export const SALES_METRICS: MetricDef[] = [
  { key: 'total_sales_tl',      label: 'Toplam Satış',        agg: 'sum', field: 'totalSalesTl',      format: 'tl' },
  { key: 'total_liters',        label: 'Toplam Litre',        agg: 'sum', field: 'totalLiters',       format: 'liter' },
  { key: 'gasoline_liters',     label: 'Benzin (L)',          agg: 'sum', field: 'gasolineLiters',    format: 'liter' },
  { key: 'diesel_liters',       label: 'Motorin (L)',         agg: 'sum', field: 'dieselLiters',      format: 'liter' },
  { key: 'lpg_liters',          label: 'LPG (L)',             agg: 'sum', field: 'lpgLiters',         format: 'liter' },
  { key: 'card_sales_tl',       label: 'Kredi Kartı (TL)',    agg: 'sum', field: 'cardSalesTl',       format: 'tl' },
  { key: 'cash_sales_tl',       label: 'Nakit (TL)',          agg: 'sum', field: 'cashSalesTl',       format: 'tl' },
  { key: 'tts_tl',              label: 'TTS (TL)',            agg: 'sum', field: 'ttsTl',             format: 'tl' },
  { key: 'company_tl',          label: 'Şirket (TL)',         agg: 'sum', field: 'companyTl',         format: 'tl' },
  { key: 'gift_tl',             label: 'Gift (TL)',           agg: 'sum', field: 'giftTl',            format: 'tl' },
  { key: 'discount_points_tl',  label: 'Smart/İndirim (TL)',  agg: 'sum', field: 'discountPointsTl',  format: 'tl' },
  { key: 'partner_tl',          label: 'Partner (TL)',        agg: 'sum', field: 'partnerTl',         format: 'tl' },
  { key: 'fault_form_tl',       label: 'Arıza Formu (TL)',    agg: 'sum', field: 'faultFormTl',       format: 'tl' },
  { key: 'alioglu_tl',          label: 'Alioğlu (TL)',        agg: 'sum', field: 'aliogluTl',         format: 'tl' },
  { key: 'calculated_sales_tl', label: 'Hesaplanan Satış (TL)', agg: 'sum', field: 'calculatedSalesTl', format: 'tl' },
  { key: 'card_ratio',          label: 'Kart Oranı',          agg: 'ratio', num: 'cardSalesTl',  den: 'totalSalesTl', format: 'percent' },
  { key: 'avg_tl_per_liter',    label: 'Ortalama TL/L',       agg: 'ratio', num: 'totalSalesTl', den: 'totalLiters',  format: 'tl' },
  { key: 'diff_sales',          label: 'Fark (Hesaplanan − Satış)', agg: 'diff', num: 'calculatedSalesTl', den: 'totalSalesTl', format: 'tl' },
];

export type RowDim = 'day' | 'week' | 'month' | 'station' | 'dept';
export type ColDim = 'none' | 'station' | 'dept';

export const ROW_DIMS: { key: RowDim; label: string }[] = [
  { key: 'day', label: 'Gün' }, { key: 'week', label: 'Hafta' }, { key: 'month', label: 'Ay' },
  { key: 'station', label: 'İstasyon' }, { key: 'dept', label: 'Departman' },
];
export const COL_DIMS: { key: ColDim; label: string }[] = [
  { key: 'none', label: 'Yok' }, { key: 'station', label: 'İstasyon' }, { key: 'dept', label: 'Departman' },
];

export const ALL = 'Tümü';
const pad2 = (n: number) => String(n).padStart(2, '0');

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // Pazartesi = 0
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function groupKeyOf(r: SalesDailyView, dim: RowDim | ColDim): string {
  switch (dim) {
    case 'day': return r.reportDate;
    case 'week': return weekStart(r.reportDate);
    case 'month': return r.month;
    case 'station': return r.stationName;
    case 'dept': return r.deptName;
    default: return '';
  }
}

function categoryLabel(key: string, dim: RowDim | ColDim): string {
  if (dim === 'month') return new Date(key + 'T00:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  if (dim === 'day' || dim === 'week') return new Date(key + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return key;
}

function sortKeys(keys: string[], dim: RowDim | ColDim): string[] {
  if (dim === 'station' || dim === 'dept') return keys.sort((a, b) => a.localeCompare(b, 'tr'));
  return keys.sort(); // ISO tarih anahtarları kronolojik sıralanır
}

// ---- Toplama ----

interface Acc { a: number; b: number; }
const numOf = (r: SalesDailyView, k: NumKey): number => Number(r[k]);

function accAdd(acc: Acc, r: SalesDailyView, m: MetricDef): void {
  if (m.agg === 'sum') acc.a += numOf(r, m.field!);
  else { acc.a += numOf(r, m.num!); acc.b += numOf(r, m.den!); }
}
function valueOf(acc: Acc | undefined, m: MetricDef): number {
  if (!acc) return 0;
  if (m.agg === 'sum') return acc.a;
  if (m.agg === 'diff') return acc.a - acc.b;
  return acc.b !== 0 ? acc.a / acc.b : 0; // ratio
}
function getAcc(map: Map<string, Acc>, key: string): Acc {
  let a = map.get(key);
  if (!a) { a = { a: 0, b: 0 }; map.set(key, a); }
  return a;
}

// ---- Format ----

export function formatMetric(v: number, m: MetricDef): string {
  if (m.format === 'percent') return '%' + (v * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  if (m.format === 'liter') return v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return '₺' + v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function compactMetric(v: number, m: MetricDef): string {
  if (m.format === 'percent') return Math.round(v * 100) + '%';
  if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + 'B';
  return String(Math.round(v));
}

export function dataDateRange(rows: SalesDailyView[]): { min: string; max: string } | null {
  if (!rows.length) return null;
  let min = rows[0].reportDate, max = rows[0].reportDate;
  for (const r of rows) { if (r.reportDate < min) min = r.reportDate; if (r.reportDate > max) max = r.reportDate; }
  return { min, max };
}

// ---- Ana motor ----

export interface ExploreInput {
  rows: SalesDailyView[];
  start: string;     // YYYY-MM-DD
  end: string;
  station: string;   // ALL veya isim
  dept: string;
  rowDim: RowDim;
  colDim: ColDim;
  metricKey: MetricKey;
}

export interface ExploreCategory { key: string; label: string; }

export interface ExploreResult {
  metric: MetricDef;
  categories: ExploreCategory[];                 // satır / X
  columns: ExploreCategory[];                     // seri / pivot kolon (colDim=none → tek sütun, etiket=metrik)
  hasCols: boolean;
  cell: (catKey: string, colKey: string) => number;
  rowTotal: (catKey: string) => number;
  colTotal: (colKey: string) => number;
  grandTotal: number;
  series: { name: string; values: number[] }[];   // grafik için
  isEmpty: boolean;
}

export function buildExplore(input: ExploreInput): ExploreResult {
  const metric = SALES_METRICS.find(m => m.key === input.metricKey) ?? SALES_METRICS[0];
  const hasCols = input.colDim !== 'none';

  const filtered = input.rows.filter(r =>
    r.reportDate >= input.start && r.reportDate <= input.end &&
    (input.station === ALL || r.stationName === input.station) &&
    (input.dept === ALL || r.deptName === input.dept),
  );

  const SEP = ' ';
  const cellAcc = new Map<string, Acc>();
  const rowAcc = new Map<string, Acc>();
  const colAcc = new Map<string, Acc>();
  const grand: Acc = { a: 0, b: 0 };
  const catKeys = new Set<string>();
  const colKeys = new Set<string>();

  for (const r of filtered) {
    const catKey = groupKeyOf(r, input.rowDim);
    const colKey = hasCols ? groupKeyOf(r, input.colDim) : '';
    catKeys.add(catKey); colKeys.add(colKey);
    accAdd(getAcc(cellAcc, catKey + SEP + colKey), r, metric);
    accAdd(getAcc(rowAcc, catKey), r, metric);
    accAdd(getAcc(colAcc, colKey), r, metric);
    accAdd(grand, r, metric);
  }

  const categories = sortKeys([...catKeys], input.rowDim).map(k => ({ key: k, label: categoryLabel(k, input.rowDim) }));
  const columns: ExploreCategory[] = hasCols
    ? sortKeys([...colKeys], input.colDim).map(k => ({ key: k, label: categoryLabel(k, input.colDim) }))
    : [{ key: '', label: metric.label }];

  const cell = (c: string, col: string) => valueOf(cellAcc.get(c + SEP + col), metric);
  const rowTotal = (c: string) => valueOf(rowAcc.get(c), metric);
  const colTotal = (col: string) => valueOf(colAcc.get(col), metric);

  const series = columns.map(col => ({
    name: col.label,
    values: categories.map(cat => cell(cat.key, col.key)),
  }));

  return {
    metric, categories, columns, hasCols,
    cell, rowTotal, colTotal,
    grandTotal: valueOf(grand, metric),
    series,
    isEmpty: filtered.length === 0,
  };
}
