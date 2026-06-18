import { getSupabaseClient } from './supabase';
import type {
  Employee, Shift, ShiftCodeKey,
  StationName, DepartmentName, RoleName, ShiftStatus, EmployeeStatus,
  Station, Department, Role,
  SalesImportConfig, SalesConfigStatus, SalesMapping, SalesDailyReport,
  SalesImportScope, SalesReportValues, SalesImportApplyResult, SalesDailyView,
} from '../types';

const supabase = () => getSupabaseClient();

// ---- Stations & Departments ----

interface StationRow   { id: number; name: string; }
interface DepartmentRow { id: number; name: string; color: string; }

function toStation(r: StationRow): Station       { return { id: r.id, name: r.name }; }
function toDepartment(r: DepartmentRow): Department { return { id: r.id, name: r.name, color: r.color }; }

export async function fetchStations(): Promise<Station[]> {
  const { data, error } = await supabase().from('stations').select('*').order('id');
  if (error) throw error;
  return (data as StationRow[]).map(toStation);
}

export async function createStation(name: string): Promise<Station> {
  const { data, error } = await supabase().from('stations').insert({ name }).select().single();
  if (error) throw error;
  return toStation(data as StationRow);
}

export async function deleteStation(id: number): Promise<void> {
  const { error } = await supabase().from('stations').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase().from('departments').select('*').order('id');
  if (error) throw error;
  return (data as DepartmentRow[]).map(toDepartment);
}

export async function createDepartment(name: string, color: string): Promise<Department> {
  const { data, error } = await supabase().from('departments').insert({ name, color }).select().single();
  if (error) throw error;
  return toDepartment(data as DepartmentRow);
}

export async function deleteDepartment(id: number): Promise<void> {
  const { error } = await supabase().from('departments').delete().eq('id', id);
  if (error) throw error;
}

interface RoleRow { id: number; name: string; }

function toRole(r: RoleRow): Role { return { id: r.id, name: r.name }; }

export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase().from('roles').select('*').order('id');
  if (error) throw error;
  return (data as RoleRow[]).map(toRole);
}

export async function createRole(name: string): Promise<Role> {
  const { data, error } = await supabase().from('roles').insert({ name }).select().single();
  if (error) throw error;
  return toRole(data as RoleRow);
}

export async function deleteRole(id: number): Promise<void> {
  const { error } = await supabase().from('roles').delete().eq('id', id);
  if (error) throw error;
}

// ---- DB row shapes (snake_case) ----

// employees.station/dept artık stations/departments tablolarına FK (id) ile bağlı.
// İsimler okuma sırasında embedded join ile çözülür; uygulama katmanı isimle çalışmaya devam eder.
const EMP_SELECT =
  'id, name, shift_name, schedule_name, is_active, start_date, end_date, station_id, dept_id, role_id, stations(name), departments(name), roles(name)';

interface EmpRow {
  id: number;
  name: string;
  shift_name: string | null;
  schedule_name: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  station_id: number;
  dept_id: number;
  role_id: number;
  stations: { name: string } | null;
  departments: { name: string } | null;
  roles: { name: string } | null;
}

interface ShiftRow {
  id: number;
  emp_id: number;
  day_index: number;
  shift_date: string | null;
  code: string;
  start_time: string;
  end_time: string;
  role: string;
  station: string;
  dept: string;
  status: string;
  note: string;
}

// ---- Mappers ----

function toEmployee(r: EmpRow): Employee {
  return {
    id: r.id,
    name: r.name,
    shiftName: r.shift_name ?? '',
    scheduleName: r.schedule_name ?? '',
    station: (r.stations?.name ?? '') as StationName,
    dept: (r.departments?.name ?? '') as DepartmentName,
    role: (r.roles?.name ?? '') as RoleName,
    status: (r.is_active ? 'Aktif' : 'Pasif') as EmployeeStatus,
    startDate: r.start_date ?? null,
    endDate: r.end_date ?? null,
  };
}

