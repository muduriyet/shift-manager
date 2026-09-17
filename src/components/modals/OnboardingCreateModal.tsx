import { useState } from 'react';
import type { Station, Department, Role } from '../../types';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Field, Input } from '../ui/Field';

export interface OnboardingCreateForm {
  name: string;
  station: string;
  dept: string;
  role: string;
  startDate: string | null;
}

interface OnboardingCreateModalProps {
  stations: Station[];
  departments: Department[];
  roles: Role[];
  onCancel: () => void;
  onSave: (form: OnboardingCreateForm) => void | Promise<void>;
}

// Bu pop-up personeli SEÇMEZ, OLUŞTURUR. İşe alımda ilk temas bu ekran olduğu
// için personel kaydı da burada açılıyor; RPC ikisini tek transaction'da yazıyor.
export function OnboardingCreateModal({
  stations, departments, roles, onCancel, onSave,
}: OnboardingCreateModalProps) {
  const [form, setForm] = useState<OnboardingCreateForm>({
    name: '',
    station: stations[0]?.name ?? '',
    dept: departments[0]?.name ?? '',
    role: roles[0]?.name ?? '',
    startDate: null,
  });
  const [hata, setHata] = useState<string | undefined>();
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Lookup tablolarından biri boşsa personel oluşturulamaz (üçü de NOT NULL FK).
  const eksikTanim = stations.length === 0 || departments.length === 0 || roles.length === 0;

  // Doğrulama EmployeeModal ile aynı kuralı izliyor.
  async function submit() {
    const ad = form.name.trim();
    if (!ad) { setHata('Ad Soyad alanı zorunludur'); return; }
    if (ad.length < 3) { setHata('Ad Soyad en az 3 karakter olmalıdır'); return; }
    if (!ad.includes(' ')) { setHata('Lütfen ad ve soyadı birlikte girin (ör. Ahmet Yılmaz)'); return; }
    setKaydediliyor(true);
    await onSave({ ...form, name: ad });
    setKaydediliyor(false);
  }

  return (
    <Dialog
      title="Yeni İşe Giriş Süreci"
      desc="Personel kaydı da bu formla oluşturulur."
      width={440}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={kaydediliyor}>İptal</Button>
          <Button icon="check" onClick={submit} disabled={kaydediliyor || eksikTanim}>Kaydet</Button>
        </>
      }
    >
      <div className="dialog-body">
        {eksikTanim && (
          <div
            className="col-2"
            style={{
              background: 'var(--late-bg)', border: '1px solid var(--late-bd)',
              color: 'var(--late-fg)', borderRadius: 'var(--radius-sm)',
              padding: '10px 12px', fontSize: 12.5,
            }}
          >
            Şube, departman veya pozisyon tanımı yok. Önce Ayarlar ekranından ekleyin.
          </div>
        )}

        <div className="col-2">
          <Field label="Ad Soyad" error={hata}>
            <Input
              value={form.name}
              error={!!hata}
              placeholder="Ahmet Yılmaz"
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setHata(undefined); }}
            />
          </Field>
        </div>

        <Field label="Şube">
          <Select
            value={form.station}
            onChange={v => setForm(f => ({ ...f, station: String(v) }))}
            options={stations.map(s => s.name)}
          />
        </Field>

        <Field label="Departman">
          <Select
            value={form.dept}
            onChange={v => setForm(f => ({ ...f, dept: String(v) }))}
            options={departments.map(d => d.name)}
          />
        </Field>

        <Field label="Pozisyon">
          <Select
            value={form.role}
            onChange={v => setForm(f => ({ ...f, role: String(v) }))}
            options={roles.map(r => r.name)}
          />
        </Field>

        <Field label="İşe Giriş Tarihi">
          <Input
            type="date"
            value={form.startDate ?? ''}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value || null }))}
          />
        </Field>
      </div>
    </Dialog>
  );
}
