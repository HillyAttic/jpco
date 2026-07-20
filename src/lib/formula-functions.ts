/**
 * Excel-like Formula Functions Library
 * Implements common spreadsheet functions for salary formula calculations
 */

// ── Helper Functions ──────────────────────────────────────────────────────────

/** Convert arguments to array of numbers */
function toNumbers(args: any[]): number[] {
  return args.flat(Infinity).filter((v) => typeof v === 'number' && !isNaN(v));
}

/** Convert arguments to array of strings */
function toStrings(args: any[]): string[] {
  return args.flat(Infinity).filter((v) => typeof v === 'string');
}

// ── Logical Functions ─────────────────────────────────────────────────────────

/** IF: Conditional test */
export function IF(condition: boolean, trueValue: any, falseValue: any): any {
  return condition ? trueValue : falseValue;
}

/** IFS: Multiple conditions */
export function IFS(...args: any[]): any {
  for (let i = 0; i < args.length - 1; i += 2) {
    if (args[i]) return args[i + 1];
  }
  return args[args.length - 1]; // Default value if provided
}

/** AND: All conditions true */
export function AND(...args: any[]): boolean {
  return args.every((v) => !!v);
}

/** OR: Any condition true */
export function OR(...args: any[]): boolean {
  return args.some((v) => !!v);
}

/** NOT: Reverses TRUE/FALSE */
export function NOT(value: boolean): boolean {
  return !value;
}

/** IFERROR: Handles errors */
export function IFERROR(value: any, defaultValue: any): any {
  try {
    const result = typeof value === 'function' ? value() : value;
    return result == null || isNaN(result) ? defaultValue : result;
  } catch {
    return defaultValue;
  }
}

// ── Math Functions ────────────────────────────────────────────────────────────

/** SUM: Adds numbers */
export function SUM(...args: any[]): number {
  return toNumbers(args).reduce((sum, n) => sum + n, 0);
}

/** AVERAGE: Calculates average */
export function AVERAGE(...args: any[]): number {
  const numbers = toNumbers(args);
  if (numbers.length === 0) return 0;
  return SUM(numbers) / numbers.length;
}

/** MIN: Smallest value */
export function MIN(...args: any[]): number {
  return Math.min(...toNumbers(args));
}

/** MAX: Largest value */
export function MAX(...args: any[]): number {
  return Math.max(...toNumbers(args));
}

/** COUNT: Counts cells with numbers */
export function COUNT(...args: any[]): number {
  return toNumbers(args).length;
}

/** COUNTA: Counts non-empty cells */
export function COUNTA(...args: any[]): number {
  return args.flat(Infinity).filter((v) => v !== null && v !== undefined && v !== '').length;
}

/** COUNTBLANK: Counts blank cells */
export function COUNTBLANK(...args: any[]): number {
  return args.flat(Infinity).filter((v) => v === null || v === undefined || v === '').length;
}

/** PRODUCT: Multiplies numbers */
export function PRODUCT(...args: any[]): number {
  return toNumbers(args).reduce((product, n) => product * n, 1);
}

/** ABS: Absolute value */
export function ABS(value: number): number {
  return Math.abs(value);
}

/** ROUND: Rounds to specified decimals */
export function ROUND(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals || 0);
  return Math.round(value * factor) / factor;
}

/** ROUNDUP: Rounds up */
export function ROUNDUP(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals || 0);
  return Math.ceil(value * factor) / factor;
}

/** ROUNDDOWN: Rounds down */
export function ROUNDDOWN(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals || 0);
  return Math.floor(value * factor) / factor;
}

