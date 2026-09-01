import fs from 'fs';
import * as XLSX from 'xlsx';

// 1. Read the CSV dataset
const csvText = fs.readFileSync('scripts/tricky_orders_rag_dataset.csv', 'utf8');
const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
const rawRows = lines.map((l) => l.split(','));

// 2. Create an Excel workbook with 2 worksheets (Orders and SummarySheet)
const wb = XLSX.utils.book_new();

// Sheet 1: Orders (60 rows)
const ws1 = XLSX.utils.aoa_to_sheet(rawRows);
XLSX.utils.book_append_sheet(wb, ws1, 'Orders');

// Sheet 2: CustomerInfo
const ws2Data = [
  ['Customer', 'Tier', 'City'],
  ['Arun', 'Platinum', 'Chennai'],
  ['Priya', 'Gold', 'Bangalore'],
  ['Meena', 'Silver', 'Hyderabad'],
  ['Rahul', 'Platinum', 'Mumbai'],
  ['Karthik', 'Gold', 'Delhi'],
];
const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
XLSX.utils.book_append_sheet(wb, ws2, 'Customers');

// 3. Write out to scripts/tricky_orders_rag_dataset.xlsx
const outPath = 'scripts/tricky_orders_rag_dataset.xlsx';
XLSX.writeFile(wb, outPath);
console.log('Successfully created test Excel workbook at:', outPath);
