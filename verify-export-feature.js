// Quick verification script for export feature
const fs = require('fs');
const path = require('path');

console.log('Verifying Reports Export Feature Implementation...\n');

const filesToCheck = [
  'src/utils/report-export.utils.ts',
  'src/components/reports/ReportsView.tsx',
  'REPORTS_EXPORT_FEATURE.md',
  'REPORTS_EXPORT_QUICK_TEST.md'
];

let allFilesExist = true;

filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n--- Checking Key Imports ---');

// Check if ReportsView has the export imports
const reportsViewContent = fs.readFileSync('src/components/reports/ReportsView.tsx', 'utf8');
const hasExportImports = reportsViewContent.includes('exportToPDF') && 
                         reportsViewContent.includes('exportToExcel') &&
                         reportsViewContent.includes('ArrowDownTrayIcon');
console.log(`${hasExportImports ? '✓' : '✗'} ReportsView has export imports`);

// Check if export utility has required functions
const exportUtilContent = fs.readFileSync('src/utils/report-export.utils.ts', 'utf8');
const hasExportFunctions = exportUtilContent.includes('export function exportToPDF') &&
                           exportUtilContent.includes('export function exportToExcel') &&
                           exportUtilContent.includes('export function exportSummaryToPDF') &&
                           exportUtilContent.includes('export function exportSummaryToExcel');
console.log(`${hasExportFunctions ? '✓' : '✗'} Export utility has all required functions`);

// Check if ReportsView has export buttons
const hasExportButtons = reportsViewContent.includes('handleExportPDF') &&
                        reportsViewContent.includes('handleExportExcel') &&
                        reportsViewContent.includes('Export Summary');
console.log(`${hasExportButtons ? '✓' : '✗'} ReportsView has export button handlers`);

console.log('\n--- Summary ---');
if (allFilesExist && hasExportImports && hasExportFunctions && hasExportButtons) {
  console.log('✓ All export feature files and code are in place!');
  console.log('\nNext steps:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. Navigate to http://localhost:3000/reports');
  console.log('3. Test the export buttons');
  process.exit(0);
} else {
  console.log('✗ Some files or code are missing');
  process.exit(1);
}
