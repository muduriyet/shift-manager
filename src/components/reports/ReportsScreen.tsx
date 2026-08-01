import { useState, useMemo, useEffect } from 'react';
import type { Employee, Shift } from '../../types';
import {
  SHIFT_CODES, WORK_CODES,
  TODAY_DATE, THIS_WEEK_START, addDays, dateToStr, MONTH_SHORT_NAMES,
  isWithinEmployment, monthsInRange,
} from '../../constants';
import { ShiftLoading } from '../ui/ShiftLoading';
import { exportRowsToExcel } from '../../lib/excel';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';

type Period = 'Bu Hafta' | 'Geçen Hafta' | 'Bu Ay';

const _WD_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

function periodRange(period: Period): { start: string; end: string; label: string } {
  if (period === 'Bu Hafta') {
    return {
      start: dateToStr(THIS_WEEK_START),
      end:   dateToStr(addDays(THIS_WEEK_START, 6)),
      label: 'Bu hafta',
    };
  }
  if (period === 'Geçen Hafta') {
    return {
      start: dateToStr(addDays(THIS_WEEK_START, -7)),
      end:   dateToStr(addDays(THIS_WEEK_START, -1)),
      label: 'Geçen hafta',
    };
  }
  const first = new Date(TODAY_DATE.getFullYear(), TODAY_DATE.getMonth(), 1);
  const last  = new Date(TODAY_DATE.getFullYear(), TODAY_DATE.getMonth() + 1, 0);
  return { start: dateToStr(first), end: dateToStr(last), label: 'Bu ay' };
}

function prevPeriodRange(period: Period): { start: string; end: string } | null {
  if (period === 'Bu Hafta') {
    return {
      start: dateToStr(addDays(THIS_WEEK_START, -7)),
      end:   dateToStr(addDays(THIS_WEEK_START, -1)),
    };
  }
  if (period === 'Geçen Hafta') {
    return {
      start: dateToStr(addDays(THIS_WEEK_START, -14)),
      end:   dateToStr(addDays(THIS_WEEK_START, -8)),
    };
  }
  return null;
}

function calcRate(shifts: Shift[]): number | null {
  const work = shifts.filter(
    s => WORK_CODES.includes(s.code) && s.status !== 'Planlandı',
  );
  if (!work.length) return null;
  const came = work.filter(s => s.status === 'Geldi').length;
  return Math.round((came / work.length) * 100);
}

function fmtDate(shiftDate: string): { key: string; date: string } {
  const d = new Date(shiftDate + 'T00:00:00');
  return {
    key:  _WD_FULL[(d.getDay() + 6) % 7],
    date: `${d.getDate()} ${MONTH_SHORT_NAMES[d.getMonth()]}`,
  };
}

interface ReportsScreenProps {
  employees: Employee[];
  shifts: Shift[];
  stationNames: string[];
  deptNames: string[];
  ensureMonths: (months: string[]) => void;
  isMonthPending: (yearMonth: string) => boolean;
}

