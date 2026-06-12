import { useState } from 'react';
import type { Employee, StationName, DepartmentName, RoleName, EmployeeStatus } from '../../types';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { Select } from '../ui/Select';
import { Avatar } from '../ui/Avatar';

interface EmployeeFormData {
  name: string;
  station: StationName;
  dept: DepartmentName;
  role: RoleName;
  status: EmployeeStatus;
  startDate: string | null;
  endDate: string | null;
}

type FormErrors = Partial<Record<keyof EmployeeFormData, string>>;

function validate(form: EmployeeFormData): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (!name) {
    errors.name = 'Ad Soyad alanı zorunludur';
  } else if (name.length < 3) {
    errors.name = 'Ad Soyad en az 3 karakter olmalıdır';
  } else if (!name.includes(' ')) {
    errors.name = 'Lütfen ad ve soyadı birlikte girin (ör. Ahmet Yılmaz)';
  }
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'İşten çıkış tarihi, işe giriş tarihinden önce olamaz';
  }
  return errors;
}

interface EmployeeModalProps {
  employee: Employee | null;
  stationNames: string[];
  deptNames: string[];
  roleNames: string[];
  onClose: () => void;
  onSave: (form: EmployeeFormData, id: number | null) => void;
}

export function EmployeeModal({ employee, stationNames, deptNames, roleNames, onClose, onSave }: EmployeeModalProps) {
  const editing = !!employee;
  const [form, setForm] = useState<EmployeeFormData>({
    name:      employee?.name      ?? '',
    station:   employee?.station   ?? stationNames[0] ?? '',
    dept:      employee?.dept      ?? deptNames[0]    ?? '',
    role:      employee?.role      ?? roleNames[0] ?? '',
    status:    employee?.status    ?? 'Aktif',
    startDate: employee?.startDate ?? null,
    endDate:   employee?.endDate   ?? null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof EmployeeFormData>(k: K, v: EmployeeFormData[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    if (submitted) setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  function handleSave() {
    setSubmitted(true);
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({ ...form, name: form.name.trim() }, employee?.id ?? null);
  }

  const previewName = form.name.trim() || (employee?.name ?? '');

  return (
    <Dialog
      title={editing ? 'Personel Bilgilerini Düzenle' : 'Yeni Personel Ekle'}
      desc="Personel bilgilerini ve istasyon / departman atamasını güncelleyin."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button icon="check" onClick={handleSave}>Kaydet</Button>
        </>
      }
    >
      <div className="dialog-body">
        {editing && previewName && (
          <div className="col-2" style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <Avatar name={previewName} size={46} />
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 15 }}>{previewName}</b>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
                #{String(employee!.id).padStart(3, '0')} · {form.station} / {form.dept}
              </div>
            </div>
          </div>
        )}

        <div className="col-2">
          <Field label="Ad Soyad" error={errors.name}>
            <Input
              value={form.name}
              placeholder="Örn. Ahmet Yılmaz"
              onChange={e => set('name', e.target.value)}
              error={!!errors.name}
            />
          </Field>
        </div>

        <Field label="İstasyon">
          <Select value={form.station} onChange={v => set('station', v as StationName)} icon="pin" options={stationNames} />
        </Field>
        <Field label="Departman">
          <Select value={form.dept} onChange={v => set('dept', v as DepartmentName)} icon="layers" options={deptNames} />
        </Field>

        <Field label="Görev">
          <Select value={form.role} onChange={v => set('role', v as RoleName)} options={roleNames} />
        </Field>

        <div>
          <span className="field-label" style={{ display: 'block', marginBottom: 7 }}>Durum</span>
          <div className="segment" style={{ width: '100%' }}>
            {(['Aktif', 'Pasif'] as EmployeeStatus[]).map(s => (
              <button key={s} className={form.status === s ? 'on' : ''} style={{ flex: 1 }} onClick={() => set('status', s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <Field label="İşe Giriş Tarihi">
          <Input
            type="date"
            value={form.startDate ?? ''}
            onChange={e => set('startDate', e.target.value || null)}
          />
        </Field>
        <Field label="İşten Çıkış Tarihi" error={errors.endDate}>
          <Input
            type="date"
            value={form.endDate ?? ''}
            onChange={e => set('endDate', e.target.value || null)}
            error={!!errors.endDate}
          />
        </Field>
      </div>
    </Dialog>
  );
}
