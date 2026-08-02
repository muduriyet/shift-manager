import type { Employee, Shift, ShiftCodeKey } from '../types';
import { SHIFT_CODES, buildMonthDays, dateToStr, isWithinEmployment, isEmployedInRange, monthBounds } from '../constants';

// Aşağıdaki sabitler şablonu YAZARKEN kullanılan düzendir. Okuma tarafı bunlara
// bağlı değildir: dosyanın düzeni detectLayout ile tespit edilir; böylece şablon
// düzeni değişse ya da kullanıcı başa kolon/satır eklese bile import çalışır.
const NAME_COL = 1;      // B
const FIRST_DAY_COL = 3; // D
const DAY_NAME_ROW = 0;  // 1
const DAY_NUM_ROW = 1;   // 2
const FIRST_EMP_ROW = 3; // 4
const DAY_SHORTS = ['PT', 'S', 'Ç', 'P', 'C', 'CT', 'P'];

// Gün numarası satırını tanımak için aranan asgari ardışık gün sayısı (1,2,3…).
const MIN_DAY_RUN = 5;
// Başlık/düzen araması yalnızca dosyanın başında yapılır.
const LAYOUT_SCAN_ROWS = 25;

type ImportCode = Exclude<ShiftCodeKey, 'Öz' | '-'>;
// 'Öz' parse aşamasında geçerlidir ama oluşturulamaz (saatleri Excel temsil edemez);
// import'ta o hücre mevcut kaydı korur — bkz buildPlanFromRows döngüsü.
type ParsedCode = ImportCode | 'Öz';

export interface ScheduleImportScope {
  station: string;
  dept: string;
  yearMonth: string;
}

export interface ScheduleImportInvalidCode {
  row: number;
  col: number;
  cell: string;
  value: string;
}

export interface ScheduleImportMatchedRow {
  excelName: string;
  employee: Employee;
}

export interface ScheduleImportAction {
  kind: 'create' | 'update' | 'delete';
  emp: Employee;
  dateStr: string;
  existing?: Shift;
  code?: ImportCode;
  statusPreserved?: boolean;
}

export interface ScheduleImportPlan {
  scope: ScheduleImportScope;
  days: string[];
  actions: ScheduleImportAction[];
  matchedRows: ScheduleImportMatchedRow[];
  unmatchedNames: string[];
  duplicateExcelNames: string[];
  duplicateScheduleNames: string[];
  emptyScheduleNameEmployees: Employee[];
  invalidCodes: ScheduleImportInvalidCode[];
  formatErrors: string[];
  warnings: string[];
  existingCount: number;
  statusPreservedCount: number;
  resetStatusCount: number;
  summary: {
    create: number;
    update: number;
    delete: number;
    skippedNames: number;
  };
  canApply: boolean;
}

export interface ScheduleImportApplyResult {
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  statusPreserved: number;
  resetToPlanned: number;
  skippedNames: string[];
  errors: string[];
}

interface ParsedExcelRow {
  excelName: string;
  normalizedName: string;
  codes: Array<ParsedCode | null>;
}

function daysForMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number);
  return buildMonthDays(year, month - 1).map(d =>
    dateToStr(new Date(year, month - 1, d.n)),
  );
}

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function normalizeScheduleName(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('tr-TR');
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
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

// Okunan sayfanın düzeni. Sabit kolon/satır varsaymak yerine dosyadan tespit
// edilir; kullanıcının başa kolon eklemesi ya da Excel'in boş kolonları
// dimension'dan düşürmesi import'u bozmaz.
interface SheetLayout {
  dayNumRow: number;
  firstDayCol: number;
  nameCol: number;
  firstEmpRow: number;
}

// Gün numarası satırı: içinde 1,2,3… diye ardışık giden bir dizi bulunan satır.
// Dönen firstDayCol, "1"in bulunduğu kolondur.
function findDayNumberRow(rows: unknown[][]): { row: number; col: number } | null {
  const scanTo = Math.min(rows.length, LAYOUT_SCAN_ROWS);
  for (let r = 0; r < scanTo; r += 1) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c += 1) {
      if (cellText(row[c]) !== '1') continue;
      let run = 1;
      while (cellText(row[c + run]) === String(run + 1)) run += 1;
      if (run >= MIN_DAY_RUN) return { row: r, col: c };
    }
  }
  return null;
}

