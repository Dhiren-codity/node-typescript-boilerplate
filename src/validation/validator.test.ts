import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'strict',
    Moderate: 'moderate',
  },
}));

import { Validator, validateData } from '../../src/validation/validator.js';
import { ValidationLevel } from '../../src/validation/schemas.js';

type RuleType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'email'
  | 'url';

type TestValidationRule = {
  field: string;
  type: RuleType;
  required?: boolean;
  errorMessage?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean;
};

type TestValidationSchema = {
  rules: TestValidationRule[];
  allowUnknownFields?: boolean;
  level: string;
};

describe('Validator', (): void => {
  let instance: Validator;
  let baseSchema: TestValidationSchema;

  beforeEach((): void => {
    baseSchema = {
      level: ValidationLevel.Strict as string,
      allowUnknownFields: false,
      rules: [
        {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 2,
          maxLength: 10,
        },
        {
          field: 'age',
          type: 'number',
          min: 18,
          max: 99,
        },
        {
          field: 'email',
          type: 'email',
        },
        {
          field: 'website',
          type: 'url',
        },
        {
          field: 'active',
          type: 'boolean',
        },
        {
          field: 'tags',
          type: 'array',
        },
        {
          field: 'meta',
          type: 'object',
        },
        {
          field: 'code',
          type: 'string',
          pattern: /^[A-Z]{3}\d{3}$/,
        },
        {
          field: 'custom',
          type: 'string',
          customValidator: (v: unknown): boolean =>
            typeof v === 'string' && v.startsWith('ok'),
        },
      ],
    };
    instance = new Validator(baseSchema as unknown as any);
  });

  afterEach((): void => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema', (): void => {
      const schema = instance.getSchema() as unknown as TestValidationSchema;
      expect(schema).toBeDefined();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(Array.isArray(schema.rules)).toBe(true);
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy of schema', (): void => {
      const returned = instance.getSchema() as unknown as TestValidationSchema;
      expect(returned).not.toBe(baseSchema);
      expect(returned.rules).toBe(baseSchema.rules);
      expect(returned.level).toBe(baseSchema.level);
    });
  });

  describe('getLevel / setLevel', (): void => {
    test('should get and set validation level', (): void => {
      expect(instance.getLevel()).toBe(ValidationLevel.Strict);
      instance.setLevel(ValidationLevel.Moderate as unknown as any);
      expect(instance.getLevel()).toBe(ValidationLevel.Moderate);
    });
  });

  describe('validate', (): void => {
    test('should validate required fields and sanitize strings (trim)', (): void => {
      const data: Record<string, unknown> = { name: '  Alice  ' };
      const result = instance.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.sanitized).toBeDefined();
      expect(result?.sanitized?.['name']).toBe('Alice');
    });

    test('should fail when required field is missing', (): void => {
      const data: Record<string, unknown> = {};
      const result = instance.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce string minLength and maxLength', (): void => {
      const tooShort: Record<string, unknown> = { name: 'A' };
      const resShort = instance.validate(tooShort);
      expect(resShort.valid).toBe(false);
      expect(resShort.errors.some((e) => e.rule === 'minLength')).toBe(true);

      const tooLong: Record<string, unknown> = { name: 'A'.repeat(11) };
      const resLong = instance.validate(tooLong);
      expect(resLong.valid).toBe(false);
      expect(resLong.errors.some((e) => e.rule === 'maxLength')).toBe(true);
    });

    test('should validate number range', (): void => {
      const belowMin: Record<string, unknown> = { name: 'John', age: 10 };
      const resMin = instance.validate(belowMin);
      expect(resMin.valid).toBe(false);
      expect(resMin.errors.some((e) => e.rule === 'min' && e.field === 'age')).toBe(true);

      const aboveMax: Record<string, unknown> = { name: 'John', age: 120 };
      const resMax = instance.validate(aboveMax);
      expect(resMax.valid).toBe(false);
      expect(resMax.errors.some((e) => e.rule === 'max' && e.field === 'age')).toBe(true);
    });

    test('should enforce type validation and not coerce number strings', (): void => {
      const data: Record<string, unknown> = { name: 'John', age: '42' };
      const result = instance.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.field).toBe('age');
      expect(result.sanitized).toBeUndefined();
    });

    test('should validate email type', (): void => {
      const valid: Record<string, unknown> = { name: 'John', email: 'john@example.com' };
      expect(instance.validate(valid).valid).toBe(true);

      const invalid: Record<string, unknown> = { name: 'John', email: 'not-an-email' };
      const resInvalid = instance.validate(invalid);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.errors.some((e) => e.field === 'email' && e.rule === 'type')).toBe(true);
    });

    test('should validate url type', (): void => {
      const valid: Record<string, unknown> = { name: 'John', website: 'https://example.com' };
      expect(instance.validate(valid).valid).toBe(true);

      const invalid: Record<string, unknown> = { name: 'John', website: 'notaurl' };
      const resInvalid = instance.validate(invalid);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.errors.some((e) => e.field === 'website' && e.rule === 'type')).toBe(true);
    });

    test('should validate boolean type', (): void => {
      const valid: Record<string, unknown> = { name: 'John', active: true };
      expect(instance.validate(valid).valid).toBe(true);

      const invalid: Record<string, unknown> = { name: 'John', active: 'true' };
      const resInvalid = instance.validate(invalid);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.errors.some((e) => e.field === 'active' && e.rule === 'type')).toBe(true);
    });

    test('should validate array and object types', (): void => {
      const valid: Record<string, unknown> = { name: 'John', tags: [], meta: { a: 1 } };
      const resValid = instance.validate(valid);
      expect(resValid.valid).toBe(true);

      const wrongObject: Record<string, unknown> = { name: 'John', meta: [] };
      const resObj = instance.validate(wrongObject);
      expect(resObj.valid).toBe(false);
      expect(resObj.errors.some((e) => e.field === 'meta' && e.rule === 'type')).toBe(true);

      const wrongArray: Record<string, unknown> = { name: 'John', tags: {} };
      const resArr = instance.validate(wrongArray);
      expect(resArr.valid).toBe(false);
      expect(resArr.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
    });

    test('should validate pattern rules', (): void => {
      const valid: Record<string, unknown> = { name: 'John', code: 'ABC123' };
      const resValid = instance.validate(valid);
      expect(resValid.valid).toBe(true);

      const invalid: Record<string, unknown> = { name: 'John', code: 'abc123' };
      const resInvalid = instance.validate(invalid);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.errors.some((e) => e.field === 'code' && e.rule === 'pattern')).toBe(true);
    });

    test('should validate with custom validator returning false', (): void => {
      const invalid: Record<string, unknown> = { name: 'John', custom: 'nope' };
      const resInvalid = instance.validate(invalid);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.errors.some((e) => e.field === 'custom' && e.rule === 'custom')).toBe(true);
    });

    test('should capture errors when custom validator throws', (): void => {
      const throwingSchema: TestValidationSchema = {
        ...baseSchema,
        rules: [
          ...baseSchema.rules.filter((r) => r.field !== 'custom'),
          {
            field: 'custom',
            type: 'string',
            customValidator: (_v: unknown): boolean => {
              throw new Error('Boom');
            },
          },
        ],
      };
      const v = new Validator(throwingSchema as unknown as any);
      const res = v.validate({ name: 'John', custom: 'okvalue' });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'custom' && e.rule === 'custom_error')).toBe(true);
      const err = res.errors.find((e) => e.rule === 'custom_error');
      expect(err?.message).toContain('Boom');
    });

    test('should error on unknown fields in Strict level', (): void => {
      const data: Record<string, unknown> = { name: 'John', unknownProp: 1 };
      const res = instance.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'unknownProp' && e.rule === 'unknown_field')).toBe(true);
    });

    test('should warn (not error) on unknown fields in non-Strict level', (): void => {
      instance.setLevel(ValidationLevel.Moderate as unknown as any);
      const data: Record<string, unknown> = { name: 'John', unknownProp: 1 };
      const res = instance.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.some((w) => w.includes("Unknown field 'unknownProp'"))).toBe(true);
    });

    test('should ignore unknown fields when allowUnknownFields=true', (): void => {
      const schema: TestValidationSchema = { ...baseSchema, allowUnknownFields: true };
      const v = new Validator(schema as unknown as any);
      const data: Record<string, unknown> = { name: 'John', unknownProp: 1 };
      const res = v.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(0);
    });

    test('should not include sanitized output when there are validation errors', (): void => {
      const data: Record<string, unknown> = { name: 'A' };
      const res = instance.validate(data);
      expect(res.valid).toBe(false);
      expect(res.sanitized).toBeUndefined();
    });
  });

  describe('validateData helper', (): void => {
    test('should validate data using helper function', (): void => {
      const data: Record<string, unknown> = { name: '  Bob  ', age: 30, email: 'b@c.co', website: 'https://ex.co', active: false, tags: [], meta: {} };
      const res = validateData(data, baseSchema as unknown as any);
      expect(res.valid).toBe(true);
      expect(res.sanitized?.['name']).toBe('Bob');
    });

    test('should return errors from helper function on invalid input', (): void => {
      const data: Record<string, unknown> = { age: 10 };
      const res = validateData(data, baseSchema as unknown as any);
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors.some((e) => e.rule === 'required' && e.field === 'name')).toBe(true);
    });
  });
});
