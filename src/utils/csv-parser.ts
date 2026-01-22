/**
 * CSV Parser Utility
 * Handles parsing CSV files for bulk import
 */

export interface ParsedCSVResult<T> {
  data: T[];
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parse CSV file content
 */
export function parseCSV<T = any>(csvContent: string): ParsedCSVResult<T> {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: Array<{ row: number; error: string }> = [];
  const data: T[] = [];

  if (lines.length === 0) {
    return { data, errors: [{ row: 0, error: 'CSV file is empty' }] };
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  if (headers.length === 0) {
    return { data, errors: [{ row: 0, error: 'No headers found in CSV' }] };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      
      if (values.length === 0) continue; // Skip empty lines
      
      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        row[header] = value;
      });
      
      data.push(row as T);
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Failed to parse row',
      });
    }
  }

  return { data, errors };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
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
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else if (char === '\t' && !inQuotes) {
      // Tab separator (for TSV)
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Convert CSV data to typed objects
 */
export function convertCSVToObjects<T>(
  csvData: any[],
  fieldMapping: Record<string, keyof T>
): T[] {
  return csvData.map(row => {
    const obj: any = {};
    
    Object.entries(fieldMapping).forEach(([csvField, objField]) => {
      const value = row[csvField];
      if (value !== undefined && value !== null && value !== '') {
        obj[objField] = value;
      }
    });
    
    return obj as T;
  });
}

/**
 * Validate required fields in CSV data
 */
export function validateCSVData(
  data: any[],
  requiredFields: string[]
): Array<{ row: number; field: string; error: string }> {
  const errors: Array<{ row: number; field: string; error: string }> = [];

  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push({
          row: index + 1,
          field,
          error: `Required field '${field}' is missing or empty`,
        });
      }
    });
  });

  return errors;
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
