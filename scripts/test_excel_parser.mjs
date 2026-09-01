import fs from 'fs';
import * as XLSX from 'xlsx';

// Simulate parseExcelDocument logic
const buffer = fs.readFileSync('scripts/tricky_orders_rag_dataset.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

console.log('Worksheets:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });
  const headers = rawData[0];
  const rows = rawData.slice(1);

  console.log(`\n--- Sheet: "${sheetName}" ---`);
  console.log('Headers:', headers);
  console.log('Row Count:', rows.length);

  if (sheetName === 'Orders') {
    const customers = new Set(rows.map((r) => r[1]));
    const products = new Set(rows.map((r) => r[2]));
    const totalQty = rows.reduce((acc, r) => acc + Number(r[3]), 0);
    const totalAmount = rows.reduce((acc, r) => acc + Number(r[4]), 0);

    console.log(`Customers (${customers.size}):`, Array.from(customers).sort().join(', '));
    console.log(`Products (${products.size}):`, Array.from(products).sort().join(', '));
    console.log('Total Quantity:', totalQty, 'units');
    console.log('Total Amount:', totalAmount, `(₹${totalAmount.toLocaleString('en-IN')})`);
  }
}
