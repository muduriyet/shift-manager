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
export type ShiftStatus = 'Planlandı' | 'Geldi' | 'Geç Kaldı' | 'Gelmedi';
export type EmployeeStatus = 'Aktif' | 'Pasif';
export type ViewId = 'cizelge' | 'personeller' | 'gunluk' | 'raporlar' | 'ayarlar';
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

