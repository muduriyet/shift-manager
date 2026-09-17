import { useEffect, useMemo, useState } from 'react';
import type { Employee, Station, Department, Role, Profile, Onboarding } from '../../types';
import { archiveOnboarding, createOnboardingWithEmployee, fetchEmployee, fetchOnboardings } from '../../lib/db';
import { activeDocCount, fmtDMY, stageDef, trLower } from '../../lib/onboarding';
import { OnboardingModal } from '../modals/OnboardingModal';
import { OnboardingCreateModal, type OnboardingCreateForm } from '../modals/OnboardingCreateModal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';
import { SearchInput } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { Stat } from '../ui/Stat';

interface OnboardingScreenProps {
  employees: Employee[];
  stations: Station[];
  departments: Department[];
  roles: Role[];
  profiles: Profile[];
  currentUserId: string | null;
  onEmployeeSaved: (e: Employee) => void;
  onToast: (msg: string) => void;
}

// Aşama çubuğu: k. segment stage >= k iken dolu.
function StageBar({ stage }: { stage: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3].map(k => (
        <span
          key={k}
          style={{
            width: 18, height: 5, borderRadius: 99,
            background: stage >= k ? 'var(--came-dot)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

export function OnboardingScreen({
  employees, stations, departments, roles, profiles, currentUserId, onEmployeeSaved, onToast,
}: OnboardingScreenProps) {
  const [list, setList] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [station, setStation] = useState('Tümü');
  const [openId, setOpenId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Ekran-yerel fetch (alive guard) — App'in giriş anındaki Promise.all'ına
  // eklenmedi; oradaki bir hata tüm uygulamayı bloke ediyor.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchOnboardings();
        if (alive) setList(data);
      } catch (err) {
        console.error('İşe giriş süreçleri yüklenemedi', err);
        onToast('İşe giriş süreçleri yüklenemedi');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [onToast]);

  async function reload() {
    try {
      setList(await fetchOnboardings());
    } catch (err) {
      console.error('Liste yenilenemedi', err);
      onToast('Liste yenilenemedi');
    }
  }

  // Personel + süreç tek transaction (RPC). employee_id olmadan yeni personel
  // App state'ine giremez ve liste satırı ad/pozisyon eşleştiremeyip boş render eder.
  async function handleCreate(form: OnboardingCreateForm) {
    const stationId = stations.find(s => s.name === form.station)?.id;
    const deptId    = departments.find(d => d.name === form.dept)?.id;
    const roleId    = roles.find(r => r.name === form.role)?.id;
    if (stationId == null || deptId == null || roleId == null) {
      onToast('Geçersiz şube, departman veya pozisyon');
      return;
    }
    try {
      const { onboardingId, employeeId } = await createOnboardingWithEmployee(
        { name: form.name, stationId, deptId, roleId, startDate: form.startDate },
        currentUserId,
      );
      onEmployeeSaved(await fetchEmployee(employeeId));
      await reload();
      setCreateOpen(false);
      setOpenId(onboardingId);     // doğrudan detaya geç
    } catch (err) {
      console.error('Süreç oluşturulamadı', err);
      onToast('Süreç oluşturulamadı');
    }
  }

  // Elle arşivleme: tamamlanmadan iptal edilen süreçler için (işe alım
  // vazgeçildi vb.). S4'teki otomatik arşivlemeden ayrı bir yol.
  async function handleArchive(id: number) {
    setOpenId(null);
    try {
      await archiveOnboarding(id);
      onToast('Süreç arşivlendi');
    } catch (err) {
      console.error('Süreç arşivlenemedi', err);
      onToast('Süreç arşivlenemedi');
    }
    void reload();
  }

  // Arşivleme kararı BURADA, modalın içinde değil: Dialog X butonu, Escape ve
  // backdrop tıklamasıyla kapanıyor ve üçü de aynı onClose'a gidiyor. Modalın
  // içindeki bir buton akışına koysaydık Escape ile kapatan kullanıcının
  // tamamlanmış süreci arşivlenmeden listede kalırdı.
  //
  // Anında değil kapanışta: kullanıcı modal içindeyken aşamayı serbestçe
  // ileri-geri alabilmeli. Anında arşivlense yanlış bir tık süreci listeden
  // düşürür ve UI'dan geri dönüş kalmazdı.
  async function handleModalClose(finalStage: number) {
    const id = openId;
    setOpenId(null);
    if (id != null && finalStage >= 3) {
      try {
        await archiveOnboarding(id);
      } catch (err) {
        console.error('Süreç arşivlenemedi', err);
        onToast('Süreç arşivlenemedi');
      }
    }
    void reload();
  }

  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // View personel bilgisi taşımıyor; ad/pozisyon/şube/başlangıç App'ten gelen
  // employees dizisinden eşleştiriliyor (fetchEmployees filtresiz, hepsi yüklü).
  const joined = useMemo(
    () => list
      .map(o => ({ o, emp: empById.get(o.employeeId) }))
      .filter((x): x is { o: Onboarding; emp: Employee } => !!x.emp),
    [list, empById],
  );

  const rows = useMemo(() => {
    const needle = trLower(q.trim());
    return joined.filter(({ emp }) =>
      (station === 'Tümü' || emp.station === station) &&
      (needle === '' || [emp.name, emp.role].some(v => trLower(v).includes(needle)))
    );
  }, [joined, q, station]);

  // Sayaçlar filtreden bağımsız (TaskNotebookScreen konvansiyonu).
  // 3. aşama için kart yok: oraya geçen süreç tamamlanıp arşivleniyor, yani
  // Toplam >= diğer ikisinin toplamı — eşitlik garanti değil.
  const stage1 = list.filter(o => o.stage === 1).length;
  const stage2 = list.filter(o => o.stage === 2).length;

  const stationNames = stations.map(s => s.name);
  const hasAny = list.length > 0;

  // Açık modalın verisi listeden gelir; personel eşleşmesi zaten joined'da yapıldı.
  const acik = openId != null ? joined.find(x => x.o.id === openId) ?? null : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">İşe Giriş Süreçleri</h1>
          <p className="page-desc">Yeni personelin işe giriş adımlarını ve evrak durumunu takip edin</p>
        </div>
        <div className="page-actions">
          <Button icon="plus" onClick={() => setCreateOpen(true)}>Yeni Süreç</Button>
        </div>
      </div>

      <div className="stat-grid stat-grid-3">
        <Stat label="Toplam Açık Süreç"        value={list.length} icon="users"     tone="primary" foot="Tüm açık süreçler" />
        <Stat label="Personel Evrak Bekleniyor" value={stage1}      icon="inbox"     tone="came"    foot="İşe giriş maili atıldı" />
        <Stat label="Giriş Evrak Bekleniyor"    value={stage2}      icon="userCheck" tone="late"    foot="SGK girişi yapıldı" />
      </div>

      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Personel veya pozisyon ara..." />
          <div style={{ marginLeft: 'auto' }}>
            <Select
              value={station}
              onChange={v => setStation(String(v))}
              icon="building"
              options={['Tümü', ...stationNames].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm Şubeler' : s }))}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13.5 }}>
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={hasAny ? 'search' : 'userCheck'}
            title={hasAny ? 'Sonuç bulunamadı' : 'Açık işe giriş süreci yok'}
            description={
              hasAny
                ? 'Arama veya filtre ölçütlerinize uyan işe giriş süreci yok.'
                : 'Yeni personel için süreç açıldığında burada listelenir.'
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="tbl" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th>Personel</th>
                    <th style={{ textAlign: 'center' }}>Şube</th>
                    <th>Süreç Adımı</th>
                    <th style={{ textAlign: 'center' }}>Evrak</th>
                    <th>Başlangıç</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ o, emp }) => {
                    const evrak = activeDocCount(o);
                    const tam = evrak.total > 0 && evrak.done === evrak.total;
                    return (
                      <tr
                        key={o.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setOpenId(o.id)}
                      >
                        <td>
                          <div className="cell-name">
                            <Avatar name={emp.name} size={32} />
                            <div className="meta">
                              <b>{emp.name}</b>
                              <span>{emp.role}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{emp.station}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <StageBar stage={o.stage} />
                            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
                              {stageDef(o.stage).short}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 650, color: tam ? 'var(--came-fg)' : 'var(--late-fg)' }}>
                            {evrak.done}/{evrak.total}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--subtle-foreground)' }}>
                            {evrak.set.title}
                          </div>
                        </td>
                        <td className="tnum">{fmtDMY(emp.startDate)}</td>
                        <td style={{ textAlign: 'center', width: 36 }}>
                          <Icon name="chevronRight" size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '11px 20px', borderTop: '1px solid var(--border)',
                fontSize: 12.5, color: 'var(--muted-foreground)',
              }}
            >
              <span>{rows.length} süreç gösteriliyor</span>
              <span>Detay için satıra tıklayın</span>
            </div>
          </>
        )}
      </div>

      {acik && (
        <OnboardingModal
          process={acik.o}
          employee={acik.emp}
          profiles={profiles}
          stations={stations}
          departments={departments}
          roles={roles}
          onEmployeeSaved={onEmployeeSaved}
          onToast={onToast}
          onClose={handleModalClose}
          onArchive={handleArchive}
        />
      )}

      {createOpen && (
        <OnboardingCreateModal
          stations={stations}
          departments={departments}
          roles={roles}
          onCancel={() => setCreateOpen(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
