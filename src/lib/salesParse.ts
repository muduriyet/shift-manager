// Satış import Excel parse + whitelist formül evaluator (SD-04).
// Günlük + Özet dosyalarını config mapping'ine göre okur.
// Mapping kaynağı: hücre referansı (ör. "G3") veya basit aritmetik (ör. "G16+G17", "N26+O26").
// Desteklenen: hücre ref, sayı, + - * /, parantez. Desteklenmeyen: SUM/IF/Excel fonksiyonu,
// sheet referansı (Sayfa1!A1), aralık (A1:A5), metin — hepsi bloklayıcı hata verir.

import type {
  SalesImportConfig, SalesMappingTarget, SalesSheetSource,
} from '../types';

// ---- Gösterim etiketleri ve hedef alan kümeleri (UI + validasyon reuse eder) ----

export const SALES_FIELD_LABELS: Record<SalesMappingTarget, string> = {
  source_report_date: 'Rapor Tarihi',
  gasoline_liters:    'Benzin (Litre)',
  diesel_liters:      'Motorin (Litre)',
  lpg_liters:         'LPG (Litre)',
  total_sales_tl:     'Toplam Satış (TL)',
  card_sales_tl:      'Kredi Kartı (TL)',
  cash_sales_tl:      'Nakit (TL)',
  tts_tl:             'TTS (TL)',
  partner_tl:         'Partner (TL)',
  gift_tl:            'Gift (TL)',
  fault_form_tl:      'Arıza Formu (TL)',
  company_tl:         'Şirket (TL)',
  alioglu_tl:         'Alioğlu (TL)',
  discount_points_tl: 'Smart/İndirim (TL)',
};

// Gösterim/mapping sırası (config tablosu bu sırayı kullanır).
export const SALES_MAPPABLE_TARGETS: SalesMappingTarget[] = [
  'source_report_date',
  'gasoline_liters', 'diesel_liters', 'lpg_liters',
  'total_sales_tl', 'card_sales_tl', 'cash_sales_tl',
  'tts_tl', 'partner_tl', 'gift_tl', 'fault_form_tl', 'company_tl', 'alioglu_tl',
  'discount_points_tl',
];

// Zorunlu hedefler = DB'de NOT NULL olan, Excel'den gelen sayısal alanlar.
// source_report_date nullable olduğu için opsiyonel (tarihi kullanıcı da girer).
export const SALES_REQUIRED_TARGETS: SalesMappingTarget[] = SALES_MAPPABLE_TARGETS.filter(
  t => t !== 'source_report_date',
);

// ---- Whitelist formül evaluator ----

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'cell'; ref: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

const CELL_RE = /^[A-Za-z]+[0-9]+$/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const s = input;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '+' || c === '-' || c === '*' || c === '/') { tokens.push({ kind: 'op', value: c }); i++; continue; }
    if (c === '(') { tokens.push({ kind: 'lparen' }); i++; continue; }
    if (c === ')') { tokens.push({ kind: 'rparen' }); i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const numStr = s.slice(i, j);
      const value = Number(numStr);
      if (!Number.isFinite(value)) throw new Error(`Geçersiz sayı: "${numStr}"`);
      tokens.push({ kind: 'num', value });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9]/.test(s[j])) j++;
      const word = s.slice(i, j);
      if (!CELL_RE.test(word)) {
        throw new Error(`Desteklenmeyen ifade: "${word}" (yalnızca hücre referansı, sayı ve + - * / ( ) kullanılabilir)`);
      }
      tokens.push({ kind: 'cell', ref: word.toUpperCase() });
      i = j;
      continue;
    }
    throw new Error(`Desteklenmeyen karakter: "${c}"`);
  }
  return tokens;
}

type Ast =
  | { type: 'num'; value: number }
  | { type: 'cell'; ref: string }
  | { type: 'neg'; operand: Ast }
  | { type: 'bin'; op: '+' | '-' | '*' | '/'; left: Ast; right: Ast };

