import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Validator, validateData } from './validator.ts';
import { ValidationLevel } from './schemas.js';

vi.mock('./schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Lenient: 'Lenient',
  },
}));

type TestValidationRule = {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean;
  errorMessage?: string;
};

type TestValidationSchema = {
  rules: TestValidationRule[];
  allowUnknownFields?: boolean;
  level: string;
};




  afterEach((): void => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize correctly with provided schema', (): void => {
      expect(validator).toBeDefined();
      const schemaCopy = validator.getSchema();
      expect(schemaCopy).toBeDefined();
      expect(schemaCopy.level).toBe(ValidationLevel.Strict);
      expect(Array.isArray(schemaCopy.rules)).toBe(true);
      expect(schemaCopy.rules.length).toBe(2);
    });

  describe('getSchema', (): void => {
    test('should return a shallow copy of schema', (): void => {
      const originalLevel = validator.getLevel();
      const schemaCopy = validator.getSchema();
      expect(schemaCopy.level).toBe(originalLevel);

      // Mutate the returned copy and ensure validator internal state is not affected
      schemaCopy.level = ValidationLevel.Lenient as string;
      expect(validator.getLevel()).toBe(originalLevel);
    });

  describe('getLevel and setLevel', (): void => {
    test('should get current level and update it via setLevel', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Lenient as unknown as typeof ValidationLevel);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });



      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.errors[0]?.message).toContain("Field 'name' is required");
      expect(result.sanitized).toBeUndefined();
    });


      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

      const resShort = validator.validate(dataTooShort);
      expect(resShort.valid).toBe(false);
      expect(resShort.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);

      const dataTooLong: Record<string, unknown> = { name: 'A'.repeat(11), age: 20 };
      const resLong = validator.validate(dataTooLong);
      expect(resLong.valid).toBe(false);
      expect(resLong.errors.some((e) => e.field === 'name' && e.rule === 'maxLength')).toBe(true);
    });

      const resYoung = validator.validate(tooYoung);
      expect(resYoung.valid).toBe(false);
      expect(resYoung.errors.some((e) => e.field === 'age' && e.rule === 'min')).toBe(true);

      const tooOld: Record<string, unknown> = { name: 'Bob', age: 100 };
      const resOld = validator.validate(tooOld);
      expect(resOld.valid).toBe(false);
      expect(resOld.errors.some((e) => e.field === 'age' && e.rule === 'max')).toBe(true);

      const boundaryOkLow: Record<string, unknown> = { name: 'Bob', age: 18 };
      const resBoundaryLow = validator.validate(boundaryOkLow);
      expect(resBoundaryLow.valid).toBe(true);

      const boundaryOkHigh: Record<string, unknown> = { name: 'Bob', age: 99 };
      const resBoundaryHigh = validator.validate(boundaryOkHigh);
      expect(resBoundaryHigh.valid).toBe(true);
    });


      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
    });

      const v = new Validator(schema as unknown as TestValidationSchema);
      const data: Record<string, unknown> = {
        s: 'hello',
        n: 123,
        b: true,
        arr: [1, 2, 3],
        obj: { key: 'value' },
        mail: 'user@example.com',
        link: 'https://example.com/path',
      };
      const result = v.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toBeDefined();
    });

      const v = new Validator(schema as unknown as TestValidationSchema);
      const data: Record<string, unknown> = {
        mail: 'not-an-email',
        link: 'ht!tp:/invalid-url',
      };
      const result = v.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'mail' && e.rule === 'type')).toBe(true);
      expect(result.errors.some((e) => e.field === 'link' && e.rule === 'type')).toBe(true);
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const bad: Record<string, unknown> = { code: 'abc-123' };
      const resBad = v.validate(bad);
      expect(resBad.valid).toBe(false);
      expect(resBad.errors[0]?.rule).toBe('pattern');
      expect(resBad.errors[0]?.message).toBe('Invalid code format');

      const good: Record<string, unknown> = { code: 'ABC-123' };
      const resGood = v.validate(good);
      expect(resGood.valid).toBe(true);
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ value: 3 });
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.rule).toBe('custom');
      expect(res.errors[0]?.message).toBe('Value must be even');
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ value: 'x' });
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.rule).toBe('custom_error');
      expect(res.errors[0]?.message).toContain('Custom validator threw error: Boom');
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ known: 'ok', extra: 123 });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
      expect(res.sanitized).toBeUndefined();
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ known: 'ok', another: 'field' });
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.some((w) => w.includes("Unknown field 'another'"))).toBe(true);
      expect(res.sanitized).toBeDefined();
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ known: 'ok', extra: 'ignored' });
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(0);
    });

      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ items: [1, 2], meta: { a: 1 } });
      expect(res.valid).toBe(true);
    });

      expect(res.valid).toBe(false);
      expect(res.sanitized).toBeUndefined();
    });

      expect(ok.valid).toBe(true);
      expect(ok.errors).toEqual([]);
      expect(ok.sanitized).toBeDefined();

      const bad = validateData({ title: 'Hi', count: 0 }, schema as unknown as TestValidationSchema);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.field === 'title' && e.rule === 'minLength')).toBe(true);
      expect(bad.errors.some((e) => e.field === 'count' && e.rule === 'min')).toBe(true);
    });
