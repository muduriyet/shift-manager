import { useEffect, useMemo, useRef, useState } from 'react';
import type { Station, Department, SalesImportConfig, SalesImportPlan, SalesImportApplyResult } from '../../types';
import { dateToStr } from '../../constants';
import { fetchSalesReportForScope } from '../../lib/db';
import { buildSalesImportPlan, applySalesImportPlan } from '../../lib/salesImport';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Field, Input } from '../ui/Field';
import { Stat } from '../ui/Stat';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

function configMetaLabel(c: SalesImportConfig): string {
  return `${c.name} · Günlük: ${c.dailySheetName || 'ilk sayfa'} · Özet: ${c.summarySheetName || 'ilk sayfa'}`;
}

interface SalesImportTabProps {
  stations: Station[];
  departments: Department[];
  salesConfigs: SalesImportConfig[];
  onToast: (msg: string) => void;
}

export function SalesImportTab({ stations, departments, salesConfigs, onToast }: SalesImportTabProps) {
  const activeConfigs = useMemo(() => salesConfigs.filter(c => c.status === 'active'), [salesConfigs]);

  const [stationId, setStationId] = useState<number | null>(null);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(() => dateToStr(new Date()));
  const [configId, setConfigId] = useState<number | null>(null);
  const [prices, setPrices] = useState({ diesel: '', gasoline: '', lpg: '' });
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [summaryFile, setSummaryFile] = useState<File | null>(null);

  const [plan, setPlan] = useState<SalesImportPlan | null>(null);
  const [building, setBuilding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<SalesImportApplyResult | null>(null);

  const dailyRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLInputElement>(null);

  // İlk aktif config'i varsayılan seç
  useEffect(() => {
    if (configId == null && activeConfigs.length) setConfigId(activeConfigs[0].id);
  }, [activeConfigs, configId]);

  const config = activeConfigs.find(c => c.id === configId) ?? null;

  // Girdi değişince eski önizleme/sonucu geçersiz kıl
  function invalidate() { setPlan(null); setResult(null); }

  async function handlePreview() {
    setResult(null);
    if (!config) { onToast('Aktif konfigürasyon seçin'); return; }
    if (!dailyFile || !summaryFile) { onToast('Günlük ve özet dosyalarını seçin'); return; }
    setBuilding(true);
    try {
      const existing = (stationId != null && deptId != null && date)
        ? await fetchSalesReportForScope(stationId, deptId, date)
        : null;
      const p = await buildSalesImportPlan({
        dailyFile, summaryFile, config, stationId, deptId, date, prices, existing,
      });
      setPlan(p);
    } catch (err) {
      console.error('Önizleme hatası', err);
      onToast('Önizleme oluşturulamadı');
    } finally {
      setBuilding(false);
    }
  }

  async function handleApply() {
    if (!plan || !plan.canApply || applying) return;
    setApplying(true);
    try {
      const res = await applySalesImportPlan(plan);
      setResult(res);
      setPlan(null);
      setDailyFile(null);
      setSummaryFile(null);
      onToast(res.action === 'insert' ? 'Satış kaydı eklendi' : 'Satış kaydı güncellendi');
    } catch (err) {
      console.error('Uygula hatası', err);
      onToast('Kaydedilemedi, tekrar deneyin');
    } finally {
      setApplying(false);
    }
  }

  const report = plan?.report;
  const detailRows: Array<[string, string, boolean]> = report ? [
    ['Rapor Tarihi (dosya)', report.sourceReportDate ?? '—', false],
    ['Benzin (L)', lt(report.gasolineLiters), false],
    ['Motorin (L)', lt(report.dieselLiters), false],
    ['LPG (L)', lt(report.lpgLiters), false],
    ['Toplam Litre', lt(report.totalLiters), true],
    ['Toplam Satış (TL)', tl(report.totalSalesTl), false],
    ['Kredi Kartı (TL)', tl(report.cardSalesTl), false],
    ['Nakit (TL)', tl(report.cashSalesTl), false],
    ['TTS (TL)', tl(report.ttsTl), false],
    ['Partner (TL)', tl(report.partnerTl), false],
    ['Gift (TL)', tl(report.giftTl), false],
    ['Arıza Formu (TL)', tl(report.faultFormTl), false],
    ['Şirket (TL)', tl(report.companyTl), false],
    ['Alioğlu (TL)', tl(report.aliogluTl), false],
    ['Smart/İndirim (TL)', tl(report.discountPointsTl), false],
    ['Hesaplanan Satış (TL)', tl(report.calculatedSalesTl), true],
  ] : [];

  return (
    <div>
      {/* Form */}
      <div className="import-form">
        <Field label="İstasyon">
          <Select
            icon="pin"
            placeholder="İstasyon seçin"
            value={stationId ?? ''}
            onChange={v => { setStationId(Number(v)); invalidate(); }}
            options={stations.map(s => ({ value: s.id, label: s.name }))}
          />
        </Field>
        <Field label="Departman">
          <Select
            icon="layers"
            placeholder="Departman seçin"
            value={deptId ?? ''}
            onChange={v => { setDeptId(Number(v)); invalidate(); }}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
          />
        </Field>
        <Field label="Tarih">
          <Input type="date" value={date} onChange={e => { setDate(e.target.value); invalidate(); }} />
        </Field>
        <Field label="Konfigürasyon">
          <Select
            icon="settings"
            placeholder={activeConfigs.length ? 'Konfigürasyon seçin' : 'Aktif config yok'}
            value={configId ?? ''}
            onChange={v => { setConfigId(Number(v)); invalidate(); }}
            options={activeConfigs.map(c => ({ value: c.id, label: configMetaLabel(c) }))}
          />
        </Field>
        <Field label="Dizel Fiyatı (TL/L)">
          <Input inputMode="decimal" placeholder="0,00" value={prices.diesel}
            onChange={e => { setPrices(p => ({ ...p, diesel: e.target.value })); invalidate(); }} />
        </Field>
        <Field label="Benzin Fiyatı (TL/L)">
          <Input inputMode="decimal" placeholder="0,00" value={prices.gasoline}
            onChange={e => { setPrices(p => ({ ...p, gasoline: e.target.value })); invalidate(); }} />
        </Field>
        <Field label="LPG Fiyatı (TL/L)">
          <Input inputMode="decimal" placeholder="0,00" value={prices.lpg}
            onChange={e => { setPrices(p => ({ ...p, lpg: e.target.value })); invalidate(); }} />
        </Field>
      </div>

      {/* Dosyalar */}
      <div className="import-files">
        <input ref={dailyRef} type="file" accept=".xlsx,.xls" hidden
          onChange={e => { setDailyFile(e.target.files?.[0] ?? null); invalidate(); }} />
        <input ref={summaryRef} type="file" accept=".xlsx,.xls" hidden
          onChange={e => { setSummaryFile(e.target.files?.[0] ?? null); invalidate(); }} />
        <Button variant="outline" icon="inbox" onClick={() => dailyRef.current?.click()}>
          {dailyFile ? dailyFile.name : 'Günlük rapor (.xlsx)'}
        </Button>
        <Button variant="outline" icon="inbox" onClick={() => summaryRef.current?.click()}>
          {summaryFile ? summaryFile.name : 'Özet rapor (.xls)'}
        </Button>
      </div>

      <div className="import-actions">
        <Button icon="check" onClick={handlePreview} disabled={building}>
          {building ? 'Hazırlanıyor...' : 'Önizle'}
        </Button>
      </div>

      {/* Sonuç (uygulandı) */}
      {result && (
        <div className="sc-msg sc-msg-ok import-preview">
          <Icon name="check" size={16} />
          <div>
            <b>{result.action === 'insert' ? 'Yeni kayıt eklendi.' : 'Mevcut kayıt güncellendi.'}</b>
            {' '}Rapor #{result.reportId} · Audit #{result.runId}
          </div>
        </div>
      )}

      {/* Önizleme */}
      {plan && report && (
        <div className="card card-pad import-preview">
          <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Önizleme</h3>

          {plan.errors.length > 0 && (
            <div className="sc-msg sc-msg-error" style={{ marginTop: 12 }}>
              <Icon name="alertCircle" size={15} />
              <div><b>{plan.errors.length} bloklayıcı hata:</b>
                <ul>{plan.errors.slice(0, 6).map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            </div>
          )}
          {plan.warnings.length > 0 && (
            <div className="sc-msg sc-msg-warn" style={{ marginTop: 12 }}>
              <Icon name="alertCircle" size={15} />
              <div><b>Uyarılar:</b>
                <ul>{plan.warnings.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            </div>
          )}
          {plan.existing && plan.changedFields.length > 0 && (
            <div className="sc-msg sc-msg-warn" style={{ marginTop: 12 }}>
              <Icon name="alertCircle" size={15} />
              <div><b>Değişen alanlar ({plan.changedFields.length}):</b> {plan.changedFields.join(', ')}</div>
            </div>
          )}

          <div className="import-kpis">
            <Stat label="Toplam Satış" value={`₺${tl(report.totalSalesTl)}`} icon="chart" tone="primary" />
            <Stat label="Toplam Litre" value={lt(report.totalLiters)} icon="fuel" tone="primary" />
            <Stat label="Hesaplanan Satış" value={`₺${tl(report.calculatedSalesTl)}`} icon="layers" tone="primary" />
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Alan</th><th style={{ textAlign: 'right' }}>Değer</th></tr></thead>
              <tbody>
                {detailRows.map(([label, val, derived]) => (
                  <tr key={label}>
                    <td>{label}{derived && <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}> (hesaplanan)</span>}</td>
                    <td style={{ textAlign: 'right' }} className="tnum">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sc-actions">
            <Button icon="check" onClick={handleApply} disabled={!plan.canApply || applying}>
              {applying ? 'Uygulanıyor...' : plan.existing ? 'Güncelle ve Uygula' : 'Uygula'}
            </Button>
            {!plan.canApply && (
              <span style={{ color: 'var(--absent-fg)', fontSize: 13, alignSelf: 'center' }}>
                Bloklayıcı hatalar giderilmeli.
              </span>
            )}
          </div>
        </div>
      )}

      {!plan && !result && (
        <div style={{ marginTop: 22 }}>
          <EmptyState
            icon="inbox"
            title="Önizleme bekleniyor"
            description="Scope, fiyatlar ve iki dosyayı seçip “Önizle”ye basın. Veri ancak siz onayladığınızda yazılır."
          />
        </div>
      )}
    </div>
  );
}
