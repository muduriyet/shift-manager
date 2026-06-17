import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  SalesImportConfig, SalesConfigStatus, SalesMapping, SalesMappingTarget, SalesSheetSource,
} from '../../types';
import { createSalesConfig, updateSalesConfig } from '../../lib/db';
import {
  parseSalesWorkbooks, validateFormula,
  SALES_FIELD_LABELS, SALES_MAPPABLE_TARGETS, SALES_REQUIRED_TARGETS,
  type SalesParseResult,
} from '../../lib/salesParse';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Field, Input } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

type DraftRow = { source: SalesSheetSource; formula: string };
type DraftMap = Record<SalesMappingTarget, DraftRow>;

interface Draft {
  name: string;
  dailySheetName: string;
  summarySheetName: string;
  status: SalesConfigStatus;
  isSystem: boolean;
  map: DraftMap;
}

const REQUIRED = new Set<SalesMappingTarget>(SALES_REQUIRED_TARGETS);
const SOURCE_LABEL: Record<SalesSheetSource, string> = { daily: 'Günlük', summary: 'Özet' };
const STATUS_META: Record<SalesConfigStatus, { label: string; variant: string }> = {
  active:   { label: 'Aktif',  variant: 'active' },
  inactive: { label: 'Pasif',  variant: 'passive' },
  draft:    { label: 'Taslak', variant: 'neutral' },
};

function emptyMap(): DraftMap {
  const m = {} as DraftMap;
  for (const t of SALES_MAPPABLE_TARGETS) {
    m[t] = { source: t === 'discount_points_tl' ? 'summary' : 'daily', formula: '' };
  }
  return m;
}

function toDraft(c: SalesImportConfig): Draft {
  const map = emptyMap();
  for (const mp of c.mappings) {
    if (map[mp.target]) map[mp.target] = { source: mp.source, formula: mp.formula };
  }
  return {
    name: c.name,
    dailySheetName: c.dailySheetName ?? '',
    summarySheetName: c.summarySheetName ?? '',
    status: c.status,
    isSystem: c.isSystem,
    map,
  };
}

function mappingsFromDraft(map: DraftMap): SalesMapping[] {
  const out: SalesMapping[] = [];
  for (const t of SALES_MAPPABLE_TARGETS) {
    const row = map[t];
    if (row.formula.trim()) out.push({ target: t, source: row.source, formula: row.formula.trim() });
  }
  return out;
}

// Aktivasyon kuralları: ad dolu, zorunlu hedefler formüllü ve whitelist'ten geçmeli.
function validationIssues(draft: Draft): string[] {
  const issues: string[] = [];
  if (!draft.name.trim()) issues.push('Konfigürasyon adı boş olamaz.');
  for (const t of SALES_MAPPABLE_TARGETS) {
    const row = draft.map[t];
    const required = REQUIRED.has(t);
    if (!row.formula.trim()) {
      if (required) issues.push(`${SALES_FIELD_LABELS[t]}: formül eksik.`);
      continue;
    }
    const err = validateFormula(row.formula);
    if (err) issues.push(`${SALES_FIELD_LABELS[t]}: ${err}`);
  }
  return issues;
}

function fmtVal(v: number | string | null): string {
  if (v === null) return '—';
  if (typeof v === 'number') return v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return v;
}

interface SalesConfigTabProps {
  configs: SalesImportConfig[];
  setConfigs: Dispatch<SetStateAction<SalesImportConfig[]>>;
  onToast: (msg: string) => void;
}

