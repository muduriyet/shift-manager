type ExcelRow = Record<string, string | number | boolean | null | undefined>;

interface ExportRowsToExcelOptions {
  rows: ExcelRow[];
  sheetName: string;
  fileName: string;
}

export async function exportRowsToExcel({
  rows,
  sheetName,
  fileName,
}: ExportRowsToExcelOptions): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}
