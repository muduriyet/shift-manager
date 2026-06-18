// Veri Gezgini "Ham Tablo" modu — sales_dashboard_daily_view satırlarını excel-vari
// gösterir; her kolon başlığı sortable; ham kolonlar inline düzenlenebilir, türevler
// salt-okunur ve düzenlemede otomatik yeniden hesaplanır.
// "Seç & Topla" modunda: Çizelge grid'i gibi sürükleyerek dikdörtgen aralık seçilir
// (mousedown→drag→mouseup), altta Toplam/Adet/Ortalama gösterilir; bu modda düzenleme kapalı.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SalesDailyView } from '../../types';

type Fmt = 'date' | 'text' | 'liter' | 'tl' | 'price' | 'percent';

interface ColDef {
  key: keyof SalesDailyView;
  label: string;
  fmt: Fmt;
  editable: boolean;
}

// Kolon sırası view tanımıyla aynı. editable=false → kimlik veya türetilmiş kolon.
const COLS: ColDef[] = [
  { key: 'reportDate',        label: 'Tarih',             fmt: 'date',    editable: false },
  { key: 'stationName',       label: 'İstasyon',          fmt: 'text',    editable: false },
  { key: 'deptName',          label: 'Departman',         fmt: 'text',    editable: false },
  { key: 'gasolineLiters',    label: 'Benzin (L)',        fmt: 'liter',   editable: true  },
  { key: 'dieselLiters',      label: 'Motorin (L)',       fmt: 'liter',   editable: true  },
  { key: 'lpgLiters',         label: 'LPG (L)',           fmt: 'liter',   editable: true  },
  { key: 'totalLiters',       label: 'Toplam Litre',      fmt: 'liter',   editable: false },
  { key: 'totalSalesTl',      label: 'Toplam Satış (₺)',  fmt: 'tl',      editable: true  },
  { key: 'cardSalesTl',       label: 'Kredi Kartı (₺)',   fmt: 'tl',      editable: true  },
  { key: 'cashSalesTl',       label: 'Nakit (₺)',         fmt: 'tl',      editable: true  },
  { key: 'ttsTl',             label: 'TTS (₺)',           fmt: 'tl',      editable: true  },
  { key: 'partnerTl',         label: 'Partner (₺)',       fmt: 'tl',      editable: true  },
  { key: 'giftTl',            label: 'Gift (₺)',          fmt: 'tl',      editable: true  },
  { key: 'faultFormTl',       label: 'Arıza Formu (₺)',   fmt: 'tl',      editable: true  },
  { key: 'companyTl',         label: 'Şirket (₺)',        fmt: 'tl',      editable: true  },
  { key: 'aliogluTl',         label: 'Alioğlu (₺)',       fmt: 'tl',      editable: true  },
  { key: 'discountPointsTl',  label: 'Smart/İndirim (₺)', fmt: 'tl',      editable: true  },
  { key: 'gasolineUnitPrice', label: 'Benzin Fiyat',      fmt: 'price',   editable: true  },
  { key: 'dieselUnitPrice',   label: 'Motorin Fiyat',     fmt: 'price',   editable: true  },
  { key: 'lpgUnitPrice',      label: 'LPG Fiyat',         fmt: 'price',   editable: true  },
  { key: 'calculatedSalesTl', label: 'Hesaplanan (₺)',    fmt: 'tl',      editable: false },
  { key: 'cardRatio',         label: 'Kart Oranı',        fmt: 'percent', editable: false },
  { key: 'avgTlPerLiter',     label: 'Ort. ₺/L',          fmt: 'tl',      editable: false },
];

const isNumericCol = (c: ColDef): boolean => c.fmt !== 'date' && c.fmt !== 'text';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

