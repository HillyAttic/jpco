/**
 * CSV Export Utility
 * Provides functionality to export data to CSV format and trigger browser download
 * Validates Requirements: 10.3
 */

/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert
 * @param headers - Optional custom headers (defaults to object keys)
 * @returns CSV string
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(escapeCSVValue).join(',');

  // Create data rows
  const dataRows = data.map((item) => {
    return csvHeaders
      .map((header) => {
        const value = item[header];
        return escapeCSVValue(formatValue(value));
      })
      .join(',');
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escapes a value for CSV format
 * Handles quotes, commas, and newlines
 */
function escapeCSVValue(value: string): string {
  if (value == null) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Formats a value for CSV export
 * Handles dates, arrays, objects, etc.
 */
function formatValue(value: any): string {
  if (value == null) {
    return '';
  }

  // Handle Date objects
  if (value instanceof Date) {
    // Check if date is valid
    if (isNaN(value.getTime())) {
      return '';
    }
    return value.toISOString();
  }

  // Handle Firestore Timestamp objects
  if (value && typeof value === 'object' && 'toDate' in value) {
    return value.toDate().toISOString();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join('; ');
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Triggers a browser download of CSV data
 * @param csvContent - CSV string content
 * @param filename - Name of the file to download
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data to CSV and triggers download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param headers - Optional custom headers
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  const csvContent = convertToCSV(data, headers);
  const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadCSV(csvContent, fullFilename);
}

/**
 * Generates a timestamped filename
 * @param prefix - Prefix for the filename
 * @returns Filename with timestamp
 */
export function generateTimestampedFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.csv`;
}
