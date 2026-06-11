import { useState, useCallback, useEffect } from 'react';
import type { ViewId, ScheduleMode, Employee, Shift, ShiftStatus, ShiftCodeKey, StationName, DepartmentName, RoleName } from './types';
import { SHIFT_CODES, WORK_CODES } from './constants';
import {
  fetchEmployees, fetchShifts,
  createEmployee, updateEmployee, deleteEmployee,
  createShift, updateShift, updateShiftStatus, deleteShift,
} from './lib/db';
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
  return '-';
}

export default function App() {
  const [view,        setView]        = useState<ViewId>(() => (localStorage.getItem('vy_view') as ViewId) ?? 'cizelge');
  const [mode,        setMode]        = useState<ScheduleMode>(() => (localStorage.getItem('vy_mode') as ScheduleMode) ?? 'ay');
  const [station,     setStation]     = useState('Tümü');
  const [dept,        setDept]        = useState('Tümü');
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [shifts,      setShifts]      = useState<Shift[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>(todayYearMonth);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(false);
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
        const [emps, shfts] = await Promise.all([fetchEmployees(), fetchShifts()]);
        setEmployees(emps);
        setShifts(shfts);
      } catch (err) {
        console.error('Veri yüklenemedi:', err);
        setLoadError(true);
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

    if (emp.startDate && dateStr < emp.startDate) return;
    if (emp.endDate   && dateStr > emp.endDate)   return;

    const isWork = (WORK_CODES as readonly string[]).includes(code);

    if (isWork) {
      const sc = SHIFT_CODES[code];
      if (existing) {
        updateShift(existing.id, { start: sc.start!, end: sc.end!, code })
          .then(updated => setShifts(prev => prev.map(s => s.id === existing.id ? updated : s)))
          .catch(() => {});
      } else {
        createShift({ empId: id, station: emp.station, dept: emp.dept, shiftDate: dateStr, start: sc.start!, end: sc.end!, role: emp.role, status: 'Planlandı', note: '', code })
          .then(newShift => setShifts(prev => [...prev, newShift]))
          .catch(() => {});
      }
    } else if (code === 'İ' || code === 'Yİ' || code === 'Üİ' || code === 'İs') {
      // Off codes stored explicitly as records with no times
      if (existing) {
        updateShift(existing.id, { start: '', end: '', code })
          .then(updated => setShifts(prev => prev.map(s => s.id === existing.id ? updated : s)))
          .catch(() => {});
      } else {
        createShift({ empId: id, station: emp.station, dept: emp.dept, shiftDate: dateStr, start: '', end: '', role: emp.role, status: 'Planlandı', note: '', code })
          .then(newShift => setShifts(prev => [...prev, newShift]))
          .catch(() => {});
      }
    } else {
      // '-' (boş): no record = empty cell, delete shift if exists
      if (existing) {
        deleteShift(existing.id)
          .then(() => setShifts(prev => prev.filter(s => s.id !== existing.id)))
          .catch(() => {});
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
    } catch {
      toast('Bir hata oluştu, tekrar deneyin');
    }
  }

  async function handleSaveEmployee(form: EmployeeFormData, id: number | null) {
    try {
      if (id !== null) {
        const updated = await updateEmployee(id, form);
        setEmployees(prev => prev.map(e => e.id === id ? updated : e));
        setShifts(prev => prev.map(s =>
          s.empId === id ? { ...s, role: form.role, station: form.station, dept: form.dept } : s
        ));

        // Tarih aralığı dışına düşen vardiyaları sil
        const outOfRange = shifts.filter(s => {
          if (s.empId !== id) return false;
          if (form.startDate && s.shiftDate < form.startDate) return true;
          if (form.endDate   && s.shiftDate > form.endDate)   return true;
          return false;
        });
        if (outOfRange.length > 0) {
          await Promise.all(outOfRange.map(s => deleteShift(s.id)));
          const removedIds = new Set(outOfRange.map(s => s.id));
          setShifts(prev => prev.filter(s => !removedIds.has(s.id)));
        }

        toast(form.name + ' güncellendi' + (outOfRange.length > 0 ? ` · ${outOfRange.length} vardiya silindi` : ''));
      } else {
        const newEmp = await createEmployee(form);
        setEmployees(prev => [...prev, newEmp]);
        toast(form.name + ' eklendi');
      }
      setEmpModalOpen(false);
      setEmpToEdit(null);
    } catch {
      toast('Bir hata oluştu, tekrar deneyin');
    }
  }

  async function handleDeleteEmployee(id: number) {
    const emp = employees.find(e => e.id === id);
    try {
      await deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      setShifts(prev => prev.filter(s => s.empId !== id));
      toast((emp?.name ?? 'Personel') + ' silindi');
    } catch {
      toast('Silme işlemi başarısız');
    }
  }

  if (loading || loadError) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
          {loadError ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--absent-fg)' }}>Bağlantı hatası</div>
              <div style={{ fontSize: 13 }}>Supabase'e ulaşılamıyor. .env.local dosyasını kontrol edin.</div>
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
          station={station} setStation={setStation}
          dept={dept} setDept={setDept}
          mode={mode} setMode={setMode}
          activeMonth={activeMonth} setActiveMonth={setActiveMonth}
          codesOf={codesOf} setCode={setCode}
          onNewShift={() => { setShiftToEdit(null); setShiftModalOpen(true); }}
          onShiftClick={s => { setShiftToEdit(s); setShiftModalOpen(true); }}
        />
      );
      break;
    case 'personeller':
      screen = (
        <EmployeesScreen
          employees={employees}
          onEdit={e => { setEmpToEdit(e); setEmpModalOpen(true); }}
          onAdd={() => { setEmpToEdit(null); setEmpModalOpen(true); }}
          onDelete={handleDeleteEmployee}
        />
      );
      break;
    case 'gunluk':
      screen = (
        <DailyScreen
          shifts={shifts}
          employees={employees}
          station={station} setStation={setStation}
          dept={dept} setDept={setDept}
          setStatus={handleSetStatus}
        />
      );
      break;
    case 'raporlar':
      screen = <ReportsScreen employees={employees} shifts={shifts} />;
      break;
    case 'ayarlar':
      screen = <SettingsScreen employees={employees} onToast={toast} />;
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
          onClose={() => { setShiftModalOpen(false); setShiftToEdit(null); }}
          onSave={(form, id) => handleSaveShift(form as ShiftFormData, id)}
        />
      )}
      {empModalOpen && (
        <EmployeeModal
          employee={empToEdit}
          onClose={() => { setEmpModalOpen(false); setEmpToEdit(null); }}
          onSave={(form, id) => handleSaveEmployee(form as EmployeeFormData, id)}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
