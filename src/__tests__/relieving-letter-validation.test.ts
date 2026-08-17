/**
 * Relieving Letter Validation Tests
 */

import {
  validateRequiredFields,
  validateDateRelationships,
  relievingLetterSchema,
  relievingLetterSettingsSchema,
} from '@/lib/relieving-letter-validation';

import {
  parseLetterNumber,
  isValidLetterNumberFormat,
} from '@/lib/relieving-letter-format';

import { RelievingLetter } from '@/types/relieving-letter.types';

function createValidLetterInput(overrides?: Partial<RelievingLetter>): RelievingLetter {
  return {
    letterNumber: 'RL-2026-001',
    employeeId: 'emp-001',
    employeeName: 'John Doe',
    employeeDesignation: 'Software Engineer',
    employeeDepartment: 'Engineering',
    dateOfJoining: '2024-01-15',
    dateOfLeaving: '2026-07-31',
    issueDate: '2026-08-12',
    companyName: 'Acme Corp',
    signatoryName: 'Jane Smith',
    signatoryDesignation: 'HR Manager',
    accessGranted: true,
    createdBy: 'admin-001',
    ...overrides,
  };
}

describe('validateRequiredFields', () => {
  it('should return valid for a complete letter input', () => {
    const data = createValidLetterInput();
    const result = validateRequiredFields(data);
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('should detect missing employeeName', () => {
    const result = validateRequiredFields(createValidLetterInput({ employeeName: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Employee Name');
  });

  it('should detect missing designation', () => {
    const result = validateRequiredFields(createValidLetterInput({ employeeDesignation: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Designation');
  });

  it('should detect missing department', () => {
    const result = validateRequiredFields(createValidLetterInput({ employeeDepartment: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Department');
  });

  it('should detect missing dateOfJoining', () => {
    const result = validateRequiredFields(createValidLetterInput({ dateOfJoining: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Date of Joining');
  });

  it('should detect missing dateOfLeaving', () => {
    const result = validateRequiredFields(createValidLetterInput({ dateOfLeaving: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Date of Leaving');
  });

  it('should detect missing issueDate', () => {
    const result = validateRequiredFields(createValidLetterInput({ issueDate: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Issue Date');
  });

  it('should detect missing companyName', () => {
    const result = validateRequiredFields(createValidLetterInput({ companyName: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Company Name');
  });

  it('should detect missing signatoryName', () => {
    const result = validateRequiredFields(createValidLetterInput({ signatoryName: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Signatory Name');
  });

  it('should detect missing signatoryDesignation', () => {
    const result = validateRequiredFields(createValidLetterInput({ signatoryDesignation: '' }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Signatory Designation');
  });

  it('should detect multiple missing fields', () => {
    const result = validateRequiredFields(
      createValidLetterInput({ employeeName: '', dateOfJoining: '', companyName: '' })
    );
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toHaveLength(3);
  });

  it('should treat undefined values as missing', () => {
    const result = validateRequiredFields(
      createValidLetterInput({ employeeName: undefined as any })
    );
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Employee Name');
  });

  it('should treat null values as missing', () => {
    const result = validateRequiredFields(
      createValidLetterInput({ companyName: null as any })
    );
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Company Name');
  });
});

describe('validateDateRelationships', () => {
  it('should accept valid date relationship', () => {
    const result = validateDateRelationships('2024-01-15', '2026-07-31', '2026-08-07');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept equal joining and leaving dates', () => {
    expect(validateDateRelationships('2026-08-01', '2026-08-01', '2026-08-07').isValid).toBe(true);
  });

  it('should accept equal leaving and issue dates', () => {
    expect(validateDateRelationships('2024-01-15', '2026-08-07', '2026-08-07').isValid).toBe(true);
  });

  it('should accept all three dates equal', () => {
    expect(validateDateRelationships('2026-08-07', '2026-08-07', '2026-08-07').isValid).toBe(true);
  });

  it('should reject joining date after leaving date', () => {
    const result = validateDateRelationships('2026-08-07', '2024-01-15', '2026-08-12');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Date of joining must be on or before date of leaving');
  });

  it('should reject issue date before leaving date', () => {
    const result = validateDateRelationships('2024-01-15', '2026-08-12', '2026-08-07');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Issue date must be on or after date of leaving');
  });

  it('should reject invalid joining date', () => {
    const result = validateDateRelationships('invalid-date', '2026-07-31', '2026-08-07');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid date of joining');
  });

  it('should reject invalid leaving date', () => {
    const result = validateDateRelationships('2024-01-15', 'not-a-date', '2026-08-07');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid date of leaving');
  });

  it('should reject invalid issue date', () => {
    const result = validateDateRelationships('2024-01-15', '2026-07-31', 'not-a-date');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid issue date');
  });
});

describe('relievingLetterSchema', () => {
  it('should validate a complete valid letter', () => {
    expect(relievingLetterSchema.safeParse(createValidLetterInput()).success).toBe(true);
  });

  it('should reject missing required fields', () => {
    expect(relievingLetterSchema.safeParse(createValidLetterInput({ employeeName: '' })).success).toBe(false);
  });

  it('should reject invalid date format', () => {
    expect(relievingLetterSchema.safeParse(createValidLetterInput({ dateOfJoining: '15-01-2024' })).success).toBe(false);
  });

  it('should reject joining > leaving', () => {
    const data = createValidLetterInput({ dateOfJoining: '2026-08-07', dateOfLeaving: '2024-01-15' });
    expect(relievingLetterSchema.safeParse(data).success).toBe(false);
  });

  it('should reject issue before leaving', () => {
    const data = createValidLetterInput({ issueDate: '2026-07-01', dateOfLeaving: '2026-08-07' });
    expect(relievingLetterSchema.safeParse(data).success).toBe(false);
  });

  it('should reject missing companyName', () => {
    const data = createValidLetterInput({ companyName: '' });
    expect(relievingLetterSchema.safeParse(data).success).toBe(false);
  });
});

describe('relievingLetterSettingsSchema', () => {
  const validSettings = {
    companyName: 'Acme Corp',
    companyAddress: '123 Main St',
    defaultSignatoryName: 'Jane Smith',
    defaultSignatoryDesignation: 'HR Manager',
  };

  it('should validate valid settings', () => {
    expect(relievingLetterSettingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it('should reject missing companyName', () => {
    const { companyName, ...rest } = validSettings;
    expect(relievingLetterSettingsSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing companyAddress', () => {
    const { companyAddress, ...rest } = validSettings;
    expect(relievingLetterSettingsSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing signatoryName', () => {
    const { defaultSignatoryName, ...rest } = validSettings;
    expect(relievingLetterSettingsSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing signatoryDesignation', () => {
    const { defaultSignatoryDesignation, ...rest } = validSettings;
    expect(relievingLetterSettingsSchema.safeParse(rest).success).toBe(false);
  });
});

describe('isValidLetterNumberFormat', () => {
  it('should accept RL-2026-001', () => {
    expect(isValidLetterNumberFormat('RL-2026-001')).toBe(true);
  });

  it('should accept RL-2026-999', () => {
    expect(isValidLetterNumberFormat('RL-2026-999')).toBe(true);
  });

  it('should accept RL-2024-001', () => {
    expect(isValidLetterNumberFormat('RL-2024-001')).toBe(true);
  });

  it('should reject without RL prefix', () => {
    expect(isValidLetterNumberFormat('2026-001')).toBe(false);
  });

  it('should reject wrong prefix', () => {
    expect(isValidLetterNumberFormat('SL-2026-001')).toBe(false);
  });

  it('should reject 2-digit sequence', () => {
    expect(isValidLetterNumberFormat('RL-2026-01')).toBe(false);
  });

  it('should reject lowercase', () => {
    expect(isValidLetterNumberFormat('rl-2026-001')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidLetterNumberFormat('')).toBe(false);
  });
});

describe('parseLetterNumber', () => {
  it('should parse RL-2026-001', () => {
    expect(parseLetterNumber('RL-2026-001')).toEqual({ year: 2026, sequence: 1 });
  });

  it('should parse RL-2026-015', () => {
    expect(parseLetterNumber('RL-2026-015')).toEqual({ year: 2026, sequence: 15 });
  });

  it('should parse RL-2026-999', () => {
    expect(parseLetterNumber('RL-2026-999')).toEqual({ year: 2026, sequence: 999 });
  });

  it('should return null for invalid format', () => {
    expect(parseLetterNumber('invalid')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseLetterNumber('')).toBeNull();
  });
});