// import'taki türetme kuralının aynısı (salesImport.ts:93,97). Ham alan değişince türevleri tazeler.
function recompute(r: SalesDailyView): SalesDailyView {
  const totalLiters = round2(r.gasolineLiters + r.dieselLiters + r.lpgLiters);
  const calculatedSalesTl = round2(
    r.dieselUnitPrice * r.dieselLiters +
    r.gasolineUnitPrice * r.gasolineLiters +
    r.lpgUnitPrice * r.lpgLiters,
  );
  const cardRatio = r.totalSalesTl !== 0 ? round4(r.cardSalesTl / r.totalSalesTl) : 0;
  const avgTlPerLiter = totalLiters !== 0 ? round4(r.totalSalesTl / totalLiters) : 0;
  return { ...r, totalLiters, calculatedSalesTl, cardRatio, avgTlPerLiter };
}

function fmtCell(v: SalesDailyView[keyof SalesDailyView], fmt: Fmt): string {
  if (fmt === 'date' || fmt === 'text') return String(v ?? '');
  const n = Number(v);
  if (fmt === 'percent') return '%' + (n * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  if (fmt === 'price') return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // liter / tl
}
const fmtNum = (n: number): string => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface CellRef { r: number; c: number }            // sorted satır indeksi + COLS kolon indeksi
interface Selection { a: CellRef; b: CellRef }        // iki köşe (Çizelge grid'iyle aynı model)

interface SalesRawGridProps {
  rows: SalesDailyView[];
  onEdit: (next: SalesDailyView) => void;
  onToast: (msg: string) => void;
}

export function SalesRawGrid({ rows, onEdit, onToast }: SalesRawGridProps) {
  const [sortKey, setSortKey] = useState<keyof SalesDailyView>('reportDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editing, setEditing] = useState<{ id: number; key: keyof SalesDailyView } | null>(null);
  const [draft, setDraft] = useState('');
  // Seç & Topla modu — Çizelge grid'i gibi sürükle-dikdörtgen seçim
  const [selectMode, setSelectMode] = useState(false);
  const [sel, setSel] = useState<Selection | null>(null);
  const selectingRef = useRef(false);                 // mouse basılı (sürüklüyor) mu

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const c = (typeof av === 'number' && typeof bv === 'number')
        ? av - bv
        : String(av).localeCompare(String(bv), 'tr');
      return sortDir === 'asc' ? c : -c;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  // Sürükleme bitişi (mouseup) ve Esc — Çizelge grid'iyle aynı.
  useEffect(() => {
    if (!selectMode) return;
    const onUp = () => { selectingRef.current = false; };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mouseup', onUp); window.removeEventListener('keydown', onKey); };
  }, [selectMode]);

  const bounds = sel ? {
    r1: Math.min(sel.a.r, sel.b.r), r2: Math.max(sel.a.r, sel.b.r),
    c1: Math.min(sel.a.c, sel.b.c), c2: Math.max(sel.a.c, sel.b.c),
  } : null;
  const isSel = (r: number, c: number) =>
    !!bounds && r >= bounds.r1 && r <= bounds.r2 && c >= bounds.c1 && c <= bounds.c2;

  // Seçili dikdörtgendeki sayısal hücrelerin istatistiği (metin/tarih hücreleri toplama girmez).
  const stats = useMemo(() => {
    if (!sel) return { count: 0, sum: 0, avg: 0 };
    const r1 = Math.min(sel.a.r, sel.b.r), r2 = Math.max(sel.a.r, sel.b.r);
    const c1 = Math.min(sel.a.c, sel.b.c), c2 = Math.max(sel.a.c, sel.b.c);
    let sum = 0, count = 0;
    for (let r = r1; r <= r2; r++) {
      const row = sorted[r];
      if (!row) continue;
      for (let c = c1; c <= c2; c++) {
        const col = COLS[c];
        if (!col || !isNumericCol(col)) continue;
        const v = Number(row[col.key]);
        if (Number.isFinite(v)) { sum += v; count++; }
      }
    }
    return { count, sum, avg: count ? sum / count : 0 };
  }, [sel, sorted]);

  function toggleSort(key: keyof SalesDailyView) {
    setSel(null);
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function enterSelectMode() { setEditing(null); setSelectMode(true); }
  function exitSelectMode() { setSelectMode(false); setSel(null); selectingRef.current = false; }

  // Çizelge grid'iyle aynı: mousedown başlat, mouseenter (basılıyken) genişlet.
  function startSel(r: number, c: number, e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    setSel({ a: { r, c }, b: { r, c } });
    selectingRef.current = true;
  }
  function extendSel(r: number, c: number) {
    if (selectingRef.current) setSel(s => (s ? { ...s, b: { r, c } } : s));
  }

  function startEdit(r: SalesDailyView, key: keyof SalesDailyView) {
    setEditing({ id: r.id, key });
    setDraft(String(r[key] ?? ''));
  }

  function commitEdit(r: SalesDailyView, col: ColDef) {
    setEditing(null);
    const raw = draft.trim().replace(',', '.');
    if (raw === '') return;                       // boş → sessiz iptal
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) { onToast('Geçersiz değer'); return; }
    const next = col.fmt === 'price' ? round4(n) : round2(n);
    if (next === Number(r[col.key])) return;      // değişmedi
    onEdit(recompute({ ...r, [col.key]: next }));
  }

  if (!rows.length) return <div className="chart-empty">Seçili aralıkta veri yok</div>;

  return (
    <div>
      <div className="raw-grid-toolbar">
        <button
          className={selectMode ? 'tgl on' : 'tgl'}
          onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}
        >
          {selectMode ? '✓ Seç & Topla' : 'Seç & Topla'}
        </button>
        {selectMode && sel && (
          <button className="tgl" onClick={() => setSel(null)}>Temizle</button>
        )}
        {selectMode && (
          <span className="hint">Sürükleyerek aralık seç · Esc temizler · düzenleme kapalı</span>
        )}
      </div>

      <div className="table-wrap raw-grid-scroll">
        <table className={`tbl raw-grid${selectMode ? ' selecting' : ''}`}>
          <thead>
            <tr>
              {COLS.map(c => (
                <th
                  key={c.key}
                  className={`sortable${isNumericCol(c) ? ' ar' : ''}`}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, rowIdx) => (
              <tr key={r.id}>
                {COLS.map((c, colIdx) => {
                  const isNum = isNumericCol(c);
                  if (!selectMode && editing && editing.id === r.id && editing.key === c.key) {
                    return (
                      <td key={c.key} className="ar">
                        <input
                          className="grid-input" type="text" inputMode="decimal" autoFocus
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onBlur={() => commitEdit(r, c)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(r, c);
                            else if (e.key === 'Escape') setEditing(null);
                          }}
                        />
                      </td>
                    );
                  }
                  const cls = [
                    isNum ? 'ar tnum' : '',
                    !selectMode && c.editable ? 'cell-edit' : '',
                    isNum && !c.editable ? 'cell-ro' : '',
                    selectMode && isSel(rowIdx, colIdx) ? 'selected' : '',
                  ].filter(Boolean).join(' ');
                  const handlers = selectMode
                    ? {
                        onMouseDown: (e: React.MouseEvent) => startSel(rowIdx, colIdx, e),
                        onMouseEnter: () => extendSel(rowIdx, colIdx),
                      }
                    : { onClick: c.editable ? () => startEdit(r, c.key) : undefined };
                  const title = selectMode ? undefined : (c.editable ? 'Düzenlemek için tıkla' : undefined);
                  return (
                    <td key={c.key} className={cls} title={title} {...handlers}>
                      {fmtCell(r[c.key], c.fmt)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectMode && (
        <div className="raw-grid-sumbar">
          {stats.count > 0 ? (
            <>Seçili: <b>{stats.count}</b> hücre&nbsp; ·&nbsp; Toplam: <b>{fmtNum(stats.sum)}</b>&nbsp; ·&nbsp; Ortalama: <b>{fmtNum(stats.avg)}</b></>
          ) : (
            <span className="muted">Sürükleyerek sayısal hücre aralığı seç…</span>
          )}
        </div>
      )}
    </div>
  );
}