/** CEILING: Rounds up to nearest multiple */
export function CEILING(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

/** FLOOR: Rounds down to nearest multiple */
export function FLOOR(value: number, multiple: number): number {
  return Math.floor(value / multiple) * multiple;
}

/** MOD: Remainder */
export function MOD(dividend: number, divisor: number): number {
  return dividend % divisor;
}

/** INT: Integer part */
export function INT(value: number): number {
  return Math.floor(value);
}

/** SQRT: Square root */
export function SQRT(value: number): number {
  return Math.sqrt(value);
}

/** POWER: Raises to a power */
export function POWER(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

/** RAND: Random decimal between 0 and 1 */
export function RAND(): number {
  return Math.random();
}

/** RANDBETWEEN: Random integer between min and max */
export function RANDBETWEEN(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Text Functions ────────────────────────────────────────────────────────────

/** CONCAT: Combines text */
export function CONCAT(...args: any[]): string {
  return args.flat(Infinity).filter((v) => v != null).join('');
}

/** TEXTJOIN: Joins with separator */
export function TEXTJOIN(separator: string, ignoreEmpty: boolean, ...args: any[]): string {
  const values = args.flat(Infinity);
  const filtered = ignoreEmpty ? values.filter((v) => v != null && v !== '') : values;
  return filtered.join(separator);
}

/** LEFT: First characters */
export function LEFT(text: string, numChars: number): string {
  return String(text).substring(0, numChars);
}

/** RIGHT: Last characters */
export function RIGHT(text: string, numChars: number): string {
  return String(text).slice(-numChars);
}

/** MID: Extracts text */
export function MID(text: string, startNum: number, numChars: number): string {
  return String(text).substring(startNum - 1, startNum - 1 + numChars);
}

/** LEN: Length of text */
export function LEN(text: string): number {
  return String(text).length;
}

/** TRIM: Removes extra spaces */
export function TRIM(text: string): string {
  return String(text).replace(/\s+/g, ' ').trim();
}

/** UPPER: Uppercase */
export function UPPER(text: string): string {
  return String(text).toUpperCase();
}

/** LOWER: Lowercase */
export function LOWER(text: string): string {
  return String(text).toLowerCase();
}

/** PROPER: Proper case */
export function PROPER(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** REPLACE: Replaces characters */
export function REPLACE(text: string, startNum: number, numChars: number, newText: string): string {
  const str = String(text);
  return str.substring(0, startNum - 1) + newText + str.substring(startNum - 1 + numChars);
}

/** SUBSTITUTE: Replaces text */
export function SUBSTITUTE(text: string, oldText: string, newText: string, instanceNum?: number): string {
  const str = String(text);
  if (!instanceNum) return str.split(oldText).join(newText);
  const parts = str.split(oldText);
  if (instanceNum > parts.length - 1) return str;
  parts[instanceNum] = parts[instanceNum] + newText + parts[instanceNum + 1];
  return parts.slice(0, instanceNum).join(oldText) + parts.slice(instanceNum).join(oldText);
}

/** FIND: Finds text (case-sensitive) */
export function FIND(findText: string, withinText: string, startNum?: number): number {
  return String(withinText).indexOf(findText, (startNum || 1) - 1) + 1;
}

/** SEARCH: Finds text (not case-sensitive) */
export function SEARCH(findText: string, withinText: string, startNum?: number): number {
  return String(withinText).toLowerCase().indexOf(String(findText).toLowerCase(), (startNum || 1) - 1) + 1;
}

/** TEXT: Formats number as text */
export function TEXT(value: number, formatText: string): string {
  // Basic implementation - can be extended for specific formats
  if (formatText.includes('₹') || formatText.includes('#')) {
    return '₹' + value.toLocaleString('en-IN');
  }
  return String(value);
}

// ── Date Functions ────────────────────────────────────────────────────────────

/** TODAY: Current date */
export function TODAY(): Date {
  return new Date();
}

/** NOW: Current date & time */
export function NOW(): Date {
  return new Date();
}

/** DATE: Creates a date */
export function DATE(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** YEAR: Extracts year */
export function YEAR(date: Date | string): number {
  const d = new Date(date);
  return d.getFullYear();
}

/** MONTH: Extracts month */
export function MONTH(date: Date | string): number {
  const d = new Date(date);
  return d.getMonth() + 1;
}

/** DAY: Extracts day */
export function DAY(date: Date | string): number {
  const d = new Date(date);
  return d.getDate();
}

/** WEEKDAY: Day of week (1=Sunday, 7=Saturday) */
export function WEEKDAY(date: Date | string): number {
  const d = new Date(date);
  return d.getDay() + 1;
}

/** EDATE: Adds months */
export function EDATE(startDate: Date | string, months: number): Date {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** DATEDIF: Difference in years/months/days */
export function DATEDIF(startDate: Date | string, endDate: Date | string, unit: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  switch (unit.toUpperCase()) {
    case 'Y':
      return end.getFullYear() - start.getFullYear();
    case 'M':
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    case 'D':
      return diffDays;
    default:
      return diffDays;
  }
}

/** NETWORKDAYS: Working days between dates */
export function NETWORKDAYS(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/** WORKDAY: Date after working days */
export function WORKDAY(startDate: Date | string, days: number): Date {
  const start = new Date(startDate);
  const result = new Date(start);
  let count = 0;
  const direction = days >= 0 ? 1 : -1;
  const absDays = Math.abs(days);

  while (count < absDays) {
    result.setDate(result.getDate() + direction);
    const day = result.getDay();
    if (day !== 0 && day !== 6) count++;
  }

  return result;
}

// ── Statistical Functions ─────────────────────────────────────────────────────

/** MEDIAN: Middle value */
export function MEDIAN(...args: any[]): number {
  const numbers = toNumbers(args).sort((a, b) => a - b);
  const mid = Math.floor(numbers.length / 2);
  return numbers.length % 2 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
}

/** MODE: Most frequent value */
export function MODE(...args: any[]): number {
  const numbers = toNumbers(args);
  const counts: Record<number, number> = {};
  numbers.forEach((n) => (counts[n] = (counts[n] || 0) + 1));
  const keys = Object.keys(counts).map(Number);
  return keys.reduce((a, b) => (counts[a] > counts[b] ? a : b), keys[0]);
}

/** LARGE: nth largest value */
export function LARGE(...args: any[]): number {
  const numbers = args.flat(Infinity).filter((v) => typeof v === 'number');
  const n = numbers.pop() as number;
  return numbers.sort((a, b) => b - a)[n - 1];
}

/** SMALL: nth smallest value */
export function SMALL(...args: any[]): number {
  const numbers = args.flat(Infinity).filter((v) => typeof v === 'number');
  const n = numbers.pop() as number;
  return numbers.sort((a, b) => a - b)[n - 1];
}

/** RANK: Rank of a value */
export function RANK(value: number, array: any[], order?: number): number {
  const numbers = array.filter((v) => typeof v === 'number');
  const sorted = order === 1 ? [...numbers].sort((a, b) => a - b) : [...numbers].sort((a, b) => b - a);
  return sorted.indexOf(value) + 1;
}

/** PERCENTILE: Percentile value */
export function PERCENTILE(array: any[], k: number): number {
  const numbers = array.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  const index = k * (numbers.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return numbers[lower];
  return numbers[lower] + (index - lower) * (numbers[upper] - numbers[lower]);
}

/** STDEV: Standard deviation */
export function STDEV(...args: any[]): number {
  const numbers = toNumbers(args);
  const avg = AVERAGE(numbers);
  const squaredDiffs = numbers.map((n) => Math.pow(n - avg, 2));
  return Math.sqrt(AVERAGE(squaredDiffs));
}

/** VAR: Variance */
export function VAR(...args: any[]): number {
  const numbers = toNumbers(args);
  const avg = AVERAGE(numbers);
  const squaredDiffs = numbers.map((n) => Math.pow(n - avg, 2));
  return AVERAGE(squaredDiffs);
}

// ── Conditional Functions ─────────────────────────────────────────────────────

/** SUMIF: Conditional sum */
export function SUMIF(range: any[], criteria: string, sumRange?: any[]): number {
  let sum = 0;
  const values = sumRange || range;

  range.forEach((value, index) => {
    if (evaluateCriteria(value, criteria)) {
      const sumValue = sumRange ? sumRange[index] : value;
      if (typeof sumValue === 'number') sum += sumValue;
    }
  });

  return sum;
}

/** SUMIFS: Multiple conditions sum */
export function SUMIFS(sumRange: any[], ...args: any[]): number {
  const criteriaRanges = args.slice(0, args.length / 2);
  const criterias = args.slice(args.length / 2);

  return sumRange.reduce((sum, value, index) => {
    const matches = criteriaRanges.every((range, i) => evaluateCriteria(range[index], criterias[i]));
    return matches && typeof value === 'number' ? sum + value : sum;
  }, 0);
}

/** COUNTIF: Conditional count */
export function COUNTIF(range: any[], criteria: string): number {
  return range.filter((value) => evaluateCriteria(value, criteria)).length;
}

/** COUNTIFS: Multiple conditions count */
export function COUNTIFS(...args: any[]): number {
  const criteriaRanges = args.slice(0, args.length / 2);
  const criterias = args.slice(args.length / 2);
  const length = criteriaRanges[0]?.length || 0;

  let count = 0;
  for (let i = 0; i < length; i++) {
    const matches = criteriaRanges.every((range, j) => evaluateCriteria(range[i], criterias[j]));
    if (matches) count++;
  }

  return count;
}

/** AVERAGEIF: Conditional average */
export function AVERAGEIF(range: any[], criteria: string, averageRange?: any[]): number {
  let sum = 0;
  let count = 0;
  const values = averageRange || range;

  range.forEach((value, index) => {
    if (evaluateCriteria(value, criteria)) {
      const avgValue = averageRange ? averageRange[index] : value;
      if (typeof avgValue === 'number') {
        sum += avgValue;
        count++;
      }
    }
  });

  return count > 0 ? sum / count : 0;
}

/** AVERAGEIFS: Multiple conditions average */
export function AVERAGEIFS(averageRange: any[], ...args: any[]): number {
  const criteriaRanges = args.slice(0, args.length / 2);
  const criterias = args.slice(args.length / 2);

  let sum = 0;
  let count = 0;

  averageRange.forEach((value, index) => {
    const matches = criteriaRanges.every((range, i) => evaluateCriteria(range[index], criterias[i]));
    if (matches && typeof value === 'number') {
      sum += value;
      count++;
    }
  });

  return count > 0 ? sum / count : 0;
}

// ── Criteria Evaluation Helper ────────────────────────────────────────────────

function evaluateCriteria(value: any, criteria: string): boolean {
  if (criteria.startsWith('>=')) return value >= parseFloat(criteria.slice(2));
  if (criteria.startsWith('<=')) return value <= parseFloat(criteria.slice(2));
  if (criteria.startsWith('>')) return value > parseFloat(criteria.slice(1));
  if (criteria.startsWith('<')) return value < parseFloat(criteria.slice(1));
  if (criteria.startsWith('<>')) return value != criteria.slice(2);
  return value == criteria;
}
