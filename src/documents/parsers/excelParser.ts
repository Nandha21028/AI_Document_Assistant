import * as XLSX from 'xlsx';
import type { ParsedDocument, ParsedPage, ParseProgressCallback } from './types';

interface ColumnStats {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'id';
  uniqueValues: string[];
  uniqueCount: number;
  valueCounts: Record<string, number>;
  sum?: number;
  avg?: number;
  min?: number | string;
  max?: number | string;
}

interface SheetData {
  sheetName: string;
  headers: string[];
  rows: string[][];
  stats: ColumnStats[];
  summaryText: string;
}

/**
 * Formats a number with Indian/standard comma formatting and optional currency symbol if relevant.
 */
function formatNumber(num: number, isCurrency: boolean = false): string {
  const formatted = num.toLocaleString('en-IN');
  return isCurrency ? `₹${formatted}` : formatted;
}

/**
 * Analyzes columns in a sheet to compute statistical aggregates, unique categories, and numerical totals.
 */
function analyzeSheetColumns(headers: string[], rows: string[][]): ColumnStats[] {
  return headers.map((header, colIdx) => {
    const values = rows.map((row) => row[colIdx]?.trim() ?? '').filter((v) => v.length > 0);
    const uniqueMap = new Map<string, number>();

    let isNumeric = values.length > 0;
    let isDate = values.length > 0;
    let sum = 0;
    let numMin = Infinity;
    let numMax = -Infinity;

    for (const val of values) {
      uniqueMap.set(val, (uniqueMap.get(val) || 0) + 1);

      // Check numeric
      const cleanNum = val.replace(/^[₹$,\s]+/, '').replace(/,/g, '');
      const num = Number(cleanNum);
      if (isNaN(num) || cleanNum === '') {
        isNumeric = false;
      } else {
        sum += num;
        if (num < numMin) numMin = num;
        if (num > numMax) numMax = num;
      }

      // Check date
      if (isDate && isNaN(Date.parse(val))) {
        isDate = false;
      }
    }

    const uniqueValues = Array.from(uniqueMap.keys());
    const valueCounts = Object.fromEntries(uniqueMap);

    const isIdColumn =
      /id|code|sku|key|uuid/i.test(header) || (uniqueValues.length === values.length && values.length > 10);

    if (isNumeric && !isIdColumn) {
      const avg = values.length > 0 ? sum / values.length : 0;
      return {
        name: header,
        type: 'numeric',
        uniqueValues,
        uniqueCount: uniqueValues.length,
        valueCounts,
        sum,
        avg,
        min: numMin,
        max: numMax,
      };
    }

    if (isDate) {
      const sortedDates = [...values].sort();
      return {
        name: header,
        type: 'date',
        uniqueValues,
        uniqueCount: uniqueValues.length,
        valueCounts,
        min: sortedDates[0],
        max: sortedDates[sortedDates.length - 1],
      };
    }

    return {
      name: header,
      type: isIdColumn ? 'id' : 'categorical',
      uniqueValues,
      uniqueCount: uniqueValues.length,
      valueCounts,
    };
  });
}

/**
 * Builds an authoritative statistical summary markdown block for a single spreadsheet sheet.
 */
function buildSheetSummary(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: string[][],
  stats: ColumnStats[],
  totalSheets: number
): string {
  const rowCount = rows.length;
  const sheetHeader = totalSheets > 1 ? ` (Sheet: "${sheetName}")` : '';
  const lines: string[] = [
    `=== SPREADSHEET OVERVIEW & STATISTICAL PROFILE${sheetHeader} ===`,
    `• File Name: ${fileName}`,
    `• Sheet Name: ${sheetName}`,
    `• Total Records / Orders / Rows: ${rowCount}`,
    `• Total Columns: ${headers.length} (${headers.join(', ')})`,
    ``,
    `--- KEY COLUMN SUMMARY & AGGREGATED STATISTICS ---`,
  ];

  for (const col of stats) {
    const isCurrency = /amount|price|cost|sales|revenue|total|fee|balance/i.test(col.name);
    const isQuantity = /qty|quantity|units|count|items|volume/i.test(col.name);

    if (col.type === 'numeric' && col.sum !== undefined) {
      const unit = isQuantity ? ' units' : '';
      const formattedSum = isCurrency ? formatNumber(col.sum, true) : `${formatNumber(col.sum)}${unit}`;
      const rawSum = col.sum;
      const formattedAvg =
        col.avg !== undefined
          ? isCurrency
            ? formatNumber(Math.round(col.avg), true)
            : col.avg.toFixed(2)
          : '';
      const minStr = col.min !== undefined ? (isCurrency ? formatNumber(Number(col.min), true) : col.min) : '';
      const maxStr = col.max !== undefined ? (isCurrency ? formatNumber(Number(col.max), true) : col.max) : '';

      lines.push(
        `• Total ${col.name} across all ${rowCount} records: ${formattedSum} (${rawSum}) [Average: ${formattedAvg}, Min: ${minStr}, Max: ${maxStr}]`
      );
    } else if (col.type === 'categorical') {
      const sortedCategories = Object.entries(col.valueCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([val, count]) => `${val} (${count})`);

      const listStr = col.uniqueValues.sort().join(', ');

      if (col.uniqueCount <= 25) {
        lines.push(`• Represented ${col.name}s (${col.uniqueCount} total unique): ${listStr}`);
        lines.push(`  Distribution: ${sortedCategories.join(', ')}`);
      } else {
        lines.push(`• ${col.name}: ${col.uniqueCount} unique values across ${rowCount} records.`);
      }
    } else if (col.type === 'date') {
      lines.push(`• ${col.name} Range: ${col.min} to ${col.max}`);
    } else if (col.type === 'id') {
      lines.push(`• ${col.name}: ${col.uniqueCount} unique entries (e.g. ${col.uniqueValues.slice(0, 3).join(', ')}...)`);
    }
  }

  lines.push(`==============================================`);
  return lines.join('\n');
}

