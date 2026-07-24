import { useEffect, useState } from 'react';
import type { Employee, Profile, Onboarding, OnboardingDetail, OnboardingDoc, OnboardingStage } from '../../types';
import { fetchOnboarding, fetchOnboardingDocs } from '../../lib/db';
import {
  DOC_SETS, STAGES, STEP_BADGE, allOriginalsReceived, fmtDMY, isComplete, stepStatus,
} from '../../lib/onboarding';
import { Dialog } from '../ui/Dialog';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

interface OnboardingModalProps {
  process: Onboarding;      // liste satırı — phone/iban/notes taşımaz
  employee: Employee;
  profiles: Profile[];
  onClose: () => void;
}

// ---- Stepper ----
// Üç durum: tamam / devam / bekleme (lib/onboarding.ts stepStatus).
// Tasarımın iki rozeti üçe çıktı; "Devam Ediyor" sıradaki işi gösteriyor.
function Stepper({ process }: { process: Onboarding }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
      {STAGES.map(s => {
        const durum = stepStatus(process, s.n);
        const rozet = STEP_BADGE[durum];
        const sonraki = s.n < 3 ? stepStatus(process, (s.n + 1) as OnboardingStage) : null;
        const daireStil =
          durum === 'tamam'
            ? { background: 'var(--came-fg)', color: '#fff', border: '2px solid var(--came-fg)', boxShadow: '0 0 0 5px var(--came-bg)' }
            : durum === 'devam'
              ? { background: 'var(--surface)', color: 'var(--late-fg)', border: '2px solid var(--late-fg)' }
              : { background: 'var(--surface)', color: 'var(--subtle-foreground)', border: '2px solid var(--border)' };

        return (
          <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
            {/* Bağlayıcı çizgi: sonraki adım tamamsa düz yeşil, değilse kesikli gri */}
            {sonraki && (
              <div
                style={{
                  position: 'absolute', top: 25, left: '50%', width: '100%', height: 0,
                  borderTop: sonraki === 'tamam' ? '2px solid var(--came-dot)' : '2px dashed var(--border-strong)',
                }}
              />
            )}
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
                position: 'relative', zIndex: 1, ...daireStil,
              }}
            >
              <Icon name={s.icon} size={22} />
            </div>
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

// ---- Evrak tablosu (S3: salt okunur) ----
// Pill'ler S4'te tıklanabilir olacak; şimdilik yalnız durumu gösteriyorlar.
function DocTable({
  setId, docs, tamamlandiSatiri,
}: {
  setId: 'personel' | 'giris' | 'asil';
  docs: OnboardingDoc[];
  tamamlandiSatiri?: boolean;
}) {
  const def = DOC_SETS.find(s => s.id === setId)!;
  const satirlar = docs.filter(d => d.docSet === setId);
  const grid = 'minmax(0,1fr) 120px 120px';

  const pill = (aktif: boolean, olumlu: boolean, metin: string) => (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
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
    </span>
  );

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
          <div style={{ textAlign: 'center' }}>{pill(d.isDone, true, def.doneLabel)}</div>
          <div style={{ textAlign: 'center' }}>{pill(!d.isDone, false, def.notDoneLabel)}</div>
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
          Tüm evrak asılları teslim alındı — süreç tamamlandı.
        </div>
      )}
    </div>
  );
}

// ---- Sağ ray bölümü ----
function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{title}</h3>
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

export function OnboardingModal({ process, employee, profiles, onClose }: OnboardingModalProps) {
  const [detail, setDetail] = useState<OnboardingDetail | null>(null);
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Liste satırı phone/iban/notes taşımıyor (view onları dışarıda bırakıyor),
  // evraklar da ayrı tabloda — ikisi paralel çekiliyor.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [d, ds] = await Promise.all([
          fetchOnboarding(process.id),
          fetchOnboardingDocs(process.id),
        ]);
        if (alive) { setDetail(d); setDocs(ds); }
      } catch (err) {
        console.error('Süreç detayı yüklenemedi', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [process.id]);

  const tamam = isComplete(process);
  const hepsiGeldi = allOriginalsReceived(process);
  const olusturan = profiles.find(p => p.id === process.createdBy)?.displayName ?? null;

  return (
    <Dialog
      title={employee.name}
      desc={`${employee.role} • ${employee.station} Şubesi • ${employee.dept}`}
      width={980}
      onClose={onClose}
    >
      <div className="dialog-body dialog-body-rail">
        {/* ---- Ana kolon ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tamam
              ? <Badge status="Geldi">Tamamlandı</Badge>
              : <Badge status="Aktif" dot>Aktif Süreç</Badge>}
          </div>

          {/* Meta şerit */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '14px 18px',
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>İşe Giriş Tarihi</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }} className="tnum">{fmtDMY(employee.startDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>Oluşturulma Tarihi</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }} className="tnum">{fmtDMY(process.createdAt)}</div>
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

          <Stepper process={process} />

          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13.5 }}>
              Evraklar yükleniyor…
            </div>
          ) : (
            <>
              <DocTable setId="personel" docs={docs} />
              <DocTable setId="giris" docs={docs} />
              <DocTable setId="asil" docs={docs} tamamlandiSatiri={hepsiGeldi} />
            </>
          )}
        </div>

        {/* ---- Sağ ray ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <RailCard title="Personel Bilgileri">
            <RailRow label="Ad Soyad" value={employee.name} />
            <RailRow label="Telefon" value={loading ? '…' : (detail?.phone ?? '')} />
            <RailRow label="IBAN" value={loading ? '…' : (detail?.iban ?? '')} />
          </RailCard>

          <RailCard title="Görev Bilgileri">
            <RailRow label="Departman" value={employee.dept} />
            <RailRow label="Pozisyon" value={employee.role} />
            <RailRow label="Şube" value={employee.station} />
            <RailRow label="İşe Giriş Tarihi" value={fmtDMY(employee.startDate)} />
          </RailCard>

          <RailCard title="Notlar">
            {loading ? (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted-foreground)' }}>…</p>
            ) : detail?.notes ? (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{detail.notes}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--subtle-foreground)' }}>Henüz not eklenmemiş.</p>
            )}
          </RailCard>

          {/* Bilgi kutusu — metin tasarımdan düzeltildi: bu uygulamada
              "personel kaydı aktif hale gelme" veya bordro sistemi yok. */}
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
  );
}
