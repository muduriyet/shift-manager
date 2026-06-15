import { useState } from 'react';
import type { Shift, Employee, ShiftCodeKey, ScheduleMode, MonthGroup } from '../../types';
import {
  MONTH_NAMES, MONTH_SHORT_NAMES,
  TODAY_DATE, TODAY_DATE_STR, WORK_CODES,
  getMonday, addDays, buildWeekDays, buildMonthDays, getMonthLabel,
  isWithinEmployment,
} from '../../constants';
import { Stat } from '../ui/Stat';
import { Button } from '../ui/Button';
import { DropdownButton } from '../ui/DropdownButton';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';
import { CodeLegend } from './CodeLegend';
import { WeeklyView } from './WeeklyView';
import { MonthlyView } from './MonthlyView';

function buildMonthGroups(
  emps: Employee[],
  stationNames: string[],
  deptNames: string[],
  deptColors: Record<string, string>,
): MonthGroup[] {
  const groups: MonthGroup[] = [];
  stationNames.forEach(st =>
    deptNames.forEach(dp => {
      const group_emps = emps.filter(e => e.station === st && e.dept === dp);
      if (group_emps.length > 0) {
        groups.push({ label: `${st} / ${dp}`, color: deptColors[dp] ?? '#64748b', emps: group_emps });
      }
    })
  );
  return groups;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface ScheduleScreenProps {
  shifts: Shift[];
  employees: Employee[];
  stationNames: string[];
  deptNames: string[];
  deptColors: Record<string, string>;
  station: string;
  setStation: (s: string) => void;
  dept: string;
  setDept: (d: string) => void;
  mode: ScheduleMode;
  setMode: (m: ScheduleMode) => void;
  activeMonth: string;
  setActiveMonth: (m: string) => void;
  codesOf: (id: number) => ShiftCodeKey[];
  setCode: (id: number, idx: number, code: ShiftCodeKey) => void;
  onNewShift: () => void;
  onExport: () => void;
  onImport: () => void;
  onShiftClick: (s: Shift) => void;
  onCellAdd: (empId: number, dateStr: string) => void;
}

export function ScheduleScreen({
  shifts, employees, stationNames, deptNames, deptColors,
  station, setStation, dept, setDept,
  mode, setMode, activeMonth, setActiveMonth,
  codesOf, setCode, onNewShift, onExport, onImport, onShiftClick, onCellAdd,
}: ScheduleScreenProps) {
  // ---- Week navigation ----
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(TODAY_DATE));
  const weekDays = buildWeekDays(weekStart);
  const todayIndex = weekDays.findIndex(d => d.dateStr === TODAY_DATE_STR);
  const weekLabel = `${weekDays[0].n} – ${weekDays[6].n} ${getMonthLabel(weekStart.getFullYear(), weekStart.getMonth())}`;

  function prevWeek() { setWeekStart(d => addDays(d, -7)); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); }

  // ---- Month navigation ----
  const [activeYear, activeMonthNum] = activeMonth.split('-').map(Number);
  const monthDays = buildMonthDays(activeYear, activeMonthNum - 1);
  const todayMidx = monthDays.findIndex(d => {
    const todayYear = TODAY_DATE.getFullYear();
    const todayMonth = TODAY_DATE.getMonth() + 1;
    return activeYear === todayYear && activeMonthNum === todayMonth && d.n === TODAY_DATE.getDate();
  });
  const monthShort = MONTH_SHORT_NAMES[activeMonthNum - 1];
  const monthName  = `${MONTH_NAMES[activeMonthNum - 1]} ${activeYear}`;

  function prevMonth() { setActiveMonth(shiftYearMonth(activeMonth, -1)); }
  function nextMonth() { setActiveMonth(shiftYearMonth(activeMonth, +1)); }

  // ---- Filters ----
  const activeEmps = employees.filter(e => e.status === 'Aktif');
  const filtered = activeEmps.filter(e =>
    (station === 'Tümü' || e.station === station) && (dept === 'Tümü' || e.dept === dept)
  );
  const filteredIds = new Set(filtered.map(e => e.id));
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  // İstihdam penceresi dışındaki (giriş öncesi / çıkış sonrası) vardiyalar
  // kayıtta korunur ama çizelge ve istatistiklerde gösterilmez.
  const filteredShifts = shifts.filter(s => {
    if (!filteredIds.has(s.empId)) return false;
    const emp = employeeMap.get(s.empId);
    return emp ? isWithinEmployment(emp.startDate, emp.endDate, s.shiftDate) : true;
  });

  // Stats use today's work shifts only (S, Ö, G)
  const todayShifts = filteredShifts.filter(s => s.shiftDate === TODAY_DATE_STR && (WORK_CODES as readonly string[]).includes(s.code));
  const stats = {
    total: filtered.length,
    today: todayShifts.length,
  };

  // Weekly view: only shifts in the viewed week
  const weekShifts = filteredShifts.filter(
    s => s.shiftDate >= weekDays[0].dateStr && s.shiftDate <= weekDays[6].dateStr
  );

  const weekGroups: MonthGroup[] = [];
  stationNames.forEach(st => deptNames.forEach(dp => {
    if (station !== 'Tümü' && st !== station) return;
    if (dept !== 'Tümü' && dp !== dept) return;
    const emps = filtered.filter(e => e.station === st && e.dept === dp);
    if (emps.length) weekGroups.push({ label: `${st} / ${dp}`, color: deptColors[dp] ?? '#64748b', emps });
  }));

  const monthGroups = buildMonthGroups(filtered, stationNames, deptNames, deptColors);

  const todayStr = `${TODAY_DATE.getDate()} ${MONTH_SHORT_NAMES[TODAY_DATE.getMonth()]} ${TODAY_DATE.getFullYear()}`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Vardiya Çizelgesi</h1>
          <p className="page-desc">Haftalık/Aylık personel vardiyalarını istasyon ve departman bazında oluşturun ve takip edin.</p>
        </div>
        <div className="page-actions">
          <div className="segment">
            <button className={mode === 'hafta' ? 'on' : ''} onClick={() => setMode('hafta')}>Hafta</button>
            <button className={mode === 'ay' ? 'on' : ''} onClick={() => setMode('ay')}>Ay</button>
          </div>
          {mode === 'hafta' && (
            <div className="weekpick">
              <Button variant="ghost" size="sm" icon="chevronLeft" onClick={prevWeek} />
              <span className="lbl tnum">
                <Icon name="calendar" size={15} style={{ marginRight: 7, verticalAlign: '-2px', color: 'var(--muted-foreground)' }} />
                {weekLabel}
              </span>
              <Button variant="ghost" size="sm" icon="chevronRight" onClick={nextWeek} />
            </div>
          )}
          {mode === 'ay' && (
            <div className="weekpick">
              <Button variant="ghost" size="sm" icon="chevronLeft" onClick={prevMonth} />
              <span className="lbl tnum">
                <Icon name="calendar" size={15} style={{ marginRight: 7, verticalAlign: '-2px', color: 'var(--muted-foreground)' }} />
                {monthName}
              </span>
              <Button variant="ghost" size="sm" icon="chevronRight" onClick={nextMonth} />
            </div>
          )}
          <DropdownButton
            label="Excel"
            icon="download"
            actions={[
              { label: "Excel'e Aktar", icon: 'download', onClick: onExport },
              { label: "Excel'den İçe Aktar", icon: 'inbox', onClick: onImport },
            ]}
          />
          <Button icon="plus" onClick={onNewShift}>Yeni Vardiya Ekle</Button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <Stat
          label="Toplam Personel"
          value={stats.total}
          icon="users"
          tone="primary"
          foot={<span>{[...new Set(filtered.map(e => e.station))].length} istasyon · {[...new Set(filtered.map(e => e.dept))].length} departman</span>}
        />
        <Stat label="Bugünkü Vardiya" value={stats.today} icon="calendar" tone="primary" foot={<span>{todayStr}</span>} />
      </div>

      <div className="card-head" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', border: '1px solid var(--border)', borderBottom: 'none', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="filter" size={16} style={{ color: 'var(--muted-foreground)' }} />
          <Select
            value={station}
            onChange={v => setStation(String(v))}
            icon="pin"
            options={['Tümü', ...stationNames].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm İstasyonlar' : s }))}
          />
          <Select
            value={dept}
            onChange={v => setDept(String(v))}
            icon="layers"
            options={['Tümü', ...deptNames].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm Departmanlar' : s }))}
          />
        </div>
        <div className="desk-only">
          <CodeLegend codes={mode === 'ay' ? ['S', 'Ö', 'G', 'Öz', 'İ', 'Yİ', 'Üİ', 'İs'] : ['S', 'Ö', 'G', 'Öz']} />
        </div>
      </div>

      {mode === 'ay' && (
        <MonthlyView
          groups={monthGroups}
          codesOf={codesOf}
          setCode={setCode}
          monthDays={monthDays}
          todayMidx={todayMidx}
          monthShort={monthShort}
          activeMonth={activeMonth}
        />
      )}
      {mode === 'hafta' && (
        <WeeklyView
          groups={weekGroups}
          shifts={weekShifts}
          employeeMap={employeeMap}
          weekDays={weekDays}
          todayIndex={todayIndex}
          onShiftClick={onShiftClick}
          onNewShift={onNewShift}
          onAddShift={onCellAdd}
        />
      )}
    </div>
  );
}