/**
 * Parses Excel (.xlsx, .xls, .xlsm, .xlsb) documents client-side.
 * Extracts all sheets, computes statistical profiles, and creates header-preserved chunks.
 */
export async function parseExcelDocument(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<ParsedDocument> {
  onProgress?.({
    currentPage: 1,
    totalPages: 1,
    status: `Reading Excel workbook ${file.name}...`,
  });

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const sheetDataList: SheetData[] = [];
  const pages: ParsedPage[] = [];
  let totalDataRows = 0;

  for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
    const sheetName = workbook.SheetNames[sIdx];
    const worksheet = workbook.Sheets[sheetName];

    onProgress?.({
      currentPage: sIdx + 1,
      totalPages: workbook.SheetNames.length,
      status: `Analyzing worksheet "${sheetName}" (${sIdx + 1}/${workbook.SheetNames.length})...`,
    });

    // Convert sheet to array of arrays
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) continue;

    const headers = (rawData[0] || []).map((h) => String(h ?? '').trim()).filter((h) => h.length > 0);
    if (headers.length === 0) continue;

    const rows = rawData.slice(1).map((row) =>
      headers.map((_, colIdx) => {
        const cellVal = row[colIdx];
        if (cellVal instanceof Date) {
          return cellVal.toISOString().split('T')[0];
        }
        return String(cellVal ?? '').trim();
      })
    );

    totalDataRows += rows.length;

    const stats = analyzeSheetColumns(headers, rows);
    const summaryText = buildSheetSummary(
      file.name,
      sheetName,
      headers,
      rows,
      stats,
      workbook.SheetNames.length
    );

    sheetDataList.push({
      sheetName,
      headers,
      rows,
      stats,
      summaryText,
    });
  }

  if (sheetDataList.length === 0 || totalDataRows === 0) {
    throw new Error('No valid tabular data found in the Excel workbook.');
  }

  // Page 1: Comprehensive Workbook Overview (Aggregating all sheets)
  const masterOverviewLines: string[] = [
    `=== WORKBOOK OVERVIEW: ${file.name} ===`,
    `• Total Worksheets: ${sheetDataList.length} (${sheetDataList.map((s) => `"${s.sheetName}" [${s.rows.length} rows]`).join(', ')})`,
    `• Total Combined Records across all sheets: ${totalDataRows}`,
    ``,
  ];

  for (const s of sheetDataList) {
    masterOverviewLines.push(s.summaryText);
    masterOverviewLines.push('');
  }

  const masterOverviewText = masterOverviewLines.join('\n').trim();

  pages.push({
    pageNumber: 1,
    text: masterOverviewText,
  });

  // Pages 2+: Row batches per sheet with header preserved as Markdown Table
  const ROWS_PER_PAGE = 20;

  for (const s of sheetDataList) {
    const tableHeader = `| ${s.headers.join(' | ')} |`;
    const tableSeparator = `| ${s.headers.map(() => '---').join(' | ')} |`;

    for (let i = 0; i < s.rows.length; i += ROWS_PER_PAGE) {
      const slice = s.rows.slice(i, i + ROWS_PER_PAGE);
      const startRow = i + 1;
      const endRow = Math.min(i + ROWS_PER_PAGE, s.rows.length);

      const tableRows = slice.map((r) => `| ${r.join(' | ')} |`);

      const pageContent = [
        `[Spreadsheet: ${file.name} | Sheet: "${s.sheetName}" | Rows ${startRow} to ${endRow} of ${s.rows.length}]`,
        tableHeader,
        tableSeparator,
        ...tableRows,
      ].join('\n');

      pages.push({
        pageNumber: pages.length + 1,
        text: pageContent,
      });
    }
  }

  const fullText = [
    masterOverviewText,
    '',
    ...pages.slice(1).map((p) => p.text),
  ].join('\n\n');

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pageCount: pages.length,
    pages,
    fullText,
  };
}
