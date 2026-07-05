import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import type { ViewId, ScheduleMode, Employee, Shift, ShiftStatus, ShiftCodeKey, StationName, DepartmentName, RoleName, Station, Department, Role, SalesImportConfig, Task, Profile } from './types';
import { SHIFT_CODES, WORK_CODES, isWithinEmployment } from './constants';
import {
  fetchEmployees, fetchShifts,
  createEmployee, updateEmployee, setEmployeeActive,
  createShift, updateShift, updateShiftStatus, deleteShift,
  fetchStations, createStation, deleteStation,
  fetchDepartments, createDepartment, deleteDepartment,
  fetchRoles, createRole, deleteRole,
  fetchSalesConfigs,
  fetchTasks, fetchProfiles, setTaskDone, createTask, updateTask, archiveTask, logTaskActivity,
} from './lib/db';
import type { TaskForm } from './lib/db';
import { isSupabaseConfigError, getCurrentSession, onAuthChange, signOut, emailToUsername } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { LoginScreen } from './components/auth/LoginScreen';
import { Sidebar, TopbarMobile, ToastStack } from './components/layout/Sidebar';
import { ScheduleScreen } from './components/schedule/ScheduleScreen';
import { EmployeesScreen } from './components/employees/EmployeesScreen';
import { DailyScreen } from './components/daily/DailyScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { TaskNotebookScreen } from './components/tasks/TaskNotebookScreen';
import { TaskModal } from './components/modals/TaskModal';
import { ShiftModal } from './components/modals/ShiftModal';
import { EmployeeModal } from './components/modals/EmployeeModal';
import { ScheduleImportModal } from './components/modals/ScheduleImportModal';
import { ScheduleExportModal } from './components/modals/ScheduleExportModal';
import {
  actionPayload,
  type ScheduleImportApplyResult,
  type ScheduleImportPlan,
} from './lib/scheduleImport';

// Satış ekranı (Recharts + tüm satış kodu) yalnızca bu sekmeye girilince yüklenir → ilk paket küçük kalır.
const SalesScreen = lazy(() =>
  import('./components/sales/SalesScreen').then(m => ({ default: m.SalesScreen }))
);

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
  shiftName: string;
  scheduleName: string;
  station: StationName;
  dept: DepartmentName;
  role: RoleName;
  status: 'Aktif' | 'Pasif';
  startDate: string | null;
  endDate: string | null;
}

