import { getSupabaseClient } from './supabase';
import type {
  Employee, Shift, ShiftCodeKey,
  StationName, DepartmentName, RoleName, ShiftStatus, EmployeeStatus,
  Station, Department, Role,
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
  'id, name, is_active, start_date, end_date, station_id, dept_id, role_id, stations(name), departments(name), roles(name)';

interface EmpRow {
  id: number;
  name: string;
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
  form: { name: string; stationId: number; deptId: number; roleId: number; status: EmployeeStatus; startDate: string | null; endDate: string | null },
): Promise<Employee> {
  const { data, error } = await supabase()
    .from('employees')
    .update({ name: form.name, station_id: form.stationId, dept_id: form.deptId, role_id: form.roleId, is_active: form.status === 'Aktif', start_date: form.startDate || null, end_date: form.endDate || null })
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
