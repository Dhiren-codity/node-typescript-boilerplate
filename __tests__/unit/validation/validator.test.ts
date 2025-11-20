import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema, ValidationRule } from './schemas.js';
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
  let schema: ValidationSchema;

  beforeEach((): void => {
    schema = {
      rules: [
        {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 2,
          maxLength: 10,
        } as ValidationRule,
        {
          field: 'email',
          type: 'email',
          required: true,
        } as ValidationRule,
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
    } as ValidationSchema;

    validator = new Validator(schema);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize correctly with provided schema', (): void => {
      const current = validator.getSchema();
      expect(current).toBeDefined();
      expect(current.rules.length).toBe(2);
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('getSchema should return a shallow copy (not the same reference)', (): void => {
      const s1 = validator.getSchema();
      const s2 = validator.getSchema();
      expect(s1).not.toBe(s2);
    });
  });

  describe('validate', (): void => {
    test('should validate and sanitize valid data (trim strings)', (): void => {
      const data: Record<string, unknown> = {
        name: '  Alice  ',
        email: 'alice@example.com',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.['name']).toBe('Alice');
      expect(result.sanitized?.['email']).toBe('alice@example.com');
    });

    test('should error when required field is missing', (): void => {
      const data: Record<string, unknown> = {
        email: 'alice@example.com',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

    test('should error when required field is null', (): void => {
      const data: Record<string, unknown> = {
        name: null,
        email: 'alice@example.com',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should validate string length constraints', (): void => {
      const tooShort: Record<string, unknown> = {
        name: 'A',
        email: 'a@example.com',
      };
      const tooLong: Record<string, unknown> = {
        name: 'ThisIsWayTooLong',
        email: 'a@example.com',
      };

      const r1 = validator.validate(tooShort);
      expect(r1.valid).toBe(false);
      expect(r1.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);

      const r2 = validator.validate(tooLong);
      expect(r2.valid).toBe(false);
      expect(r2.errors.some((e) => e.field === 'name' && e.rule === 'maxLength')).toBe(true);
    });

    test('should validate email type', (): void => {
      const bad: Record<string, unknown> = {
        name: 'Alice',
        email: 'not-an-email',
      };
      const result = validator.validate(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'email' && e.rule === 'type')).toBe(true);
    });

    test('should validate url type', (): void => {
      const urlSchema: ValidationSchema = {
        rules: [
          { field: 'site', type: 'url', required: true } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(urlSchema);

      const ok: Record<string, unknown> = { site: 'https://example.com' };
      const bad: Record<string, unknown> = { site: 'not a url' };

      const r1 = v.validate(ok);
      expect(r1.valid).toBe(true);

      const r2 = v.validate(bad);
      expect(r2.valid).toBe(false);
      expect(r2.errors[0]?.rule).toBe('type');
    });

    test('should validate number range and NaN handling', (): void => {
      const numberSchema: ValidationSchema = {
        rules: [
          { field: 'age', type: 'number', required: true, min: 18, max: 65 } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(numberSchema);

      const ok: Record<string, unknown> = { age: 30 };
      const minEdge: Record<string, unknown> = { age: 18 };
      const maxEdge: Record<string, unknown> = { age: 65 };
      const tooLow: Record<string, unknown> = { age: 10 };
      const tooHigh: Record<string, unknown> = { age: 90 };
      const notNumber: Record<string, unknown> = { age: Number.NaN };

      expect(v.validate(ok).valid).toBe(true);
      expect(v.validate(minEdge).valid).toBe(true);
      expect(v.validate(maxEdge).valid).toBe(true);

      const r1 = v.validate(tooLow);
      expect(r1.valid).toBe(false);
      expect(r1.errors[0]?.rule).toBe('min');

      const r2 = v.validate(tooHigh);
      expect(r2.valid).toBe(false);
      expect(r2.errors[0]?.rule).toBe('max');

      const r3 = v.validate(notNumber);
      expect(r3.valid).toBe(false);
      expect(r3.errors[0]?.rule).toBe('type');
    });

    test('should validate boolean, array, and object types', (): void => {
      const mixedSchema: ValidationSchema = {
        rules: [
          { field: 'active', type: 'boolean', required: true } as ValidationRule,
          { field: 'tags', type: 'array', required: true } as ValidationRule,
          { field: 'prefs', type: 'object', required: true } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(mixedSchema);

      const ok: Record<string, unknown> = {
        active: true,
        tags: ['a', 'b'],
        prefs: { theme: 'dark' },
      };
      expect(v.validate(ok).valid).toBe(true);

      const bad: Record<string, unknown> = {
        active: 'true',
        tags: 'not-array',
        prefs: null,
      };
      const r = v.validate(bad);
      expect(r.valid).toBe(false);
      expect(r.errors.some((e) => e.field === 'active' && e.rule === 'type')).toBe(true);
      expect(r.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
      expect(r.errors.some((e) => e.field === 'prefs' && e.rule === 'type')).toBe(true);
    });

    test('should validate pattern for strings', (): void => {
      const patternSchema: ValidationSchema = {
        rules: [
          { field: 'code', type: 'string', required: true, pattern: /^[A-Z]{3}\d{3}$/ } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(patternSchema);

      const ok: Record<string, unknown> = { code: 'ABC123' };
      const bad: Record<string, unknown> = { code: 'abc-123' };

      expect(v.validate(ok).valid).toBe(true);

      const r = v.validate(bad);
      expect(r.valid).toBe(false);
      expect(r.errors[0]?.rule).toBe('pattern');
    });

    test('should handle custom validator returning false', (): void => {
      const customSchema: ValidationSchema = {
        rules: [
          {
            field: 'value',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => false,
          } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(customSchema);

      const r = v.validate({ value: 'ok' });
      expect(r.valid).toBe(false);
      expect(r.errors[0]?.rule).toBe('custom');
    });

    test('should handle custom validator throwing an error (exception handling)', (): void => {
      const customSchema: ValidationSchema = {
        rules: [
          {
            field: 'value',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => {
              throw new Error('Boom');
            },
          } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(customSchema);

      const r = v.validate({ value: 'ok' });
      expect(r.valid).toBe(false);
      expect(r.errors[0]?.rule).toBe('custom_error');
      expect(r.errors[0]?.message).toContain('Custom validator threw error: Boom');
    });

    test('should flag unknown fields as error in Strict mode', (): void => {
      const data: Record<string, unknown> = {
        name: 'Bob',
        email: 'bob@example.com',
        extra: 123,
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
    });

    test('should warn on unknown fields in Lenient mode', (): void => {
      validator.setLevel(ValidationLevel.Lenient as unknown as ValidationSchema['level']);
      const data: Record<string, unknown> = {
        name: 'Bob',
        email: 'bob@example.com',
        extra: 123,
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("Unknown field 'extra'"))).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    test('should ignore unknown fields when allowUnknownFields = true', (): void => {
      const localSchema: ValidationSchema = {
        rules: [
          { field: 'name', type: 'string', required: true } as ValidationRule,
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(localSchema);
      const data: Record<string, unknown> = { name: 'Zoe', extra: 'ok' };
      const result = v.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });

    test('should report type error for unsupported rule.type', (): void => {
      const badTypeRule = { field: 'x', type: 'unknown_type', required: true } as unknown as ValidationRule;
      const localSchema: ValidationSchema = {
        rules: [badTypeRule],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(localSchema);
      const result = v.validate({ x: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
    });

    test('should not coerce string to number during sanitization if type check fails', (): void => {
      const numSchema: ValidationSchema = {
        rules: [{ field: 'age', type: 'number', required: true } as ValidationRule],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(numSchema);
      const result = v.validate({ age: '42' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.sanitized).toBeUndefined();
    });

    test('should skip validations for optional missing fields and not add to sanitized', (): void => {
      const optSchema: ValidationSchema = {
        rules: [
          { field: 'opt', type: 'string', required: false } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
      };
      const v = new Validator(optSchema);
      const result = v.validate({});
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'opt')).toBe(false);
    });
  });

  describe('getLevel', (): void => {
    test('should return current validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      validator.setLevel(ValidationLevel.Lenient as unknown as ValidationSchema['level']);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });

    test('should not mutate original schema returned by getSchema (shallow copy check)', (): void => {
      const snapshot = validator.getSchema();
      (snapshot as ValidationSchema).level = ValidationLevel.Lenient as unknown as ValidationSchema['level'];
      // Validator's internal level should remain unchanged
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });
});

describe('validateData (helper)', (): void => {
  test('should validate using helper and return result', (): void => {
    const schema: ValidationSchema = {
      rules: [
        { field: 'name', type: 'string', required: true } as ValidationRule,
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict as unknown as ValidationSchema['level'],
    };
    const ok = validateData({ name: 'Neo' }, schema);
    expect(ok.valid).toBe(true);
    expect(ok.errors.length).toBe(0);
    expect(ok.sanitized?.['name']).toBe('Neo');

    const bad = validateData({}, schema);
    expect(bad.valid).toBe(false);
    expect(bad.errors[0]?.rule).toBe('required');
  });
});
