import { useState } from 'react';
import type { Employee } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { SearchInput } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';

interface EmployeesScreenProps {
  employees: Employee[];
  stationNames: string[];
  deptNames: string[];
  onEdit: (e: Employee) => void;
  onAdd: () => void;
  onSetActive: (id: number, active: boolean) => void;
}

export function EmployeesScreen({ employees, stationNames, deptNames, onEdit, onAdd, onSetActive }: EmployeesScreenProps) {
  const [q, setQ] = useState('');
  const [station, setStation] = useState('Tümü');
  const [dept, setDept] = useState('Tümü');
  const [status, setStatus] = useState<'Tümü' | 'Aktif' | 'Pasif'>('Aktif');
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const confirmEmp = confirmId != null ? employees.find(e => e.id === confirmId) : null;

  function handleDeactivateClick(id: number) { setConfirmId(id); }
  function handleConfirm() { if (confirmId != null) { onSetActive(confirmId, false); setConfirmId(null); } }
  function handleCancel() { setConfirmId(null); }

  const rows = employees.filter(e =>
    (status === 'Tümü' || e.status === status) &&
    (station === 'Tümü' || e.station === station) &&
    (dept === 'Tümü' || e.dept === dept) &&
    (q === '' || e.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
  );

  // Hiç personel yoksa "ilk personeli ekle"; varsa ama filtre elediyse "sonuç yok" göster.
  const hasEmployees = employees.length > 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Personel Listesi</h1>
          <p className="page-desc">Personel bilgilerini yönetin ve istasyon / departman atamalarını belirleyin.</p>
        </div>
        <div className="page-actions">
          <Button icon="plus" onClick={onAdd}>Yeni Personel Ekle</Button>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Personel ara..." />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <Select
              value={status}
              onChange={v => setStatus(v as 'Tümü' | 'Aktif' | 'Pasif')}
              icon="filter"
              options={[
                { value: 'Aktif', label: 'Aktif Personel' },
                { value: 'Pasif', label: 'Pasif Personel' },
                { value: 'Tümü',  label: 'Tüm Durumlar' },
              ]}
            />
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
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={hasEmployees ? 'search' : 'users'}
            title={hasEmployees ? 'Sonuç bulunamadı' : 'Henüz personel eklenmedi'}
            description={
              hasEmployees
                ? 'Arama veya filtre kriterlerinizi değiştirerek tekrar deneyin.'
                : 'İlk personeli eklemek için "Yeni Personel Ekle" butonuna tıklayın.'
            }
            action={!hasEmployees ? { label: 'Personel Ekle', icon: 'plus', onClick: onAdd } : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrap desk-only">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>İstasyon</th>
                    <th>Departman</th>
                    <th>Görev</th>
                    <th style={{ textAlign: 'center' }}>Durum</th>
                    <th style={{ textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div className="cell-name">
                          <Avatar name={e.name} size={36} />
                          <div className="meta">
                            <b>{e.name}</b>
                            <span>#{String(e.id).padStart(3, '0')}</span>
                          </div>
                        </div>
                      </td>
                      <td>{e.station}</td>
                      <td><Badge variant="dept">{e.dept}</Badge></td>
                      <td>{e.role}</td>
                      <td style={{ textAlign: 'center' }}><Badge status={e.status} /></td>
                      <td>
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" icon="pencil" onClick={() => onEdit(e)} title="Düzenle" />
                          {e.status === 'Aktif' ? (
                            <Button variant="ghost" size="sm" icon="userX" onClick={() => handleDeactivateClick(e.id)} title="Pasife Al" />
                          ) : (
                            <Button variant="ghost" size="sm" icon="userCheck" onClick={() => onSetActive(e.id, true)} title="Aktif Et" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="only-mobile emp-cards">
              {rows.map(e => (
                <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar name={e.name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 15 }}>{e.name}</b>
                      <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{e.role}</div>
                    </div>
                    <Badge status={e.status} dot />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, fontSize: 13 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--subtle-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>İstasyon</div>
                      {e.station}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--subtle-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>Departman</div>
                      {e.dept}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 11, color: 'var(--subtle-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>Görev</div>
                      {e.role}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Button variant="outline" size="sm" icon="pencil" onClick={() => onEdit(e)} style={{ flex: 1 }}>Düzenle</Button>
                    {e.status === 'Aktif' ? (
                      <Button variant="ghost" size="sm" icon="userX" onClick={() => handleDeactivateClick(e.id)} title="Pasife Al" />
                    ) : (
                      <Button variant="ghost" size="sm" icon="userCheck" onClick={() => onSetActive(e.id, true)} title="Aktif Et" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {confirmEmp && (
        <div className="overlay" onClick={handleCancel}>
          <div className="dialog" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="dialog-head">
              <h2>Personeli Pasife Al</h2>
              <p><b>{confirmEmp.name}</b> pasife alınacak. Geçmiş vardiyaları korunur ve istediğin zaman tekrar aktif edebilirsin.</p>
            </div>
            <div className="dialog-foot">
              <Button variant="outline" onClick={handleCancel}>İptal</Button>
              <Button variant="primary" icon="userX" onClick={handleConfirm}>Pasife Al</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
