import { useState } from 'react';
import type { Employee, Station, Department, Role } from '../../types';
import { SHIFT_TIMES } from '../../constants';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';

const COLOR_OPTIONS = [
  '#1e3a8a', '#0f766e', '#b45309', '#7c3aed', '#be185d', '#0369a1', '#64748b',
];

interface SettingsScreenProps {
  employees: Employee[];
  stations: Station[];
  departments: Department[];
  roles: Role[];
  onAddStation: (name: string) => Promise<void>;
  onDeleteStation: (id: number) => Promise<void>;
  onAddDepartment: (name: string, color: string) => Promise<void>;
  onDeleteDepartment: (id: number) => Promise<void>;
  onAddRole: (name: string) => Promise<void>;
  onDeleteRole: (id: number) => Promise<void>;
  onToast: (msg: string) => void;
}

export function SettingsScreen({
  employees, stations, departments, roles,
  onAddStation, onDeleteStation, onAddDepartment, onDeleteDepartment,
  onAddRole, onDeleteRole, onToast,
}: SettingsScreenProps) {
  const [addingStation,  setAddingStation]  = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [addingDept,     setAddingDept]     = useState(false);
  const [newDeptName,    setNewDeptName]    = useState('');
  const [newDeptColor,   setNewDeptColor]   = useState(COLOR_OPTIONS[0]);
  const [addingRole,     setAddingRole]     = useState(false);
  const [newRoleName,    setNewRoleName]    = useState('');
  const [saving,         setSaving]         = useState(false);

  async function handleAddStation() {
    const name = newStationName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onAddStation(name);
      setNewStationName('');
      setAddingStation(false);
    } catch {
      onToast('İstasyon eklenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStation(id: number, name: string) {
    const assigned = employees.filter(e => e.station === name).length;
    if (assigned > 0) {
      onToast(`"${name}" istasyonunda ${assigned} personel var — önce başka istasyona taşıyın`);
      return;
    }
    try {
      await onDeleteStation(id);
    } catch {
      onToast('İstasyon silinemedi');
    }
  }

  async function handleAddDept() {
    const name = newDeptName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onAddDepartment(name, newDeptColor);
      setNewDeptName('');
      setNewDeptColor(COLOR_OPTIONS[0]);
      setAddingDept(false);
    } catch {
      onToast('Departman eklenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDept(id: number, name: string) {
    const assigned = employees.filter(e => e.dept === name).length;
    if (assigned > 0) {
      onToast(`"${name}" departmanında ${assigned} personel var — önce başka departmana taşıyın`);
      return;
    }
    try {
      await onDeleteDepartment(id);
    } catch {
      onToast('Departman silinemedi');
    }
  }

  async function handleAddRole() {
    const name = newRoleName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onAddRole(name);
      setNewRoleName('');
      setAddingRole(false);
    } catch {
      onToast('Görev eklenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(id: number, name: string) {
    const assigned = employees.filter(e => e.role === name).length;
    if (assigned > 0) {
      onToast(`"${name}" görevinde ${assigned} personel var — önce başka göreve taşıyın`);
      return;
    }
    try {
      await onDeleteRole(id);
    } catch {
      onToast('Görev silinemedi');
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ayarlar</h1>
          <p className="page-desc">İstasyon, departman ve vardiya yapılandırmasını yönetin.</p>
        </div>
      </div>

      <div className="set-grid">
        {/* İstasyon */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="stat-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Icon name="pin" size={18} />
            </span>
            <div>
              <h2 className="card-title">İstasyon Ayarları</h2>
              <p className="card-sub">Aktif istasyonlar</p>
            </div>
          </div>
          <div className="set-list">
            {stations.map(s => (
              <div className="set-item" key={s.id}>
                <Icon name="building" size={16} style={{ color: 'var(--muted-foreground)' }} />
                <div className="si-main">
                  <b>{s.name}</b>
                  <span>
                    {employees.filter(e => e.station === s.name).length} personel
                  </span>
                </div>
                <Badge status="Aktif" dot className="si-r" />
                <button
                  className="icon-btn danger"
                  title="Sil"
                  onClick={() => handleDeleteStation(s.id, s.name)}
                  style={{ marginLeft: 6, color: 'var(--absent-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>

          {addingStation ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <Input
                value={newStationName}
                onChange={e => setNewStationName(e.target.value)}
                placeholder="İstasyon adı"
                onKeyDown={e => { if (e.key === 'Enter') handleAddStation(); if (e.key === 'Escape') setAddingStation(false); }}
                style={{ flex: 1 }}
              />
              <Button size="sm" onClick={handleAddStation} disabled={saving || !newStationName.trim()}>Kaydet</Button>
              <Button size="sm" variant="outline" onClick={() => { setAddingStation(false); setNewStationName(''); }}>İptal</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 14 }} onClick={() => setAddingStation(true)}>
              İstasyon Ekle
            </Button>
          )}
        </div>

        {/* Departman */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="stat-ico" style={{ background: 'var(--came-bg)', color: 'var(--came-fg)' }}>
              <Icon name="layers" size={18} />
            </span>
            <div>
              <h2 className="card-title">Departman Tanımları</h2>
              <p className="card-sub">Tüm istasyonlarda geçerli</p>
            </div>
          </div>
          <div className="set-list">
            {departments.map(d => (
              <div className="set-item" key={d.id}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <div className="si-main">
                  <b>{d.name}</b>
                  <span>
                    {employees.filter(e => e.dept === d.name).length} personel
                  </span>
                </div>
                <Badge status="Aktif" dot className="si-r" />
                <button
                  className="icon-btn danger"
                  title="Sil"
                  onClick={() => handleDeleteDept(d.id, d.name)}
                  style={{ marginLeft: 6, color: 'var(--absent-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>

          {addingDept ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Input
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  placeholder="Departman adı"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddDept(); if (e.key === 'Escape') setAddingDept(false); }}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewDeptColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: 4, background: c, border: 'none', cursor: 'pointer',
                      outline: c === newDeptColor ? '2px solid var(--foreground)' : '2px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={handleAddDept} disabled={saving || !newDeptName.trim()}>Kaydet</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingDept(false); setNewDeptName(''); }}>İptal</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 14 }} onClick={() => setAddingDept(true)}>
              Departman Ekle
            </Button>
          )}
        </div>

        {/* Görev */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="stat-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Icon name="users" size={18} />
            </span>
            <div>
              <h2 className="card-title">Görev Tanımları</h2>
              <p className="card-sub">Personel görev / pozisyonları</p>
            </div>
          </div>
          <div className="set-list">
            {roles.map(r => (
              <div className="set-item" key={r.id}>
                <Icon name="userCheck" size={16} style={{ color: 'var(--muted-foreground)' }} />
                <div className="si-main">
                  <b>{r.name}</b>
                  <span>{employees.filter(e => e.role === r.name).length} personel</span>
                </div>
                <Badge status="Aktif" dot className="si-r" />
                <button
                  className="icon-btn danger"
                  title="Sil"
                  onClick={() => handleDeleteRole(r.id, r.name)}
                  style={{ marginLeft: 6, color: 'var(--absent-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>

          {addingRole ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <Input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="Görev adı"
                onKeyDown={e => { if (e.key === 'Enter') handleAddRole(); if (e.key === 'Escape') setAddingRole(false); }}
                style={{ flex: 1 }}
              />
              <Button size="sm" onClick={handleAddRole} disabled={saving || !newRoleName.trim()}>Kaydet</Button>
              <Button size="sm" variant="outline" onClick={() => { setAddingRole(false); setNewRoleName(''); }}>İptal</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 14 }} onClick={() => setAddingRole(true)}>
              Görev Ekle
            </Button>
          )}
        </div>

        {/* Vardiya Saatleri */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="stat-ico" style={{ background: 'var(--late-bg)', color: 'var(--late-fg)' }}>
              <Icon name="clock" size={18} />
            </span>
            <div>
              <h2 className="card-title">Vardiya Saatleri</h2>
              <p className="card-sub">Varsayılan vardiya şablonları</p>
            </div>
          </div>
          <div className="set-list">
            {SHIFT_TIMES.map(t => (
              <div className="set-item" key={t.id}>
                <div className="si-main"><b>{t.label}</b></div>
                <span className="time-pill si-r tnum">{t.start} – {t.end}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
