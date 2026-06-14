import { useState, useCallback, useEffect } from 'react';
import type { ViewId, ScheduleMode, Employee, Shift, ShiftStatus, ShiftCodeKey, StationName, DepartmentName, RoleName, Station, Department, Role } from './types';
import { SHIFT_CODES, WORK_CODES, isWithinEmployment } from './constants';
import {
  fetchEmployees, fetchShifts,
  createEmployee, updateEmployee, setEmployeeActive,
  createShift, updateShift, updateShiftStatus, deleteShift,
  fetchStations, createStation, deleteStation,
  fetchDepartments, createDepartment, deleteDepartment,
  fetchRoles, createRole, deleteRole,
} from './lib/db';
import { isSupabaseConfigError } from './lib/supabase';
import { Sidebar, TopbarMobile, ToastStack } from './components/layout/Sidebar';
import { ScheduleScreen } from './components/schedule/ScheduleScreen';
import { EmployeesScreen } from './components/employees/EmployeesScreen';
import { DailyScreen } from './components/daily/DailyScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { ShiftModal } from './components/modals/ShiftModal';
import { EmployeeModal } from './components/modals/EmployeeModal';

interface ToastItem { id: number; msg: string }

interface ShiftFormData {
  empId: number;
  station: StationName;
  dept: DepartmentName;
  shiftDate: string;
  start: string;
  end: string;
  role: RoleName;
  status: ShiftStatus;
  note: string;
}

interface EmployeeFormData {
  name: string;
  station: StationName;
  dept: DepartmentName;
  role: RoleName;
  status: 'Aktif' | 'Pasif';
  startDate: string | null;
  endDate: string | null;
}

const DEFAULT_VIEW: ViewId = 'cizelge';
const DEFAULT_SCHEDULE_MODE: ScheduleMode = 'ay';
const VIEW_IDS: readonly ViewId[] = ['cizelge', 'personeller', 'gunluk', 'raporlar', 'ayarlar'];
const SCHEDULE_MODES: readonly ScheduleMode[] = ['hafta', 'ay'];

function isViewId(value: string | null): value is ViewId {
  return value !== null && (VIEW_IDS as readonly string[]).includes(value);
}

function isScheduleMode(value: string | null): value is ScheduleMode {
  return value !== null && (SCHEDULE_MODES as readonly string[]).includes(value);
}

function readStoredView(): ViewId {
  const stored = localStorage.getItem('vy_view');
  if (isViewId(stored)) return stored;
  if (stored !== null) localStorage.removeItem('vy_view');
  return DEFAULT_VIEW;
}

function readStoredScheduleMode(): ScheduleMode {
  const stored = localStorage.getItem('vy_mode');
  if (isScheduleMode(stored)) return stored;
  if (stored !== null) localStorage.removeItem('vy_mode');
  return DEFAULT_SCHEDULE_MODE;
}

function todayYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInYearMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function codeFromTimes(start: string, end: string): ShiftCodeKey {
  if (start === '08:00' && end === '16:00') return 'S';
  if (start === '16:00' && end === '00:00') return 'Ö';
  if (start === '00:00' && end === '08:00') return 'G';
  if (start && end) return 'Öz';  // şablon dışı, serbest saatli çalışma vardiyası
  return '-';
}

function isDuplicateShiftError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; details?: string };
  const text = `${e.message ?? ''} ${e.details ?? ''}`;
  return e.code === '23505' || text.includes('shifts_emp_id_shift_date_unique');
}

function shiftErrorMessage(err: unknown): string {
  if (isDuplicateShiftError(err)) {
    return 'Bu personel için seçili tarihte zaten vardiya var';
  }
  return 'Vardiya kaydedilemedi, tekrar deneyin';
}

function loadErrorMessage(err: unknown): string {
  if (isSupabaseConfigError(err)) return err.message;
  return "Supabase'e ulaşılamıyor. .env.local dosyasını, ağ bağlantısını ve Supabase ayarlarını kontrol edin.";
}

