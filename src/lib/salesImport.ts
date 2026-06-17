// Satış import plan/preview mantığı (SD-05).
// Parse sonucunu alır, türetilmiş alanları hesaplar, bloklayıcı hatalar + uyarılar
// üretir, mevcut kayıtla farkı çıkarır ve canApply belirler. Uygula adımı tek RPC.

import type {
  SalesImportConfig, SalesImportPlan, SalesImportScope, SalesReportValues,
  SalesDailyReport, SalesImportApplyResult,
} from '../types';
import { parseSalesWorkbooks, SALES_REQUIRED_TARGETS, SALES_FIELD_LABELS } from './salesParse';
import { applySalesImport } from './db';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

// "71,54" veya "71.54" → 71.54. Boş/geçersiz/negatif → null.
function parsePrice(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface BuildSalesImportPlanInput {
  dailyFile: File;
  summaryFile: File;
  config: SalesImportConfig;
  stationId: number | null;
  deptId: number | null;
  date: string;                              // YYYY-MM-DD
  prices: { diesel: string; gasoline: string; lpg: string };
  existing: SalesDailyReport | null;         // scope için DB'de mevcut kayıt
}

// Mevcut kayıt ↔ yeni rapor karşılaştırması (etiket, yeni, eski).
function diffPairs(r: SalesReportValues, e: SalesDailyReport): Array<[string, number, number]> {
  return [
    [SALES_FIELD_LABELS.gasoline_liters, r.gasolineLiters, e.gasolineLiters],
    [SALES_FIELD_LABELS.diesel_liters, r.dieselLiters, e.dieselLiters],
    [SALES_FIELD_LABELS.lpg_liters, r.lpgLiters, e.lpgLiters],
    ['Toplam Litre', r.totalLiters, e.totalLiters],
    [SALES_FIELD_LABELS.total_sales_tl, r.totalSalesTl, e.totalSalesTl],
    [SALES_FIELD_LABELS.discount_points_tl, r.discountPointsTl, e.discountPointsTl],
    [SALES_FIELD_LABELS.card_sales_tl, r.cardSalesTl, e.cardSalesTl],
    [SALES_FIELD_LABELS.cash_sales_tl, r.cashSalesTl, e.cashSalesTl],
    [SALES_FIELD_LABELS.tts_tl, r.ttsTl, e.ttsTl],
    [SALES_FIELD_LABELS.partner_tl, r.partnerTl, e.partnerTl],
    [SALES_FIELD_LABELS.gift_tl, r.giftTl, e.giftTl],
    [SALES_FIELD_LABELS.fault_form_tl, r.faultFormTl, e.faultFormTl],
    [SALES_FIELD_LABELS.company_tl, r.companyTl, e.companyTl],
    [SALES_FIELD_LABELS.alioglu_tl, r.aliogluTl, e.aliogluTl],
    ['Dizel Fiyatı', r.dieselUnitPrice, e.dieselUnitPrice],
    ['Benzin Fiyatı', r.gasolineUnitPrice, e.gasolineUnitPrice],
    ['LPG Fiyatı', r.lpgUnitPrice, e.lpgUnitPrice],
    ['Hesaplanan Satış', r.calculatedSalesTl, e.calculatedSalesTl],
  ];
}

export async function buildSalesImportPlan(input: BuildSalesImportPlanInput): Promise<SalesImportPlan> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Scope kontrolü
  if (input.stationId == null) errors.push('İstasyon seçilmedi.');
  if (input.deptId == null) errors.push('Departman seçilmedi.');
  if (!input.date) errors.push('Tarih seçilmedi.');

  // Fiyat kontrolü
  const diesel = parsePrice(input.prices.diesel);
  const gasoline = parsePrice(input.prices.gasoline);
  const lpg = parsePrice(input.prices.lpg);
  if (diesel == null) errors.push('Dizel fiyatı eksik/geçersiz.');
  if (gasoline == null) errors.push('Benzin fiyatı eksik/geçersiz.');
  if (lpg == null) errors.push('LPG fiyatı eksik/geçersiz.');

  // Dosyaları parse et
  const [dailyBytes, summaryBytes] = await Promise.all([
    input.dailyFile.arrayBuffer(),
    input.summaryFile.arrayBuffer(),
  ]);
  const parsed = await parseSalesWorkbooks({ dailyBytes, summaryBytes, config: input.config });
  errors.push(...parsed.errors);

  // Zorunlu hedef alanların eşlemesi var mı (parse hatası zaten errors'a eklendi)
  for (const t of SALES_REQUIRED_TARGETS) {
    const hasMapping = input.config.mappings.some(m => m.target === t);
    if (!hasMapping) errors.push(`Eksik zorunlu eşleme: ${SALES_FIELD_LABELS[t]}`);
  }

  // Türetilmiş alanlar
  const g = round2(parsed.values.gasoline_liters ?? 0);
  const d = round2(parsed.values.diesel_liters ?? 0);
  const l = round2(parsed.values.lpg_liters ?? 0);
  const totalLiters = round2(g + d + l);
  const dieselP = round4(diesel ?? 0);
  const gasolineP = round4(gasoline ?? 0);
  const lpgP = round4(lpg ?? 0);
  const calculatedSalesTl = round2(dieselP * d + gasolineP * g + lpgP * l);

  const report: SalesReportValues = {
    gasolineLiters: g,
    dieselLiters: d,
    lpgLiters: l,
    totalLiters,
    totalSalesTl: round2(parsed.values.total_sales_tl ?? 0),
    discountPointsTl: round2(parsed.values.discount_points_tl ?? 0),
    cardSalesTl: round2(parsed.values.card_sales_tl ?? 0),
    cashSalesTl: round2(parsed.values.cash_sales_tl ?? 0),
    ttsTl: round2(parsed.values.tts_tl ?? 0),
    partnerTl: round2(parsed.values.partner_tl ?? 0),
    giftTl: round2(parsed.values.gift_tl ?? 0),
    faultFormTl: round2(parsed.values.fault_form_tl ?? 0),
    companyTl: round2(parsed.values.company_tl ?? 0),
    aliogluTl: round2(parsed.values.alioglu_tl ?? 0),
    dieselUnitPrice: dieselP,
    gasolineUnitPrice: gasolineP,
    lpgUnitPrice: lpgP,
    calculatedSalesTl,
    sourceReportDate: parsed.sourceReportDate,
  };

  // Uyarılar: rapor tarihi ↔ kullanıcı tarihi
  if (parsed.sourceReportDate === null) {
    warnings.push('Günlük rapordan tarih okunamadı (G1 boş veya tarih değil).');
  } else if (input.date && parsed.sourceReportDate !== input.date) {
    warnings.push(`Rapor tarihi (G1: ${parsed.sourceReportDate}) seçilen tarihten (${input.date}) farklı.`);
  }

  // Mevcut kayıt + değişen alanlar
  const changedFields: string[] = [];
  if (input.existing) {
    warnings.push('Bu istasyon/departman/tarih için mevcut kayıt var — güncellenecek.');
    for (const [label, nv, ov] of diffPairs(report, input.existing)) {
      if (nv !== ov) changedFields.push(label);
    }
  }

  const scope: SalesImportScope = {
    stationId: input.stationId ?? 0,
    deptId: input.deptId ?? 0,
    date: input.date,
  };

  return {
    scope,
    config: input.config,
    prices: { diesel: dieselP, gasoline: gasolineP, lpg: lpgP },
    dailyFileName: input.dailyFile.name,
    summaryFileName: input.summaryFile.name,
    fields: parsed.fields,
    report,
    existing: input.existing,
    changedFields,
    warnings,
    errors,
    canApply: errors.length === 0,
  };
}

// Önizleme onaylandıktan sonra tek RPC çağrısı.
export async function applySalesImportPlan(plan: SalesImportPlan): Promise<SalesImportApplyResult> {
  if (!plan.canApply) throw new Error('Plan uygulanabilir değil; önce hataları giderin.');

  const parsedValues: Record<string, number | string | null> = {};
  for (const f of plan.fields) parsedValues[f.target] = f.value;

  return applySalesImport({
    scope: plan.scope,
    configId: plan.config.id,
    dailyFileName: plan.dailyFileName,
    summaryFileName: plan.summaryFileName,
    configSnapshot: {
      id: plan.config.id,
      name: plan.config.name,
      dailySheetName: plan.config.dailySheetName,
      summarySheetName: plan.config.summarySheetName,
      mappings: plan.config.mappings,
    },
    parsedValues,
    warnings: plan.warnings,
    report: plan.report,
  });
}
