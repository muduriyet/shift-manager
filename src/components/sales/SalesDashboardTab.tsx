import { useEffect, useMemo, useState } from 'react';
import type { Station, Department, SalesDailyView } from '../../types';
import { fetchSalesDashboardDaily } from '../../lib/db';
import { Select } from '../ui/Select';
import { Stat } from '../ui/Stat';
import { EmptyState } from '../ui/EmptyState';
import { LineChart } from './charts/LineChart';
import { BarChart, type BarDatum } from './charts/BarChart';

const ALL = 'Tümü';
const tl0 = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
const tl2 = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const pct = (n: number) => '%' + (n * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
const compact = (n: number) => n >= 1000 ? (n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + 'B' : String(Math.round(n));

function monthLabel(month: string): string {
  return new Date(month + 'T00:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}
const dayNum = (date: string) => String(Number(date.slice(8, 10)));

interface DayAgg {
  date: string;
  totalSalesTl: number; totalLiters: number;
  gasolineLiters: number; dieselLiters: number; lpgLiters: number;
  cardSalesTl: number; cashSalesTl: number; ttsTl: number;
  companyTl: number; giftTl: number; discountPointsTl: number; aliogluTl: number; partnerTl: number;
}

interface SalesDashboardTabProps {
  stations: Station[];
  departments: Department[];
  onToast: (msg: string) => void;
}

export function SalesDashboardTab({ stations, departments, onToast }: SalesDashboardTabProps) {
  const [rows, setRows] = useState<SalesDailyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState(ALL);
  const [dept, setDept] = useState(ALL);
  const [month, setMonth] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchSalesDashboardDaily();
        if (alive) setRows(data);
      } catch (err) {
        console.error('Dashboard verisi yüklenemedi', err);
        onToast('Dashboard verisi yüklenemedi');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [onToast]);

  const months = useMemo(
    () => [...new Set(rows.map(r => r.month))].sort().reverse(),
    [rows],
  );
  // Veri gelince en güncel ayı seç
  useEffect(() => {
    if (!month && months.length) setMonth(months[0]);
  }, [months, month]);

  const filtered = useMemo(
    () => rows.filter(r =>
      (station === ALL || r.stationName === station) &&
      (dept === ALL || r.deptName === dept) &&
      (!month || r.month === month),
    ),
    [rows, station, dept, month],
  );

  const byDate = useMemo<DayAgg[]>(() => {
    const map = new Map<string, DayAgg>();
    for (const r of filtered) {
      const e = map.get(r.reportDate) ?? {
        date: r.reportDate, totalSalesTl: 0, totalLiters: 0,
        gasolineLiters: 0, dieselLiters: 0, lpgLiters: 0,
        cardSalesTl: 0, cashSalesTl: 0, ttsTl: 0,
        companyTl: 0, giftTl: 0, discountPointsTl: 0, aliogluTl: 0, partnerTl: 0,
      };
      e.totalSalesTl += r.totalSalesTl; e.totalLiters += r.totalLiters;
      e.gasolineLiters += r.gasolineLiters; e.dieselLiters += r.dieselLiters; e.lpgLiters += r.lpgLiters;
      e.cardSalesTl += r.cardSalesTl; e.cashSalesTl += r.cashSalesTl; e.ttsTl += r.ttsTl;
      e.companyTl += r.companyTl; e.giftTl += r.giftTl; e.discountPointsTl += r.discountPointsTl;
      e.aliogluTl += r.aliogluTl; e.partnerTl += r.partnerTl;
      map.set(r.reportDate, e);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const kpi = useMemo(() => {
    const s = filtered.reduce((a, r) => ({
      sales: a.sales + r.totalSalesTl, liters: a.liters + r.totalLiters, card: a.card + r.cardSalesTl,
    }), { sales: 0, liters: 0, card: 0 });
    return {
      sales: s.sales, liters: s.liters,
      cardRatio: s.sales ? s.card / s.sales : 0,
      tlPerL: s.liters ? s.sales / s.liters : 0,
    };
  }, [filtered]);

  const paymentBars = useMemo<BarDatum[]>(() => {
    const sum = (k: keyof DayAgg) => byDate.reduce((a, d) => a + (d[k] as number), 0);
    return ([
      { label: 'Kart', value: sum('cardSalesTl'), color: 'var(--primary)' },
      { label: 'Nakit', value: sum('cashSalesTl'), color: '#0f766e' },
      { label: 'TTS', value: sum('ttsTl'), color: '#7c3aed' },
      { label: 'Şirket', value: sum('companyTl'), color: '#b45309' },
      { label: 'Gift', value: sum('giftTl'), color: '#be185d' },
      { label: 'İndirim', value: sum('discountPointsTl'), color: '#0891b2' },
    ] as BarDatum[]).filter(b => b.value > 0);
  }, [byDate]);

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--muted-foreground)' }}>Yükleniyor…</div>;
  }
  if (!rows.length) {
    return (
      <EmptyState
        icon="inbox"
        title="Henüz satış verisi yok"
        description="“İçe Aktar” sekmesinden günlük/özet raporları yükleyince dashboard burada dolacak."
      />
    );
  }

  const labels = byDate.map(d => dayNum(d.date));

  return (
    <div>
      {/* Filtreler */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Select icon="pin" value={station} onChange={v => setStation(String(v))}
          options={[ALL, ...stations.map(s => s.name)].map(s => ({ value: s, label: s === ALL ? 'Tüm İstasyonlar' : s }))} />
        <Select icon="layers" value={dept} onChange={v => setDept(String(v))}
          options={[ALL, ...departments.map(d => d.name)].map(s => ({ value: s, label: s === ALL ? 'Tüm Departmanlar' : s }))} />
        <Select icon="calendar" value={month} onChange={v => setMonth(String(v))}
          options={months.map(m => ({ value: m, label: monthLabel(m) }))} />
      </div>

      {/* KPI'lar */}
      <div className="stat-grid">
        <Stat label="Toplam Satış" value={tl0(kpi.sales)} icon="chart" tone="primary" />
        <Stat label="Toplam Litre" value={lt(kpi.liters)} icon="fuel" tone="primary" />
        <Stat label="Kart Oranı" value={pct(kpi.cardRatio)} icon="layers" tone="came" />
        <Stat label="Ortalama TL/L" value={'₺' + tl2(kpi.tlPerL)} icon="grip" tone="primary" />
      </div>

      {/* Grafikler */}
      <div className="sales-charts">
        <div className="card">
          <div className="card-head"><h3 className="card-title">Günlük Toplam Satış</h3></div>
          <div className="card-pad">
            <LineChart labels={labels} yFormat={compact}
              series={[{ name: 'Toplam Satış', color: 'var(--primary)', values: byDate.map(d => d.totalSalesTl) }]} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="card-title">Ödeme Dağılımı</h3></div>
          <div className="card-pad">
            {paymentBars.length
              ? <BarChart data={paymentBars} valueFormat={compact} />
              : <div className="chart-empty">Veri yok</div>}
          </div>
        </div>
        <div className="card chart-wide">
          <div className="card-head"><h3 className="card-title">Günlük Litre Trendleri</h3></div>
          <div className="card-pad">
            <LineChart labels={labels} yFormat={compact} series={[
              { name: 'Benzin', color: '#f59e0b', values: byDate.map(d => d.gasolineLiters) },
              { name: 'Motorin', color: '#1e3a8a', values: byDate.map(d => d.dieselLiters) },
              { name: 'LPG', color: '#0f766e', values: byDate.map(d => d.lpgLiters) },
            ]} />
          </div>
        </div>
      </div>

      {/* Tablolar */}
      <div className="sales-tables">
        <div className="card">
          <div className="card-head"><h3 className="card-title">Günlük Özet</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Tarih</th><th className="ar">Satış (TL)</th><th className="ar">Litre</th><th className="ar">Kart %</th><th className="ar">TL/L</th></tr></thead>
              <tbody>
                {byDate.map(d => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="ar tnum">{tl2(d.totalSalesTl)}</td>
                    <td className="ar tnum">{lt(d.totalLiters)}</td>
                    <td className="ar tnum">{pct(d.totalSalesTl ? d.cardSalesTl / d.totalSalesTl : 0)}</td>
                    <td className="ar tnum">{tl2(d.totalLiters ? d.totalSalesTl / d.totalLiters : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="card-title">Yakıt Litre</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Tarih</th><th className="ar">Benzin</th><th className="ar">Motorin</th><th className="ar">LPG</th><th className="ar">Toplam</th></tr></thead>
              <tbody>
                {byDate.map(d => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="ar tnum">{lt(d.gasolineLiters)}</td>
                    <td className="ar tnum">{lt(d.dieselLiters)}</td>
                    <td className="ar tnum">{lt(d.lpgLiters)}</td>
                    <td className="ar tnum">{lt(d.totalLiters)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
