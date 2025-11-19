import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Validator, validateData } from './validator.js';
import { ValidationLevel } from './schemas.js';

vi.mock('./schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'strict',
    Lenient: 'lenient',
  },
}));

describe('Validator', (): void => {
  let validator: Validator;
  let schema: {
    rules: Array<Record<string, unknown>>;
    allowUnknownFields: boolean;
    level: unknown;
  };

  beforeEach((): void => {
    schema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 3, maxLength: 10 },
        { field: 'age', type: 'number', min: 18, max: 99 },
        { field: 'email', type: 'email' },
        { field: 'website', type: 'url' },
        { field: 'tags', type: 'array' },
        { field: 'settings', type: 'object' },
        { field: 'active', type: 'boolean' },
      ],
      allowUnknownFields: true,
      level: (ValidationLevel as Record<string, unknown>).Strict,
    };
    validator = new Validator(schema as unknown as Record<string, unknown>);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize correctly with given schema', (): void => {
      expect(validator).toBeDefined();
      const s = validator.getSchema();
      expect(s).toBeDefined();
      expect(Array.isArray(s.rules)).toBe(true);
      expect(s.level).toBe((ValidationLevel as Record<string, unknown>).Strict);
    });
  });

  describe('getLevel / setLevel', (): void => {
    test('should return and update validation level', (): void => {
      expect(validator.getLevel()).toBe((ValidationLevel as Record<string, unknown>).Strict);
      validator.setLevel((ValidationLevel as Record<string, unknown>).Lenient as unknown as never);
      expect(validator.getLevel()).toBe((ValidationLevel as Record<string, unknown>).Lenient);
    });
  });

  describe('validate', (): void => {
    test('should validate required field presence and type', (): void => {
      const result = validator.validate({
        // name missing - required
        age: 25,
        email: 'user@example.com',
        website: 'https://example.com',
        tags: ['a'],
        settings: { theme: 'dark' },
        active: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'required' }),
        ]),
      );
      expect(result.sanitized).toBeUndefined();
    });

    test('should treat null as missing for required fields', (): void => {
      const result = validator.validate({
        name: null,
      } as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'required' }),
        ]),
      );
    });

    test('should fail on type mismatch with correct error', (): void => {
      const result = validator.validate({
        name: 'John',
        age: '30', // wrong type
      } as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'type' }),
        ]),
      );
    });

    test('should validate string length constraints', (): void => {
      const tooShort = validator.validate({ name: 'Al' });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'minLength' }),
        ]),
      );

      const tooLong = validator.validate({ name: 'A very long name' });
      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'maxLength' }),
        ]),
      );

      const ok = validator.validate({ name: 'Alice' });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);
      expect(ok.sanitized).toBeDefined();
    });

    test('should validate number range constraints (min/max)', (): void => {
      const below = validator.validate({ name: 'Bob', age: 10 });
      expect(below.valid).toBe(false);
      expect(below.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'min' }),
        ]),
      );

      const above = validator.validate({ name: 'Bob', age: 120 });
      expect(above.valid).toBe(false);
      expect(above.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'max' }),
        ]),
      );

      const ok = validator.validate({ name: 'Bob', age: 30 });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);
    });

    test('should validate pattern rules', (): void => {
      const patternSchema = {
        ...schema,
        rules: [
          { field: 'code', type: 'string', pattern: /^[A-Z]{3}-\d{4}$/ },
        ],
      };
      const patternValidator = new Validator(patternSchema as unknown as Record<string, unknown>);

      const bad = patternValidator.validate({ code: 'abc-1234' });
      expect(bad.valid).toBe(false);
      expect(bad.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'code', rule: 'pattern' }),
        ]),
      );

      const good = patternValidator.validate({ code: 'ABC-1234' });
      expect(good.valid).toBe(true);
      expect(good.errors).toHaveLength(0);
    });

    test('should use custom errorMessage when provided for type or pattern', (): void => {
      const customSchema = {
        ...schema,
        rules: [
          { field: 'zip', type: 'string', pattern: /^\d{5}$/, errorMessage: 'Invalid ZIP' },
        ],
      };
      const v = new Validator(customSchema as unknown as Record<string, unknown>);
      const res = v.validate({ zip: '12-345' });
      expect(res.valid).toBe(false);
      expect(res.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'zip', rule: 'pattern', message: 'Invalid ZIP' }),
        ]),
      );
    });

    test('should run custom validator and handle false result', (): void => {
      const customSchema = {
        ...schema,
        rules: [
          { field: 'code', type: 'string', customValidator: (v: unknown): boolean => v === 'OK', errorMessage: 'Code must be OK' },
        ],
      };
      const v = new Validator(customSchema as unknown as Record<string, unknown>);
      const bad = v.validate({ code: 'NOPE' });
      expect(bad.valid).toBe(false);
      expect(bad.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'code', rule: 'custom', message: 'Code must be OK' }),
        ]),
      );
      const good = v.validate({ code: 'OK' });
      expect(good.valid).toBe(true);
    });

    test('should catch exceptions thrown by custom validators', (): void => {
      const throwingSchema = {
        ...schema,
        rules: [
          {
            field: 'value',
            type: 'string',
            customValidator: (_v: unknown): boolean => {
              throw new Error('boom');
            },
          },
        ],
      };
      const v = new Validator(throwingSchema as unknown as Record<string, unknown>);
      const res = v.validate({ value: 'test' });
      expect(res.valid).toBe(false);
      expect(res.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'value', rule: 'custom_error', message: expect.stringContaining('boom') }),
        ]),
      );
    });

    test('should trim string values in sanitized output', (): void => {
      const res = validator.validate({ name: '  Alice  ' });
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBeDefined();
      expect(res.sanitized).toMatchObject({ name: 'Alice' });
    });

    test('should mark NaN number values as invalid type', (): void => {
      const res = validator.validate({ name: 'Joe', age: Number.NaN });
      expect(res.valid).toBe(false);
      expect(res.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'age', rule: 'type' })]),
      );
    });

    test('should validate boolean, array, and object types', (): void => {
      const res = validator.validate({
        name: 'Jane',
        active: false,
        tags: ['x', 'y'],
        settings: { darkMode: true },
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    test('should validate email type', (): void => {
      const bad = validator.validate({ name: 'Ed', email: 'not-an-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email', rule: 'type' })]),
      );

      const good = validator.validate({ name: 'Ed', email: 'ed@example.com' });
      expect(good.valid).toBe(true);
    });

    test('should validate url type', (): void => {
      const bad = validator.validate({ name: 'U', website: 'notaurl' });
      expect(bad.valid).toBe(false);
      expect(bad.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'website', rule: 'type' })]),
      );

      const good = validator.validate({ name: 'U', website: 'https://vitest.dev' });
      expect(good.valid).toBe(true);
    });

    test('should handle unknown fields with Strict level as errors', (): void => {
      const strictSchema = {
        ...schema,
        allowUnknownFields: false,
        level: (ValidationLevel as Record<string, unknown>).Strict,
        rules: [{ field: 'known', type: 'string' }],
      };
      const v = new Validator(strictSchema as unknown as Record<string, unknown>);
      const res = v.validate({ known: 'ok', unknownField: 123 });
      expect(res.valid).toBe(false);
      expect(res.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'unknownField', rule: 'unknown_field' }),
        ]),
      );
      expect(res.sanitized).toBeUndefined();
    });

    test('should handle unknown fields with Lenient level as warnings', (): void => {
      const lenientSchema = {
        ...schema,
        allowUnknownFields: false,
        level: (ValidationLevel as Record<string, unknown>).Lenient,
        rules: [{ field: 'known', type: 'string' }],
      };
      const v = new Validator(lenientSchema as unknown as Record<string, unknown>);
      const res = v.validate({ known: 'ok', extra: true });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining("Unknown field 'extra'")]),
      );
      expect(res.sanitized).toMatchObject({ known: 'ok' });
    });

    test('should return undefined sanitized when any validation error occurs', (): void => {
      const res = validator.validate({ name: 123 });
      expect(res.valid).toBe(false);
      expect(res.sanitized).toBeUndefined();
    });
  });

  describe('validateData (helper)', (): void => {
    test('should construct Validator and validate data correctly', (): void => {
      const simpleSchema = {
        rules: [{ field: 'title', type: 'string', required: true }],
        allowUnknownFields: true,
        level: (ValidationLevel as Record<string, unknown>).Strict,
      };
      const result = validateData({ title: '  Hello  ' }, simpleSchema as unknown as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toMatchObject({ title: 'Hello' });
    });

    test('should propagate validation errors from constructed Validator', (): void => {
      const simpleSchema = {
        rules: [{ field: 'title', type: 'string', required: true }],
        allowUnknownFields: true,
        level: (ValidationLevel as Record<string, unknown>).Strict,
      };
      const result = validateData({}, simpleSchema as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'title', rule: 'required' })]),
      );
    });
  });
});