const DEFAULT_VIEW: ViewId = 'cizelge';
const DEFAULT_SCHEDULE_MODE: ScheduleMode = 'ay';
const VIEW_IDS: readonly ViewId[] = ['cizelge', 'personeller', 'gunluk', 'gorev', 'raporlar', 'ayarlar', 'satis'];
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
  const [salesConfigs, setSalesConfigs] = useState<SalesImportConfig[]>([]);
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [profiles,    setProfiles]    = useState<Profile[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>(todayYearMonth);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [session,     setSession]     = useState<Session | null>(null);
  const [authReady,   setAuthReady]   = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftToEdit,    setShiftToEdit]    = useState<Shift | null>(null);
  const [empModalOpen,   setEmpModalOpen]   = useState(false);
  const [empToEdit,      setEmpToEdit]      = useState<Employee | null>(null);
  const [taskModalOpen,  setTaskModalOpen]  = useState(false);
  const [taskToEdit,     setTaskToEdit]     = useState<Task | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => { localStorage.setItem('vy_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('vy_mode', mode); }, [mode]);
  useEffect(() => { setDrawer(false); }, [view]);

  // Oturum kapısı: açılışta mevcut oturumu oku, sonra login/logout/token değişimlerini dinle.
  useEffect(() => {
    let mounted = true;
    getCurrentSession()
      .then(s => { if (mounted) { setSession(s); setAuthReady(true); } })
      .catch(() => { if (mounted) setAuthReady(true); });
    const unsub = onAuthChange((_event, s) => {
      setSession(s);
      if (!s) {
        // SIGNED_OUT / token yenilenemedi: bellekteki veriyi temizle, login'e dön.
        setEmployees([]); setShifts([]);
        setStations([]); setDepartments([]); setRoles([]); setSalesConfigs([]);
        setTasks([]); setProfiles([]);
        setLoadError(null); setLoading(true);
      }
    });
    return () => { mounted = false; unsub(); };
  }, []);

  // Veri yükleme yalnızca oturum açıkken çalışır (girişten önce fetch yok).
  // userId'ye bağlı: token yenilenince (aynı kullanıcı) tekrar yüklemez.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    async function load() {
      try {
        const [sts, depts, rls, emps, shfts, sconfigs, tsks, profs] = await Promise.all([
          fetchStations(), fetchDepartments(), fetchRoles(), fetchEmployees(), fetchShifts(), fetchSalesConfigs(),
          fetchTasks(), fetchProfiles(),
        ]);
        if (!active) return;
        setStations(sts);
        setDepartments(depts);
        setRoles(rls);
        setEmployees(emps);
        setShifts(shfts);
        setSalesConfigs(sconfigs);
        setTasks(tsks);
        setProfiles(profs);
      } catch (err) {
        console.error('Veri yüklenemedi:', err);
        if (active) setLoadError(loadErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      toast('Çıkış yapılamadı, tekrar deneyin');
    }
    // Oturum durumu sıfırlama ve veri temizliği onAuthChange aboneliğinde yapılır.
  }

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
      name: form.name,
      shiftName: form.shiftName.trim(),
      scheduleName: form.scheduleName.trim(),
      stationId, deptId, roleId,
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

  async function handleToggleTaskDone(task: Task, done: boolean) {
    try {
      await setTaskDone(task, done, userId);
      // Tekrarlayan görev tamamlanınca sunucu yeni bir örnek ekleyebilir → taze çek.
      setTasks(await fetchTasks());
    } catch {
      toast('Görev güncellenemedi');
    }
  }

  async function handleSaveTask(form: TaskForm, id: number | null) {
    try {
      if (id !== null) {
        await updateTask(id, form);
        const prev = taskToEdit;
        if (prev) {
          let action = 'görevi güncelledi';
          if (form.isTeam !== prev.isTeam) action = form.isTeam ? 'görevi ortak göreve çevirdi' : 'görevi kişiye atadı';
          else if ((form.assigneeId ?? null) !== (prev.assigneeId ?? null)) action = 'görevi devraldı';
          await logTaskActivity(id, userId, action);
        }
        toast('Görev güncellendi');
      } else {
        await createTask(form, userId);
        toast('Yeni görev eklendi');
      }
      setTasks(await fetchTasks());
      setTaskModalOpen(false);
      setTaskToEdit(null);
    } catch {
      toast('Görev kaydedilemedi, tekrar deneyin');
    }
  }

  async function handleArchiveTask(id: number) {
    try {
      await archiveTask(id);
      setTasks(await fetchTasks());
      setTaskModalOpen(false);
      setTaskToEdit(null);
      toast('Görev arşivlendi');
    } catch {
      toast('Görev arşivlenemedi');
    }
  }

  async function handleApplyScheduleImport(plan: ScheduleImportPlan): Promise<ScheduleImportApplyResult> {
    const result: ScheduleImportApplyResult = {
      created: 0,
      updated: 0,
      deleted: 0,
      failed: 0,
      statusPreserved: plan.statusPreservedCount,
      resetToPlanned: 0,
      skippedNames: plan.unmatchedNames,
      errors: [],
    };
    let nextShifts = shifts;

    for (const action of plan.actions) {
      try {
        if (action.kind === 'delete') {
          if (!action.existing) continue;
          await deleteShift(action.existing.id);
          nextShifts = nextShifts.filter(s => s.id !== action.existing!.id);
          result.deleted += 1;
        } else if (action.kind === 'create') {
          const payload = actionPayload(action);
          const created = await createShift({
            empId: action.emp.id,
            station: action.emp.station,
            dept: action.emp.dept,
            shiftDate: action.dateStr,
            start: payload.start,
            end: payload.end,
            role: action.emp.role,
            status: 'Planlandı',
            note: '',
            code: payload.code,
          });
          nextShifts = [...nextShifts, created];
          result.created += 1;
        } else if (action.kind === 'update' && action.existing) {
          const payload = actionPayload(action);
          const updated = await updateShift(action.existing.id, {
            station: action.emp.station,
            dept: action.emp.dept,
            role: action.emp.role,
            start: payload.start,
            end: payload.end,
            status: 'Planlandı',
            code: payload.code,
          });
          nextShifts = nextShifts.map(s => s.id === updated.id ? updated : s);
          result.updated += 1;
          result.resetToPlanned += 1;
        }
      } catch (err) {
        result.failed += 1;
        result.errors.push(`${action.emp.name} · ${action.dateStr}: ${shiftErrorMessage(err)}`);
      }
    }

    setShifts(nextShifts);
    toast(`Import tamamlandı: ${result.created} yeni, ${result.updated} güncelleme, ${result.deleted} silme`);
    return result;
  }

  if (!authReady) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Yükleniyor…</div>
          <div style={{ fontSize: 13 }}>Oturum kontrol ediliyor</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
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
          onExport={() => setExportModalOpen(true)}
          onImport={() => setImportModalOpen(true)}
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
    case 'gorev':
      screen = (
        <TaskNotebookScreen
          tasks={tasks}
          profiles={profiles}
          onToggleDone={handleToggleTaskDone}
          onAdd={() => { setTaskToEdit(null); setTaskModalOpen(true); }}
          onEdit={t => { setTaskToEdit(t); setTaskModalOpen(true); }}
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
    case 'satis':
      screen = (
        <SalesScreen
          stations={stations}
          departments={departments}
          salesConfigs={salesConfigs}
          setSalesConfigs={setSalesConfigs}
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
        username={emailToUsername(session.user.email)}
        onSignOut={handleSignOut}
      />
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <TopbarMobile onMenuOpen={() => setDrawer(true)} />
        <div className="content">
          <Suspense fallback={
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 320, color: 'var(--muted-foreground)', fontSize: 13 }}>Yükleniyor…</div>
          }>{screen}</Suspense>
        </div>
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
      {taskModalOpen && (
        <TaskModal
          task={taskToEdit}
          profiles={profiles}
          currentUserId={userId}
          onClose={() => { setTaskModalOpen(false); setTaskToEdit(null); }}
          onSave={handleSaveTask}
          onArchive={handleArchiveTask}
        />
      )}
      {importModalOpen && (
        <ScheduleImportModal
          employees={employees}
          shifts={shifts}
          stationNames={stationNames}
          deptNames={deptNames}
          initialStation={station}
          initialDept={dept}
          initialMonth={activeMonth}
          onClose={() => setImportModalOpen(false)}
          onApply={handleApplyScheduleImport}
        />
      )}
      {exportModalOpen && (
        <ScheduleExportModal
          employees={employees}
          shifts={shifts}
          stationNames={stationNames}
          deptNames={deptNames}
          initialStation={station}
          initialDept={dept}
          initialMonth={activeMonth}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
