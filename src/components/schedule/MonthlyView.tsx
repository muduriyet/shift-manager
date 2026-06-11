import { useState, useRef, useEffect, useCallback } from 'react';
import type { ShiftCodeKey, MonthGroup, Employee } from '../../types';
import { SHIFT_CODES, ALL_CODES } from '../../constants';
import type { MonthDay } from '../../types';
import { Icon } from '../ui/Icon';

const SHIFT_SORT_ORDER: Record<string, number> = { S: 0, Ö: 1, G: 2, İ: 3, Yİ: 4, '-': 5 };

interface DragState {
  empId: number;
  groupLabel: string;
  name: string;
  x: number;
  y: number;
  overEmpId: number | null;
  overBelow: boolean;
}

interface SelectionAnchor { r: number; c: number }
interface Selection { a: SelectionAnchor; b: SelectionAnchor }
interface PickerPos { x: number; y: number }

type EmpOrderMap = Record<string, number[]>;

function buildFlat(groups: MonthGroup[], empOrder: EmpOrderMap): Employee[] {
  const flat: Employee[] = [];
  groups.forEach(g => {
    const order = empOrder[g.label] ?? g.emps.map(e => e.id);
    const byId = new Map(g.emps.map(e => [e.id, e]));
    order.forEach(id => { const e = byId.get(id); if (e) flat.push(e); });
  });
  return flat;
}

function defaultOrder(g: MonthGroup, codesOf: (id: number) => ShiftCodeKey[], todayMidx: number): number[] {
  return [...g.emps]
    .sort((a, b) => {
      const ca = codesOf(a.id)[todayMidx] ?? '-';
      const cb = codesOf(b.id)[todayMidx] ?? '-';
      const oa = SHIFT_SORT_ORDER[ca] ?? 5;
      const ob = SHIFT_SORT_ORDER[cb] ?? 5;
      return oa !== ob ? oa - ob : a.name.localeCompare(b.name, 'tr');
    })
    .map(e => e.id);
}

interface MonthlyViewProps {
  groups: MonthGroup[];
  codesOf: (id: number) => ShiftCodeKey[];
  setCode: (id: number, idx: number, code: ShiftCodeKey) => void;
  monthDays: MonthDay[];
  todayMidx: number;
  monthShort: string;
  activeMonth: string;
}

