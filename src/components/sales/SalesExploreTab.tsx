import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Station, Department, SalesDailyView } from '../../types';
import { fetchSalesDashboardDaily, updateSalesReport } from '../../lib/db';
import {
  SALES_METRICS, ROW_DIMS, COL_DIMS, ALL,
  buildExplore, dataDateRange, formatMetric, compactMetric,
  type MetricKey, type RowDim, type ColDim,
} from '../../lib/salesExplore';
import { Select } from '../ui/Select';
import { Field, Input } from '../ui/Field';
import { Stat } from '../ui/Stat';
import { EmptyState } from '../ui/EmptyState';
import { LineChart } from './charts/LineChart';
import { BarChart } from './charts/BarChart';
import { SalesRawGrid } from './SalesRawGrid';

type View = 'line' | 'bar' | 'table' | 'raw';
const SERIES_COLORS = ['#1e3a8a', '#0f766e', '#b45309', '#7c3aed', '#be185d', '#0891b2', '#3b6d11'];

interface SalesExploreTabProps {
  stations: Station[];
  departments: Department[];
  onToast: (msg: string) => void;
}

export function SalesExploreTab({ stations, departments, onToast }: SalesExploreTabProps) {
  const [rows, setRows] = useState<SalesDailyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricKey, setMetricKey] = useState<MetricKey>('total_sales_tl');
  const [rowDim, setRowDim] = useState<RowDim>('day');
  const [colDim, setColDim] = useState<ColDim>('none');
  const [station, setStation] = useState(ALL);
  const [dept, setDept] = useState(ALL);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [view, setView] = useState<View>('line');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchSalesDashboardDaily();
        if (alive) setRows(data);
      } catch (err) {
        console.error('Veri Gezgini verisi yüklenemedi', err);
        onToast('Veri yüklenemedi');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [onToast]);

  // Veri gelince varsayılan tarih aralığı = min–max
  useEffect(() => {
    if (rows.length && !start) {
      const r = dataDateRange(rows);
      if (r) { setStart(r.min); setEnd(r.max); }
    }
  }, [rows, start]);

  const result = useMemo(() => buildExplore({
    rows,
    start: start || '0000-01-01',
    end: end || '9999-12-31',
    station, dept, rowDim, colDim, metricKey,
  }), [rows, start, end, station, dept, rowDim, colDim, metricKey]);

  // Ham Tablo modu: buildExplore ile aynı filtre (tarih aralığı + istasyon/departman).
  const rawRows = useMemo(() => rows.filter(r =>
    r.reportDate >= (start || '0000-01-01') && r.reportDate <= (end || '9999-12-31') &&
    (station === ALL || r.stationName === station) &&
    (dept === ALL || r.deptName === dept),
  ), [rows, start, end, station, dept]);

  // Inline düzenleme: optimistik güncelle → DB'ye yaz → hata olursa geri al.
  const saveReportEdit = useCallback(async (next: SalesDailyView) => {
    const prev = rows.find(r => r.id === next.id);
    if (!prev) return;
    setRows(rs => rs.map(r => (r.id === next.id ? next : r)));
    try {
      await updateSalesReport(next.id, next);
    } catch (err) {
      console.error('Satış kaydı güncellenemedi', err);
      setRows(rs => rs.map(r => (r.id === next.id ? prev : r)));
      onToast('Kaydedilemedi, değişiklik geri alındı');
    }
  }, [rows, onToast]);

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--muted-foreground)' }}>Yükleniyor…</div>;
  }
  if (!rows.length) {
    return (
      <EmptyState
        icon="inbox"
        title="Henüz satış verisi yok"
        description="“İçe Aktar” sekmesinden veri yükleyince burada serbestçe analiz edebilirsiniz."
      />
    );
  }

  const rowDimLabel = ROW_DIMS.find(d => d.key === rowDim)?.label ?? '';
  const perCat = result.categories.map(c => result.rowTotal(c.key));
  const mean = perCat.length ? perCat.reduce((a, b) => a + b, 0) / perCat.length : 0;
  const hi = perCat.length ? Math.max(...perCat) : 0;
  const lo = perCat.length ? Math.min(...perCat) : 0;

  const labels = result.categories.map(c => c.label);
  const lineSeries = result.series.map((s, i) => ({ name: s.name, color: SERIES_COLORS[i % SERIES_COLORS.length], values: s.values }));
  const barData = result.categories.map(c => ({ label: c.label, value: result.rowTotal(c.key), color: '#1e3a8a' }));

  return (
    <div>
      {/* Kontroller */}
      <div className="explore-controls">
        {view !== 'raw' && (
          <>
            <Field label="Metrik">
              <Select value={metricKey} onChange={v => setMetricKey(v as MetricKey)} icon="chart"
                options={SALES_METRICS.map(m => ({ value: m.key, label: m.label }))} />
            </Field>
            <Field label="Kırılım (satır)">
              <Select value={rowDim} onChange={v => setRowDim(v as RowDim)} icon="layers"
                options={ROW_DIMS.map(d => ({ value: d.key, label: d.label }))} />
            </Field>
            <Field label="Pivot kolonu">
              <Select value={colDim} onChange={v => setColDim(v as ColDim)} icon="grip"
                options={COL_DIMS.map(d => ({ value: d.key, label: d.label }))} />
            </Field>
          </>
        )}
        <Field label="İstasyon">
          <Select value={station} onChange={v => setStation(String(v))} icon="pin"
            options={[ALL, ...stations.map(s => s.name)].map(s => ({ value: s, label: s === ALL ? 'Tüm İstasyonlar' : s }))} />
        </Field>
        <Field label="Departman">
          <Select value={dept} onChange={v => setDept(String(v))} icon="layers"
            options={[ALL, ...departments.map(d => d.name)].map(s => ({ value: s, label: s === ALL ? 'Tüm Departmanlar' : s }))} />
        </Field>
        <Field label="Başlangıç">
          <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
        </Field>
        <Field label="Bitiş">
          <Input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </Field>
      </div>

      {/* Özet (Ham Tablo modunda gizli) */}
      {view !== 'raw' && (
        <div className="stat-grid">
          <Stat label={`${result.metric.label} · Genel`} value={formatMetric(result.grandTotal, result.metric)} icon="chart" tone="primary"
            foot={<span>{result.categories.length} {rowDimLabel.toLowerCase()}</span>} />
          <Stat label="Ortalama" value={formatMetric(mean, result.metric)} icon="grip" tone="primary" />
          <Stat label="En yüksek" value={formatMetric(hi, result.metric)} icon="chart" tone="came" />
          <Stat label="En düşük" value={formatMetric(lo, result.metric)} icon="chart" tone="absent" />
        </div>
      )}

      {/* Çıktı */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">{view === 'raw'
            ? 'Ham Veri · sales_dashboard_daily_view'
            : `${result.metric.label}${result.hasCols ? ` · ${COL_DIMS.find(d => d.key === colDim)?.label}` : ''}`}</h3>
          <div className="segment">
            <button className={view === 'line' ? 'on' : ''} onClick={() => setView('line')}>Çizgi</button>
            <button className={view === 'bar' ? 'on' : ''} onClick={() => setView('bar')}>Bar</button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Pivot</button>
            <button className={view === 'raw' ? 'on' : ''} onClick={() => setView('raw')}>Ham Tablo</button>
          </div>
        </div>
        <div className="card-pad">
          {view === 'raw' ? (
            <SalesRawGrid rows={rawRows} onEdit={saveReportEdit} onToast={onToast} />
          ) : result.isEmpty ? (
            <div className="chart-empty">Seçili aralıkta veri yok</div>
          ) : view === 'table' ? (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{rowDimLabel}</th>
                    {result.columns.map(col => <th key={col.key} className="ar">{col.label}</th>)}
                    {result.hasCols && <th className="ar">Toplam</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.categories.map(cat => (
                    <tr key={cat.key}>
                      <td>{cat.label}</td>
                      {result.columns.map(col => (
                        <td key={col.key} className="ar tnum">{formatMetric(result.cell(cat.key, col.key), result.metric)}</td>
                      ))}
                      {result.hasCols && <td className="ar tnum">{formatMetric(result.rowTotal(cat.key), result.metric)}</td>}
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 600 }}>
                    <td>Toplam</td>
                    {result.columns.map(col => (
                      <td key={col.key} className="ar tnum">{formatMetric(result.colTotal(col.key), result.metric)}</td>
                    ))}
                    {result.hasCols && <td className="ar tnum">{formatMetric(result.grandTotal, result.metric)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : view === 'bar' ? (
            <BarChart data={barData} valueFormat={v => compactMetric(v, result.metric)} />
          ) : (
            <LineChart labels={labels} series={lineSeries} yFormat={v => compactMetric(v, result.metric)} />
          )}
        </div>
      </div>
    </div>
  );
}
