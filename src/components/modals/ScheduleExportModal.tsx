import { useEffect, useMemo, useState } from 'react';
import type { Employee, Shift } from '../../types';
import {
  downloadScheduleExport,
  type ScheduleExportScope,
} from '../../lib/scheduleExport';
import { MONTH_NAMES, isEmployedInRange, monthBounds } from '../../constants';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';

interface ScheduleExportModalProps {
  employees: Employee[];
  shifts: Shift[];
  stationNames: string[];
  deptNames: string[];
  initialStation: string;
  initialDept: string;
  initialMonth: string;
  ensureMonths: (months: string[]) => void;
  isMonthLoaded: (yearMonth: string) => boolean;
  onClose: () => void;
}

function firstRealValue(current: string, values: string[]): string {
  return current !== 'Tümü' && values.includes(current) ? current : values[0] ?? '';
}

function scopeLabel(scope: ScheduleExportScope): string {
  if (!scope.yearMonth) return `${scope.station} / ${scope.dept}`;
  const [year, month] = scope.yearMonth.split('-').map(Number);
  return `${scope.station} / ${scope.dept} · ${MONTH_NAMES[month - 1]} ${year}`;
}

export function ScheduleExportModal({
  employees,
  shifts,
  stationNames,
  deptNames,
  initialStation,
  initialDept,
  initialMonth,
  ensureMonths,
  isMonthLoaded,
  onClose,
}: ScheduleExportModalProps) {
  const [scope, setScope] = useState<ScheduleExportScope>({
    station: firstRealValue(initialStation, stationNames),
    dept: firstRealValue(initialDept, deptNames),
    yearMonth: initialMonth,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const availableStations = useMemo(
    () => stationNames.filter(st =>
      employees.some(e => e.status === 'Aktif' && e.station === st),
    ),
    [employees, stationNames],
  );
  const availableDepartments = useMemo(
    () => deptNames.filter(dp =>
      employees.some(e =>
        e.status === 'Aktif' &&
        e.station === scope.station &&
        e.dept === dp,
      ),
    ),
    [employees, deptNames, scope.station],
  );
  // Sayaç, dosyaya gerçekten yazılacak personeli göstermeli: çizelgedeki gibi
  // aralığı seçili ayla kesişmeyenler hariç tutulur.
  const scopedEmployees = useMemo(() => {
    const bounds = scope.yearMonth ? monthBounds(scope.yearMonth) : null;
    return employees.filter(e =>
      e.status === 'Aktif' &&
      e.station === scope.station &&
      e.dept === scope.dept &&
      (!bounds || isEmployedInRange(e.startDate, e.endDate, bounds.start, bounds.end)),
    );
  }, [employees, scope.station, scope.dept, scope.yearMonth]);
  // Seçilen ay bellekte değilken dışa aktarım boş/eksik bir çizelge üretirdi.
  const monthReady = !!scope.yearMonth && isMonthLoaded(scope.yearMonth);
  useEffect(() => {
    if (scope.yearMonth) ensureMonths([scope.yearMonth]);
  }, [scope.yearMonth, ensureMonths]);

  const canExport = !!scope.station && !!scope.dept && !!scope.yearMonth && monthReady && scopedEmployees.length > 0 && !busy;

  function resetResult() {
    setError('');
    setResult('');
  }

  function setScopeValue<K extends keyof ScheduleExportScope>(key: K, value: ScheduleExportScope[K]) {
    setScope(prev => {
      if (key === 'station') {
        const nextDept = deptNames.find(dp =>
          employees.some(e =>
            e.status === 'Aktif' &&
            e.station === value &&
            e.dept === dp,
          ),
        ) ?? '';
        return { ...prev, station: value as string, dept: nextDept };
      }
      return { ...prev, [key]: value };
    });
    resetResult();
  }

  useEffect(() => {
    const nextStation = availableStations.includes(scope.station)
      ? scope.station
      : availableStations[0] ?? '';
    const nextDepartments = deptNames.filter(dp =>
      employees.some(e =>
        e.status === 'Aktif' &&
        e.station === nextStation &&
        e.dept === dp,
      ),
    );
    const nextDept = nextDepartments.includes(scope.dept)
      ? scope.dept
      : nextDepartments[0] ?? '';
    if (nextStation !== scope.station || nextDept !== scope.dept) {
      setScope(prev => ({ ...prev, station: nextStation, dept: nextDept }));
      resetResult();
    }
  }, [availableStations, deptNames, employees, scope.dept, scope.station]);

  async function handleExport() {
    if (!canExport) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const exported = await downloadScheduleExport({ employees, shifts, scope });
      setResult(`${exported.fileName} indirildi. ${exported.employeeCount} personel ve ${exported.shiftCount} vardiya kaydı aktarıldı.`);
    } catch (err) {
      console.error('Schedule export failed', err);
      setError('Excel oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Excel'e Aktar"
      desc="Seçili şube, departman ve ay için aylık vardiya çizelgesini Excel olarak indirin."
      onClose={onClose}
      width={640}
      footer={
        result ? (
          <Button icon="check" onClick={onClose}>Tamam</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>Vazgeç</Button>
            <Button icon="download" onClick={handleExport} disabled={!canExport}>
              {busy ? 'Hazırlanıyor...' : 'Excel Oluştur'}
            </Button>
          </>
        )
      }
    >
      <div className="dialog-body">
        <Field label="Şube">
          <Select
            value={scope.station}
            onChange={v => setScopeValue('station', String(v))}
            icon="pin"
            options={availableStations}
          />
        </Field>
        <Field label="Departman">
          <Select
            value={scope.dept}
            onChange={v => setScopeValue('dept', String(v))}
            icon="layers"
            options={availableDepartments}
          />
        </Field>
        <Field label="Ay">
          <Input
            type="month"
            value={scope.yearMonth}
            onChange={e => setScopeValue('yearMonth', e.target.value)}
          />
        </Field>

        <div className="col-2" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--muted-foreground)', fontSize: 13 }}>
            <Icon name="users" size={16} />
            <span>{scopeLabel(scope)} · {scopedEmployees.length} aktif personel</span>
          </div>
          {!!scope.yearMonth && !monthReady && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--muted-foreground)', fontSize: 13 }}>
              <Icon name="clock" size={16} />
              <span>Seçili ayın vardiyaları yükleniyor…</span>
            </div>
          )}
          {error && <div style={{ color: 'var(--absent-fg)', fontSize: 13 }}>{error}</div>}
          {result && (
            <div style={{ border: '1px solid var(--came-bd)', background: 'var(--came-bg)', color: 'var(--came-fg)', borderRadius: 8, padding: 12, fontSize: 13 }}>
              {result}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
