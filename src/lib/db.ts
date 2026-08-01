import { getSupabaseClient } from './supabase';
import type {
  Employee, Shift, ShiftCodeKey,
  StationName, DepartmentName, RoleName, ShiftStatus, EmployeeStatus,
  Station, Department, Role,
  SalesImportConfig, SalesConfigStatus, SalesMapping, SalesDailyReport,
  SalesImportScope, SalesReportValues, SalesImportApplyResult, SalesDailyView,
  Task, TaskPriority, RepeatKind, RepeatUnit, Profile, TaskComment, TaskActivity, TaskAttachment,
} from '../types';

const supabase = () => getSupabaseClient();

// PostgREST tek istekte en fazla 1000 satır döndürür (db-max-rows). Satır sayısı
// bunu aşan tablolarda sessizce kırpılma olur; bu yüzden büyüyen tabloları
// .range() ile sayfa sayfa çekiyoruz.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> },
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

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

// Tüm çizelge ekranları tarih aralığıyla çalıştığı için vardiyalar aralık aralık
// çekilir; tablonun tamamı hiçbir zaman belleğe alınmaz. Aralık büyük olsa bile
// fetchAllRows sayfalama yaptığından 1000 satır limiti sorun olmaz.
export async function fetchShiftsInRange(fromDate: string, toDate: string): Promise<Shift[]> {
  const rows = await fetchAllRows<ShiftRow>(
    () => supabase()
      .from('shifts')
      .select('*')
      .gte('shift_date', fromDate)
      .lte('shift_date', toDate)
      .order('id'),
  );
  return rows.map(toShift);
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
  const rows = await fetchAllRows<SalesReportRow>(
    () => supabase().from('sales_daily_reports').select('*').order('report_date').order('id'),
  );
  return rows.map(toSalesReport);
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
  const rows = await fetchAllRows<SalesDailyViewRow>(
    () => supabase().from('sales_dashboard_daily_view').select('*').order('report_date').order('id'),
  );
  return rows.map(toDailyView);
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

// ---- Görev Defteri: profiles ----

interface ProfileRow { id: string; username: string; display_name: string; is_active: boolean; }

function toProfile(r: ProfileRow): Profile {
  return { id: r.id, username: r.username, displayName: r.display_name, isActive: r.is_active };
}

// Giriş yapan kullanıcı dizini (atama listesi + ad/avatar). Tümü çekilir; aktif
// süzme UI'da yapılır (pasif bir atanan hâlâ adıyla gösterilebilsin).
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase().from('profiles').select('*').order('display_name');
  if (error) throw error;
  return (data as ProfileRow[]).map(toProfile);
}

// ---- Görev Defteri: tasks ----