export function ReportsScreen({ employees, shifts, stationNames, deptNames, ensureMonths, isMonthPending }: ReportsScreenProps) {
  const [period,     setPeriod]     = useState<Period>('Bu Hafta');
  const [station,    setStation]    = useState('Tümü');
  const [dept,       setDept]       = useState('Tümü');
  const [absentOpen, setAbsentOpen] = useState(false);
  const [exporting,  setExporting]  = useState(false);

  const range = useMemo(() => periodRange(period),     [period]);
  const prev  = useMemo(() => prevPeriodRange(period), [period]);

  // Rapor, seçili dönemin yanında karşılaştırma dönemini de hesapladığı için
  // her iki aralığın kapsadığı aylar istenir.
  const neededKey = useMemo(() => {
    const months = [
      ...monthsInRange(range.start, range.end),
      ...(prev ? monthsInRange(prev.start, prev.end) : []),
    ];
    return Array.from(new Set(months)).join(',');
  }, [range, prev]);
  useEffect(() => { ensureMonths(neededKey.split(',')); }, [neededKey, ensureMonths]);
  const periodPending = neededKey.split(',').some(isMonthPending);

  // İstihdam penceresi dışındaki vardiyalar rapora dahil edilmez (geçmiş kayıtta korunur).
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const employed = useMemo(
    () => shifts.filter(s => {
      const emp = empById.get(s.empId);
      return emp ? isWithinEmployment(emp.startDate, emp.endDate, s.shiftDate) : true;
    }),
    [shifts, empById],
  );

  const inRange = useMemo(
    () => employed.filter(s => s.shiftDate >= range.start && s.shiftDate <= range.end),
    [employed, range],
  );

  const filtered = useMemo(
    () => inRange.filter(s =>
      (station === 'Tümü' || s.station === station) &&
      (dept    === 'Tümü' || s.dept    === dept),
    ),
    [inRange, station, dept],
  );

  const inPrev = useMemo(
    () => prev
      ? employed.filter(s =>
          s.shiftDate >= prev.start && s.shiftDate <= prev.end &&
          (station === 'Tümü' || s.station === station) &&
          (dept    === 'Tümü' || s.dept    === dept),
        )
      : [],
    [employed, prev, station, dept],
  );

  const overallRate = useMemo(() => calcRate(filtered), [filtered]);
  const prevRate    = useMemo(() => calcRate(inPrev),   [inPrev]);

  const comparison = useMemo(() => {
    if (overallRate === null || prevRate === null) return '';
    const diff = overallRate - prevRate;
    const rel  = period === 'Bu Hafta' ? 'geçen haftaya göre' : '2 hafta öncesine göre';
    if (diff === 0) return `${rel} değişim yok`;
    return `${rel} ${diff > 0 ? '+' : ''}${diff}`;
  }, [overallRate, prevRate, period]);

  const deptRates = useMemo(
    () => deptNames.map(d => ({
      dept: d,
      rate: calcRate(filtered.filter(s => s.dept === d)),
    })),
    [filtered, deptNames],
  );

  const deptVal = deptRates.map(d => d.rate !== null ? `%${d.rate}` : '—').join(' / ');

  const absentRows = useMemo(
    () => filtered
      .filter(s => s.status === 'Gelmedi')
      .map(s => ({
        s,
        emp: employees.find(e => e.id === s.empId),
        day: fmtDate(s.shiftDate),
        sc:  SHIFT_CODES[s.code],
      }))
      .filter(r => r.emp),
    [filtered, employees],
  );

  type Tone = 'primary' | 'absent' | 'came';
  const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
    primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
    came:    { bg: 'var(--came-bg)',      fg: 'var(--came-fg)' },
    absent:  { bg: 'var(--absent-bg)',    fg: 'var(--absent-fg)' },
  };

  const reports: Array<{
    icon: string; tone: Tone; title: string; desc: string;
    val: string; sub: string; onClick?: () => void;
  }> = [
    {
      icon: 'userX', tone: 'absent',
      title: 'Gelmeyen Personel',
      desc:  'İşaretlenen devamsızlıklar.',
      val:   String(absentRows.length),
      sub:   'kayıt',
      onClick: () => setAbsentOpen(true),
    },
    {
      icon: 'clipboard', tone: 'primary',
      title: 'Devam Durumu',
      desc:  'Tüm istasyonlar genelinde gelme oranı.',
      val:   overallRate !== null ? `%${overallRate}` : '—',
      sub:   comparison,
    },
    {
      icon: 'layers', tone: 'came',
      title: 'Departman Bazlı Devam',
      desc:  `${deptNames.join(' / ')} devam oranı.`,
      val:   deptVal,
      sub:   '',
    },
  ];

  const filterLabel = [station !== 'Tümü' ? station : null, dept !== 'Tümü' ? dept : null]
    .filter(Boolean).join(' · ') || 'Tüm filtreler';

  async function handleExport() {
    if (exporting || absentRows.length === 0) return;

    const rows = absentRows.map(row => ({
      'Personel':   row.emp!.name,
      'Görev':      row.emp!.role,
      'Gün':        row.day.key,
      'Tarih':      row.day.date,
      'İstasyon':   row.s.station,
      'Departman':  row.s.dept,
      'Vardiya':    row.s.code,
    }));
    const slug = range.label.toLowerCase().replace(/\s+/g, '-');

    setExporting(true);
    try {
      await exportRowsToExcel({
        rows,
        sheetName: 'Gelmeyen Personel',
        fileName: `gelmeyen-personel-${slug}.xlsx`,
      });
    } catch (error) {
      console.error('Excel export failed', error);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Raporlar</h1>
          <p className="page-desc">Devam ve vardiya dağılımlarını istasyon ve departman bazında inceleyin.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Select
          value={period}
          onChange={v => setPeriod(v as Period)}
          icon="calendar"
          options={['Bu Hafta', 'Geçen Hafta', 'Bu Ay']}
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

      {/* Dönemin ayları gelmeden kartlar sıfır/boş gösterilirse rapor yanlış
          okunur; onun yerine yükleniyor durumu gösterilir. */}
      {periodPending && <ShiftLoading label={range.label} />}

      {!periodPending && (
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
      )}

      {absentOpen && (
        <Dialog
          title="Gelmeyen Personel"
          desc={`${range.label} · ${filterLabel} · ${absentRows.length} kayıt`}
          onClose={() => setAbsentOpen(false)}
          width={620}
          footer={
            <>
              <Button variant="outline" icon="download" onClick={handleExport} disabled={absentRows.length === 0 || exporting}>
                {exporting ? 'Hazırlanıyor...' : 'Dışa Aktar'}
              </Button>
              <Button variant="outline" onClick={() => setAbsentOpen(false)}>Kapat</Button>
            </>
          }
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
                        <td style={{ fontSize: 13 }}>
                          {row.s.station} <span style={{ color: 'var(--muted-foreground)' }}>/ {row.s.dept}</span>
                        </td>
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
