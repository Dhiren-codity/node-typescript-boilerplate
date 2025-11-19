import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Ambient module declaration to satisfy type-only imports in validator.ts
declare module './schemas.js' {
  export type ValidationRule = {
    field: string;
    type:
      | 'string'
      | 'number'
      | 'boolean'
      | 'array'
      | 'object'
      | 'email'
      | 'url';
    required?: boolean;
    errorMessage?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    customValidator?: (value: unknown) => boolean;
  };

  export type ValidationError = {
    field: string;
    value: unknown;
    message: string;
    rule: string;
  };

  export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    sanitized?: Record<string, unknown>;
  };

  export type ValidationSchema = {
    rules: ValidationRule[];
    allowUnknownFields?: boolean;
    level: ValidationLevel;
  };

  export const ValidationLevel: {
    Strict: 'Strict';
    Relaxed: 'Relaxed';
  };
}

// Mock the dependency used by the class under test
vi.mock('./schemas.js', (): Record<string, unknown> => {
  const ValidationLevel = {
    Strict: 'Strict',
    Relaxed: 'Relaxed',
  } as const;

  return {
    ValidationLevel,
  };
});

import { Validator, validateData } from './validator.ts';
import { ValidationLevel } from './schemas.js';

describe('Validator', (): void => {
  let validator: Validator;

  beforeEach((): void => {
    validator = new Validator({
      level: ValidationLevel.Strict,
      allowUnknownFields: false,
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 20 },
        { field: 'age', type: 'number', required: true, min: 1, max: 120 },
        { field: 'email', type: 'email' },
        { field: 'website', type: 'url' },
      ],
    });
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema', (): void => {
      const schema = validator.getSchema();
      expect(schema).toBeDefined();
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('getLevel and setLevel', (): void => {
    test('should get and set validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Relaxed);
      expect(validator.getLevel()).toBe(ValidationLevel.Relaxed);
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy of the schema', (): void => {
      const schema1 = validator.getSchema();
      const schema2 = validator.getSchema();
      expect(schema1).not.toBe(schema2);
      // ensure changing returned copy does not mutate internal schema
      (schema1 as { level: string }).level = 'Changed';
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('validate', (): void => {
    test('should validate and sanitize correct data', (): void => {
      const result = validator.validate({
        name: '  Alice  ',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toEqual({
        name: 'Alice', // trimmed
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
      });
    });

    test('should not convert number from string due to type validation', (): void => {
      const result = validator.validate({
        name: 'Bob',
        age: '42', // type mismatch
      } as unknown as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      // should include at least age type error and name passes
      const ageTypeError = result.errors.find((e) => e.field === 'age' && e.rule === 'type');
      expect(ageTypeError).toBeDefined();
    });

    test('should error on missing required fields', (): void => {
      const result = validator.validate({
        name: 'X',
      });

      expect(result.valid).toBe(false);
      const requiredError = result.errors.find((e) => e.rule === 'required' && e.field === 'age');
      expect(requiredError).toBeDefined();
      expect(result.sanitized).toBeUndefined();
    });

    test('should collect type errors for multiple fields with custom error message precedence', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          { field: 'title', type: 'string' },
          { field: 'count', type: 'number', errorMessage: 'Count must be a number' },
          { field: 'flag', type: 'boolean' },
          { field: 'items', type: 'array' },
          { field: 'meta', type: 'object' },
          { field: 'workEmail', type: 'email' },
          { field: 'homepage', type: 'url' },
        ],
      });

      const result = v.validate({
        title: 123,
        count: '12',
        flag: 'true',
        items: {},
        meta: [],
        workEmail: 'not-an-email',
        homepage: 'not a url',
      } as unknown as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(7);

      const countError = result.errors.find((e) => e.field === 'count');
      expect(countError?.message).toBe('Count must be a number');

      for (const field of ['title', 'flag', 'items', 'meta', 'workEmail', 'homepage']) {
        const err = result.errors.find((e) => e.field === field);
        expect(err?.rule).toBe('type');
      }
    });

    test('should enforce string length constraints', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          { field: 'short', type: 'string', minLength: 5 },
          { field: 'long', type: 'string', maxLength: 3 },
        ],
      });

      const result = v.validate({
        short: 'abc',
        long: 'abcd',
      });

      expect(result.valid).toBe(false);
      const minLenErr = result.errors.find((e) => e.field === 'short' && e.rule === 'minLength');
      const maxLenErr = result.errors.find((e) => e.field === 'long' && e.rule === 'maxLength');
      expect(minLenErr).toBeDefined();
      expect(maxLenErr).toBeDefined();
    });

    test('should enforce number range constraints', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          { field: 'low', type: 'number', min: 5 },
          { field: 'high', type: 'number', max: 7 },
        ],
      });

      const result = v.validate({
        low: 1,
        high: 10,
      });

      expect(result.valid).toBe(false);
      const minErr = result.errors.find((e) => e.field === 'low' && e.rule === 'min');
      const maxErr = result.errors.find((e) => e.field === 'high' && e.rule === 'max');
      expect(minErr).toBeDefined();
      expect(maxErr).toBeDefined();
    });

    test('should validate pattern and use custom pattern message', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          {
            field: 'code',
            type: 'string',
            pattern: /^[A-Z]{3}$/,
            errorMessage: 'Code must be 3 uppercase letters',
          },
        ],
      });

      const result = v.validate({ code: 'ab1' });
      expect(result.valid).toBe(false);
      const patternErr = result.errors.find((e) => e.field === 'code' && e.rule === 'pattern');
      expect(patternErr?.message).toBe('Code must be 3 uppercase letters');
    });

    test('should collect custom validator failure', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          {
            field: 'even',
            type: 'number',
            customValidator: (value: unknown): boolean => typeof value === 'number' && value % 2 === 0,
          },
        ],
      });

      const result = v.validate({ even: 3 });
      expect(result.valid).toBe(false);
      const customErr = result.errors.find((e) => e.field === 'even' && e.rule === 'custom');
      expect(customErr).toBeDefined();
    });

    test('should report custom validator thrown error', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          {
            field: 'boom',
            type: 'string',
            customValidator: (_v: unknown): boolean => {
              throw new Error('Explosion');
            },
          },
        ],
      });

      const result = v.validate({ boom: 'data' });
      expect(result.valid).toBe(false);
      const customErr = result.errors.find((e) => e.field === 'boom' && e.rule === 'custom_error');
      expect(customErr?.message).toContain('Explosion');
    });

    test('should produce error for unknown fields in Strict level when not allowed', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [{ field: 'known', type: 'string' }],
      });

      const result = v.validate({ known: 'ok', unknown: 'nope' });
      expect(result.valid).toBe(false);
      const unknownErr = result.errors.find((e) => e.rule === 'unknown_field' && e.field === 'unknown');
      expect(unknownErr).toBeDefined();
      expect(result.warnings.length).toBe(0);
    });

    test('should produce warning for unknown fields in Relaxed level when not allowed', (): void => {
      const v = new Validator({
        level: ValidationLevel.Relaxed,
        allowUnknownFields: false,
        rules: [{ field: 'known', type: 'string' }],
      });

      const result = v.validate({ known: 'ok', unknown: 'nope' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings[0]).toContain("Unknown field 'unknown'");
      expect(result.sanitized).toEqual({ known: 'ok' });
    });

    test('should ignore unknown fields completely when allowUnknownFields is true', (): void => {
      const v = new Validator({
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [{ field: 'known', type: 'string' }],
      });

      const result = v.validate({ known: ' ok ', extra: 123 });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toEqual({ known: 'ok' });
    });
  });

  describe('validateData helper', (): void => {
    test('should return same result as Validator.validate', (): void => {
      const schema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [{ field: 'x', type: 'number', min: 0 }],
      };
      const data = { x: 5 };

      const direct = new Validator(schema).validate(data);
      const helper = validateData(data, schema);

      expect(helper.valid).toBe(direct.valid);
      expect(helper.errors).toEqual(direct.errors);
      expect(helper.warnings).toEqual(direct.warnings);
      expect(helper.sanitized).toEqual(direct.sanitized);
    });

    test('should surface errors from helper when validation fails', (): void => {
      const schema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [{ field: 'x', type: 'number', min: 10 }],
      };
      const data = { x: 5 };

      const helper = validateData(data, schema);
      expect(helper.valid).toBe(false);
      const minError = helper.errors.find((e) => e.field === 'x' && e.rule === 'min');
      expect(minError).toBeDefined();
      expect(helper.sanitized).toBeUndefined();
    });
  });
});