function parse(tokens: Token[]): Ast {
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  function parseExpression(): Ast {
    let node = parseTerm();
    for (;;) {
      const t = peek();
      if (t && t.kind === 'op' && (t.value === '+' || t.value === '-')) {
        consume();
        node = { type: 'bin', op: t.value, left: node, right: parseTerm() };
      } else break;
    }
    return node;
  }
  function parseTerm(): Ast {
    let node = parseFactor();
    for (;;) {
      const t = peek();
      if (t && t.kind === 'op' && (t.value === '*' || t.value === '/')) {
        consume();
        node = { type: 'bin', op: t.value, left: node, right: parseFactor() };
      } else break;
    }
    return node;
  }
  function parseFactor(): Ast {
    const t = peek();
    if (!t) throw new Error('Beklenmeyen formül sonu');
    if (t.kind === 'op' && (t.value === '+' || t.value === '-')) {
      consume();
      const operand = parseFactor();
      return t.value === '-' ? { type: 'neg', operand } : operand;
    }
    if (t.kind === 'num') { consume(); return { type: 'num', value: t.value }; }
    if (t.kind === 'cell') { consume(); return { type: 'cell', ref: t.ref }; }
    if (t.kind === 'lparen') {
      consume();
      const inner = parseExpression();
      const close = peek();
      if (!close || close.kind !== 'rparen') throw new Error('Kapanmayan parantez');
      consume();
      return inner;
    }
    throw new Error('Beklenmeyen ifade');
  }

  if (tokens.length === 0) throw new Error('Formül boş');
  const ast = parseExpression();
  if (pos !== tokens.length) throw new Error('Formül düzgün ayrıştırılamadı');
  return ast;
}

function evalAst(ast: Ast, resolveCell: (ref: string) => number): number {
  switch (ast.type) {
    case 'num': return ast.value;
    case 'cell': return resolveCell(ast.ref);
    case 'neg': return -evalAst(ast.operand, resolveCell);
    case 'bin': {
      const l = evalAst(ast.left, resolveCell);
      const r = evalAst(ast.right, resolveCell);
      switch (ast.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new Error('Sıfıra bölme');
          return l / r;
      }
    }
  }
}

// Yalnızca sözdizimi/whitelist kontrolü (hücre değeri gerekmez). Config aktivasyonu kullanır.
// Hata varsa mesaj, geçerliyse null döner.
export function validateFormula(formula: string): string | null {
  try {
    parse(tokenize(formula));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Geçersiz formül';
  }
}

export function evaluateFormula(formula: string, resolveCell: (ref: string) => number): number {
  return evalAst(parse(tokenize(formula)), resolveCell);
}

// ---- Hücre okuma ----

// "C16" → { row: 15, col: 2 } (0-based). Geçersizse null.
export function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = /^([A-Za-z]+)([0-9]+)$/.exec(ref.trim());
  if (!m) return null;
  const letters = m[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64);
  const row = parseInt(m[2], 10);
  if (col <= 0 || row <= 0) return null;
  return { row: row - 1, col: col - 1 };
}

type Cell = { v?: number | string | boolean | null; t?: string };

function cellOf(ws: unknown, ref: string): Cell | undefined {
  return (ws as Record<string, Cell | undefined>)[ref];
}