// İsim kolonu: gün kolonlarının solunda kalan, altındaki satırlarda en çok metin
// içeren kolon. Şablonda A ve C boş, B isimli olduğu için B seçilir.
function findNameColumn(rows: unknown[][], dayNumRow: number, firstDayCol: number): number | null {
  let bestCol = -1;
  let bestCount = 0;
  for (let c = 0; c < firstDayCol; c += 1) {
    let count = 0;
    for (let r = dayNumRow + 1; r < rows.length; r += 1) {
      if (cellText(rows[r]?.[c])) count += 1;
    }
    // Eşitlikte gün kolonlarına en yakın olan kazanır (isim sütunu genelde bitişiktir).
    if (count > 0 && count >= bestCount) { bestCount = count; bestCol = c; }
  }
  return bestCol >= 0 ? bestCol : null;
}

function detectLayout(rows: unknown[][]): SheetLayout | null {
  const day = findDayNumberRow(rows);
  if (!day) return null;
  const nameCol = findNameColumn(rows, day.row, day.col);
  if (nameCol === null) return null;
  let firstEmpRow = -1;
  for (let r = day.row + 1; r < rows.length; r += 1) {
    if (cellText(rows[r]?.[nameCol])) { firstEmpRow = r; break; }
  }
  if (firstEmpRow < 0) return null;
  return { dayNumRow: day.row, firstDayCol: day.col, nameCol, firstEmpRow };
}

function normalizeCode(value: unknown): ParsedCode | null | 'INVALID' {
  const text = cellText(value);
  if (!text) return null;
  const normalized = normalizeScheduleName(text);
  const byCode = new Map<string, ParsedCode>(
    (['S', 'Ö', 'G', 'Öz', 'İ', 'Yİ', 'Üİ', 'İs'] as ParsedCode[]).map(code => [
      normalizeScheduleName(code),
      code,
    ]),
  );
  return byCode.get(normalized) ?? 'INVALID';
}

function shiftStartEnd(code: ImportCode): { start: string; end: string } {
  const def = SHIFT_CODES[code];
  return { start: def.start ?? '', end: def.end ?? '' };
}

