import { useState } from 'react';
import type { Shift, Employee, ShiftStatus } from '../../types';
import { STATIONS, DEPARTMENTS, SHIFT_CODES, WORK_CODES, TODAY_DATE, addDays, dateToStr, MONTH_NAMES } from '../../constants';
import { Stat } from '../ui/Stat';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';
import { EmptyState } from '../ui/EmptyState';

const QUICK: Array<{ status: ShiftStatus; label: string; on: string }> = [
  { status: 'Geldi',   label: 'Geldi',   on: 'on-came' },
  { status: 'Gelmedi', label: 'Gelmedi', on: 'on-absent' },
];

const SHIFT_CODE_ORDER: Record<string, number> = { S: 0, Ö: 1, G: 2 };

interface DailyScreenProps {
  shifts: Shift[];
  employees: Employee[];
  station: string;
  setStation: (s: string) => void;
  dept: string;
  setDept: (d: string) => void;
  setStatus: (shiftId: number, status: ShiftStatus) => void;
}

export function DailyScreen({ shifts, employees, station, setStation, dept, setDept, setStatus }: DailyScreenProps) {
  const [viewDate, setViewDate] = useState<Date>(() => addDays(TODAY_DATE, -1));
  const viewDateStr = dateToStr(viewDate);

  const isToday = viewDateStr === dateToStr(TODAY_DATE);
  const isYesterday = viewDateStr === dateToStr(addDays(TODAY_DATE, -1));
  const dayLabel = `${viewDate.getDate()} ${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const wdNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const fullLabel = `${wdNames[(viewDate.getDay() + 6) % 7]}, ${dayLabel}`;

  const empMap = new Map(employees.map(e => [e.id, e]));

  const allowedIds = new Set(
    employees
      .filter(e => (station === 'Tümü' || e.station === station) && (dept === 'Tümü' || e.dept === dept))
      .map(e => e.id)
  );

  const rows = shifts
    .filter(s => s.shiftDate === viewDateStr && allowedIds.has(s.empId) && (WORK_CODES as readonly string[]).includes(s.code))
    .sort((a, b) => (SHIFT_CODE_ORDER[a.code] ?? 9) - (SHIFT_CODE_ORDER[b.code] ?? 9) || a.start.localeCompare(b.start));

  const counts = {
    total:  rows.length,
    came:   rows.filter(s => s.status === 'Geldi').length,
    absent: rows.filter(s => s.status === 'Gelmedi').length,
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Günlük Kontrol</h1>
          <p className="page-desc">Vardiya devam durumunu takip edin ve tek dokunuşla işaretleyin.</p>
        </div>
        <div className="page-actions">
          <div className="weekpick">
            <Button variant="ghost" size="sm" icon="chevronLeft" onClick={() => setViewDate(d => addDays(d, -1))} />
            <span className="lbl tnum">
              <Icon name="calendar" size={15} style={{ marginRight: 7, verticalAlign: '-2px', color: 'var(--muted-foreground)' }} />
              {isToday ? 'Bugün' : fullLabel}
            </span>
            <Button variant="ghost" size="sm" icon="chevronRight" onClick={() => setViewDate(d => addDays(d, 1))} />
            {!isYesterday && (
              <>
                <span style={{ width: 1, height: 18, background: 'var(--border-strong)', margin: '0 2px' }} />
                <Button variant="ghost" size="sm" onClick={() => setViewDate(addDays(TODAY_DATE, -1))}>Dün</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {!isToday && (
        <p style={{ margin: '-8px 0 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>{fullLabel}</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Select
          value={station}
          onChange={v => setStation(String(v))}
          icon="pin"
          options={['Tümü', ...STATIONS].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm İstasyonlar' : s }))}
        />
        <Select
          value={dept}
          onChange={v => setDept(String(v))}
          icon="layers"
          options={['Tümü', ...DEPARTMENTS].map(s => ({ value: s, label: s === 'Tümü' ? 'Tüm Departmanlar' : s }))}
        />
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Toplam Personel" value={counts.total} icon="users"     tone="primary" foot={<span>{isToday ? 'Bugün vardiyalı' : dayLabel}</span>} />
        <Stat label="Gelen"           value={counts.came}  icon="userCheck" tone="came"    foot={<span>{counts.total ? Math.round(counts.came / counts.total * 100) : 0}% devam</span>} />
        <Stat label="Gelmeyen"        value={counts.absent} icon="userX"    tone="absent"  foot={<span>{counts.absent > 0 ? 'İşlem gerekiyor' : 'Sorun yok'}</span>} />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">{isToday ? 'Bugünkü Vardiyalar' : `${dayLabel} Vardiyaları`}</h2>
            <p className="card-sub">{rows.length} vardiya · devam durumunu işaretleyin</p>
          </div>
          {isToday && (
            <Badge variant="neutral">
              <Icon name="clock" size={13} style={{ marginRight: 2 }} />
              Canlı
            </Badge>
          )}
        </div>

        <div className="att-list">
          {rows.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="Bu filtrede vardiya yok"
              description="Farklı bir istasyon, departman veya tarih seçin."
            />
          ) : (
            rows.map(s => {
              const emp = empMap.get(s.empId);
              if (!emp) return null;
              return (
                <div className="att-row" key={s.id}>
                  <div className="att-main">
                    <Avatar name={emp.name} size={42} />
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 14.5 }}>{emp.name}</b>
                      <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{emp.role}</div>
                    </div>
                  </div>
                  <div className="att-meta-cols">
                    <div className="att-mc">
                      <span className="k">Vardiya</span>
                      <span className="v att-time">
                        <Icon name="clock" size={14} />
                        <span>{SHIFT_CODES[s.code]?.label} · </span>
                        <span className="tnum">{s.start}–{s.end}</span>
                      </span>
                    </div>
                    <div className="att-mc"><span className="k">İstasyon</span><span className="v">{s.station}</span></div>
                    <div className="att-mc"><span className="k">Departman</span><span className="v">{s.dept}</span></div>
                    <div className="att-mc"><span className="k">Durum</span><span className="v"><Badge status={s.status} dot /></span></div>
                  </div>
                  <div className="att-actions">
                    {QUICK.map(q => (
                      <button
                        key={q.status}
                        className={`qbtn${s.status === q.status ? ' ' + q.on : ''}`}
                        onClick={() => setStatus(s.id, s.status === q.status ? 'Planlandı' : q.status)}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
