import { useEffect, useState } from 'react';
import type {
  Employee, Profile, Station, Department, Role,
  Onboarding, OnboardingDoc, OnboardingStage,
} from '../../types';
import {
  fetchOnboarding, fetchOnboardingDocs, setOnboardingContact, setOnboardingDocDone,
  setOnboardingNotes, setOnboardingStage, updateEmployeeAssignment, updateEmployeeName,
} from '../../lib/db';
import { DOC_SETS, STAGES, STEP_BADGE, fmtDMY, isComplete, stepStatus } from '../../lib/onboarding';
import { Dialog } from '../ui/Dialog';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Field, Input, Textarea } from '../ui/Field';

interface OnboardingModalProps {
  process: Onboarding;      // liste satırı — phone/iban/notes taşımaz
  employee: Employee;
  profiles: Profile[];
  stations: Station[];
  departments: Department[];
  roles: Role[];
  onEmployeeSaved: (e: Employee) => void;
  onToast: (msg: string) => void;
  // Son aşamayı geri bildirir: arşivleme kararı EKRANDA veriliyor ki
  // X / Escape / backdrop üç kapanış yolu da aynı kontrolden geçsin.
  onClose: (finalStage: OnboardingStage) => void;
  // Elle arşivleme: tamamlanmadan iptal edilen süreçler için.
  onArchive: (id: number) => void;
}

// ---- Stepper ----
function Stepper({
  stage, tamam, saving, onPick,
}: {
  stage: OnboardingStage;
  tamam: boolean;
  // Aşama yazımı uçuştayken tıklamalar yutuluyor; buton da devre dışı olmalı
  // ki kullanıcı "tıkladım ama hiçbir şey olmadı" durumunda kalmasın.
  saving: boolean;
  onPick: (k: OnboardingStage) => void;
}) {
  const sahte = { stage } as Onboarding;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
      {STAGES.map(s => {
        const durum = tamam ? 'tamam' : stepStatus(sahte, s.n);
        const rozet = STEP_BADGE[durum];
        const sonraki = s.n < 3
          ? (tamam ? 'tamam' : stepStatus(sahte, (s.n + 1) as OnboardingStage))
          : null;
        const daire =
          durum === 'tamam'
            ? { background: 'var(--came-fg)', color: '#fff', border: '2px solid var(--came-fg)', boxShadow: '0 0 0 5px var(--came-bg)' }
            : durum === 'devam'
              ? { background: 'var(--surface)', color: 'var(--late-fg)', border: '2px solid var(--late-fg)' }
              : { background: 'var(--surface)', color: 'var(--subtle-foreground)', border: '2px solid var(--border)' };

        return (
          <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
            {sonraki && (
              <div
                style={{
                  position: 'absolute', top: 25, left: '50%', width: '100%', height: 0,
                  borderTop: sonraki === 'tamam' ? '2px solid var(--came-dot)' : '2px dashed var(--border-strong)',
                }}
              />
            )}
            <button
              type="button"
              onClick={() => onPick(s.n)}
              disabled={saving}
              title={saving ? 'Kaydediliyor…' : `${s.n}. adıma al`}
              style={{
                width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
                position: 'relative', zIndex: 1, padding: 0,
                cursor: saving ? 'default' : 'pointer', ...daire,
              }}
            >
              <Icon name={s.icon} size={22} />
            </button>
            <div style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.35, padding: '0 6px' }}>
              {s.n}. {s.title}
            </div>
            <Badge status={rozet.status} dot={rozet.dot}>{rozet.label}</Badge>
          </div>
        );
      })}
    </div>
  );
}