// Boş/eksik hücre → 0 (Excel aritmetik semantiği). Metin sayıya çevrilemezse hata.
function cellNumber(ws: unknown, ref: string): number {
  const cell = cellOf(ws, ref);
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return 0;
  if (typeof cell.v === 'number') return cell.v;
  const n = Number(String(cell.v).trim());
  if (!Number.isFinite(n)) throw new Error(`Hücre sayıya çevrilemedi: ${ref} ("${String(cell.v)}")`);
  return n;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

// source_report_date: tek hücre, Excel serial → yerel YYYY-MM-DD.
// UTC bazlı serial→tarih: cellDates JS Date'i yerel TZ'ye göre bir gün geri
// kaydırabildiği (ör. serial 46143 → 30 Nisan) için serial'dan UTC ile üretiyoruz.
function readDateCell(ws: unknown, formula: string): string | null {
  const ref = formula.trim().toUpperCase();
  if (!CELL_RE.test(ref)) throw new Error('Tarih alanı tek bir hücre referansı olmalı (ör. G1)');
  const cell = cellOf(ws, ref);
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return null;
  if (typeof cell.v === 'number') {
    const ms = Date.UTC(1899, 11, 30) + Math.round(cell.v) * 86400000; // Excel 1900 sistem epoch'u
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  // String tarih (nadir): ISO/Date.parse dene.
  const parsed = new Date(String(cell.v));
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
}

function pickSheet(
  wb: { SheetNames: string[]; Sheets: Record<string, unknown> },
  name: string | null,
  label: string,
  errors: string[],
): unknown | null {
  if (name && name.trim()) {
    const ws = wb.Sheets[name];
    if (!ws) { errors.push(`${label} dosyasında "${name}" sayfası bulunamadı.`); return null; }
    return ws;
  }
  const first = wb.SheetNames[0];
  if (!first) { errors.push(`${label} dosyasında okunabilir sayfa yok.`); return null; }
  return wb.Sheets[first];
}

// ---- Ana parse ----

export interface SalesParseFieldResult {
  target: SalesMappingTarget;
  source: SalesSheetSource;
  formula: string;
  value: number | string | null;
  error?: string;
}

export interface SalesParseResult {
  values: Partial<Record<SalesMappingTarget, number>>; // sayısal hedefler
  sourceReportDate: string | null;                     // source_report_date
  fields: SalesParseFieldResult[];                     // preview gösterimi
  errors: string[];                                    // bloklayıcılar
}

export interface SalesParseInput {
  dailyBytes: ArrayBuffer | Uint8Array;
  summaryBytes: ArrayBuffer | Uint8Array;
  config: SalesImportConfig;
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Bilinmeyen hata');

export async function parseSalesWorkbooks(input: SalesParseInput): Promise<SalesParseResult> {
  const XLSX = await import('xlsx');
  const errors: string[] = [];
  const fields: SalesParseFieldResult[] = [];
  const values: Partial<Record<SalesMappingTarget, number>> = {};
  let sourceReportDate: string | null = null;

  const dailyWb = XLSX.read(new Uint8Array(input.dailyBytes as ArrayBuffer), { type: 'array' });
  const summaryWb = XLSX.read(new Uint8Array(input.summaryBytes as ArrayBuffer), { type: 'array' });

  const dailyWs = pickSheet(dailyWb, input.config.dailySheetName, 'Günlük rapor', errors);
  const summaryWs = pickSheet(summaryWb, input.config.summarySheetName, 'Özet rapor', errors);

  if (!dailyWs || !summaryWs) {
    return { values, sourceReportDate, fields, errors };
  }

  for (const m of input.config.mappings) {
    const ws = m.source === 'daily' ? dailyWs : summaryWs;
    const label = SALES_FIELD_LABELS[m.target] ?? m.target;
    try {
      if (m.target === 'source_report_date') {
        sourceReportDate = readDateCell(ws, m.formula);
        fields.push({ target: m.target, source: m.source, formula: m.formula, value: sourceReportDate });
      } else {
        const v = evaluateFormula(m.formula, ref => cellNumber(ws, ref));
        if (!Number.isFinite(v)) throw new Error('Hesaplanan değer geçersiz');
        values[m.target] = v;
        fields.push({ target: m.target, source: m.source, formula: m.formula, value: v });
      }
    } catch (e) {
      const msg = errMsg(e);
      errors.push(`${label} (${m.source}.${m.formula}): ${msg}`);
      fields.push({ target: m.target, source: m.source, formula: m.formula, value: null, error: msg });
    }
  }

  return { values, sourceReportDate, fields, errors };
}
