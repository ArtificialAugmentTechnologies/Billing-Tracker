import type { Response } from 'express';

export type Cell = string | number | null;

export interface ExportTable {
  filename: string;
  sheet: string;
  columns: string[];
  rows: Cell[][];
}

/** Tells Excel the file is UTF-8, so the rupee sign and names display correctly. */
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/**
 * Text starting with these can run as a formula when opened in a spreadsheet, and client names
 * and references are typed in by users, so it's stored as plain text instead.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

const safeText = (value: string) => (FORMULA_START.test(value) ? `'${value}` : value);

function csvCell(value: Cell) {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  const text = safeText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function sendCsv(res: Response, table: ExportTable) {
  const lines = [table.columns, ...table.rows].map((row) => row.map(csvCell).join(','));
  res
    .attachment(`${table.filename}.csv`)
    .type('text/csv; charset=utf-8')
    .send(`${BYTE_ORDER_MARK}${lines.join('\r\n')}\r\n`);
}

export async function sendExcel(res: Response, table: ExportTable) {
  // Loaded on first use, as it adds many seconds to every server start.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(table.sheet);

  sheet.columns = table.columns.map((header) => ({ header, width: 18 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of table.rows) {
    sheet.addRow(row.map((cell) => (typeof cell === 'string' ? safeText(cell) : cell)));
  }
  sheet.columns.forEach((column, index) => {
    if (table.rows.some((row) => typeof row[index] === 'number' && !Number.isInteger(row[index]))) {
      column.numFmt = '#,##0.00';
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res
    .attachment(`${table.filename}.xlsx`)
    .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .send(Buffer.from(buffer));
}

export async function sendTable(res: Response, format: 'csv' | 'xlsx', table: ExportTable) {
  if (format === 'xlsx') await sendExcel(res, table);
  else sendCsv(res, table);
}
