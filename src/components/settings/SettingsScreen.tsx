import type { Employee } from '../../types';
import { STATIONS, DEPARTMENTS } from '../../constants';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface SettingsScreenProps {
  employees: Employee[];
  onToast: (msg: string) => void;
}

export function SettingsScreen({ employees, onToast }: SettingsScreenProps) {
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
            {STATIONS.map(s => (
              <div className="set-item" key={s}>
                <Icon name="building" size={16} style={{ color: 'var(--muted-foreground)' }} />
                <div className="si-main">
                  <b>{s}</b>
                  <span>{DEPARTMENTS.length} departman aktif</span>
                </div>
                <Badge status="Aktif" dot className="si-r" />
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 14 }} onClick={() => onToast('İstasyon ekleme formu açıldı')}>
            İstasyon Ekle
          </Button>
        </div>

        {/* Departman */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="stat-ico" style={{ background: 'var(--came-bg)', color: 'var(--came-fg)' }}>
              <Icon name="layers" size={18} />
            </span>
            <div>
              <h2 className="card-title">Departman Tanımları</h2>
              <p className="card-sub">Her departman bir istasyona bağlıdır</p>
            </div>
          </div>
          <div className="set-list">
            {STATIONS.map(st => (
              <div key={st} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon name="pin" size={14} style={{ color: 'var(--primary)' }} />
                  <b style={{ fontSize: 13 }}>{st}</b>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>istasyonu</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 22 }}>
                  {DEPARTMENTS.map(d => (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="layers" size={14} style={{ color: 'var(--muted-foreground)' }} />
                      <div className="si-main" style={{ flex: 1 }}>
                        <b style={{ fontSize: 13 }}>{d}</b>{' '}
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                          · {employees.filter(e => e.station === st && e.dept === d).length} personel
                        </span>
                      </div>
                      <Badge status="Aktif" dot />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 14 }} onClick={() => onToast('Departman ekleme formu açıldı')}>
            Departman Ekle
          </Button>
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
            {([['Sabah', '08:00 – 16:00'], ['Öğlen', '16:00 – 00:00'], ['Gece', '00:00 – 08:00']] as const).map(([n, t]) => (
              <div className="set-item" key={n}>
                <div className="si-main"><b>{n}</b></div>
                <span className="time-pill si-r tnum">{t}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 14 }} onClick={() => onToast('Vardiya şablonu ekleme açıldı')}>
            Vardiya Şablonu Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}