function toShift(r: ShiftRow): Shift {
  const shiftDate = r.shift_date ?? '';
  const dayIndex = shiftDate
    ? (new Date(shiftDate + 'T00:00:00').getDay() + 6) % 7  // Mon=0…Sun=6
    : r.day_index;
  return {
    id: r.id,
    empId: r.emp_id,
    shiftDate,
    dayIndex,
    code: r.code as ShiftCodeKey,
    start: r.start_time,
    end: r.end_time,
    role: r.role as RoleName,
    station: r.station as StationName,
    dept: r.dept as DepartmentName,
    status: r.status as ShiftStatus,
    note: r.note,
  };
}

// ---- Employees ----

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase().from('employees').select(EMP_SELECT).order('id');
  if (error) throw error;
  return (data as unknown as EmpRow[]).map(toEmployee);
}

export async function createEmployee(form: {
  name: string;
  shiftName: string;
  scheduleName: string;
  stationId: number;
  deptId: number;
  roleId: number;
  status: EmployeeStatus;
  startDate: string | null;
  endDate: string | null;
}): Promise<Employee> {
  const { data, error } = await supabase()
    .from('employees')
    .insert({
      name: form.name,
      shift_name: form.shiftName,
      schedule_name: form.scheduleName,
      station_id: form.stationId,
      dept_id: form.deptId,
      role_id: form.roleId,
      is_active: form.status === 'Aktif',
      start_date: form.startDate || null,
      end_date: form.endDate || null,
    })
    .select(EMP_SELECT)
    .single();
  if (error) throw error;
  return toEmployee(data as unknown as EmpRow);
}

export async function updateEmployee(
  id: number,
  form: { name: string; shiftName: string; scheduleName: string; stationId: number; deptId: number; roleId: number; status: EmployeeStatus; startDate: string | null; endDate: string | null },
): Promise<Employee> {
  const { data, error } = await supabase()
    .from('employees')
    .update({ name: form.name, shift_name: form.shiftName, schedule_name: form.scheduleName, station_id: form.stationId, dept_id: form.deptId, role_id: form.roleId, is_active: form.status === 'Aktif', start_date: form.startDate || null, end_date: form.endDate || null })
    .eq('id', id)
    .select(EMP_SELECT)
    .single();
  if (error) throw error;
  return toEmployee(data as unknown as EmpRow);
}

// Soft delete: personeli fiziksel silmek yerine is_active'i değiştirir. Böylece
// shifts.emp_id cascade'i hiç tetiklenmez ve geçmiş vardiya kaydı korunur.
export async function setEmployeeActive(id: number, active: boolean): Promise<Employee> {
  const { data, error } = await supabase()
    .from('employees')
    .update({ is_active: active })
    .eq('id', id)
    .select(EMP_SELECT)
    .single();
  if (error) throw error;
  return toEmployee(data as unknown as EmpRow);
}


// ---- Shifts ----

export async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await supabase().from('shifts').select('*').order('id');
  if (error) throw error;
  return (data as ShiftRow[]).map(toShift);
}

export async function createShift(form: {
  empId: number;
  station: StationName;
  dept: DepartmentName;
  shiftDate: string;
  start: string;
  end: string;
  role: RoleName;
  status: ShiftStatus;
  note: string;
  code?: ShiftCodeKey;
}): Promise<Shift> {
  const dayIndex = (new Date(form.shiftDate + 'T00:00:00').getDay() + 6) % 7;
  const { data, error } = await supabase()
    .from('shifts')
    .insert({
      emp_id: form.empId,
      day_index: dayIndex,
      shift_date: form.shiftDate,
      code: form.code ?? '-',
      start_time: form.start,
      end_time: form.end,
      role: form.role,
      station: form.station,
      dept: form.dept,
      status: form.status,
      note: form.note,
    })
    .select()
    .single();
  if (error) throw error;
  return toShift(data as ShiftRow);
}

