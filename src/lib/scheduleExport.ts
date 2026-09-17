import type { Employee, Shift, ShiftCodeKey } from '../types';
import { MONTH_NAMES, buildMonthDays, dateToStr, isWithinEmployment, isEmployedInRange, monthBounds } from '../constants';

export interface ScheduleExportScope {
  station: string;
  dept: string;
  yearMonth: string;
}

const TOTAL_CODES: Exclude<ShiftCodeKey, '-'>[] = ['S', 'Ö', 'G', 'Öz', 'İ', 'Yİ', 'Üİ', 'İs'];
const WORK_TOTAL_CODES = new Set<ShiftCodeKey>(['S', 'Ö', 'G', 'Öz']);
const OFF_TOTAL_CODES = new Set<ShiftCodeKey>(['İ', 'Yİ', 'Üİ', 'İs']);

const STYLE = {
  default: 3,
  title: 6,
  personHeader: 60,
  dayHeader: 9,
  weekendHeader: 18,
  totalHeader: 58,
  name: 17,
  dayBlank: 45,
  weekendBlank: 45,
  total: 50,
  totalStrong: 52,
  grand: 55,
  grandLabel: 56,
  codeS: 31,
  codeO: 27,
  codeG: 36,
  codeOz: 41,
  codeI: 25,
  codeYI: 23,
  codeUI: 48,
  codeIs: 25,
} as const;

const CODE_STYLE: Partial<Record<ShiftCodeKey, number>> = {
  S: STYLE.codeS,
  'Ö': STYLE.codeO,
  G: STYLE.codeG,
  'Öz': STYLE.codeOz,
  'İ': STYLE.codeI,
  'Yİ': STYLE.codeYI,
  'Üİ': STYLE.codeUI,
  'İs': STYLE.codeIs,
};

type CellValue = string | number | null;

interface Cell {
  row: number;
  col: number;
  value: CellValue;
  style: number;
}

type XlsxCfb = {
  CFB: {
    find: (cfb: unknown, path: string) => { content: Uint8Array; size: number } | null;
    read: (data: Uint8Array, opts: { type: 'buffer' }) => unknown;
    utils: {
      cfb_add: (cfb: unknown, path: string, content: Uint8Array) => void;
    };
    write: (cfb: unknown, opts: { type: 'array'; fileType: 'zip'; compression?: boolean }) => ArrayBuffer;
  };
};

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function daysForMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number);
  return buildMonthDays(year, month - 1).map(d =>
    dateToStr(new Date(year, month - 1, d.n)),
  );
}

function scopedEmployees(employees: Employee[], scope: ScheduleExportScope): Employee[] {
  // Çalışma aralığı seçili ayla kesişmeyen personel çizelgede listelenmediği
  // gibi Excel'e de yazılmaz; aksi halde dosyada tamamı boş satırlar çıkar.
  const { start, end } = monthBounds(scope.yearMonth);
  return employees.filter(e =>
    e.status === 'Aktif' &&
    e.station === scope.station &&
    e.dept === scope.dept &&
    isEmployedInRange(e.startDate, e.endDate, start, end),
  );
}