export function SalesConfigTab({ configs, setConfigs, onToast }: SalesConfigTabProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  // Test Et durumları
  const [testDaily, setTestDaily] = useState<File | null>(null);
  const [testSummary, setTestSummary] = useState<File | null>(null);
  const [testResult, setTestResult] = useState<SalesParseResult | null>(null);
  const [testing, setTesting] = useState(false);
  const dailyRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLInputElement>(null);

  const selected = configs.find(c => c.id === selectedId) ?? null;

  // İlk seçim + seçili config değiştiğinde / configs güncellenince draft'ı yükle.
  useEffect(() => {
    if (selectedId == null) {
      if (configs.length) setSelectedId(configs[0].id);
      return;
    }
    const c = configs.find(x => x.id === selectedId);
    if (c) setDraft(toDraft(c));
    setTestResult(null);
    setTestDaily(null);
    setTestSummary(null);
  }, [selectedId, configs]);

  if (!configs.length || !selected || !draft) {
    return (
      <EmptyState
        icon="settings"
        title="Konfigürasyon yok"
        description="Bir sistem konfigürasyonu kopyalayarak kendi eşlemelerinizi oluşturabilirsiniz."
      />
    );
  }

  const readOnly = draft.isSystem;
  const issues = validationIssues(draft);

  function updateRow(t: SalesMappingTarget, patch: Partial<DraftRow>) {
    setDraft(d => (d ? { ...d, map: { ...d.map, [t]: { ...d.map[t], ...patch } } } : d));
  }

  async function persist(targetStatus: SalesConfigStatus, fromToggle: boolean) {
    if (!draft || selectedId == null || busy) return;
    let status = targetStatus;
    if (status === 'active' && issues.length) {
      if (fromToggle) { onToast(`Aktif yapılamadı — ${issues[0]}`); return; }
      status = 'draft'; // düz kayıt: geçersizse taslağa düşür
    }
    setBusy(true);
    try {
      const saved = await updateSalesConfig(selectedId, {
        name: draft.name.trim(),
        status,
        dailySheetName: draft.dailySheetName.trim() || null,
        summarySheetName: draft.summarySheetName.trim() || null,
        mappings: mappingsFromDraft(draft.map),
      });
      setConfigs(prev => prev.map(c => (c.id === saved.id ? saved : c)));
      onToast(
        targetStatus === 'active' && status === 'draft'
          ? 'Kaydedildi (eksik eşleme: taslak)'
          : 'Konfigürasyon kaydedildi',
      );
    } catch (err) {
      console.error('Config kaydedilemedi', err);
      onToast('Kaydedilemedi, tekrar deneyin');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const created = await createSalesConfig({
        name: `${draft.name} (kopya)`,
        status: 'draft',
        dailySheetName: draft.dailySheetName.trim() || null,
        summarySheetName: draft.summarySheetName.trim() || null,
        mappings: mappingsFromDraft(draft.map),
      });
      setConfigs(prev => [...prev, created]);
      setSelectedId(created.id);
      onToast('Kopya oluşturuldu (taslak)');
    } catch (err) {
      console.error('Kopyalanamadı', err);
      onToast('Kopyalanamadı, tekrar deneyin');
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    if (!draft || !testDaily || !testSummary || testing) return;
    setTesting(true);
    try {
      const [db, sb] = await Promise.all([testDaily.arrayBuffer(), testSummary.arrayBuffer()]);
      const tempConfig: SalesImportConfig = {
        ...selected!,
        name: draft.name,
        dailySheetName: draft.dailySheetName.trim() || null,
        summarySheetName: draft.summarySheetName.trim() || null,
        mappings: mappingsFromDraft(draft.map),
      };
      const res = await parseSalesWorkbooks({ dailyBytes: db, summaryBytes: sb, config: tempConfig });
      setTestResult(res);
    } catch (err) {
      console.error('Test başarısız', err);
      onToast('Dosya okunamadı');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="sales-config">
      {/* Sol: config listesi */}
      <aside className="sc-list">
        {configs.map(c => {
          const meta = STATUS_META[c.status];
          return (
            <button
              key={c.id}
              type="button"
              className={`sc-item${c.id === selectedId ? ' active' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <span className="sc-item-main">
                <b>{c.name}</b>
                {c.isSystem && (
                  <span className="sc-system"><Icon name="check" size={12} />sistem</span>
                )}
              </span>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </button>
          );
        })}
      </aside>

      {/* Sağ: editör */}
      <section className="sc-editor card card-pad">
        {readOnly && (
          <div className="sc-note">
            <Icon name="alertCircle" size={15} />
            Sistem konfigürasyonu — düzenlenemez. Kendi eşlemeleriniz için <b>Kopyala</b>’yı kullanın.
          </div>
        )}

        <div className="sc-grid">
          <Field label="Konfigürasyon Adı">
            <Input
              value={draft.name}
              readOnly={readOnly}
              onChange={e => setDraft(d => (d ? { ...d, name: e.target.value } : d))}
            />
          </Field>
          <Field label="Günlük Sayfa Adı (boş = ilk sayfa)">
            <Input
              value={draft.dailySheetName}
              placeholder="ilk sayfa"
              readOnly={readOnly}
              onChange={e => setDraft(d => (d ? { ...d, dailySheetName: e.target.value } : d))}
            />
          </Field>
          <Field label="Özet Sayfa Adı (boş = ilk sayfa)">
            <Input
              value={draft.summarySheetName}
              placeholder="ilk sayfa"
              readOnly={readOnly}
              onChange={e => setDraft(d => (d ? { ...d, summarySheetName: e.target.value } : d))}
            />
          </Field>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="tbl sc-map">
            <thead>
              <tr><th>Hedef Alan</th><th style={{ width: 130 }}>Kaynak</th><th>Formül</th></tr>
            </thead>
            <tbody>
              {SALES_MAPPABLE_TARGETS.map(t => {
                const row = draft.map[t];
                const required = REQUIRED.has(t);
                const fErr = row.formula.trim() ? validateFormula(row.formula) : null;
                return (
                  <tr key={t}>
                    <td>
                      {SALES_FIELD_LABELS[t]}
                      {required && <span className="sc-req" title="zorunlu"> *</span>}
                    </td>
                    <td>
                      {readOnly ? (
                        <span className="sc-ro">{SOURCE_LABEL[row.source]}</span>
                      ) : (
                        <Select
                          small
                          value={row.source}
                          onChange={v => updateRow(t, { source: v as SalesSheetSource })}
                          options={[{ value: 'daily', label: 'Günlük' }, { value: 'summary', label: 'Özet' }]}
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span className="sc-ro sc-mono">{row.formula || '—'}</span>
                      ) : (
                        <Input
                          className="sc-mono"
                          value={row.formula}
                          error={!!fErr}
                          placeholder={required ? 'ör. G3' : '(opsiyonel)'}
                          onChange={e => updateRow(t, { formula: e.target.value })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!readOnly && issues.length > 0 && (
          <div className="sc-msg sc-msg-warn" style={{ marginTop: 14 }}>
            <Icon name="alertCircle" size={15} />
            <div>
              <b>Aktifleştirme için {issues.length} eksik/hatalı alan:</b>
              <ul>{issues.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          </div>
        )}

        {/* Dosyayla Test Et */}
        <div className="sc-test">
          <div className="sc-test-head">
            <h4>Dosyayla Test Et</h4>
            <span>Eşlemeleri gerçek dosyalara karşı doğrulayın (kaydetmez).</span>
          </div>
          <div className="sc-test-pick">
            <input ref={dailyRef} type="file" accept=".xlsx,.xls" hidden
              onChange={e => setTestDaily(e.target.files?.[0] ?? null)} />
            <input ref={summaryRef} type="file" accept=".xlsx,.xls" hidden
              onChange={e => setTestSummary(e.target.files?.[0] ?? null)} />
            <Button variant="outline" size="sm" icon="inbox" onClick={() => dailyRef.current?.click()}>
              {testDaily ? testDaily.name : 'Günlük dosya'}
            </Button>
            <Button variant="outline" size="sm" icon="inbox" onClick={() => summaryRef.current?.click()}>
              {testSummary ? testSummary.name : 'Özet dosya'}
            </Button>
            <Button size="sm" icon="check" onClick={runTest} disabled={!testDaily || !testSummary || testing}>
              {testing ? 'Okunuyor...' : 'Test Et'}
            </Button>
          </div>

          {testResult && (
            <div style={{ marginTop: 12 }}>
              {testResult.errors.length > 0 && (
                <div className="sc-msg sc-msg-error">
                  <Icon name="alertCircle" size={15} />
                  <div><b>{testResult.errors.length} hata:</b>
                    <ul>{testResult.errors.slice(0, 5).map((m, i) => <li key={i}>{m}</li>)}</ul>
                  </div>
                </div>
              )}
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="tbl">
                  <thead><tr><th>Alan</th><th>Kaynak</th><th style={{ textAlign: 'right' }}>Değer</th></tr></thead>
                  <tbody>
                    {testResult.fields.map(f => (
                      <tr key={f.target}>
                        <td>{SALES_FIELD_LABELS[f.target]}</td>
                        <td className="sc-mono">{f.source}.{f.formula}</td>
                        <td style={{ textAlign: 'right' }} className="tnum">
                          {f.error ? <span className="sc-req">{f.error}</span> : fmtVal(f.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Aksiyonlar */}
        <div className="sc-actions">
          <Button variant="outline" icon="grip" onClick={handleCopy} disabled={busy}>Kopyala</Button>
          {!readOnly && (
            <>
              <Button icon="check" onClick={() => persist(draft.status, false)} disabled={busy}>Kaydet</Button>
              {draft.status === 'active' ? (
                <Button variant="outline" onClick={() => persist('inactive', true)} disabled={busy}>Pasife Al</Button>
              ) : (
                <Button variant="outline" onClick={() => persist('active', true)} disabled={busy || issues.length > 0}>
                  Aktifleştir
                </Button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
