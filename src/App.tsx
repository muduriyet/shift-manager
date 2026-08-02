import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import type { ViewId, Employee, Shift, ShiftStatus, ShiftCodeKey, StationName, DepartmentName, RoleName, Station, Department, Role, SalesImportConfig, Task, Profile } from './types';
import { SHIFT_CODES, WORK_CODES, isWithinEmployment, yearMonthOf } from './constants';
import { useShiftStore } from './hooks/useShiftStore';
import {
  fetchEmployees,
  createEmployee, updateEmployee, setEmployeeActive,
  createShift, updateShift, updateShiftStatus,
  applyScheduleImport, type ScheduleImportRow,
  fetchStations, createStation, deleteStation,
  fetchDepartments, createDepartment, deleteDepartment,
  fetchRoles, createRole, deleteRole,
  fetchSalesConfigs,
  fetchTasks, fetchProfiles, setTaskDone, createTask, updateTask, archiveTask, logTaskActivity, linkAttachments,
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
const VIEW_IDS: readonly ViewId[] = ['cizelge', 'personeller', 'gunluk', 'gorev', 'raporlar', 'ayarlar', 'satis'];

function isViewId(value: string | null): value is ViewId {
  return value !== null && (VIEW_IDS as readonly string[]).includes(value);
}

function readStoredView(): ViewId {
  const stored = localStorage.getItem('vy_view');
  if (isViewId(stored)) return stored;
  if (stored !== null) localStorage.removeItem('vy_view');
  return DEFAULT_VIEW;
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
  const [station,     setStation]     = useState('Tümü');
  const [dept,        setDept]        = useState('Tümü');
  const [stations,    setStations]    = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles,       setRoles]       = useState<Role[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const shiftStore = useShiftStore();
  const { shifts, setShifts, ensureMonths, reloadMonths, isMonthPending } = shiftStore;
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
  // Izgarada toplu kod ataması sürerken yeni seçim/atama kabul edilmez.
  const [gridBusy, setGridBusy] = useState(false);

  useEffect(() => { localStorage.setItem('vy_view', view); }, [view]);
  useEffect(() => { setDrawer(false); }, [view]);

  // Oturum kapısı: açılışta mevcut oturumu oku, sonra login/logout/token değişimlerini dinle.
  const resetShifts = shiftStore.reset;
  useEffect(() => {
    let mounted = true;
    getCurrentSession()
      .then(s => { if (mounted) { setSession(s); setAuthReady(true); } })
      .catch(() => { if (mounted) setAuthReady(true); });
    const unsub = onAuthChange((_event, s) => {
      setSession(s);
      if (!s) {
        // SIGNED_OUT / token yenilenemedi: bellekteki veriyi temizle, login'e dön.
        // resetShifts yüklenmiş ay kümesini de sıfırlar; yeni oturumda aylar
        // "zaten yüklü" sanılıp atlanmaz.
        setEmployees([]); resetShifts();
        setStations([]); setDepartments([]); setRoles([]); setSalesConfigs([]);
        setTasks([]); setProfiles([]);
        setLoadError(null); setLoading(true);
      }
    });
    return () => { mounted = false; unsub(); };
  }, [resetShifts]);

  // Veri yükleme yalnızca oturum açıkken çalışır (girişten önce fetch yok).
  // userId'ye bağlı: token yenilenince (aynı kullanıcı) tekrar yüklemez.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    async function load() {
      try {
        // Vardiyalar burada topluca çekilmez: yalnızca açılışta gösterilen ay
        // yüklenir, diğer aylar ekranlar istedikçe gelir (bkz. useShiftStore).
        const [sts, depts, rls, emps, sconfigs, tsks, profs] = await Promise.all([
          fetchStations(), fetchDepartments(), fetchRoles(), fetchEmployees(), fetchSalesConfigs(),
          fetchTasks(), fetchProfiles(),
          ensureMonths([activeMonth]),
        ]);
        if (!active) return;
        setStations(sts);
        setDepartments(depts);
        setRoles(rls);
        setEmployees(emps);
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

  // Izgarada kod atama (tek hücre de çok hücre de buradan geçer).
  // Önceden hücre başına bir istek atılıyor ve hepsi aynı anda başlatılıyordu:
  // 620 hücrelik bir seçim 620 paralel istek demekti — yavaş, geri bildirimsiz
  // ve yarıda kesilirse tutarsız. Artık tek RPC, tek transaction.
  const gridBusyRef = useRef(false);
  const setCodes = useCallback(async (cells: Array<{ empId: number; dayIdx: number }>, code: ShiftCodeKey) => {
    if (!cells.length) return;
    if (gridBusyRef.current) { toast('Önceki atama sürüyor, lütfen bekleyin'); return; }

    const [y, m] = activeMonth.split('-').map(Number);
    const dateOf = (idx: number) => `${y}-${String(m).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`;
    const empById = new Map(employees.map(e => [e.id, e]));
    const existingByCell = new Map(shifts.map(s => [`${s.empId}|${s.shiftDate}`, s]));

    const isWork = (WORK_CODES as readonly string[]).includes(code);
    const sc = SHIFT_CODES[code];
    const deleteIds: number[] = [];
    const rows: ScheduleImportRow[] = [];
    let skipped = 0;
    let unchanged = 0;

    for (const { empId, dayIdx } of cells) {
      const emp = empById.get(empId);
      if (!emp) continue;
      const dateStr = dateOf(dayIdx);
      // Çalışma aralığı dışındaki hücreler yazılmaz; kaç tanesi atlandı sayılır
      // ki kullanıcı sessiz bir kayıpla karşılaşmasın.
      if (!isWithinEmployment(emp.startDate, emp.endDate, dateStr)) { skipped += 1; continue; }

      const existing = existingByCell.get(`${empId}|${dateStr}`);
      if (code === '-') {
        if (existing) deleteIds.push(existing.id); else unchanged += 1;
        continue;
      }
      // Zaten aynı kod olan hücreye tekrar yazma.
      if (existing && existing.code === code) { unchanged += 1; continue; }
      rows.push({
        empId, shiftDate: dateStr, code,
        start: isWork ? sc.start! : '',
        end:   isWork ? sc.end!   : '',
        role: emp.role, station: emp.station, dept: emp.dept,
        // Izgarada kod düzeltmek devam kaydını silmez: mevcut kaydın durumu
        // (Geldi/Gelmedi) korunur, yalnızca yeni kayıt Planlandı başlar.
        // Excel import'u bilinçli olarak Planlandı'ya çeker; ızgara düzeltmesi
        // ondan farklıdır ve öyle kalmalı.
        status: existing?.status ?? 'Planlandı',
        note: existing?.note ?? '',
      });
    }

    if (!deleteIds.length && !rows.length) {
      toast(skipped > 0
        ? `${skipped} hücre çalışma aralığı dışında olduğu için atlandı`
        : 'Değişiklik yok — hücreler zaten bu kodda');
      return;
    }

    gridBusyRef.current = true;
    setGridBusy(true);
    try {
      await applyScheduleImport(deleteIds, rows);
      await reloadMonths([activeMonth]);
      const parts = [`${deleteIds.length + rows.length} hücre güncellendi`];
      if (skipped)   parts.push(`${skipped} hücre çalışma aralığı dışında, atlandı`);
      if (unchanged) parts.push(`${unchanged} hücre zaten aynıydı`);
      toast(parts.join(' · '));
    } catch (err) {
      console.error('Toplu kod atama başarısız', err);
      toast(`Hiçbir hücre değişmedi: ${shiftErrorMessage(err)}`);
    } finally {
      gridBusyRef.current = false;
      setGridBusy(false);
    }
  }, [activeMonth, employees, shifts, reloadMonths, toast]);

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
    // İstasyon/departman daima personelden alınır. Form bunları salt-okunur
    // gösteriyor ama kaynak burada da sabitleniyor: vardiyanın şubesi ile
    // personelin şubesi ayrışırsa kayıt çizelgede bir şubeye, raporlarda
    // başka bir şubeye sayılıyor.
    const payload = emp ? { ...form, station: emp.station, dept: emp.dept } : form;
    try {
      if (id !== null) {
        const updated = await updateShift(id, { ...payload, code });
        setShifts(prev => prev.map(s => s.id === id ? updated : s));
        toast('Vardiya güncellendi');
      } else {
        const newShift = await createShift({ ...payload, code });
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

  async function handleSaveTask(form: TaskForm, id: number | null, draftAttachmentIds: number[] = []) {
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
        const created = await createTask(form, userId);
        if (draftAttachmentIds.length) await linkAttachments(draftAttachmentIds, created.id);
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

  // Tüm import tek RPC çağrısında, tek transaction'da uygulanır.
  // Önceden aksiyon başına bir istek atılıyordu: 500 kayıtlık bir ay 500 istek
  // demekti ve kullanıcı pencereyi kapatsa ya da bağlantı düşse ay yarı
  // yazılmış kalıyordu. Artık ya tamamı uygulanır ya hiçbiri.
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

    const deleteIds: number[] = [];
    const rows: ScheduleImportRow[] = [];
    let createCount = 0;
    let updateCount = 0;

    for (const action of plan.actions) {
      if (action.kind === 'delete') {
        if (action.existing) deleteIds.push(action.existing.id);
      } else if (action.kind === 'create' || action.kind === 'update') {
        const payload = actionPayload(action);
        rows.push({
          empId: action.emp.id,
          shiftDate: action.dateStr,
          code: payload.code,
          start: payload.start,
          end: payload.end,
          role: action.emp.role,
          station: action.emp.station,
          dept: action.emp.dept,
          status: 'Planlandı',
          // Güncellemede mevcut not korunur; yeni kayıtta boş başlar.
          note: action.existing?.note ?? '',
        });
        if (action.kind === 'create') createCount += 1;
        else updateCount += 1;
      }
    }

    try {
      const applied = await applyScheduleImport(deleteIds, rows);
      result.created = createCount;
      result.updated = updateCount;
      result.deleted = applied.deleted;
      result.resetToPlanned = updateCount;
    } catch (err) {
      // Transaction geri alındığı için kısmi yazma yok: hiçbiri uygulanmadı.
      console.error('Schedule import failed', err);
      result.failed = plan.actions.length;
      result.errors.push(`Hiçbir kayıt yazılmadı: ${shiftErrorMessage(err)}`);
      toast('Import uygulanamadı, hiçbir kayıt değişmedi');
      return result;
    }

    // Kayıtlar silinip yeniden oluşturulduğu için id'ler değişti; etkilenen
    // ayları sunucudan tazele.
    const touched = new Set<string>();
    plan.actions.forEach(a => touched.add(yearMonthOf(a.dateStr)));
    await reloadMonths([...touched]);

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
          activeMonth={activeMonth} setActiveMonth={setActiveMonth}
          codesOf={codesOf} setCodes={setCodes} gridBusy={gridBusy}
          ensureMonths={ensureMonths} isMonthPending={isMonthPending}
          onNewShift={() => { setShiftToEdit(null); setShiftModalOpen(true); }}
          onExport={() => setExportModalOpen(true)}
          onImport={() => setImportModalOpen(true)}
          onCellDetail={(empId, shiftDate) => {
            const existing = shifts.find(s => s.empId === empId && s.shiftDate === shiftDate);
            if (existing) { setShiftToEdit(existing); setShiftModalOpen(true); return; }
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
          ensureMonths={ensureMonths} isMonthPending={isMonthPending}
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
      screen = (
        <ReportsScreen
          employees={employees}
          shifts={shifts}
          stationNames={stationNames}
          deptNames={deptNames}
          ensureMonths={ensureMonths}
          isMonthPending={isMonthPending}
        />
      );
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
          ensureMonths={ensureMonths}
          isMonthLoaded={shiftStore.isMonthLoaded}
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
          ensureMonths={ensureMonths}
          isMonthLoaded={shiftStore.isMonthLoaded}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
