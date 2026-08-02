import { useEffect, useMemo, useRef, useState } from 'react';
import type { Employee, Shift } from '../../types';
import {
  buildScheduleImportPlan,
  downloadScheduleTemplate,
  type ScheduleImportApplyResult,
  type ScheduleImportPlan,
  type ScheduleImportScope,
} from '../../lib/scheduleImport';
import { MONTH_NAMES, isEmployedInRange, monthBounds } from '../../constants';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Field, Input } from '../ui/Field';
import { Icon } from '../ui/Icon';

interface ScheduleImportModalProps {
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
  onApply: (plan: ScheduleImportPlan) => Promise<ScheduleImportApplyResult>;
}

function firstRealValue(current: string, values: string[]): string {
  return current !== 'Tümü' && values.includes(current) ? current : values[0] ?? '';
}

function scopeLabel(scope: ScheduleImportScope): string {
  if (!scope.yearMonth) return `${scope.station} / ${scope.dept}`;
  const [year, month] = scope.yearMonth.split('-').map(Number);
  return `${scope.station} / ${scope.dept} · ${MONTH_NAMES[month - 1]} ${year}`;
}

function ResultLine({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <b className="tnum">{value}</b>
    </div>
  );
}

function MessageList({ title, items, tone = 'neutral' }: { title: string; items: string[]; tone?: 'neutral' | 'warn' | 'error' }) {
  if (!items.length) return null;
  const color = tone === 'error' ? 'var(--absent-fg)' : tone === 'warn' ? '#92400e' : 'var(--muted-foreground)';
  return (
    <div style={{ display: 'grid', gap: 5 }}>
      <b style={{ fontSize: 13, color }}>{title}</b>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted-foreground)', fontSize: 12.5 }}>
        {items.slice(0, 8).map((item, index) => <li key={index}>{item}</li>)}
        {items.length > 8 && <li>{items.length - 8} kayıt daha...</li>}
      </ul>
    </div>
  );
}

