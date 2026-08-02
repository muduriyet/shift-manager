import { useState } from 'react';
import type { Shift, Employee, ShiftCodeKey, StationName, DepartmentName, RoleName, ShiftStatus } from '../../types';
import { STATUSES, SHIFT_TIMES, shiftById, TODAY_DATE_STR, isWithinEmployment } from '../../constants';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Field';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';

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

type FormErrors = Partial<Record<keyof ShiftFormData, string>>;

function validate(form: ShiftFormData, employees: Employee[]): FormErrors {
  const e: FormErrors = {};
  if (!form.empId || form.empId <= 0) e.empId = 'Geçerli bir personel seçin';
  if (!form.shiftDate) e.shiftDate = 'Tarih zorunludur';
  if (!form.start) e.start = 'Başlangıç saati zorunludur';
  if (!form.end)   e.end   = 'Bitiş saati zorunludur';
  if (form.start && form.end && form.start === form.end) {
    e.end = 'Başlangıç ve bitiş saati aynı olamaz';
  }
  const emp = employees.find(x => x.id === form.empId);
  if (!e.empId && emp && form.shiftDate && !isWithinEmployment(emp.startDate, emp.endDate, form.shiftDate)) {
    e.shiftDate = 'Seçili tarih personelin çalışma aralığı dışında';
  }
  return e;
}

interface ShiftModalProps {
  shift: Shift | null;
  employees: Employee[];
  stationNames: string[];
  deptNames: string[];
  roleNames: string[];
  onClose: () => void;
  onSave: (form: ShiftFormData, id: number | null) => void;
}

export function ShiftModal({ shift, employees, stationNames, deptNames, roleNames, onClose, onSave }: ShiftModalProps) {
  const editing = !!shift?.id;
  const emp0 = shift ? employees.find(e => e.id === shift.empId) : null;

  const [form, setForm] = useState<ShiftFormData>({
    empId:     shift?.empId     ?? (employees.find(e => e.status === 'Aktif')?.id ?? employees[0]?.id ?? 0),
    // Personelinki önce gelir: kayıtta eski/sapmış bir şube kalmışsa salt-okunur
    // alan yanlış değeri göstermesin.
    station:   emp0?.station ?? shift?.station ?? stationNames[0] ?? '',
    dept:      emp0?.dept    ?? shift?.dept    ?? deptNames[0]    ?? '',
    shiftDate: shift?.shiftDate ?? TODAY_DATE_STR,
    start:     shift?.start     ?? '08:00',
    end:       shift?.end       ?? '16:00',
    role:      shift?.role      ?? emp0?.role    ?? roleNames[0] ?? '',
    status:    shift?.status    ?? 'Planlandı',
    note:      shift?.note      ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof ShiftFormData>(k: K, v: ShiftFormData[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    if (submitted) setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  function pickEmp(id: number) {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    setForm(f => ({ ...f, empId: id, station: e.station, dept: e.dept, role: e.role }));
  }

  function applyTemplate(id: ShiftCodeKey) {
    const t = shiftById(id);
    setForm(f => ({ ...f, start: t.start, end: t.end }));
    if (submitted) setErrors(prev => ({ ...prev, start: undefined, end: undefined }));
  }

  function handleSave() {
    setSubmitted(true);
    const errs = validate(form, employees);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form, editing ? shift!.id : null);
  }

  const timeTemplate = SHIFT_TIMES.find(t => t.start === form.start && t.end === form.end)?.id ?? '';
  const activeEmployees = employees.filter(e => e.status === 'Aktif');
  const noActive = activeEmployees.length === 0;

  return (
    <Dialog
      title={editing ? 'Vardiya Düzenle' : 'Yeni Vardiya Ekle'}
      desc="Personel, istasyon ve departman bazında vardiya tanımlayın."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button icon="check" onClick={handleSave} disabled={noActive && !editing}>Kaydet</Button>
        </>
      }
    >
      {noActive && !editing ? (
        <div className="dialog-body">
          <EmptyState
            icon="users"
            title="Aktif personel yok"
            description="Vardiya oluşturmak için önce Personeller sayfasından en az bir personeli aktif edin."
          />
        </div>
      ) : (
      <div className="dialog-body">
        <div className="col-2">
          <Field label="Personel" error={errors.empId}>
            <Select
              value={form.empId}
              onChange={v => pickEmp(Number(v))}
              options={activeEmployees.map(e => ({ value: e.id, label: `${e.name} · ${e.station}/${e.dept}` }))}
              error={!!errors.empId}
            />
          </Field>
        </div>

        {/* İstasyon/departman personelden türetilir, elle değiştirilemez.
            Serbest bırakıldığında vardiya personelin şubesinden farklı
            kaydedilebiliyordu: çizelge personelin şubesine göre grupluyor,
            raporlar vardiyanınkine göre sayıyor — aynı kayıt iki yere düşüyordu. */}
        <Field label="İstasyon" hint="Personelden alınır">
          <Select value={form.station} onChange={() => {}} icon="pin" options={stationNames} disabled />
        </Field>
        <Field label="Departman" hint="Personelden alınır">
          <Select value={form.dept} onChange={() => {}} icon="layers" options={deptNames} disabled />
        </Field>

        <div className="col-2">
          <Field label="Tarih" error={errors.shiftDate}>
            <Input
              type="date"
              value={form.shiftDate}
              onChange={e => set('shiftDate', e.target.value)}
              error={!!errors.shiftDate}
              className="tnum"
            />
          </Field>
        </div>

        <div className="col-2">
          <span className="field-label" style={{ display: 'block', marginBottom: 7 }}>Hazır Vardiya Şablonu</span>
          <div className="segment" style={{ width: '100%' }}>
            {SHIFT_TIMES.map(t => (
              <button
                key={t.id}
                className={timeTemplate === t.id ? 'on' : ''}
                style={{ flex: 1 }}
                onClick={() => applyTemplate(t.id)}
              >
                {t.label} <span className="tnum" style={{ opacity: .7 }}>{t.start}</span>
              </button>
            ))}
          </div>
        </div>

        <Field label="Başlangıç Saati" error={errors.start}>
          <Input
            type="time"
            value={form.start}
            onChange={e => set('start', e.target.value)}
            error={!!errors.start}
            className="tnum"
          />
        </Field>
        <Field label="Bitiş Saati" error={errors.end}>
          <Input
            type="time"
            value={form.end}
            onChange={e => set('end', e.target.value)}
            error={!!errors.end}
            className="tnum"
          />
        </Field>

        <Field label="Görev">
          <Select value={form.role} onChange={v => set('role', v as RoleName)} options={roleNames} />
        </Field>
        <Field label="Durum">
          <Select value={form.status} onChange={v => set('status', v as ShiftStatus)} options={STATUSES} />
        </Field>

        <div className="col-2">
          <Field label="Notlar">
            <Textarea
              placeholder="İsteğe bağlı not ekleyin (ör. vardiya değişikliği nedeni)..."
              value={form.note}
              onChange={e => set('note', e.target.value)}
            />
          </Field>
        </div>
      </div>
      )}
    </Dialog>
  );
}