function scopedEmployees(employees: Employee[], scope: ScheduleImportScope): Employee[] {
  // Şablon ve import planı, çizelgeyle aynı personel kümesi üzerinden çalışır:
  // aralığı seçili ayla kesişmeyen personel her iki tarafta da yer almaz.
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

function scopedMonthShifts(
  shifts: Shift[],
  employees: Employee[],
  scope: ScheduleImportScope,
): Shift[] {
  const ids = new Set(scopedEmployees(employees, scope).map(e => e.id));
  return shifts.filter(s => ids.has(s.empId) && s.shiftDate.startsWith(`${scope.yearMonth}-`));
}

export async function downloadScheduleTemplate(options: {
  employees: Employee[];
  shifts: Shift[];
  scope: ScheduleImportScope;
}): Promise<void> {
  const XLSX = await import('xlsx');
  const { employees, shifts, scope } = options;
  const [year, month] = scope.yearMonth.split('-').map(Number);
  const monthDays = buildMonthDays(year, month - 1);
  const days = daysForMonth(scope.yearMonth);
  const people = scopedEmployees(employees, scope);
  const shiftByCell = new Map(
    scopedMonthShifts(shifts, employees, scope).map(s => [shiftKey(s.empId, s.shiftDate), s]),
  );

  const rows: Array<Array<string | number | null>> = [];
  rows[DAY_NAME_ROW] = [null, null, null, ...monthDays.map(d => DAY_SHORTS[d.wIdx])];
  rows[DAY_NUM_ROW] = [null, null, null, ...monthDays.map(d => d.n)];
  rows[2] = [];

  people.forEach((emp, index) => {
    rows[FIRST_EMP_ROW + index] = [
      null,
      emp.scheduleName,
      null,
      ...days.map(dateStr => {
        if (!isWithinEmployment(emp.startDate, emp.endDate, dateStr)) return '';
        return shiftByCell.get(shiftKey(emp.id, dateStr))?.code ?? '';
      }),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 3 },
    { wch: 18 },
    { wch: 3 },
    ...monthDays.map(() => ({ wch: 4 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Çizelge');
  XLSX.writeFile(
    wb,
    `vardiya-sablon-${slug(scope.station)}-${slug(scope.dept)}-${monthLabel(scope.yearMonth)}.xlsx`,
  );
}

// sheet_to_json satır dizilerini !ref'in BAŞLANGIÇ KOLONUNA göre indeksler,
// A kolonuna göre değil. Şablonun A kolonu tamamen boş olduğu için (isimler B,
// günler D'den başlar) Excel dosyayı kaydederken boş kolonu dimension'dan
// düşürür ve !ref B1'e kayar; o andan itibaren tüm diziler bir kolon sola
// kayarak okunur — isim kolonu boş görünür, 1. gün yerine 2. gün okunur.
// Aralığı A1'den başlamaya zorlayarak indeksleri mutlak hale getiriyoruz.
function sheetToAbsoluteRows(
  XLSX: typeof import('xlsx'),
  sheet: import('xlsx').WorkSheet,
): unknown[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  range.s.c = 0;
  range.s.r = 0;
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: false, range });
}

export async function buildScheduleImportPlan(options: {
  file: File;
  employees: Employee[];
  shifts: Shift[];
  scope: ScheduleImportScope;
}): Promise<ScheduleImportPlan> {
  const XLSX = await import('xlsx');
  const bytes = await options.file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
  const rows = sheet ? sheetToAbsoluteRows(XLSX, sheet) : [];

  return buildPlanFromRows(rows, options);
}

function buildPlanFromRows(
  rows: unknown[][],
  options: {
    employees: Employee[];
    shifts: Shift[];
    scope: ScheduleImportScope;
  },
): ScheduleImportPlan {
  const { employees, shifts, scope } = options;
  const days = daysForMonth(scope.yearMonth);
  const people = scopedEmployees(employees, scope);
  const warnings: string[] = [];
  const formatErrors: string[] = [];
  const invalidCodes: ScheduleImportInvalidCode[] = [];
  const parsedRows: ParsedExcelRow[] = [];

  if (!rows.length) {
    formatErrors.push('Excel dosyasında okunabilir sayfa bulunamadı.');
  }

  // Kolon/satır konumları dosyadan tespit edilir, sabit varsayılmaz.
  const layout = rows.length ? detectLayout(rows) : null;

  if (rows.length && !layout) {
    formatErrors.push(
      'Çizelge düzeni tanınamadı: gün numaralarının (1, 2, 3…) bulunduğu satır ' +
      've solunda personel isimlerinin olduğu kolon bulunamadı. Şablonu indirip ' +
      'gün başlıklarını ve isim kolonunu koruyarak doldurun.',
    );
  }

  if (layout) {
    const { dayNumRow, firstDayCol, nameCol, firstEmpRow } = layout;
    const dayRowLabel = dayNumRow + 1;

    for (let dayIdx = 0; dayIdx < days.length; dayIdx += 1) {
      const expected = String(dayIdx + 1);
      const actual = cellText(rows[dayNumRow]?.[firstDayCol + dayIdx]);
      if (actual !== expected) {
        formatErrors.push(`${colName(firstDayCol + dayIdx)}${dayRowLabel} hücresinde ${expected} bekleniyordu, ${actual || 'boş'} bulundu.`);
        break;
      }
    }

    const extraDay = cellText(rows[dayNumRow]?.[firstDayCol + days.length]);
    if (extraDay) {
      warnings.push(`Seçili ay ${days.length} gün; ${colName(firstDayCol + days.length)}${dayRowLabel} ve sonrası yok sayılacak.`);
    }

    for (let rowIdx = firstEmpRow; rowIdx < rows.length; rowIdx += 1) {
      const excelName = cellText(rows[rowIdx]?.[nameCol]);
      if (!excelName) continue;
      const codes: Array<ParsedCode | null> = [];
      for (let dayIdx = 0; dayIdx < days.length; dayIdx += 1) {
        const raw = rows[rowIdx]?.[firstDayCol + dayIdx];
        const code = normalizeCode(raw);
        if (code === 'INVALID') {
          invalidCodes.push({
            row: rowIdx + 1,
            col: firstDayCol + dayIdx + 1,
            cell: `${colName(firstDayCol + dayIdx)}${rowIdx + 1}`,
            value: cellText(raw),
          });
          codes.push(null);
        } else {
          codes.push(code);
        }
      }
      parsedRows.push({ excelName, normalizedName: normalizeScheduleName(excelName), codes });
    }

    if (!parsedRows.length) {
      formatErrors.push(`${colName(nameCol)}${firstEmpRow + 1} kolonundan başlayan personel isimleri bulunamadı.`);
    }
  }

  const excelNameMap = new Map<string, string[]>();
  parsedRows.forEach(row => {
    excelNameMap.set(row.normalizedName, [...(excelNameMap.get(row.normalizedName) ?? []), row.excelName]);
  });
  const duplicateExcelNames = [...excelNameMap.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([name, names]) => `${name}: ${names.join(', ')}`);

  const emptyScheduleNameEmployees = people.filter(e => !normalizeScheduleName(e.scheduleName));
  const scheduleNameMap = new Map<string, Employee[]>();
  people.forEach(emp => {
    const key = normalizeScheduleName(emp.scheduleName);
    if (!key) return;
    scheduleNameMap.set(key, [...(scheduleNameMap.get(key) ?? []), emp]);
  });

  const duplicateScheduleNames = [...scheduleNameMap.entries()]
    .filter(([, emps]) => emps.length > 1)
    .map(([name, emps]) => `${name}: ${emps.map(e => e.name).join(', ')}`);

  const matchedRows: ScheduleImportMatchedRow[] = [];
  const unmatchedNames: string[] = [];
  const desiredByEmployee = new Map<number, ParsedExcelRow>();

  parsedRows.forEach(row => {
    const matches = scheduleNameMap.get(row.normalizedName) ?? [];
    if (matches.length === 1) {
      matchedRows.push({ excelName: row.excelName, employee: matches[0] });
      desiredByEmployee.set(matches[0].id, row);
    } else if (matches.length === 0) {
      unmatchedNames.push(row.excelName);
    }
  });

  const existingShifts = scopedMonthShifts(shifts, employees, scope);
  const existingByCell = new Map(existingShifts.map(s => [shiftKey(s.empId, s.shiftDate), s]));
  const actions: ScheduleImportAction[] = [];
  let statusPreservedCount = 0;
  let resetStatusCount = 0;
  let ozPreservedCount = 0;

  people.forEach(emp => {
    const desiredRow = desiredByEmployee.get(emp.id);
    days.forEach((dateStr, dayIdx) => {
      if (!isWithinEmployment(emp.startDate, emp.endDate, dateStr)) return;
      const existing = existingByCell.get(shiftKey(emp.id, dateStr));
      const desiredCode = desiredRow?.codes[dayIdx] ?? null;

      if (desiredCode === 'Öz') {
        // Serbest saatli hücre: Excel saatleri temsil edemez → mevcut kayıt korunur.
        if (existing) ozPreservedCount += 1;
        return;
      }

      if (!desiredCode) {
        if (existing) actions.push({ kind: 'delete', emp, dateStr, existing });
        return;
      }

      if (!existing) {
        actions.push({ kind: 'create', emp, dateStr, code: desiredCode });
        return;
      }

      if (existing.code === desiredCode) {
        statusPreservedCount += 1;
        return;
      }

      resetStatusCount += 1;
      actions.push({ kind: 'update', emp, dateStr, existing, code: desiredCode });
    });
  });

  if (ozPreservedCount > 0) {
    warnings.push(`${ozPreservedCount} özel (Öz) hücre korundu — serbest saatli vardiyalar Excel üzerinden değiştirilmez.`);
  }

  const summary = {
    create: actions.filter(a => a.kind === 'create').length,
    update: actions.filter(a => a.kind === 'update').length,
    delete: actions.filter(a => a.kind === 'delete').length,
    skippedNames: unmatchedNames.length,
  };
  const canApply =
    formatErrors.length === 0 &&
    invalidCodes.length === 0 &&
    duplicateExcelNames.length === 0 &&
    duplicateScheduleNames.length === 0 &&
    emptyScheduleNameEmployees.length === 0;

  return {
    scope,
    days,
    actions,
    matchedRows,
    unmatchedNames,
    duplicateExcelNames,
    duplicateScheduleNames,
    emptyScheduleNameEmployees,
    invalidCodes,
    formatErrors,
    warnings,
    existingCount: existingShifts.length,
    statusPreservedCount,
    resetStatusCount,
    summary,
    canApply,
  };
}

export function actionPayload(action: ScheduleImportAction): {
  start: string;
  end: string;
  code: ImportCode;
} {
  if (!action.code) throw new Error('Import aksiyonu için vardiya kodu eksik.');
  return { ...shiftStartEnd(action.code), code: action.code };
}

function slug(value: string): string {
  return normalizeScheduleName(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ığüşöçİĞÜŞÖÇ]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'secim';
}
