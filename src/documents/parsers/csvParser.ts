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

/**
 * Robust CSV line splitter that respects quoted values containing commas or escaped quotes.
 */
function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Formats a number with Indian/standard comma formatting and optional currency symbol if relevant.
 */
function formatNumber(num: number, isCurrency: boolean = false): string {
  const formatted = num.toLocaleString('en-IN');
  return isCurrency ? `₹${formatted}` : formatted;
}

/**
 * Analyzes CSV columns to compute statistical aggregates, unique categories, and numerical totals.
 */
function analyzeColumns(headers: string[], rows: string[][]): ColumnStats[] {
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
 * Builds an authoritative statistical summary markdown block for the dataset.
 */
function buildDatasetSummary(fileName: string, headers: string[], rows: string[][], stats: ColumnStats[]): string {
  const rowCount = rows.length;
  const lines: string[] = [
    `=== DATASET OVERVIEW & STATISTICAL PROFILE ===`,
    `• File Name: ${fileName}`,
    `• Total Records / Orders / Rows: ${rowCount}`,
    `• Total Columns: ${headers.length} (${headers.join(', ')})`,
    ``,
    `--- KEY COLUMN SUMMARY & AGGREGATED STATISTICS ---`,
  ];

  for (const col of stats) {
    const isCurrency = /amount|price|cost|sales|revenue|total/i.test(col.name);
    const isQuantity = /qty|quantity|units|count|items/i.test(col.name);

    if (col.type === 'numeric' && col.sum !== undefined) {
      const unit = isQuantity ? ' units' : '';
      const formattedSum = isCurrency ? formatNumber(col.sum, true) : `${formatNumber(col.sum)}${unit}`;
      const rawSum = col.sum;
      const formattedAvg = col.avg !== undefined ? (isCurrency ? formatNumber(Math.round(col.avg), true) : col.avg.toFixed(2)) : '';
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
 * Parses CSV/TSV documents client-side and creates an enriched overview profile + header-preserved pages.
 */
export async function parseCsvDocument(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<ParsedDocument> {
  onProgress?.({
    currentPage: 1,
    totalPages: 1,
    status: `Parsing CSV file ${file.name}...`,
  });

  const rawText = await file.text();
  const trimmed = rawText.trim();

  if (trimmed.length === 0) {
    throw new Error('The uploaded CSV document is empty.');
  }

  // Detect delimiter: comma vs tab vs semicolon
  const firstLine = trimmed.split('\n')[0] || '';
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  // Split lines
  const rawLines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    throw new Error('No valid data lines found in CSV.');
  }

  const headers = parseCsvLine(rawLines[0], delimiter);
  const rows = rawLines.slice(1).map((line) => parseCsvLine(line, delimiter));

  onProgress?.({
    currentPage: 1,
    totalPages: 1,
    status: `Analyzing ${rows.length} rows and ${headers.length} columns...`,
  });

  // Calculate statistics and profiling
  const stats = analyzeColumns(headers, rows);
  const summaryProfile = buildDatasetSummary(file.name, headers, rows, stats);

  const pages: ParsedPage[] = [];

  // Page 1: Comprehensive Statistical Summary & Dataset Profile
  pages.push({
    pageNumber: 1,
    text: summaryProfile,
  });

  // Pages 2+: Chunk rows preserving CSV header as Markdown Table (e.g., 20 rows per logical page)
  const ROWS_PER_PAGE = 20;
  const tableHeader = `| ${headers.join(' | ')} |`;
  const tableSeparator = `| ${headers.map(() => '---').join(' | ')} |`;

  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    const slice = rows.slice(i, i + ROWS_PER_PAGE);
    const startRow = i + 1;
    const endRow = Math.min(i + ROWS_PER_PAGE, rows.length);

    const tableRows = slice.map((r) => `| ${r.join(' | ')} |`);

    const pageContent = [
      `[Dataset: ${file.name} | Rows ${startRow} to ${endRow} of ${rows.length}]`,
      tableHeader,
      tableSeparator,
      ...tableRows,
    ].join('\n');

    pages.push({
      pageNumber: pages.length + 1,
      text: pageContent,
    });
  }

  const fullText = [summaryProfile, '', ...rawLines].join('\n');

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || 'text/csv',
    pageCount: pages.length,
    pages,
    fullText,
  };
}