interface TaskRow {
  id: number;
  title: string;
  note: string;
  priority: string;
  due_date: string | null;
  done: boolean;
  done_at: string | null;
  is_team: boolean;
  assignee_id: string | null;
  created_by: string | null;
  repeat_kind: string;
  repeat_n: number;
  repeat_unit: string;
  series_id: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    priority: r.priority as TaskPriority,
    dueDate: r.due_date,
    done: r.done,
    doneAt: r.done_at,
    isTeam: r.is_team,
    assigneeId: r.assignee_id,
    createdBy: r.created_by,
    repeatKind: r.repeat_kind as RepeatKind,
    repeatN: r.repeat_n,
    repeatUnit: r.repeat_unit as RepeatUnit,
    seriesId: r.series_id,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface TaskForm {
  title: string;
  note: string;
  priority: TaskPriority;
  dueDate: string | null;   // YYYY-MM-DD; null = backlog
  isTeam: boolean;
  assigneeId: string | null;
  repeatKind: RepeatKind;
  repeatN: number;
  repeatUnit: RepeatUnit;
}

// Yerel (TR) tarih aritmetiği — 'YYYY-MM-DD' string'i yerel gece yarısı olarak parse
// edilir (new Date('YYYY-MM-DD') UTC parse eder → gün kayması olur, ondan kaçınılır).
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Ay ekleme ay-sonu clamp'li (H1): hedef ayda orijinal gün yoksa ayın son gününe
// sabitlenir. Örn. 31 Oca + 1 ay -> 28 Şub (setMonth taşması engellenir).
function addMonthsClamped(base: Date, months: number): Date {
  const day = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function nextDueDate(base: Date, kind: RepeatKind, n: number, unit: RepeatUnit): Date {
  if (kind === 'daily')  { const d = new Date(base); d.setDate(d.getDate() + 1); return d; }
  if (kind === 'weekly') { const d = new Date(base); d.setDate(d.getDate() + 7); return d; }
  if (kind === 'monthly') return addMonthsClamped(base, 1);
  if (kind === 'custom') {
    const k = Math.max(1, n);
    if (unit === 'gün')   { const d = new Date(base); d.setDate(d.getDate() + k); return d; }
    if (unit === 'hafta') { const d = new Date(base); d.setDate(d.getDate() + k * 7); return d; }
    if (unit === 'ay')    return addMonthsClamped(base, k);
  }
  return new Date(base);
}

export async function fetchTasks(): Promise<Task[]> {
  const rows = await fetchAllRows<TaskRow>(
    () => supabase().from('tasks').select('*').is('archived_at', null).order('id'),
  );
  return rows.map(toTask);
}

export async function createTask(form: TaskForm, createdBy: string | null): Promise<Task> {
  const { data, error } = await supabase()
    .from('tasks')
    .insert({
      title: form.title,
      note: form.note,
      priority: form.priority,
      due_date: form.dueDate,
      is_team: form.isTeam,
      assignee_id: form.assigneeId,
      created_by: createdBy,
      repeat_kind: form.repeatKind,
      repeat_n: form.repeatN,
      repeat_unit: form.repeatUnit,
    })
    .select()
    .single();
  if (error) throw error;
  const task = toTask(data as TaskRow);
  await logTaskActivity(task.id, createdBy, 'görevi oluşturdu');
  return task;
}

export async function updateTask(id: number, form: TaskForm): Promise<Task> {
  const { data, error } = await supabase()
    .from('tasks')
    .update({
      title: form.title,
      note: form.note,
      priority: form.priority,
      due_date: form.dueDate,
      is_team: form.isTeam,
      assignee_id: form.assigneeId,
      repeat_kind: form.repeatKind,
      repeat_n: form.repeatN,
      repeat_unit: form.repeatUnit,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toTask(data as TaskRow);
}

// Soft delete (D6): satırı silmez, archived_at doldurur; fetchTasks bunları süzer.
export async function archiveTask(id: number): Promise<void> {
  const { error } = await supabase()
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Tamamlandı işaretleme + tekrar (GD-4/D5): tekrarlayan görev tamamlanınca o örnek
// "done" kalır (Tamamlanan'da), bir sonraki örnek yeni satır olarak eklenir. series_id
// örnekleri zincirler. Tüm alanları hesaba katmak için tam Task nesnesi alınır.
export async function setTaskDone(task: Task, done: boolean, actorId: string | null): Promise<void> {
  const { error } = await supabase()
    .from('tasks')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', task.id);
  if (error) throw error;
  await logTaskActivity(task.id, actorId, done ? 'tamamlandı olarak işaretledi' : 'görevi yeniden açtı');

  if (done && task.repeatKind !== 'none') {
    const base = task.dueDate ? parseYmd(task.dueDate) : new Date();
    const next = formatYmd(nextDueDate(base, task.repeatKind, task.repeatN, task.repeatUnit));
    const { error: insErr } = await supabase().from('tasks').insert({
      title: task.title,
      note: task.note,
      priority: task.priority,
      due_date: next,
      is_team: task.isTeam,
      assignee_id: task.assigneeId,
      created_by: task.createdBy,
      repeat_kind: task.repeatKind,
      repeat_n: task.repeatN,
      repeat_unit: task.repeatUnit,
      series_id: task.seriesId ?? task.id,
    });
    // Duplicate guard (H3): eşzamanlı tamamlamada aynı seri+tarih için 2. insert'i
    // partial unique index reddeder (23505); bunu yut, diğer hataları fırlat.
    if (insErr && (insErr as { code?: string }).code !== '23505') throw insErr;
  }
}

// ---- Görev Defteri: yorumlar + aktivite (GD-5) ----

interface CommentRow { id: number; task_id: number; author_id: string | null; body: string; created_at: string; }
function toComment(r: CommentRow): TaskComment {
  return { id: r.id, taskId: r.task_id, authorId: r.author_id, body: r.body, createdAt: r.created_at };
}

interface ActivityRow { id: number; task_id: number; actor_id: string | null; action: string; created_at: string; }
function toActivity(r: ActivityRow): TaskActivity {
  return { id: r.id, taskId: r.task_id, actorId: r.actor_id, action: r.action, createdAt: r.created_at };
}

export async function fetchComments(taskId: number): Promise<TaskComment[]> {
  const { data, error } = await supabase().from('task_comments').select('*').eq('task_id', taskId).order('created_at');
  if (error) throw error;
  return (data as CommentRow[]).map(toComment);
}

export async function fetchActivity(taskId: number): Promise<TaskActivity[]> {
  const { data, error } = await supabase().from('task_activity').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ActivityRow[]).map(toActivity);
}

// Aktivite kaydı best-effort: ana aksiyonu bloklamasın (hata olursa yalnızca uyarır).
export async function logTaskActivity(taskId: number, actorId: string | null, action: string): Promise<void> {
  const { error } = await supabase().from('task_activity').insert({ task_id: taskId, actor_id: actorId, action });
  if (error) console.warn('Aktivite kaydı eklenemedi:', error);
}

export async function addComment(taskId: number, authorId: string | null, body: string): Promise<void> {
  const { error } = await supabase().from('task_comments').insert({ task_id: taskId, author_id: authorId, body });
  if (error) throw error;
  await logTaskActivity(taskId, authorId, 'yorum ekledi');
}

// ---- Görev Defteri: dosya ekleri (GD-6) ----

const ATTACH_BUCKET = 'task-attachments';

interface AttachmentRow {
  id: number; task_id: number | null; storage_path: string; file_name: string;
  file_size: number; mime_type: string | null; uploaded_by: string | null; created_at: string;
}
function toAttachment(r: AttachmentRow): TaskAttachment {
  return {
    id: r.id, taskId: r.task_id, storagePath: r.storage_path, fileName: r.file_name,
    fileSize: r.file_size, mimeType: r.mime_type, uploadedBy: r.uploaded_by, createdAt: r.created_at,
  };
}

export async function fetchAttachments(taskId: number): Promise<TaskAttachment[]> {
  const { data, error } = await supabase().from('task_attachments').select('*').eq('task_id', taskId).order('created_at');
  if (error) throw error;
  return (data as AttachmentRow[]).map(toAttachment);
}

// Dosyayı Storage'a yükler + metadata satırı ekler. taskId null → taslak
// (görev kaydında linkAttachments ile bağlanır; iptalde removeAttachment ile silinir).
export async function uploadAttachment(taskId: number | null, file: File, uploadedBy: string | null): Promise<TaskAttachment> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const prefix = taskId != null ? `tasks/${taskId}` : 'drafts';
  const path = `${prefix}/${crypto.randomUUID()}-${safeName}`;
  const { error: upErr } = await supabase().storage.from(ATTACH_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;
  const { data, error } = await supabase().from('task_attachments').insert({
    task_id: taskId,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: uploadedBy,
  }).select().single();
  if (error) throw error;
  return toAttachment(data as AttachmentRow);
}

// Taslak yüklemeleri (task_id=null) yeni göreve bağlar.
export async function linkAttachments(ids: number[], taskId: number): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase().from('task_attachments').update({ task_id: taskId }).in('id', ids);
  if (error) throw error;
}

// Private bucket → kısa ömürlü (5 dk) signed URL ile indirme.
export async function attachmentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase().storage.from(ATTACH_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeAttachment(id: number, path: string): Promise<void> {
  const { error: sErr } = await supabase().storage.from(ATTACH_BUCKET).remove([path]);
  if (sErr) throw sErr;
  const { error } = await supabase().from('task_attachments').delete().eq('id', id);
  if (error) throw error;
}