export default function App() {
  const [view,        setView]        = useState<ViewId>(readStoredView);
  const [mode,        setMode]        = useState<ScheduleMode>(readStoredScheduleMode);
  const [station,     setStation]     = useState('Tümü');
  const [dept,        setDept]        = useState('Tümü');
  const [stations,    setStations]    = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles,       setRoles]       = useState<Role[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [shifts,      setShifts]      = useState<Shift[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>(todayYearMonth);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftToEdit,    setShiftToEdit]    = useState<Shift | null>(null);
  const [empModalOpen,   setEmpModalOpen]   = useState(false);
  const [empToEdit,      setEmpToEdit]      = useState<Employee | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => { localStorage.setItem('vy_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('vy_mode', mode); }, [mode]);
  useEffect(() => { setDrawer(false); }, [view]);

  useEffect(() => {
    async function load() {
      try {
        const [sts, depts, rls, emps, shfts] = await Promise.all([
          fetchStations(), fetchDepartments(), fetchRoles(), fetchEmployees(), fetchShifts(),
        ]);
        setStations(sts);
        setDepartments(depts);
        setRoles(rls);
        setEmployees(emps);
        setShifts(shfts);
      } catch (err) {
        console.error('Veri yüklenemedi:', err);
        setLoadError(loadErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  const stationNames = stations.map(s => s.name);
  const deptNames    = departments.map(d => d.name);
  const roleNames    = roles.map(r => r.name);
  const deptColors   = Object.fromEntries(departments.map(d => [d.name, d.color]));

  async function handleAddStation(name: string) {
    const s = await createStation(name);
    setStations(prev => [...prev, s]);
    toast(`${name} istasyonu eklendi`);
  }

  async function handleDeleteStation(id: number) {
    await deleteStation(id);
    setStations(prev => prev.filter(s => s.id !== id));
    toast('İstasyon silindi');
  }

  async function handleAddDepartment(name: string, color: string) {
    const d = await createDepartment(name, color);
    setDepartments(prev => [...prev, d]);
    toast(`${name} departmanı eklendi`);
  }

  async function handleDeleteDepartment(id: number) {
    await deleteDepartment(id);
    setDepartments(prev => prev.filter(d => d.id !== id));
    toast('Departman silindi');
  }

  async function handleAddRole(name: string) {
    const r = await createRole(name);
    setRoles(prev => [...prev, r]);
    toast(`${name} görevi eklendi`);
  }

  async function handleDeleteRole(id: number) {
    await deleteRole(id);
    setRoles(prev => prev.filter(r => r.id !== id));
    toast('Görev silindi');
  }

  // Derive monthly codes directly from the shifts array — no separate state needed
  // No record = '-' (boş/unassigned). İ and Yİ are stored explicitly as records.
  const codesOf = useCallback((id: number): ShiftCodeKey[] => {
    const days = daysInYearMonth(activeMonth);
    const result = Array(days).fill('-') as ShiftCodeKey[];
    shifts
      .filter(s => s.empId === id && s.shiftDate.startsWith(activeMonth + '-'))
      .forEach(s => {
        const dayIdx = parseInt(s.shiftDate.slice(8, 10), 10) - 1;
        if (dayIdx >= 0 && dayIdx < days) result[dayIdx] = s.code;
      });
    return result;
  }, [shifts, activeMonth]);

  const setCode = useCallback((id: number, idx: number, code: ShiftCodeKey) => {
    const [y, m] = activeMonth.split('-').map(Number);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`;
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const existing = shifts.find(s => s.empId === id && s.shiftDate === dateStr);

    if (!isWithinEmployment(emp.startDate, emp.endDate, dateStr)) return;

    const isWork = (WORK_CODES as readonly string[]).includes(code);

    if (isWork) {
      const sc = SHIFT_CODES[code];
      if (existing) {
        updateShift(existing.id, { start: sc.start!, end: sc.end!, code })
          .then(updated => setShifts(prev => prev.map(s => s.id === existing.id ? updated : s)))
          .catch(err => toast(shiftErrorMessage(err)));
      } else {
        createShift({ empId: id, station: emp.station, dept: emp.dept, shiftDate: dateStr, start: sc.start!, end: sc.end!, role: emp.role, status: 'Planlandı', note: '', code })
          .then(newShift => setShifts(prev => [...prev, newShift]))
          .catch(err => toast(shiftErrorMessage(err)));
      }
    } else if (code === 'İ' || code === 'Yİ' || code === 'Üİ' || code === 'İs') {
      // Off codes stored explicitly as records with no times
      if (existing) {
        updateShift(existing.id, { start: '', end: '', code })
          .then(updated => setShifts(prev => prev.map(s => s.id === existing.id ? updated : s)))
          .catch(err => toast(shiftErrorMessage(err)));
      } else {
        createShift({ empId: id, station: emp.station, dept: emp.dept, shiftDate: dateStr, start: '', end: '', role: emp.role, status: 'Planlandı', note: '', code })
          .then(newShift => setShifts(prev => [...prev, newShift]))
          .catch(err => toast(shiftErrorMessage(err)));
      }
    } else {
      // '-' (boş): no record = empty cell, delete shift if exists
      if (existing) {
        deleteShift(existing.id)
          .then(() => setShifts(prev => prev.filter(s => s.id !== existing.id)))
          .catch(err => toast(shiftErrorMessage(err)));
      }
    }
  }, [activeMonth, employees, shifts]);

  async function handleSetStatus(shiftId: number, status: ShiftStatus) {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift || !(WORK_CODES as readonly string[]).includes(shift.code)) return;
    const prev = shift.status;
    setShifts(s => s.map(x => x.id === shiftId ? { ...x, status } : x));
    try {
      await updateShiftStatus(shiftId, status);
    } catch {
      setShifts(s => s.map(x => x.id === shiftId ? { ...x, status: prev } : x));
      toast('Durum güncellenemedi');
    }
  }

  async function handleSaveShift(form: ShiftFormData, id: number | null) {
    const code = codeFromTimes(form.start, form.end);
    const emp = employees.find(e => e.id === form.empId);
    if (emp && !isWithinEmployment(emp.startDate, emp.endDate, form.shiftDate)) {
      toast('Seçili tarih personelin çalışma aralığı dışında');
      return;
    }
    try {
      if (id !== null) {
        const updated = await updateShift(id, { ...form, code });
        setShifts(prev => prev.map(s => s.id === id ? updated : s));
        toast('Vardiya güncellendi');
      } else {
        const newShift = await createShift({ ...form, code });
        setShifts(prev => [...prev, newShift]);
        toast('Yeni vardiya eklendi');
      }
      setShiftModalOpen(false);
      setShiftToEdit(null);
    } catch (err) {
      toast(shiftErrorMessage(err));
    }
  }

  async function handleSaveEmployee(form: EmployeeFormData, id: number | null) {
    // İstasyon/departman/görev adlarını FK id'lerine çevir (DB id ile tutuyor, UI isimle çalışıyor)
    const stationId = stations.find(s => s.name === form.station)?.id;
    const deptId    = departments.find(d => d.name === form.dept)?.id;
    const roleId    = roles.find(r => r.name === form.role)?.id;
    if (stationId == null || deptId == null || roleId == null) {
      toast('Geçersiz istasyon, departman veya görev');
      return;
    }
    const payload = {
      name: form.name, stationId, deptId, roleId,
      status: form.status,
      startDate: form.startDate, endDate: form.endDate,
    };
    try {
      if (id !== null) {
        const updated = await updateEmployee(id, payload);
        setEmployees(prev => prev.map(e => e.id === id ? updated : e));

        // Vardiya station/dept/role değerleri tarihsel snapshot'tır. Personel
        // güncellenince mevcut vardiyalar değiştirilmez; yeni vardiyalar güncel
        // personel atamasını kullanır. Giriş/çıkış aralığı dışındaki vardiyalar da
        // SİLİNMEZ; DB'de korunur ve görünümlerde isWithinEmployment ile süzülür.
        toast(form.name + ' güncellendi');
      } else {
        const newEmp = await createEmployee(payload);
        setEmployees(prev => [...prev, newEmp]);
        toast(form.name + ' eklendi');
      }
      setEmpModalOpen(false);
      setEmpToEdit(null);
    } catch {
      toast('Bir hata oluştu, tekrar deneyin');
    }
  }

  async function handleSetEmployeeActive(id: number, active: boolean) {
    const emp = employees.find(e => e.id === id);
    try {
      const updated = await setEmployeeActive(id, active);
      // Soft delete: personel listede kalır, vardiya geçmişi (shifts) korunur.
      setEmployees(prev => prev.map(e => e.id === id ? updated : e));
      toast((emp?.name ?? 'Personel') + (active ? ' tekrar aktif edildi' : ' pasife alındı'));
    } catch {
      toast(active ? 'Aktifleştirme başarısız' : 'Pasife alma başarısız');
    }
  }

  if (loading || loadError) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
          {loadError ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--absent-fg)' }}>Bağlantı hatası</div>
              <div style={{ fontSize: 13, maxWidth: 420 }}>{loadError}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Yükleniyor…</div>
              <div style={{ fontSize: 13 }}>Veriler hazırlanıyor</div>
            </>
          )}
        </div>
      </div>
    );
  }

  let screen: React.ReactNode;
  switch (view) {
    case 'cizelge':
      screen = (
        <ScheduleScreen
          shifts={shifts}
          employees={employees}
          stationNames={stationNames}
          deptNames={deptNames}
          deptColors={deptColors}
          station={station} setStation={setStation}
          dept={dept} setDept={setDept}
          mode={mode} setMode={setMode}
          activeMonth={activeMonth} setActiveMonth={setActiveMonth}
          codesOf={codesOf} setCode={setCode}
          onNewShift={() => { setShiftToEdit(null); setShiftModalOpen(true); }}
          onShiftClick={s => { setShiftToEdit(s); setShiftModalOpen(true); }}
          onCellAdd={(empId, shiftDate) => {
            const emp = employees.find(e => e.id === empId);
            if (!emp) return;
            // Seed (id:0) → modal "Yeni Vardiya Ekle" modunda ama personel + tarih dolu açılır.
            setShiftToEdit({
              id: 0, empId, shiftDate, dayIndex: 0, code: '-',
              start: '08:00', end: '16:00',
              role: emp.role, station: emp.station, dept: emp.dept,
              status: 'Planlandı', note: '',
            });
            setShiftModalOpen(true);
          }}
        />
      );
      break;
    case 'personeller':
      screen = (
        <EmployeesScreen
          employees={employees}
          stationNames={stationNames}
          deptNames={deptNames}
          onEdit={e => { setEmpToEdit(e); setEmpModalOpen(true); }}
          onAdd={() => { setEmpToEdit(null); setEmpModalOpen(true); }}
          onSetActive={handleSetEmployeeActive}
        />
      );
      break;
    case 'gunluk':
      screen = (
        <DailyScreen
          shifts={shifts}
          employees={employees}
          stationNames={stationNames}
          deptNames={deptNames}
          station={station} setStation={setStation}
          dept={dept} setDept={setDept}
          setStatus={handleSetStatus}
        />
      );
      break;
    case 'raporlar':
      screen = <ReportsScreen employees={employees} shifts={shifts} stationNames={stationNames} deptNames={deptNames} />;
      break;
    case 'ayarlar':
      screen = (
        <SettingsScreen
          employees={employees}
          stations={stations}
          departments={departments}
          roles={roles}
          onAddStation={handleAddStation}
          onDeleteStation={handleDeleteStation}
          onAddDepartment={handleAddDepartment}
          onDeleteDepartment={handleDeleteDepartment}
          onAddRole={handleAddRole}
          onDeleteRole={handleDeleteRole}
          onToast={toast}
        />
      );
      break;
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        onNav={setView}
        open={drawer}
        onClose={() => setDrawer(false)}
      />
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <TopbarMobile onMenuOpen={() => setDrawer(true)} />
        <div className="content">{screen}</div>
      </div>

      {shiftModalOpen && (
        <ShiftModal
          shift={shiftToEdit}
          employees={employees}
          stationNames={stationNames}
          deptNames={deptNames}
          roleNames={roleNames}
          onClose={() => { setShiftModalOpen(false); setShiftToEdit(null); }}
          onSave={(form, id) => handleSaveShift(form as ShiftFormData, id)}
        />
      )}
      {empModalOpen && (
        <EmployeeModal
          employee={empToEdit}
          stationNames={stationNames}
          deptNames={deptNames}
          roleNames={roleNames}
          onClose={() => { setEmpModalOpen(false); setEmpToEdit(null); }}
          onSave={(form, id) => handleSaveEmployee(form as EmployeeFormData, id)}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