const MONTH_NAMES_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTH_NAMES_TR[parseInt(m) - 1]} ${y}`;
}

export function MonthlyView({ groups, codesOf, setCode, monthDays, todayMidx, monthShort, activeMonth }: MonthlyViewProps) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [picker, setPicker] = useState<PickerPos | null>(null);
  const [warning, setWarning] = useState<{ x: number; y: number; msg: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [empOrder, setEmpOrder] = useState<EmpOrderMap>(() => {
    const o: EmpOrderMap = {};
    groups.forEach(g => { o[g.label] = defaultOrder(g, codesOf, todayMidx); });
    return o;
  });

  const selectingRef = useRef(false);
  const selRef = useRef<Selection | null>(null);
  const flatRef = useRef<Employee[]>([]);
  const activeMonthRef = useRef(activeMonth);
  const dragRef = useRef<DragState | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActiveRef = useRef(false);

  // Recompute order when filter changes
  const groupsSnap = groups.map(g => g.label + '|' + g.emps.map(e => e.id).join(',')).join(';');
  useEffect(() => {
    setEmpOrder(prev => {
      let changed = false;
      const next: EmpOrderMap = {};
      groups.forEach(g => {
        const prevOrder = prev[g.label];
        const same = prevOrder && prevOrder.length === g.emps.length && g.emps.every(e => prevOrder.includes(e.id));
        next[g.label] = same ? prevOrder : defaultOrder(g, codesOf, todayMidx);
        if (!same) changed = true;
      });
      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsSnap]);

  const flat = buildFlat(groups, empOrder);
  flatRef.current = flat;
  activeMonthRef.current = activeMonth;
  const rowOf = new Map(flat.map((emp, i) => [emp.id, i]));

  const bounds = sel ? {
    r1: Math.min(sel.a.r, sel.b.r), r2: Math.max(sel.a.r, sel.b.r),
    c1: Math.min(sel.a.c, sel.b.c), c2: Math.max(sel.a.c, sel.b.c),
  } : null;
  const isSel = (r: number, c: number) =>
    !!bounds && r >= bounds.r1 && r <= bounds.r2 && c >= bounds.c1 && c <= bounds.c2;
  const selCount = bounds ? (bounds.r2 - bounds.r1 + 1) * (bounds.c2 - bounds.c1 + 1) : 0;

  function startSel(r: number, c: number, e: React.MouseEvent) {
    if (e.button !== 0 || drag) return;
    e.preventDefault();
    const next = { a: { r, c }, b: { r, c } };
    selRef.current = next;
    setSel(next);
    selectingRef.current = true;
    setPicker(null); setWarning(null);
  }
  function extendSel(r: number, c: number) {
    if (selectingRef.current) {
      setSel(s => {
        const next = s ? { ...s, b: { r, c } } : s;
        selRef.current = next;
        return next;
      });
    }
  }
  function applyCode(code: ShiftCodeKey) {
    if (!bounds) return;
    flat.forEach((emp, r) => {
      if (r < bounds.r1 || r > bounds.r2) return;
      for (let c = bounds.c1; c <= bounds.c2; c++) setCode(emp.id, c, code);
    });
    setSel(null); setPicker(null);
  }

  function empDown(emp: Employee, groupLabel: string, e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    longPressActiveRef.current = true;
    longPressRef.current = setTimeout(() => {
      if (!longPressActiveRef.current) return;
      longPressActiveRef.current = false;
      dragRef.current = { empId: emp.id, groupLabel, name: emp.name, x: e.clientX, y: e.clientY, overEmpId: null, overBelow: false };
      setDrag({ empId: emp.id, groupLabel, name: emp.name, x: e.clientX, y: e.clientY, overEmpId: null, overBelow: false });
      setSel(null); setPicker(null); selectingRef.current = false;
    }, 380);
  }
  function empUp() { longPressActiveRef.current = false; if (longPressRef.current) clearTimeout(longPressRef.current); }

  const commitDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    if (d.overEmpId != null && d.overEmpId !== d.empId) {
      setEmpOrder(prev => {
        const order = [...(prev[d.groupLabel] ?? [])];
        const fromIdx = order.indexOf(d.empId);
        const overBefore = order.indexOf(d.overEmpId!);
        if (fromIdx === -1 || overBefore === -1) return prev;
        order.splice(fromIdx, 1);
        const overAfter = order.indexOf(d.overEmpId!);
        order.splice(d.overBelow ? overAfter + 1 : overAfter, 0, d.empId);
        return { ...prev, [d.groupLabel]: order };
      });
    }
    dragRef.current = null;
    setDrag(null);
  }, []);

  useEffect(() => {
    function onUp(e: MouseEvent) {
      if (dragRef.current) { commitDrag(); return; }
      if (selectingRef.current) {
        selectingRef.current = false;
        const s = selRef.current;
        const pos = {
          x: Math.max(8, Math.min(e.clientX - 100, window.innerWidth - 320)),
          y: Math.min(e.clientY + 16, window.innerHeight - 110),
        };
        if (s && s.a.r === s.b.r && s.a.c === s.b.c) {
          const emp = flatRef.current[s.a.r];
          if (emp) {
            const [y, m] = activeMonthRef.current.split('-').map(Number);
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(s.a.c + 1).padStart(2, '0')}`;
            if (emp.startDate && dateStr < emp.startDate) {
              setWarning({ ...pos, msg: `${emp.name} için işe giriş tarihi ${fmtDate(emp.startDate)} — önceki tarihlere atama yapılamaz.` });
              return;
            }
            if (emp.endDate && dateStr > emp.endDate) {
              setWarning({ ...pos, msg: `${emp.name} için işten çıkış tarihi ${fmtDate(emp.endDate)} — sonraki tarihlere atama yapılamaz.` });
              return;
            }
          }
        }
        setPicker(pos);
      }
    }
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      let overEmpId: number | null = null; let overBelow = false;
      const topEl = document.elementFromPoint(e.clientX, e.clientY);
      if (topEl) {
        const row = topEl.closest('[data-drag-row]') as HTMLElement | null;
        if (row) {
          overEmpId = parseInt(row.dataset.dragRow!);
          overBelow = e.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
        }
      }
      dragRef.current = { ...dragRef.current, overEmpId, overBelow };
      setDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, overEmpId, overBelow } : null);
    }
    function onDown(e: MouseEvent) {
      if (!(e.target as Element).closest('.mg-picker') &&
          !(e.target as Element).closest('.mg-warning') &&
          !(e.target as Element).closest('.m-cell') &&
          !(e.target as Element).closest('.m-emp')) {
        setSel(null); setPicker(null); setWarning(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSel(null); setPicker(null); setWarning(null); selectingRef.current = false;
        dragRef.current = null; setDrag(null);
        if (longPressRef.current) clearTimeout(longPressRef.current);
        longPressActiveRef.current = false;
      }
    }
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [commitDrag]);

  return (
    <>
      <div className={`month-scroll${drag ? ' month-dragging' : ''}`}>
        <table className="month">
          <thead>
            <tr>
              <th className="m-corner" style={{ padding: '7px 12px', fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                Personel
              </th>
              {monthDays.map((d, i) => (
                <th key={i} className={`m-day${d.weekend ? ' wknd' : ''}${i === todayMidx ? ' today' : ''}`}>
                  <span className="wd">{d.wShort}</span>
                  <span className="dn tnum">{d.n}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(g => {
              const order = empOrder[g.label] ?? g.emps.map(e => e.id);
              const byId = new Map(g.emps.map(e => [e.id, e]));
              const ordered = order.map(id => byId.get(id)).filter((e): e is Employee => !!e);
              return (
                <GroupRows
                  key={g.label}
                  group={g}
                  orderedEmps={ordered}
                  drag={drag}
                  codesOf={codesOf}
                  rowOf={rowOf}
                  isSel={isSel}
                  startSel={startSel}
                  extendSel={extendSel}
                  empDown={empDown}
                  empUp={empUp}
                  monthDays={monthDays}
                  todayMidx={todayMidx}
                  monthShort={monthShort}
                  activeMonth={activeMonth}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {drag && (
        <div className="month-drag-ghost" style={{ left: drag.x + 16, top: drag.y - 18 }}>
          <Icon name="grip" size={13} />
          {drag.name}
        </div>
      )}

      {warning && (
        <div
          className="mg-warning"
          style={{ left: warning.x, top: warning.y }}
          onClick={e => e.stopPropagation()}
        >
          <Icon name="alertCircle" size={15} style={{ color: 'var(--absent-fg)', flexShrink: 0, marginTop: 1 }} />
          <span>{warning.msg}</span>
          <button className="mg-warning-close" onClick={() => { setSel(null); setWarning(null); }}>
            <Icon name="x" size={13} />
          </button>
        </div>
      )}

      {picker && bounds && (
        <div className="mg-picker" style={{ left: picker.x, top: picker.y }}>
          <div className="mg-picker-head">
            <Icon name="checkSquare" size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <b>{selCount}</b> hücre seçildi
            <span className="mg-picker-sep">—</span>
            <span>vardiya ata:</span>
          </div>
          <div className="mg-picker-codes">
            {ALL_CODES.map(c => {
              const sc = SHIFT_CODES[c];
              return (
                <button
                  key={c}
                  className={`sc-pill mg-code-btn ${sc.cls}`}
                  title={sc.label + (sc.work ? ` · ${sc.start}–${sc.end}` : '')}
                  onClick={() => applyCode(c)}
                >
                  {sc.empty ? <Icon name="minus" size={11} /> : c}
                </button>
              );
            })}
            <div className="mg-picker-divider" />
            <button className="mg-picker-clear" title="İptal (Esc)" onClick={() => { setSel(null); setPicker(null); }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface GroupRowsProps {
  group: MonthGroup;
  orderedEmps: Employee[];
  drag: DragState | null;
  codesOf: (id: number) => ShiftCodeKey[];
  rowOf: Map<number, number>;
  isSel: (r: number, c: number) => boolean;
  startSel: (r: number, c: number, e: React.MouseEvent) => void;
  extendSel: (r: number, c: number) => void;
  empDown: (emp: Employee, groupLabel: string, e: React.MouseEvent) => void;
  empUp: () => void;
  monthDays: MonthDay[];
  todayMidx: number;
  monthShort: string;
  activeMonth: string;
}

function GroupRows({ group, orderedEmps, drag, codesOf, rowOf, isSel, startSel, extendSel, empDown, empUp, monthDays, todayMidx, monthShort, activeMonth }: GroupRowsProps) {
  return (
    <>
      <tr className="m-team-row">
        <td colSpan={monthDays.length + 1}>
          <div className="group-head">
            <span className="group-chip" style={{ background: group.color }} />
            <b>{group.label}</b>
            <span className="count">· {group.emps.length} personel</span>
          </div>
        </td>
      </tr>
      {orderedEmps.map(emp => {
        const r = rowOf.get(emp.id) ?? 0;
        const codes = codesOf(emp.id);
        const isDragging = drag?.empId === emp.id;
        const isOver = drag && drag.overEmpId === emp.id && !isDragging;
        return (
          <tr
            key={emp.id}
            data-drag-row={emp.id}
            className={[
              'm-emp-row',
              isDragging ? 'row-is-dragging' : '',
              isOver && !drag?.overBelow ? 'drop-before' : '',
              isOver && drag?.overBelow ? 'drop-after' : '',
            ].filter(Boolean).join(' ')}
          >
            <td
              className="m-emp m-emp-drag"
              onMouseDown={e => empDown(emp, group.label, e)}
              onMouseUp={empUp}
              onMouseLeave={empUp}
              title="Basılı tut ve sürükle — sırayı değiştir"
            >
              <div className="m-emp-inner">
                <span className="drag-grip"><Icon name="grip" size={12} /></span>
                <div className="emp-info">
                  <span className="en">{emp.name}</span>
                  <span className="er">{emp.role}</span>
                </div>
              </div>
            </td>
            {codes.map((code, idx) => {
              const sc = SHIFT_CODES[code] ?? SHIFT_CODES['-'];
              const d = monthDays[idx];
              const dateStr = `${activeMonth}-${String(idx + 1).padStart(2, '0')}`;
              const blocked =
                (!!emp.startDate && dateStr < emp.startDate) ||
                (!!emp.endDate   && dateStr > emp.endDate);
              return (
                <td
                  key={idx}
                  className={[
                    'm-cell',
                    d.weekend ? 'col-wknd' : '',
                    idx === todayMidx ? 'col-today' : '',
                    isSel(r, idx) ? 'sel' : '',
                    blocked ? 'm-cell-blocked' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseDown={e => startSel(r, idx, e)}
                  onMouseEnter={() => extendSel(r, idx)}
                >
                  {!blocked && (
                    <span
                      className={`sc-pill ${sc.cls}${sc.off ? ' is-off' : ''}`}
                      title={`${emp.name} · ${d.n} ${monthShort} · ${sc.label}`}
                    >
                      {sc.empty ? '' : code}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
