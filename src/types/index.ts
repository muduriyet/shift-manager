export type StationName = string;
export type DepartmentName = string;

export interface Station {
  id: number;
  name: string;
}

export interface Department {
  id: number;
  name: string;
  color: string;
}

export interface Role {
  id: number;
  name: string;
}
export type RoleName = string;
export type ShiftCodeKey = 'S' | 'Ö' | 'G' | 'Öz' | 'İ' | 'Yİ' | 'Üİ' | 'İs' | '-';
export type ShiftStatus = 'Planlandı' | 'Geldi' | 'Gelmedi';
export type EmployeeStatus = 'Aktif' | 'Pasif';
export type ViewId = 'cizelge' | 'personeller' | 'gunluk' | 'raporlar' | 'ayarlar' | 'satis';
export type ScheduleMode = 'hafta' | 'ay';

export interface ShiftCodeDef {
  key: ShiftCodeKey;
  label: string;
  start?: string;
  end?: string;
  cls: string;
  work?: boolean;
  off?: boolean;
  empty?: boolean;
}

export interface ShiftTime {
  id: ShiftCodeKey;
  start: string;
  end: string;
  label: string;
}

export interface Employee {
  id: number;
  name: string;
  shiftName: string;
  scheduleName: string;
  station: StationName;
  dept: DepartmentName;
  role: RoleName;
  status: EmployeeStatus;
  startDate: string | null;
  endDate: string | null;
}

export interface Shift {
  id: number;
  empId: number;
  shiftDate: string;  // YYYY-MM-DD
  dayIndex: number;   // 0=Mon…6=Sun, derived from shiftDate
  code: ShiftCodeKey;
  start: string;
  end: string;
  role: RoleName;
  station: StationName;
  dept: DepartmentName;
  status: ShiftStatus;
  note: string;
}

export interface MonthDay {
  n: number;
  wIdx: number;
  wShort: string;
  wFull: string;
  weekend: boolean;
}

export interface WeekDay {
  key: string;
  short: string;
  date: string;    // display label, e.g. "9 Haz"
  dateStr: string; // YYYY-MM-DD
  n: number;
  weekend: boolean;
}

export interface MonthGroup {
  label: string;
  color: string;
  emps: Employee[];
}

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

// ---- Satış Dashboard ----
// NOT: ViewId'a 'satis' SD-06'da (App.tsx case'iyle birlikte) eklenecek.

export type SalesConfigStatus = 'draft' | 'active' | 'inactive';

// Mapping hedef alanları ilk sürümde sabit (kullanıcı yeni metrik ekleyemez).
export type SalesMappingTarget =
  | 'source_report_date'
  | 'gasoline_liters'
  | 'diesel_liters'
  | 'lpg_liters'
  | 'total_sales_tl'
  | 'card_sales_tl'
  | 'cash_sales_tl'
  | 'tts_tl'
  | 'partner_tl'
  | 'gift_tl'
  | 'fault_form_tl'
  | 'company_tl'
  | 'alioglu_tl'
  | 'discount_points_tl';

export type SalesSheetSource = 'daily' | 'summary';

export interface SalesMapping {
  target: SalesMappingTarget;
  source: SalesSheetSource;
  formula: string;        // hücre referansı veya whitelist ifade (ör. "G3", "G16+G17")
}

export interface SalesImportConfig {
  id: number;
  name: string;
  status: SalesConfigStatus;
  isSystem: boolean;
  dailySheetName: string | null;
  summarySheetName: string | null;
  mappings: SalesMapping[];
  createdAt: string;
  updatedAt: string;
}

// Persist edilen günlük rapor satırı (sales_daily_reports).
export interface SalesDailyReport {
  id: number;
  stationId: number;
  deptId: number;
  reportDate: string;           // YYYY-MM-DD
  gasolineLiters: number;
  dieselLiters: number;
  lpgLiters: number;
  totalLiters: number;
  totalSalesTl: number;
  discountPointsTl: number;
  cardSalesTl: number;
  cashSalesTl: number;
  ttsTl: number;
  partnerTl: number;
  giftTl: number;
  faultFormTl: number;
  companyTl: number;
  aliogluTl: number;
  dieselUnitPrice: number;
  gasolineUnitPrice: number;
  lpgUnitPrice: number;
  calculatedSalesTl: number;
  sourceReportDate: string | null;
  lastImportRunId: number | null;
}

export interface SalesImportScope {
  stationId: number;
  deptId: number;
  date: string;                 // YYYY-MM-DD
}

export interface SalesUnitPrices {
  diesel: number;
  gasoline: number;
  lpg: number;
}

// RPC'ye gönderilecek hesaplanmış değerler (türetilmiş alanlar + birim fiyatlar dahil).
export interface SalesReportValues {
  gasolineLiters: number;
  dieselLiters: number;
  lpgLiters: number;
  totalLiters: number;
  totalSalesTl: number;
  discountPointsTl: number;
  cardSalesTl: number;
  cashSalesTl: number;
  ttsTl: number;
  partnerTl: number;
  giftTl: number;
  faultFormTl: number;
  companyTl: number;
  aliogluTl: number;
  dieselUnitPrice: number;
  gasolineUnitPrice: number;
  lpgUnitPrice: number;
  calculatedSalesTl: number;
  sourceReportDate: string | null;
}

export interface SalesImportApplyResult {
  reportId: number;
  runId: number;
  action: 'insert' | 'update';
  changedFields: Record<string, { old: unknown; new: unknown }>;
}

// Parse edilen tek alan (preview gösterimi için).
export interface SalesParsedField {
  target: SalesMappingTarget;
  source: SalesSheetSource;
  formula: string;
  value: number | string | null;
  error?: string;
}

// SD-05 buildSalesImportPlan çıktısı; SD-08 preview paneli buradan beslenir.
export interface SalesImportPlan {
  scope: SalesImportScope;
  config: SalesImportConfig;
  prices: SalesUnitPrices;
  dailyFileName: string;
  summaryFileName: string;
  fields: SalesParsedField[];
  report: SalesReportValues;
  existing: SalesDailyReport | null;
  changedFields: string[];
  warnings: string[];
  errors: string[];             // bloklayıcılar
  canApply: boolean;
}

// sales_dashboard_daily_view satırı (dashboard kaynağı).
export interface SalesDailyView {
  id: number;
  stationId: number;
  stationName: string;
  deptId: number;
  deptName: string;
  reportDate: string;
  month: string;
  gasolineLiters: number;
  dieselLiters: number;
  lpgLiters: number;
  totalLiters: number;
  totalSalesTl: number;
  cardSalesTl: number;
  cashSalesTl: number;
  ttsTl: number;
  partnerTl: number;
  giftTl: number;
  faultFormTl: number;
  companyTl: number;
  aliogluTl: number;
  discountPointsTl: number;
  dieselUnitPrice: number;
  gasolineUnitPrice: number;
  lpgUnitPrice: number;
  calculatedSalesTl: number;
  cardRatio: number;
  avgTlPerLiter: number;
}
