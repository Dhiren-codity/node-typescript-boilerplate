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

describe('Validator', (): void => {
  let defaultSchema: TestValidationSchema;
  let validator: Validator;

  beforeEach((): void => {
    defaultSchema = {
      level: ValidationLevel.Strict as string,
      allowUnknownFields: false,
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
        { field: 'age', type: 'number', required: true, min: 18, max: 99 },
      ],
    };
    validator = new Validator(defaultSchema as unknown as TestValidationSchema);
  });



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
  });

  describe('getLevel and setLevel', (): void => {
    test('should get current level and update it via setLevel', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Lenient as unknown as typeof ValidationLevel);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });

  describe('validate', (): void => {
    test('should validate correct data and sanitize string values by trimming', (): void => {
      const data: Record<string, unknown> = {
        name: '  Alice  ',
        age: 30,
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).name).toBe('Alice');
      expect((result.sanitized as Record<string, unknown>).age).toBe(30);
    });

    test('should report required error when field is missing', (): void => {
      const data: Record<string, unknown> = {
        age: 20,
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.errors[0]?.message).toContain("Field 'name' is required");
      expect(result.sanitized).toBeUndefined();
    });

    test('should report required error when field is null', (): void => {
      const data: Record<string, unknown> = {
        name: null,
        age: 25,
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce string length constraints', (): void => {
      const dataTooShort: Record<string, unknown> = { name: 'A', age: 20 };
      const resShort = validator.validate(dataTooShort);
      expect(resShort.valid).toBe(false);
      expect(resShort.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);

      const dataTooLong: Record<string, unknown> = { name: 'A'.repeat(11), age: 20 };
      const resLong = validator.validate(dataTooLong);
      expect(resLong.valid).toBe(false);
      expect(resLong.errors.some((e) => e.field === 'name' && e.rule === 'maxLength')).toBe(true);
    });

    test('should enforce number range constraints including boundaries', (): void => {
      const tooYoung: Record<string, unknown> = { name: 'Bob', age: 17 };
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

    test('should fail type validation for number when value is a string number', (): void => {
      const data: Record<string, unknown> = {
        name: 'Carl',
        age: '42',
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should treat NaN as invalid number type', (): void => {
      const data: Record<string, unknown> = {
        name: 'Dora',
        age: Number.NaN,
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
    });

    test('should validate all supported types via switch in validateType', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          { field: 's', type: 'string', required: true },
          { field: 'n', type: 'number', required: true },
          { field: 'b', type: 'boolean', required: true },
          { field: 'arr', type: 'array', required: true },
          { field: 'obj', type: 'object', required: true },
          { field: 'mail', type: 'email', required: true },
          { field: 'link', type: 'url', required: true },
        ],
      };
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

    test('should fail email and url type validations with descriptive errors', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          { field: 'mail', type: 'email', required: true },
          { field: 'link', type: 'url', required: true },
        ],
      };
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

    test('should apply pattern validation and use custom error message if provided', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            pattern: /^[A-Z]{3}-\d{3}$/,
            errorMessage: 'Invalid code format',
          },
        ],
      };
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

    test('should handle custom validator returning false', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          {
            field: 'value',
            type: 'number',
            required: true,
            customValidator: (val: unknown): boolean => (typeof val === 'number' ? val % 2 === 0 : false),
            errorMessage: 'Value must be even',
          },
        ],
      };
      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ value: 3 });
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.rule).toBe('custom');
      expect(res.errors[0]?.message).toBe('Value must be even');
    });

    test('should handle custom validator throwing an error (exception handling)', (): void => {
      const thrown = new Error('Boom');
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          {
            field: 'value',
            type: 'string',
            required: true,
            customValidator: (_val: unknown): boolean => {
              throw thrown;
            },
          },
        ],
      };
      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ value: 'x' });
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.rule).toBe('custom_error');
      expect(res.errors[0]?.message).toContain('Custom validator threw error: Boom');
    });

    test('should produce errors for unknown fields when strict and allowUnknownFields is false', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [{ field: 'known', type: 'string', required: true }],
      };
      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ known: 'ok', extra: 123 });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
      expect(res.sanitized).toBeUndefined();
    });

    test('should produce warnings (not errors) for unknown fields when level is lenient', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Lenient as string,
        allowUnknownFields: false,
        rules: [{ field: 'known', type: 'string', required: true }],
      };
      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ known: 'ok', another: 'field' });
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.some((w) => w.includes("Unknown field 'another'"))).toBe(true);
      expect(res.sanitized).toBeDefined();
    });

    test('should ignore unknown fields when allowUnknownFields is true', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: true,
        rules: [{ field: 'known', type: 'string', required: true }],
      };
      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ known: 'ok', extra: 'ignored' });
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(0);
    });

    test('should validate array and object types', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          { field: 'items', type: 'array', required: true },
          { field: 'meta', type: 'object', required: true },
        ],
      };
      const v = new Validator(schema as unknown as TestValidationSchema);

      const res = v.validate({ items: [1, 2], meta: { a: 1 } });
      expect(res.valid).toBe(true);
    });

    test('should not produce sanitized output when any error exists', (): void => {
      const res = validator.validate({ name: 'OK', age: 10 });
      expect(res.valid).toBe(false);
      expect(res.sanitized).toBeUndefined();
    });
  });

  describe('validateData helper', (): void => {
    test('should validate data using helper function and return consistent result', (): void => {
      const schema: TestValidationSchema = {
        level: ValidationLevel.Strict as string,
        allowUnknownFields: false,
        rules: [
          { field: 'title', type: 'string', required: true, minLength: 3 },
          { field: 'count', type: 'number', required: true, min: 1 },
        ],
      };

      const ok = validateData({ title: 'Hello', count: 1 }, schema as unknown as TestValidationSchema);
      expect(ok.valid).toBe(true);
      expect(ok.errors).toEqual([]);
      expect(ok.sanitized).toBeDefined();

      const bad = validateData({ title: 'Hi', count: 0 }, schema as unknown as TestValidationSchema);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.field === 'title' && e.rule === 'minLength')).toBe(true);
      expect(bad.errors.some((e) => e.field === 'count' && e.rule === 'min')).toBe(true);
    });
  });
});
