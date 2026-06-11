import { useState } from 'react';
import type { Employee, Shift } from '../../types';
import { STATIONS, DEPARTMENTS, SHIFT_CODES, WEEK_DAYS } from '../../constants';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';

interface ReportsScreenProps {
  employees: Employee[];
  shifts: Shift[];
}

export function ReportsScreen({ employees, shifts }: ReportsScreenProps) {
  const [station, setStation] = useState('Tümü');
  const [dept,    setDept]    = useState('Tümü');
  const [absentOpen, setAbsentOpen] = useState(false);

  const absentRows = shifts
    .filter(s =>
      s.status === 'Gelmedi' &&
      (station === 'Tümü' || s.station === station) &&
      (dept    === 'Tümü' || s.dept    === dept)
    )
    .map(s => ({
      s,
      emp: employees.find(e => e.id === s.empId),
      day: WEEK_DAYS[s.dayIndex],
      sc: SHIFT_CODES[s.code],
    }))
    .filter(r => r.emp && r.day);

  type Tone = 'primary' | 'absent' | 'came';
  const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
    primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
    came:    { bg: 'var(--came-bg)',      fg: 'var(--came-fg)' },
    absent:  { bg: 'var(--absent-bg)',    fg: 'var(--absent-fg)' },
  };

  const reports: Array<{ icon: string; tone: Tone; title: string; desc: string; val: string; sub: string; onClick?: () => void }> = [
    { icon: 'clipboard', tone: 'primary', title: 'Haftalık Devam Durumu',      desc: 'Tüm istasyonlar genelinde gelme oranı.',    val: '%92', sub: 'geçen haftaya göre +3' },
    { icon: 'userX',     tone: 'absent',  title: 'Gelmeyen Personel',           desc: 'İşaretlenen devamsızlıklar.',               val: String(absentRows.length), sub: 'vardiya', onClick: () => setAbsentOpen(true) },
    { icon: 'layers',    tone: 'came',    title: 'Departman Bazlı Devam Durumu', desc: 'Akaryakıt / Market devam oranı.',          val: '%94 / %89', sub: '' },
  ];

  const filterLabel = [station !== 'Tümü' ? station : null, dept !== 'Tümü' ? dept : null].filter(Boolean).join(' · ') || 'Tüm filtreler';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Raporlar</h1>
          <p className="page-desc">Devam ve vardiya dağılımlarını istasyon ve departman bazında inceleyin.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" icon="download">Dışa Aktar</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Select value="Bu Hafta" onChange={() => {}} icon="calendar" options={['Bu Hafta', 'Geçen Hafta', 'Bu Ay', 'Özel Aralık']} />
        <Select value={station} onChange={v => setStation(String(v))} icon="pin"    options={['Tümü', ...STATIONS].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm İstasyonlar' : s }))} />
        <Select value={dept}    onChange={v => setDept(String(v))}    icon="layers" options={['Tümü', ...DEPARTMENTS].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm Departmanlar' : s }))} />
      </div>

      <div className="report-grid">
        {reports.map((r, i) => {
          const { bg, fg } = TONE_STYLES[r.tone];
          return (
            <div
              key={i}
              className={`report-card${r.onClick ? ' report-card-action' : ''}`}
              onClick={r.onClick}
            >
              <span className="rc-ico" style={{ background: bg, color: fg }}>
                <Icon name={r.icon} size={20} />
              </span>
              <div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
              </div>
              <div className="rc-stat tnum">
                <b>{r.val}</b>
                {r.sub && <span>{r.sub}</span>}
                {r.onClick && <span className="rc-drill"><Icon name="chevronRight" size={14} /></span>}
              </div>
            </div>
          );
        })}
      </div>

      {absentOpen && (
        <Dialog
          title="Gelmeyen Personel"
          desc={`Bu hafta · ${filterLabel} · ${absentRows.length} kayıt`}
          onClose={() => setAbsentOpen(false)}
          width={620}
          footer={<Button variant="outline" onClick={() => setAbsentOpen(false)}>Kapat</Button>}
        >
          <div style={{ padding: '0 24px 4px' }}>
            {absentRows.length === 0 ? (
              <EmptyState
                icon="userCheck"
                title="Devamsızlık kaydı yok"
                description="Seçili filtrede devamsızlık işaretlenmemiş."
              />
            ) : (
              <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Personel</th>
                      <th>Gün</th>
                      <th>İstasyon / Dept.</th>
                      <th>Vardiya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absentRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <div className="cell-name">
                            <Avatar name={row.emp!.name} size={30} />
                            <div className="meta"><b>{row.emp!.name}</b><span>{row.emp!.role}</span></div>
                          </div>
                        </td>
                        <td>
                          <b style={{ fontSize: 13 }}>{row.day.key}</b>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: 12, marginLeft: 6 }}>{row.day.date}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{row.s.station} <span style={{ color: 'var(--muted-foreground)' }}>/ {row.s.dept}</span></td>
                        <td>
                          <span className={`sc-pill ${row.sc.cls}`} style={{ width: 30, height: 26 }}>{row.s.code}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