export async function updateShift(
  id: number,
  form: {
    empId?: number; station?: StationName; dept?: DepartmentName;
    shiftDate?: string; start?: string; end?: string;
    role?: RoleName; status?: ShiftStatus; note?: string;
    code?: ShiftCodeKey;
  },
): Promise<Shift> {
  const patch: Record<string, unknown> = {};
  if (form.empId     !== undefined) patch.emp_id     = form.empId;
  if (form.station   !== undefined) patch.station    = form.station;
  if (form.dept      !== undefined) patch.dept       = form.dept;
  if (form.shiftDate !== undefined) {
    patch.shift_date = form.shiftDate;
    patch.day_index  = (new Date(form.shiftDate + 'T00:00:00').getDay() + 6) % 7;
  }
  if (form.start  !== undefined) patch.start_time = form.start;
  if (form.end    !== undefined) patch.end_time   = form.end;
  if (form.role   !== undefined) patch.role       = form.role;
  if (form.status !== undefined) patch.status     = form.status;
  if (form.note   !== undefined) patch.note       = form.note;
  if (form.code   !== undefined) patch.code       = form.code;

  const { data, error } = await supabase()
    .from('shifts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return toShift(data as ShiftRow);
}

export async function updateShiftStatus(id: number, status: ShiftStatus): Promise<void> {
  const { error } = await supabase().from('shifts').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteShift(id: number): Promise<void> {
  const { error } = await supabase().from('shifts').delete().eq('id', id);
  if (error) throw error;
}

// ---- Satış: konfigürasyonlar ----

interface SalesConfigRow {
  id: number;
  name: string;
  status: string;
  is_system: boolean;
  daily_sheet_name: string | null;
  summary_sheet_name: string | null;
  mappings: SalesMapping[] | null;
  created_at: string;
  updated_at: string;
}

function toSalesConfig(r: SalesConfigRow): SalesImportConfig {
  return {
    id: r.id,
    name: r.name,
    status: r.status as SalesConfigStatus,
    isSystem: r.is_system,
    dailySheetName: r.daily_sheet_name,
    summarySheetName: r.summary_sheet_name,
    mappings: Array.isArray(r.mappings) ? r.mappings : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface SalesConfigForm {
  name: string;
  status: SalesConfigStatus;
  dailySheetName: string | null;
  summarySheetName: string | null;
  mappings: SalesMapping[];
}

export async function fetchSalesConfigs(): Promise<SalesImportConfig[]> {
  const { data, error } = await supabase().from('sales_import_configs').select('*').order('id');
  if (error) throw error;
  return (data as SalesConfigRow[]).map(toSalesConfig);
}

export async function createSalesConfig(form: SalesConfigForm): Promise<SalesImportConfig> {
  const { data, error } = await supabase()
    .from('sales_import_configs')
    .insert({
      name: form.name,
      status: form.status,
      is_system: false,
      daily_sheet_name: form.dailySheetName,
      summary_sheet_name: form.summarySheetName,
      mappings: form.mappings,
    })
    .select()
    .single();
  if (error) throw error;
  return toSalesConfig(data as SalesConfigRow);
}

// System config korumalı: .eq('is_system', false) ile yalnızca kullanıcı config'leri
// güncellenir; system config hedeflenirse 0 satır döner ve hata fırlar.
export async function updateSalesConfig(id: number, form: SalesConfigForm): Promise<SalesImportConfig> {
  const { data, error } = await supabase()
    .from('sales_import_configs')
    .update({
      name: form.name,
      status: form.status,
      daily_sheet_name: form.dailySheetName,
      summary_sheet_name: form.summarySheetName,
      mappings: form.mappings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('is_system', false)
    .select()
    .single();
  if (error) throw error;
  return toSalesConfig(data as SalesConfigRow);
}

export async function setSalesConfigStatus(id: number, status: SalesConfigStatus): Promise<SalesImportConfig> {
  const { data, error } = await supabase()
    .from('sales_import_configs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_system', false)
    .select()
    .single();
  if (error) throw error;
  return toSalesConfig(data as SalesConfigRow);
}

// ---- Satış: günlük raporlar ----

interface SalesReportRow {
  id: number;
  station_id: number;
  dept_id: number;
  report_date: string;
  gasoline_liters: number | string;
  diesel_liters: number | string;
  lpg_liters: number | string;
  total_liters: number | string;
  total_sales_tl: number | string;
  discount_points_tl: number | string;
  card_sales_tl: number | string;
  cash_sales_tl: number | string;
  tts_tl: number | string;
  partner_tl: number | string;
  gift_tl: number | string;
  fault_form_tl: number | string;
  company_tl: number | string;
  alioglu_tl: number | string;
  diesel_unit_price: number | string;
  gasoline_unit_price: number | string;
  lpg_unit_price: number | string;
  calculated_sales_tl: number | string;
  source_report_date: string | null;
  last_import_run_id: number | null;
}

// Postgres numeric, PostgREST'te string olarak gelebilir → Number'a normalize et.
const num = (v: number | string): number => (typeof v === 'number' ? v : parseFloat(v));

function toSalesReport(r: SalesReportRow): SalesDailyReport {
  return {
    id: r.id,
    stationId: r.station_id,
    deptId: r.dept_id,
    reportDate: r.report_date,
    gasolineLiters: num(r.gasoline_liters),
    dieselLiters: num(r.diesel_liters),
    lpgLiters: num(r.lpg_liters),
    totalLiters: num(r.total_liters),
    totalSalesTl: num(r.total_sales_tl),
    discountPointsTl: num(r.discount_points_tl),
    cardSalesTl: num(r.card_sales_tl),
    cashSalesTl: num(r.cash_sales_tl),
    ttsTl: num(r.tts_tl),
    partnerTl: num(r.partner_tl),
    giftTl: num(r.gift_tl),
    faultFormTl: num(r.fault_form_tl),
    companyTl: num(r.company_tl),
    aliogluTl: num(r.alioglu_tl),
    dieselUnitPrice: num(r.diesel_unit_price),
    gasolineUnitPrice: num(r.gasoline_unit_price),
    lpgUnitPrice: num(r.lpg_unit_price),
    calculatedSalesTl: num(r.calculated_sales_tl),
    sourceReportDate: r.source_report_date,
    lastImportRunId: r.last_import_run_id,
  };
}

// Belirli scope için mevcut kayıt (import preview'da eski/yeni farkı için).
export async function fetchSalesReportForScope(
  stationId: number,
  deptId: number,
  date: string,
): Promise<SalesDailyReport | null> {
  const { data, error } = await supabase()
    .from('sales_daily_reports')
    .select('*')
    .eq('station_id', stationId)
    .eq('dept_id', deptId)
    .eq('report_date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? toSalesReport(data as SalesReportRow) : null;
}

export async function fetchSalesReports(): Promise<SalesDailyReport[]> {
  const { data, error } = await supabase()
    .from('sales_daily_reports')
    .select('*')
    .order('report_date');
  if (error) throw error;
  return (data as SalesReportRow[]).map(toSalesReport);
}

// ---- Satış: dashboard view ----

interface SalesDailyViewRow {
  id: number; station_id: number; station_name: string;
  dept_id: number; dept_name: string; report_date: string; month: string;
  gasoline_liters: number | string; diesel_liters: number | string; lpg_liters: number | string;
  total_liters: number | string; total_sales_tl: number | string; card_sales_tl: number | string;
  cash_sales_tl: number | string; tts_tl: number | string; partner_tl: number | string;
  gift_tl: number | string; fault_form_tl: number | string; company_tl: number | string;
  alioglu_tl: number | string; discount_points_tl: number | string;
  diesel_unit_price: number | string; gasoline_unit_price: number | string; lpg_unit_price: number | string;
  calculated_sales_tl: number | string;
  card_ratio: number | string; avg_tl_per_liter: number | string;
}

function toDailyView(r: SalesDailyViewRow): SalesDailyView {
  return {
    id: r.id,
    stationId: r.station_id, stationName: r.station_name,
    deptId: r.dept_id, deptName: r.dept_name,
    reportDate: r.report_date, month: r.month,
    gasolineLiters: num(r.gasoline_liters), dieselLiters: num(r.diesel_liters), lpgLiters: num(r.lpg_liters),
    totalLiters: num(r.total_liters), totalSalesTl: num(r.total_sales_tl), cardSalesTl: num(r.card_sales_tl),
    cashSalesTl: num(r.cash_sales_tl), ttsTl: num(r.tts_tl), partnerTl: num(r.partner_tl),
    giftTl: num(r.gift_tl), faultFormTl: num(r.fault_form_tl), companyTl: num(r.company_tl),
    aliogluTl: num(r.alioglu_tl), discountPointsTl: num(r.discount_points_tl),
    dieselUnitPrice: num(r.diesel_unit_price), gasolineUnitPrice: num(r.gasoline_unit_price), lpgUnitPrice: num(r.lpg_unit_price),
    calculatedSalesTl: num(r.calculated_sales_tl),
    cardRatio: num(r.card_ratio), avgTlPerLiter: num(r.avg_tl_per_liter),
  };
}

export async function fetchSalesDashboardDaily(): Promise<SalesDailyView[]> {
  const { data, error } = await supabase()
    .from('sales_dashboard_daily_view')
    .select('*')
    .order('report_date');
  if (error) throw error;
  return (data as SalesDailyViewRow[]).map(toDailyView);
}

// Veri Gezgini "Ham Tablo" inline düzenlemesi → temel tabloya (view değil) id ile yazar.
// card_ratio / avg_tl_per_liter view'da türetildiği için yazılmaz; total_liters ve
// calculated_sales_tl ise saklanan kolonlar olduğundan (import'taki kuralla) yazılır.
export async function updateSalesReport(id: number, v: SalesDailyView): Promise<void> {
  const { error } = await supabase()
    .from('sales_daily_reports')
    .update({
      gasoline_liters: v.gasolineLiters, diesel_liters: v.dieselLiters, lpg_liters: v.lpgLiters, total_liters: v.totalLiters,
      total_sales_tl: v.totalSalesTl, discount_points_tl: v.discountPointsTl, card_sales_tl: v.cardSalesTl, cash_sales_tl: v.cashSalesTl,
      tts_tl: v.ttsTl, partner_tl: v.partnerTl, gift_tl: v.giftTl, fault_form_tl: v.faultFormTl, company_tl: v.companyTl, alioglu_tl: v.aliogluTl,
      diesel_unit_price: v.dieselUnitPrice, gasoline_unit_price: v.gasolineUnitPrice, lpg_unit_price: v.lpgUnitPrice, calculated_sales_tl: v.calculatedSalesTl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

// ---- Satış: import uygula (apply_sales_import RPC) ----

export interface SalesImportApplyInput {
  scope: SalesImportScope;
  configId: number | null;
  dailyFileName: string;
  summaryFileName: string;
  configSnapshot: unknown;
  parsedValues: unknown;
  warnings: string[];
  report: SalesReportValues;
}

export async function applySalesImport(input: SalesImportApplyInput): Promise<SalesImportApplyResult> {
  const r = input.report;
  const payload = {
    station_id: input.scope.stationId,
    dept_id: input.scope.deptId,
    report_date: input.scope.date,
    config_id: input.configId,
    daily_file_name: input.dailyFileName,
    summary_file_name: input.summaryFileName,
    config_snapshot: input.configSnapshot,
    parsed_values: input.parsedValues,
    warnings: input.warnings,
    report: {
      gasoline_liters: r.gasolineLiters,
      diesel_liters: r.dieselLiters,
      lpg_liters: r.lpgLiters,
      total_liters: r.totalLiters,
      total_sales_tl: r.totalSalesTl,
      discount_points_tl: r.discountPointsTl,
      card_sales_tl: r.cardSalesTl,
      cash_sales_tl: r.cashSalesTl,
      tts_tl: r.ttsTl,
      partner_tl: r.partnerTl,
      gift_tl: r.giftTl,
      fault_form_tl: r.faultFormTl,
      company_tl: r.companyTl,
      alioglu_tl: r.aliogluTl,
      diesel_unit_price: r.dieselUnitPrice,
      gasoline_unit_price: r.gasolineUnitPrice,
      lpg_unit_price: r.lpgUnitPrice,
      calculated_sales_tl: r.calculatedSalesTl,
      source_report_date: r.sourceReportDate,
    },
  };
  const { data, error } = await supabase().rpc('apply_sales_import', { payload });
  if (error) throw error;
  const res = data as { report_id: number; run_id: number; action: string; changed_fields: Record<string, { old: unknown; new: unknown }> };
  return {
    reportId: res.report_id,
    runId: res.run_id,
    action: res.action as 'insert' | 'update',
    changedFields: res.changed_fields ?? {},
  };
}