function shiftKey(empId: number, dateStr: string): string {
  return `${empId}|${dateStr}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function cellRef(row: number, col: number): string {
  return `${colName(col)}${row}`;
}

function slug(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'secim';
}

function cellXml(cell: Cell): string {
  const ref = cellRef(cell.row, cell.col);
  const style = ` s="${cell.style}"`;
  if (cell.value === null || cell.value === '') return `<c r="${ref}"${style}/>`;
  if (typeof cell.value === 'number') return `<c r="${ref}"${style}><v>${cell.value}</v></c>`;
  return `<c r="${ref}"${style} t="inlineStr"><is><t>${xmlEscape(cell.value)}</t></is></c>`;
}

function rowXml(row: number, cells: Cell[]): string {
  return `<row r="${row}">${cells.map(cellXml).join('')}</row>`;
}

function encodeXml(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

function replaceCfbFile(xlsx: XlsxCfb, cfb: unknown, path: string, content: string): void {
  const file = xlsx.CFB.find(cfb, path);
  if (!file) {
    xlsx.CFB.utils.cfb_add(cfb, path.replace(/^\//, ''), encodeXml(content));
    return;
  }
  file.content = encodeXml(content);
  file.size = file.content.length;
}

function buildWorksheetXml(options: {
  cellsByRow: Map<number, Cell[]>;
  merges: string[];
  lastRow: number;
  lastCol: number;
  dayCount: number;
}): string {
  const { cellsByRow, merges, lastRow, lastCol, dayCount } = options;
  const rows = [...cellsByRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, cells]) => rowXml(row, cells.sort((a, b) => a.col - b.col)))
    .join('');
  const spacerCol = 4 + dayCount;
  const totalStart = spacerCol + 1;
  const totalEnd = totalStart + 10;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${cellRef(lastRow, lastCol)}"/>
  <sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="3" topLeftCell="D4" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="D4" sqref="D4"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="3" customWidth="1"/>
    <col min="2" max="2" width="24" customWidth="1"/>
    <col min="3" max="3" width="3" customWidth="1"/>
    <col min="4" max="${3 + dayCount}" width="4" customWidth="1"/>
    <col min="${spacerCol}" max="${spacerCol}" width="3" customWidth="1"/>
    <col min="${totalStart}" max="${totalEnd}" width="9" customWidth="1"/>
  </cols>
  <sheetData>${rows}</sheetData>
  <mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function addCell(rows: Map<number, Cell[]>, row: number, col: number, value: CellValue, style: number): void {
  rows.set(row, [...(rows.get(row) ?? []), { row, col, value, style }]);
}

async function loadTemplateCfb(xlsx: XlsxCfb): Promise<unknown> {
  const response = await fetch('/templates/vardiya-export-template.xlsx');
  if (!response.ok) throw new Error('Export template dosyası okunamadı.');
  return xlsx.CFB.read(new Uint8Array(await response.arrayBuffer()), { type: 'buffer' });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function downloadScheduleExport(options: {
  employees: Employee[];
  shifts: Shift[];
  scope: ScheduleExportScope;
}): Promise<{ fileName: string; employeeCount: number; shiftCount: number }> {
  const XLSX = await import('xlsx') as unknown as XlsxCfb;
  const { employees, shifts, scope } = options;
  const [year, month] = scope.yearMonth.split('-').map(Number);
  const monthDays = buildMonthDays(year, month - 1);
  const days = daysForMonth(scope.yearMonth);
  const people = scopedEmployees(employees, scope);
  const peopleIds = new Set(people.map(emp => emp.id));
  const shiftsInScope = shifts.filter(s =>
    peopleIds.has(s.empId) &&
    s.shiftDate.startsWith(`${scope.yearMonth}-`),
  );
  const shiftByCell = new Map(shiftsInScope.map(s => [shiftKey(s.empId, s.shiftDate), s]));
  const rows = new Map<number, Cell[]>();
  const merges = [
    `B1:${cellRef(1, 14 + monthDays.length)}`,
    'B2:B3',
  ];

  const spacerCol = 3 + monthDays.length;
  const totalStartCol = spacerCol + 1;
  const totalHeaders = [...TOTAL_CODES, 'Çalışma', 'İzin', 'Toplam'];
  const lastCol = totalStartCol + totalHeaders.length - 1;

  addCell(rows, 1, 0, null, STYLE.title);
  addCell(rows, 1, 1, `${scope.station} / ${scope.dept} - ${monthLabel(scope.yearMonth)} Vardiya Çizelgesi`, STYLE.title);
  addCell(rows, 2, 1, 'Personel', STYLE.personHeader);
  addCell(rows, 3, 1, null, STYLE.personHeader);
  addCell(rows, 2, 2, null, STYLE.dayHeader);
  addCell(rows, 3, 2, null, STYLE.dayHeader);

  monthDays.forEach((day, index) => {
    const col = 3 + index;
    const headerStyle = day.weekend ? STYLE.weekendHeader : STYLE.dayHeader;
    addCell(rows, 2, col, day.wShort.toLocaleUpperCase('tr-TR'), headerStyle);
    addCell(rows, 3, col, day.n, headerStyle);
  });

  addCell(rows, 2, spacerCol, null, STYLE.default);
  addCell(rows, 3, spacerCol, null, STYLE.default);
  totalHeaders.forEach((label, index) => {
    const col = totalStartCol + index;
    merges.push(`${cellRef(2, col)}:${cellRef(3, col)}`);
    addCell(rows, 2, col, label, STYLE.totalHeader);
    addCell(rows, 3, col, null, STYLE.totalHeader);
  });

  const overallCounts = new Map<ShiftCodeKey | 'Çalışma' | 'İzin' | 'Toplam', number>();
  totalHeaders.forEach(label => overallCounts.set(label as ShiftCodeKey, 0));
  const dailyTotals = Array(monthDays.length).fill(0) as number[];

  people.forEach((emp, empIndex) => {
    const row = 4 + empIndex;
    const rowCounts = new Map<ShiftCodeKey | 'Çalışma' | 'İzin' | 'Toplam', number>();
    totalHeaders.forEach(label => rowCounts.set(label as ShiftCodeKey, 0));
    addCell(rows, row, 0, null, STYLE.default);
    addCell(rows, row, 1, emp.name, STYLE.name);
    addCell(rows, row, 2, null, STYLE.default);

    days.forEach((dateStr, dayIndex) => {
      const monthDay = monthDays[dayIndex];
      const shift = isWithinEmployment(emp.startDate, emp.endDate, dateStr)
        ? shiftByCell.get(shiftKey(emp.id, dateStr))
        : undefined;
      const code = shift?.code ?? '';
      if (shift?.code && shift.code !== '-') {
        rowCounts.set(shift.code, (rowCounts.get(shift.code) ?? 0) + 1);
        overallCounts.set(shift.code, (overallCounts.get(shift.code) ?? 0) + 1);
        dailyTotals[dayIndex] += 1;
        if (WORK_TOTAL_CODES.has(shift.code)) {
          rowCounts.set('Çalışma', (rowCounts.get('Çalışma') ?? 0) + 1);
          overallCounts.set('Çalışma', (overallCounts.get('Çalışma') ?? 0) + 1);
        }
        if (OFF_TOTAL_CODES.has(shift.code)) {
          rowCounts.set('İzin', (rowCounts.get('İzin') ?? 0) + 1);
          overallCounts.set('İzin', (overallCounts.get('İzin') ?? 0) + 1);
        }
        rowCounts.set('Toplam', (rowCounts.get('Toplam') ?? 0) + 1);
        overallCounts.set('Toplam', (overallCounts.get('Toplam') ?? 0) + 1);
      }
      const blankStyle = monthDay.weekend ? STYLE.weekendBlank : STYLE.dayBlank;
      addCell(rows, row, 3 + dayIndex, code, CODE_STYLE[shift?.code ?? '-'] ?? blankStyle);
    });

    addCell(rows, row, spacerCol, null, STYLE.default);
    totalHeaders.forEach((label, index) => {
      const style = label === 'Çalışma' || label === 'İzin' || label === 'Toplam'
        ? STYLE.totalStrong
        : STYLE.total;
      addCell(rows, row, totalStartCol + index, rowCounts.get(label as ShiftCodeKey) ?? 0, style);
    });
  });

  const blankRow = 4 + people.length;
  const totalRow = blankRow + 1;
  addCell(rows, blankRow, 0, null, STYLE.default);
  addCell(rows, totalRow, 0, null, STYLE.default);
  addCell(rows, totalRow, 1, 'GENEL TOPLAM', STYLE.grandLabel);
  addCell(rows, totalRow, 2, null, STYLE.grand);
  dailyTotals.forEach((count, index) => {
    addCell(rows, totalRow, 3 + index, count, STYLE.grand);
  });
  addCell(rows, totalRow, spacerCol, null, STYLE.grand);
  totalHeaders.forEach((label, index) => {
    addCell(rows, totalRow, totalStartCol + index, overallCounts.get(label as ShiftCodeKey) ?? 0, STYLE.grand);
  });

  const worksheetXml = buildWorksheetXml({
    cellsByRow: rows,
    merges,
    lastRow: totalRow,
    lastCol,
    dayCount: monthDays.length,
  });
  const cfb = await loadTemplateCfb(XLSX);
  replaceCfbFile(XLSX, cfb, '/xl/worksheets/sheet1.xml', worksheetXml);
  const arrayBuffer = XLSX.CFB.write(cfb, { type: 'array', fileType: 'zip', compression: true });
  const fileName = `vardiya-cizelgesi-${slug(scope.station)}-${slug(scope.dept)}-${scope.yearMonth}.xlsx`;

  downloadBlob(
    new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName,
  );

  return { fileName, employeeCount: people.length, shiftCount: shiftsInScope.length };
}
