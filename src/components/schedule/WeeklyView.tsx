import { useState, useEffect } from 'react';
import type { Shift, Employee, MonthGroup, WeekDay } from '../../types';
import { SHIFT_CODES, WORK_CODES, MONTH_SHORT_NAMES, isWithinEmployment } from '../../constants';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { EmptyState } from '../ui/EmptyState';

function shiftsFor(shifts: Shift[], empId: number, dateStr: string) {
  return shifts.filter(s => s.empId === empId && s.shiftDate === dateStr);
}

function fmtShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_SHORT_NAMES[m - 1]} ${y}`;
}

// İstihdam penceresi dışındaki hücre için tooltip metni (neden boş?).
function outsideReason(emp: Employee, dateStr: string): string {
  if (emp.startDate && dateStr < emp.startDate) return `${emp.name} · işe giriş ${fmtShort(emp.startDate)}`;
  if (emp.endDate   && dateStr > emp.endDate)   return `${emp.name} · işten çıkış ${fmtShort(emp.endDate)}`;
  return '';
}

interface WeeklyViewProps {
  groups: MonthGroup[];
  shifts: Shift[];
  employeeMap: Map<number, Employee>;
  weekDays: WeekDay[];
  todayIndex: number;   // -1 if today is not in this week
  onShiftClick: (s: Shift) => void;
  onNewShift: () => void;
  onAddShift: (empId: number, dateStr: string) => void;
}

export function WeeklyView({ groups, shifts, employeeMap, weekDays, todayIndex, onShiftClick, onNewShift, onAddShift }: WeeklyViewProps) {
  const codeOrder: Record<string, number> = { S: 0, Ö: 1, G: 2, 'Öz': 3 };

  // Sıralama çapası gün indeksi. null ise (bugün o haftada yok ve gün seçilmedi) isme göre sıralanır.
  const [sortIndex, setSortIndex] = useState<number | null>(todayIndex >= 0 ? todayIndex : null);
  const weekKey = weekDays[0]?.dateStr;
  useEffect(() => {
    setSortIndex(todayIndex >= 0 ? todayIndex : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  const sortedGroups = groups.map(g => ({
    ...g,
    emps: [...g.emps].sort((a, b) => {
      if (sortIndex === null) return a.name.localeCompare(b.name, 'tr');
      const sortDate = weekDays[sortIndex].dateStr;
      const sa = shifts.find(x => x.empId === a.id && x.shiftDate === sortDate);
      const sb = shifts.find(x => x.empId === b.id && x.shiftDate === sortDate);
      const ra = sa ? (codeOrder[sa.code] ?? 8) : 9;
      const rb = sb ? (codeOrder[sb.code] ?? 8) : 9;
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name, 'tr');
    }),
  }));

  if (sortedGroups.every(g => g.emps.length === 0)) {
    return (
      <div className="sched-scroll" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
        <EmptyState
          icon="calendar"
          title="Bu filtreye ait vardiya bulunamadı"
          description="Farklı bir istasyon veya departman seçin, ya da yeni vardiya ekleyin."
          action={{ label: 'Yeni Vardiya Ekle', icon: 'plus', onClick: onNewShift }}
        />
      </div>
    );
  }

  return (
    <div className="sched-scroll as-cards" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
      {/* Desktop table */}
      <table className="sched desk-only">
        <thead>
          <tr>
            <th className="col-emp">Personel</th>
            {weekDays.map((d, i) => (
              <th
                key={i}
                className={`col-day${i === todayIndex ? ' today' : ''}${i === sortIndex ? ' sortday' : ''}`}
                onClick={() => setSortIndex(i)}
                title="Bu güne göre sırala"
              >
                <b>{d.short}</b>{' '}
                <span className="tnum">{d.date}</span>
                {i === todayIndex && <span className="today-pill">BUGÜN</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map(g => (
            <TableGroup
              key={g.label}
              group={g}
              shifts={shifts}
              weekDays={weekDays}
              todayIndex={todayIndex}
              sortIndex={sortIndex}
              onShiftClick={onShiftClick}
              onAddShift={onAddShift}
            />
          ))}
        </tbody>
      </table>

      {/* Mobile day cards */}
      <div className="daycards">
        {weekDays.map((d, di) => {
          const dayShifts = shifts.filter(s => s.shiftDate === d.dateStr);
          return (
            <div className="daycard" key={di}>
              <div className="daycard-head">
                <b>{d.key} <span className="tnum" style={{ color: 'var(--muted-foreground)', fontWeight: 500 }}>{d.date}</span></b>
                {di === todayIndex && (
                  <span className="today-pill" style={{ background: 'var(--primary)' }}>BUGÜN</span>
                )}
              </div>
              <div className="daycard-body">
                {dayShifts.length === 0
                  ? <div className="day-off">Bu gün için vardiya yok</div>
                  : dayShifts.map(s => {
                      const emp = employeeMap.get(s.empId);
                      if (!emp) return null;
                      return (
                        <div
                          key={s.id}
                          className={`daycard-shift coded ${SHIFT_CODES[s.code]?.cls ?? ''}`}
                          onClick={() => onShiftClick(s)}
                        >
                          <Avatar name={emp.name} size={36} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <b style={{ fontSize: 14 }}>{emp.name}</b>
                            <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
                              {SHIFT_CODES[s.code]?.label} · {s.station} / {s.dept}
                            </div>
                          </div>
                          {(WORK_CODES as readonly string[]).includes(s.code) && <Badge status={s.status} dot />}
                        </div>
                      );
                    })
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TableGroupProps {
  group: MonthGroup;
  shifts: Shift[];
  weekDays: WeekDay[];
  todayIndex: number;
  sortIndex: number | null;
  onShiftClick: (s: Shift) => void;
  onAddShift: (empId: number, dateStr: string) => void;
}

function TableGroup({ group, shifts, weekDays, todayIndex, sortIndex, onShiftClick, onAddShift }: TableGroupProps) {
  return (
    <>
      <tr className="group-row">
        <td colSpan={8}>
          <div className="group-head">
            <span className="group-chip" style={{ background: group.color || '#64748b' }} />
            <b>{group.label}</b>
            <span className="count">· {group.emps.length} personel</span>
          </div>
        </td>
      </tr>
      {group.emps.map(emp => (
        <tr key={emp.id}>
          <td className="emp-cell">
            <div className="cell-name">
              <Avatar name={emp.name} size={36} />
              <div className="meta">
                <b>{emp.name}</b>
                <div className="role-line">
                  <Icon name="fuel" size={12} />
                  {emp.role}
                </div>
              </div>
            </div>
          </td>
          {weekDays.map((d, di) => {
            const cellShifts = shiftsFor(shifts, emp.id, d.dateStr);
            const isToday = di === todayIndex;
            const isPast  = todayIndex >= 0 && di < todayIndex;
            const outside = !isWithinEmployment(emp.startDate, emp.endDate, d.dateStr);
            const cls = `day-cell${isToday ? ' is-today' : isPast ? ' is-past' : ''}${outside ? ' is-outside' : ''}${di === sortIndex ? ' is-sortday' : ''}`;
            return (
              <td key={di} className={cls}>
                {outside
                  ? <div className="day-outside" title={outsideReason(emp, d.dateStr)}>—</div>
                  : cellShifts.length === 0
                    ? <button className="day-add" onClick={() => onAddShift(emp.id, d.dateStr)} title="Vardiya ekle">
                        <span className="dash">—</span>
                        <span className="add-ico"><Icon name="plus" size={13} /> Ekle</span>
                      </button>
                    : cellShifts.map(s => (
                      <div
                        key={s.id}
                        className={`shift coded ${SHIFT_CODES[s.code]?.cls ?? ''}`}
                        onClick={() => onShiftClick(s)}
                      >
                        <div className="shift-name">{SHIFT_CODES[s.code]?.label}</div>
                        {(WORK_CODES as readonly string[]).includes(s.code) && (
                          <div className="shift-foot">
                            <Badge status={s.status} dot />
                          </div>
                        )}
                      </div>
                    ))
                }
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