// ---- Evrak tablosu ----
function DocTable({
  setId, docs, onToggle, tamamlandiSatiri, surecTamam,
}: {
  setId: 'personel' | 'giris' | 'asil';
  docs: OnboardingDoc[];
  onToggle: (doc: OnboardingDoc, done: boolean) => void;
  // Yalnız 'asil' tablosunda: tüm asıllar geldi mi (yeşil satırı sürer).
  tamamlandiSatiri?: boolean;
  // Süreç 3. aşamada mı. Satırın METNİNİ belirler: asılların gelmesi tek
  // başına süreci bitirmez (bkz. isComplete), o yüzden ikisi ayrı.
  surecTamam?: boolean;
}) {
  const def = DOC_SETS.find(s => s.id === setId)!;
  const satirlar = docs.filter(d => d.docSet === setId);
  const grid = 'minmax(0,1fr) 120px 120px';

  const pill = (d: OnboardingDoc, olumlu: boolean) => {
    const aktif = olumlu ? d.isDone : !d.isDone;
    const metin = olumlu ? def.doneLabel : def.notDoneLabel;
    return (
      <button
        type="button"
        onClick={() => onToggle(d, olumlu)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '4px 10px', borderRadius: 99, fontSize: 12,
          fontWeight: aktif ? 650 : 500,
          background: aktif ? (olumlu ? 'var(--came-bg)' : 'var(--absent-bg)') : 'var(--surface)',
          border: `1px solid ${aktif ? (olumlu ? 'var(--came-bd)' : 'var(--absent-bd)') : 'var(--border)'}`,
          color: aktif ? (olumlu ? 'var(--came-fg)' : 'var(--absent-fg)') : 'var(--muted-foreground)',
        }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: aktif ? (olumlu ? 'var(--came-dot)' : 'var(--absent-dot)') : 'transparent',
            border: aktif ? 'none' : '1.5px solid var(--subtle-foreground)',
          }}
        />
        {metin}
      </button>
    );
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{def.title}</h3>
      </div>

      <div
        style={{
          display: 'grid', gridTemplateColumns: grid, gap: 14,
          padding: '9px 18px', background: 'var(--surface-2)',
          fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em',
          textTransform: 'uppercase', color: 'var(--subtle-foreground)',
        }}
      >
        <span>Evrak Adı</span>
        <span style={{ textAlign: 'center' }}>{def.doneLabel}</span>
        <span style={{ textAlign: 'center' }}>{def.notDoneLabel}</span>
      </div>

      {satirlar.map(d => (
        <div
          key={d.id}
          style={{
            display: 'grid', gridTemplateColumns: grid, gap: 14, alignItems: 'center',
            padding: '11px 18px', borderTop: '1px solid var(--muted)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
            {d.description && (
              <div style={{ fontSize: 11.5, color: 'var(--subtle-foreground)' }}>{d.description}</div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>{pill(d, true)}</div>
          <div style={{ textAlign: 'center' }}>{pill(d, false)}</div>
        </div>
      ))}

      {tamamlandiSatiri && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 18px', borderTop: '1px solid var(--came-bd)',
            background: 'var(--came-bg)', color: 'var(--came-fg)',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Icon name="check" size={16} />
          {surecTamam
            ? 'Tüm evrak asılları teslim alındı — süreç tamamlandı.'
            : 'Tüm evrak asılları teslim alındı — 3. adımı işaretleyin.'}
        </div>
      )}
    </div>
  );
}

// ---- Sağ ray ----
function RailCard({ title, onEdit, editTitle, children }: {
  title: string; onEdit?: () => void; editTitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{title}</h3>
        {onEdit && <Button variant="ghost" size="sm" icon="pencil" onClick={onEdit} title={editTitle} />}
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 10, padding: '5px 0', fontSize: 12.5 }}>
      <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span style={{ textAlign: 'right', overflowWrap: 'anywhere', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

export function OnboardingModal({
  process, employee, profiles, stations, departments, roles,
  onEmployeeSaved, onToast, onClose, onArchive,
}: OnboardingModalProps) {
  const [stage, setStage] = useState<OnboardingStage>(process.stage);
  const [stageSaving, setStageSaving] = useState(false);
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [phone, setPhone] = useState('');
  const [iban, setIban] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const [notEdit, setNotEdit] = useState(false);
  const [notDraft, setNotDraft] = useState('');
  const [duzenleme, setDuzenleme] = useState<'personel' | 'gorev' | null>(null);
  const [iptalOnayi, setIptalOnayi] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [d, ds] = await Promise.all([
          fetchOnboarding(process.id),
          fetchOnboardingDocs(process.id),
        ]);
        if (alive) { setPhone(d.phone); setIban(d.iban); setNotes(d.notes); setDocs(ds); }
      } catch (err) {
        console.error('Süreç detayı yüklenemedi', err);
        onToast('Süreç detayı yüklenemedi');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [process.id, onToast]);

  const tamam = isComplete({ stage } as Onboarding);
  const asillar = docs.filter(d => d.docSet === 'asil');
  // Lokal docs'tan anlık türetiliyor; view sayaçları modal açıkken bayat kalır.
  const hepsiGeldi = asillar.length > 0 && asillar.every(d => d.isDone);
  const olusturan = profiles.find(p => p.id === process.createdBy)?.displayName ?? null;

  // İyimser: UI hemen döner, hata olursa geri alınır.
  async function toggleDoc(doc: OnboardingDoc, done: boolean) {
    if (doc.isDone === done) return;
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, isDone: done } : d));
    try {
      await setOnboardingDocDone(doc.id, done);
    } catch (err) {
      console.error('Evrak güncellenemedi', err);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, isDone: !done } : d));
      onToast('Evrak güncellenemedi');
    }
  }

  // İleri ve geri serbest. Aşamayı geri almak evrak işaretlerini SİLMEZ —
  // yanlış aşama seçimi veri kaybettirmemeli.
  //
  // Tek uçuş: iki aşama yazımı aynı anda uçuşta olursa sıra dışı tamamlanıp
  // DB'de UI'ın gösterdiğinden başka bir aşama kalabilir (QA turu 1).
  async function pickStage(k: OnboardingStage) {
    if (k === stage || stageSaving) return;
    const onceki = stage;
    setStage(k);
    setStageSaving(true);
    try {
      await setOnboardingStage(process.id, k);
    } catch (err) {
      console.error('Aşama güncellenemedi', err);
      setStage(onceki);
      onToast('Aşama güncellenemedi');
    } finally {
      setStageSaving(false);
    }
  }

  async function saveNotes() {
    const yeni = notDraft.trim();
    try {
      await setOnboardingNotes(process.id, yeni);
      setNotes(yeni);
      setNotEdit(false);
    } catch (err) {
      console.error('Not kaydedilemedi', err);
      onToast('Not kaydedilemedi');
    }
  }

  return (
    <>
      <Dialog
        title={employee.name}
        desc={`${employee.role} • ${employee.station} Şubesi • ${employee.dept}`}
        width={980}
        onClose={() => onClose(stage)}
        footer={tamam ? undefined : (
          <Button variant="danger-ghost" icon="trash" onClick={() => setIptalOnayi(true)}>
            Süreci İptal Et
          </Button>
        )}
      >
        <div className="dialog-body dialog-body-rail">
          {/* ---- Ana kolon ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <div>
              {tamam
                ? <Badge status="Geldi">Tamamlandı</Badge>
                : <Badge status="Aktif" dot>Aktif Süreç</Badge>}
            </div>

            <div
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '14px 18px',
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>İşe Giriş Tarihi</div>
                <div className="tnum" style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtDMY(employee.startDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>Oluşturulma Tarihi</div>
                <div className="tnum" style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtDMY(process.createdAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>Oluşturan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                  {olusturan
                    ? <><Avatar name={olusturan} size={22} /><span style={{ fontSize: 13, fontWeight: 500 }}>{olusturan}</span></>
                    : <span style={{ fontSize: 13.5, fontWeight: 600 }}>—</span>}
                </div>
              </div>
            </div>

            <Stepper stage={stage} tamam={tamam} saving={stageSaving} onPick={pickStage} />

            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13.5 }}>
                Evraklar yükleniyor…
              </div>
            ) : (
              <>
                <DocTable setId="personel" docs={docs} onToggle={toggleDoc} />
                <DocTable setId="giris" docs={docs} onToggle={toggleDoc} />
                <DocTable setId="asil" docs={docs} onToggle={toggleDoc} tamamlandiSatiri={hepsiGeldi} surecTamam={tamam} />
              </>
            )}
          </div>

          {/* ---- Sağ ray ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <RailCard title="Personel Bilgileri" editTitle="Düzenle" onEdit={() => setDuzenleme('personel')}>
              <RailRow label="Ad Soyad" value={employee.name} />
              <RailRow label="Telefon" value={loading ? '…' : phone} />
              <RailRow label="IBAN" value={loading ? '…' : iban} />
            </RailCard>

            <RailCard title="Görev Bilgileri" editTitle="Düzenle" onEdit={() => setDuzenleme('gorev')}>
              <RailRow label="Departman" value={employee.dept} />
              <RailRow label="Pozisyon" value={employee.role} />
              <RailRow label="Şube" value={employee.station} />
              <RailRow label="İşe Giriş Tarihi" value={fmtDMY(employee.startDate)} />
            </RailCard>

            <RailCard
              title="Notlar"
              editTitle="Not ekle / düzenle"
              onEdit={notEdit ? undefined : () => { setNotDraft(notes); setNotEdit(true); }}
            >
              {notEdit ? (
                <>
                  <Textarea
                    rows={3}
                    value={notDraft}
                    placeholder="Not yazın..."
                    onChange={e => setNotDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button variant="ghost" size="sm" onClick={() => setNotEdit(false)}>İptal</Button>
                    <Button size="sm" icon="check" onClick={saveNotes}>Kaydet</Button>
                  </div>
                </>
              ) : loading ? (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted-foreground)' }}>…</p>
              ) : notes ? (
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{notes}</p>
              ) : (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--subtle-foreground)' }}>Henüz not eklenmemiş.</p>
              )}
            </RailCard>

            {tamam ? (
              <div style={{ background: 'var(--came-bg)', border: '1px solid var(--came-bd)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--came-fg)', fontWeight: 700, fontSize: 13 }}>
                  <Icon name="check" size={16} />Süreç Tamamlandı
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--came-fg)' }}>
                  Tüm adımlar tamamlandı, evrak asılları muhasebeye teslim edildi.
                </p>
              </div>
            ) : (
              <div style={{ background: 'var(--plan-bg)', border: '1px solid var(--plan-bd)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--plan-fg)', fontWeight: 700, fontSize: 13 }}>
                  <Icon name="alertCircle" size={16} />Bilgilendirme
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--plan-fg)' }}>
                  Evrak asılları muhasebeye ulaştığında 3. adımı işaretleyin; süreç o zaman tamamlanır.
                </p>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {iptalOnayi && (
        <Dialog
          title="Süreci İptal Et"
          width={400}
          onClose={() => setIptalOnayi(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setIptalOnayi(false)}>Vazgeç</Button>
              <Button variant="danger-ghost" icon="trash" onClick={() => onArchive(process.id)}>
                Evet, İptal Et
              </Button>
            </>
          }
        >
          <div className="dialog-body">
            <p className="col-2" style={{ margin: 0, fontSize: 13.5, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              <b>{employee.name}</b> için açılan işe giriş süreci arşivlenecek ve listeden düşecek.
              Evrak kayıtları silinmez, personel kaydına dokunulmaz.
            </p>
          </div>
        </Dialog>
      )}

      {duzenleme === 'personel' && (
        <PersonelDuzenle
          employee={employee}
          phone={phone}
          iban={iban}
          onCancel={() => setDuzenleme(null)}
          onSave={async (form) => {
            try {
              // Ad employees'e, telefon/IBAN onboardings'e — kullanıcı için tek form.
              if (form.name !== employee.name) {
                onEmployeeSaved(await updateEmployeeName(employee.id, form.name));
              }
              await setOnboardingContact(process.id, { phone: form.phone, iban: form.iban });
              setPhone(form.phone); setIban(form.iban);
              setDuzenleme(null);
            } catch (err) {
              console.error('Personel bilgileri kaydedilemedi', err);
              onToast('Personel bilgileri kaydedilemedi');
            }
          }}
        />
      )}

      {duzenleme === 'gorev' && (
        <GorevDuzenle
          employee={employee}
          stations={stations}
          departments={departments}
          roles={roles}
          onCancel={() => setDuzenleme(null)}
          onSave={async (form) => {
            // Employee tipi id taşımıyor (toEmployee onları düşürüyor) →
            // Select'lerden gelen adları id'ye çevirmek gerekiyor.
            const stationId = stations.find(s => s.name === form.station)?.id;
            const deptId    = departments.find(d => d.name === form.dept)?.id;
            const roleId    = roles.find(r => r.name === form.role)?.id;
            if (stationId == null || deptId == null || roleId == null) {
              onToast('Geçersiz şube, departman veya pozisyon');
              return;
            }
            try {
              onEmployeeSaved(await updateEmployeeAssignment(employee.id, {
                stationId, deptId, roleId, startDate: form.startDate,
              }));
              setDuzenleme(null);
            } catch (err) {
              console.error('Görev bilgileri kaydedilemedi', err);
              onToast('Görev bilgileri kaydedilemedi');
            }
          }}
        />
      )}
    </>
  );
}

// ---- İç içe düzenleme dialogları ----
// Dialog yığını (2ec21e4) sayesinde Escape yalnız üsttekini kapatıyor.

function PersonelDuzenle({
  employee, phone, iban, onCancel, onSave,
}: {
  employee: Employee; phone: string; iban: string;
  onCancel: () => void;
  onSave: (f: { name: string; phone: string; iban: string }) => void | Promise<void>;
}) {
  const [form, setForm] = useState({ name: employee.name, phone, iban });
  const [hata, setHata] = useState<string | undefined>();
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function submit() {
    const ad = form.name.trim();
    if (!ad || ad.length < 3 || !ad.includes(' ')) {
      setHata('Lütfen ad ve soyadı birlikte girin (ör. Ahmet Yılmaz)');
      return;
    }
    setKaydediliyor(true);
    await onSave({ ...form, name: ad });
    setKaydediliyor(false);
  }

  return (
    <Dialog
      title="Personel Bilgilerini Düzenle"
      width={440}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={kaydediliyor}>İptal</Button>
          <Button icon="check" onClick={submit} disabled={kaydediliyor}>Kaydet</Button>
        </>
      }
    >
      <div className="dialog-body">
        <div className="col-2">
          <Field label="Ad Soyad" error={hata}>
            <Input
              value={form.name}
              error={!!hata}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setHata(undefined); }}
            />
          </Field>
        </div>
        <div className="col-2">
          <Field label="Telefon">
            <Input value={form.phone} placeholder="0500 000 00 00" onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
        </div>
        <div className="col-2">
          <Field label="IBAN">
            <Input value={form.iban} placeholder="TR00 0000 0000 0000 0000 0000 00" onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

function GorevDuzenle({
  employee, stations, departments, roles, onCancel, onSave,
}: {
  employee: Employee;
  stations: Station[]; departments: Department[]; roles: Role[];
  onCancel: () => void;
  onSave: (f: { station: string; dept: string; role: string; startDate: string | null }) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    station: employee.station,
    dept: employee.dept,
    role: employee.role,
    startDate: employee.startDate,
  });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function submit() {
    setKaydediliyor(true);
    await onSave(form);
    setKaydediliyor(false);
  }

  return (
    <Dialog
      title="Görev Bilgilerini Düzenle"
      width={440}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={kaydediliyor}>İptal</Button>
          <Button icon="check" onClick={submit} disabled={kaydediliyor}>Kaydet</Button>
        </>
      }
    >
      <div className="dialog-body">
        <div className="col-2">
          <Field label="Şube">
            <Select
              value={form.station}
              onChange={v => setForm(f => ({ ...f, station: String(v) }))}
              options={stations.map(s => s.name)}
            />
          </Field>
        </div>
        <div className="col-2">
          <Field label="Departman">
            <Select
              value={form.dept}
              onChange={v => setForm(f => ({ ...f, dept: String(v) }))}
              options={departments.map(d => d.name)}
            />
          </Field>
        </div>
        <div className="col-2">
          <Field label="Pozisyon">
            <Select
              value={form.role}
              onChange={v => setForm(f => ({ ...f, role: String(v) }))}
              options={roles.map(r => r.name)}
            />
          </Field>
        </div>
        <div className="col-2">
          <Field label="İşe Giriş Tarihi">
            <Input
              type="date"
              value={form.startDate ?? ''}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value || null }))}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