export function ScheduleImportModal({
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
  onApply,
}: ScheduleImportModalProps) {
  const [scope, setScope] = useState<ScheduleImportScope>({
    station: firstRealValue(initialStation, stationNames),
    dept: firstRealValue(initialDept, deptNames),
    yearMonth: initialMonth,
  });
  const [fileName, setFileName] = useState('');
  const [plan, setPlan] = useState<ScheduleImportPlan | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  // applying yalnız yazma aşaması için; busy şablon indirme ve önizlemeyi de kapsıyor.
  // Yazma sürerken pencere kapatılamaz, bu yüzden ikisi ayrı tutuluyor.
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScheduleImportApplyResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  // Sayaç, şablona/plana gerçekten girecek personeli göstermeli: çizelgedeki
  // gibi aralığı seçili ayla kesişmeyenler hariç tutulur.
  const scopedEmployees = useMemo(() => {
    const bounds = scope.yearMonth ? monthBounds(scope.yearMonth) : null;
    return employees.filter(e =>
      e.status === 'Aktif' && e.station === scope.station && e.dept === scope.dept &&
      (!bounds || isEmployedInRange(e.startDate, e.endDate, bounds.start, bounds.end)),
    );
  }, [employees, scope.station, scope.dept, scope.yearMonth]);
  // Seçilen ayın vardiyaları bellekte olmadan plan kurulamaz: eksik veriyle
  // mevcut kayıtlar "yok" görünür ve import onları yeniden oluşturmaya çalışır.
  const monthReady = !!scope.yearMonth && isMonthLoaded(scope.yearMonth);
  useEffect(() => {
    if (scope.yearMonth) ensureMonths([scope.yearMonth]);
  }, [scope.yearMonth, ensureMonths]);

  const canUseScope = !!scope.station && !!scope.dept && !!scope.yearMonth && monthReady;
  const needsConfirm = (plan?.existingCount ?? 0) > 0 || (plan?.summary.delete ?? 0) > 0;
  const canApply = !!plan && plan.canApply && (!needsConfirm || confirmed) && !busy;

  function resetImportState() {
    setFileName('');
    setPlan(null);
    setConfirmed(false);
    setError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function setScopeValue<K extends keyof ScheduleImportScope>(key: K, value: ScheduleImportScope[K]) {
    // Yazma sürerken kapsam değiştirilemez: resetImportState planı sıfırlar,
    // oysa döngü hâlâ eski plan üzerinde yazmaya devam ediyor olur.
    if (applying) return;
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
    resetImportState();
  }

  useEffect(() => {
    setScope(prev => {
      const nextStation = availableStations.includes(prev.station) ? prev.station : availableStations[0] ?? '';
      const nextDepartments = deptNames.filter(dp =>
        employees.some(e =>
          e.status === 'Aktif' &&
          e.station === nextStation &&
          e.dept === dp,
        ),
      );
      const nextDept = nextDepartments.includes(prev.dept) ? prev.dept : nextDepartments[0] ?? '';
      if (nextStation === prev.station && nextDept === prev.dept) return prev;
      resetImportState();
      return { ...prev, station: nextStation, dept: nextDept };
    });
  }, [availableStations, deptNames, employees]);

  async function handleTemplateDownload() {
    if (!canUseScope) return;
    setBusy(true);
    setError('');
    try {
      await downloadScheduleTemplate({ employees, shifts, scope });
    } catch (err) {
      console.error('Template download failed', err);
      setError('Şablon Excel oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(file: File | null) {
    resetImportState();
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLocaleLowerCase('tr-TR').endsWith('.xlsx')) {
      setError('Sadece .xlsx dosyası yüklenebilir.');
      return;
    }
    setBusy(true);
    try {
      const nextPlan = await buildScheduleImportPlan({ file, employees, shifts, scope });
      setPlan(nextPlan);
    } catch (err) {
      console.error('Import preview failed', err);
      setError('Excel dosyası okunamadı. Lütfen seçili kapsam için yeni şablon indirip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    if (!canApply || !plan) return;
    setBusy(true);
    setApplying(true);
    setError('');
    try {
      const applied = await onApply(plan);
      setResult(applied);
    } catch (err) {
      console.error('Schedule import failed', err);
      setError('Import işlemi tamamlanamadı.');
    } finally {
      setBusy(false);
      setApplying(false);
    }
  }

  const blockingMessages = [
    ...(plan?.formatErrors ?? []),
    ...(plan?.duplicateExcelNames.map(x => `Excel'de tekrar eden isim: ${x}`) ?? []),
    ...(plan?.duplicateScheduleNames.map(x => `Duplicate Çizelge İsmi: ${x}`) ?? []),
    ...(plan?.emptyScheduleNameEmployees.map(e => `${e.name} için Çizelge İsmi boş.`) ?? []),
    ...(plan?.invalidCodes.map(c => `${c.cell}: geçersiz kod "${c.value}"`) ?? []),
  ];

  return (
    <Dialog
      title="Excel'den İçe Aktar"
      desc="Seçili şube, departman ve ay için vardiya çizelgesini şablon Excel üzerinden yükleyin."
      onClose={onClose}
      width={760}
      // Yazma sürerken kapatma kapalı: aksi halde kullanıcı pencereyi kapatıp
      // süreci gözden kaybediyor, işlem arka planda devam ediyor ve sonuç
      // özeti (kaç kayıt, kaç hata) hiç görünmüyor.
      dismissible={!applying}
      footer={
        result ? (
          <Button icon="check" onClick={onClose}>Tamam</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={applying}>Vazgeç</Button>
            <Button icon="check" onClick={handleApply} disabled={!canApply}>
              {applying ? 'İçe aktarılıyor…' : busy ? 'İşleniyor...' : 'İçe Aktar'}
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
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <Button
            variant="outline"
            icon="download"
            onClick={handleTemplateDownload}
            disabled={!canUseScope || busy}
            style={{ width: '100%' }}
          >
            Şablon İndir
          </Button>
        </div>

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
          <Field label="Excel Dosyası">
            <div
              style={{
                minHeight: 42,
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--surface)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                disabled={!canUseScope || busy}
                style={{ display: 'none' }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="inbox"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canUseScope || busy}
              >
                Dosya Seç
              </Button>
              <span
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: fileName ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontSize: 13,
                }}
                title={fileName || 'Henüz dosya seçilmedi'}
              >
                {fileName || 'Henüz dosya seçilmedi'}
              </span>
            </div>
          </Field>
          {error && <div style={{ color: 'var(--absent-fg)', fontSize: 13 }}>{error}</div>}
        </div>

        {/* Yazma tek transaction'da yapıldığı için sayaç yok: işlem ya tamamen
            uygulanır ya hiç. Belirsiz süreli bir gösterge daha dürüst. */}
        {applying && plan && (
          <div className="col-2" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <b>Vardiyalar yazılıyor…</b>
              <span className="tnum" style={{ color: 'var(--muted-foreground)' }}>
                {plan.actions.length} kayıt
              </span>
            </div>
            <div className="progress-indet" />
            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
              Tek işlemde uygulanıyor — kesinti olursa hiçbir kayıt değişmez.
            </span>
          </div>
        )}

        {plan && !result && !applying && (
          <div className="col-2" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <ResultLine label="Eşleşen" value={plan.matchedRows.length} />
              <ResultLine label="Oluşturulacak" value={plan.summary.create} />
              <ResultLine label="Güncellenecek" value={plan.summary.update} />
              <ResultLine label="Silinecek" value={plan.summary.delete} />
            </div>

            {plan.existingCount > 0 && (
              <div style={{ border: '1px solid var(--absent-bd)', background: 'var(--absent-bg)', color: 'var(--absent-fg)', borderRadius: 8, padding: 12, fontSize: 13 }}>
                Seçili kapsamda {plan.existingCount} mevcut vardiya kaydı var. Devam edersen Excel'deki çizelge bu ayın kayıtlarının yerine uygulanacak.
              </div>
            )}

            <MessageList title="Bloklayıcı Kontroller" items={blockingMessages} tone="error" />
            <MessageList title="Uyarılar" items={plan.warnings} tone="warn" />
            <MessageList title="Atlanacak Excel İsimleri" items={plan.unmatchedNames} />

            {needsConfirm && plan.canApply && (
              <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--foreground)' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>Mevcut vardiyaların güncelleneceğini, boş hücrelerin ve Excel'de olmayan aktif personellerin seçili ay kayıtlarını sileceğini anlıyorum.</span>
              </label>
            )}
          </div>
        )}

        {result && (
          <div className="col-2" style={{ display: 'grid', gap: 14 }}>
            <div style={{ border: '1px solid var(--came-bd)', background: 'var(--came-bg)', color: 'var(--came-fg)', borderRadius: 8, padding: 12, fontSize: 13 }}>
              Import tamamlandı. {result.created} kayıt oluşturuldu, {result.updated} kayıt güncellendi, {result.deleted} kayıt silindi. {result.skippedNames.length} Excel satırı personel eşleşmediği için atlandı. {result.failed} kayıt hata aldı.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <ResultLine label="Status korundu" value={result.statusPreserved} />
              <ResultLine label="Planlandı yapıldı" value={result.resetToPlanned} />
              <ResultLine label="Hata" value={result.failed} />
            </div>
            <MessageList title="Atlanan İsimler" items={result.skippedNames} />
            <MessageList title="Hatalar" items={result.errors} tone="error" />
          </div>
        )}
      </div>
    </Dialog>
  );
}
