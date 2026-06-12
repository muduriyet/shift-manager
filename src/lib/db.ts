import { supabase } from './supabase';
import type {
  Employee, Shift, ShiftCodeKey,
  StationName, DepartmentName, RoleName, ShiftStatus, EmployeeStatus,
} from '../types';

// ---- DB row shapes (snake_case) ----

interface EmpRow {
  id: number;
  name: string;
  station: string;
  dept: string;
  role: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
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
    station: r.station as StationName,
    dept: r.dept as DepartmentName,
    role: r.role as RoleName,
    status: r.status as EmployeeStatus,
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
  const { data, error } = await supabase.from('employees').select('*').order('id');
  if (error) throw error;
  return (data as EmpRow[]).map(toEmployee);
}

export async function createEmployee(form: {
  name: string;
  station: StationName;
  dept: DepartmentName;
  role: RoleName;
  status: EmployeeStatus;
  startDate: string | null;
  endDate: string | null;
}): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: form.name,
      station: form.station,
      dept: form.dept,
      role: form.role,
      status: form.status,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return toEmployee(data as EmpRow);
}

export async function updateEmployee(
  id: number,
  form: { name: string; station: StationName; dept: DepartmentName; role: RoleName; status: EmployeeStatus; startDate: string | null; endDate: string | null },
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update({ name: form.name, station: form.station, dept: form.dept, role: form.role, status: form.status, start_date: form.startDate || null, end_date: form.endDate || null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toEmployee(data as EmpRow);
}

export async function deleteEmployee(id: number): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}


// ---- Shifts ----

export async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await supabase.from('shifts').select('*').order('id');
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
  const { data, error } = await supabase
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

  const { data, error } = await supabase
    .from('shifts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return toShift(data as ShiftRow);
}

export async function updateShiftStatus(id: number, status: ShiftStatus): Promise<void> {
  const { error } = await supabase.from('shifts').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteShift(id: number): Promise<void> {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) throw error;
}

