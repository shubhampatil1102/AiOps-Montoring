// Minimal, dependency-free CSV export — no XLSX/PDF engine here. Native
// Excel/PDF generation would need a new library dependency (exceljs/jspdf);
// a plain CSV opens correctly in Excel today without adding one.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRowsAsCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  downloadCsv(filename, toCsv(rows, columns));
}
