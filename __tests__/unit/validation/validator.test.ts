import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependency used by Validator
vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 1,
    Permissive: 0,
  },
}));

import { Validator, validateData } from '../../src/validation/validator.ts';
import { ValidationLevel } from '../../src/validation/schemas.js';

describe('Validator', (): void => {
  let validator: Validator;
  let schema: {
    rules: Array<{
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
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: RegExp;
      customValidator?: (value: unknown) => boolean;
      errorMessage?: string;
    }>;
    allowUnknownFields?: boolean;
    level: typeof ValidationLevel[keyof typeof ValidationLevel];
  };

  beforeEach((): void => {
    schema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
        { field: 'age', type: 'number', required: true, min: 18, max: 99 },
        { field: 'email', type: 'email', required: false },
        { field: 'website', type: 'url', required: false },
      ],
      allowUnknownFields: true,
      level: ValidationLevel.Strict,
    };

    validator = new Validator(schema as unknown as any);
  });

  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('constructor', (): void => {
    test('should initialize correctly', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      const returnedSchema = validator.getSchema();
      expect(returnedSchema).toBeDefined();
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy of the schema', (): void => {
      const returnedSchema = validator.getSchema();
      expect(returnedSchema).not.toBe(schema);
      // Mutating returned schema's top-level fields should not affect validator
      (returnedSchema as { level: number }).level = ValidationLevel.Permissive;
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('getLevel', (): void => {
    test('should return the current validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('setLevel', (): void => {
    test('should update the validation level', (): void => {
      validator.setLevel(ValidationLevel.Permissive);
      expect(validator.getLevel()).toBe(ValidationLevel.Permissive);
    });
  });

  describe('validate', (): void => {
      const result = validator.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).toEqual({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
      });
    });

      const missing = validator.validate(dataMissing);
      expect(missing.valid).toBe(false);
      expect(missing.errors.some((e) => e.field === 'age' && e.rule === 'required')).toBe(true);
      expect(missing.sanitized).toBeUndefined();

      const dataNull: Record<string, unknown> = { name: 'Bob', age: null };
      const nullRes = validator.validate(dataNull);
      expect(nullRes.valid).toBe(false);
      expect(nullRes.errors.some((e) => e.field === 'age' && e.rule === 'required')).toBe(true);
      expect(nullRes.sanitized).toBeUndefined();
    });

      const res = validator.validate(dataWrongTypes);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'name' && e.rule === 'type')).toBe(true);
      expect(res.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
    });

      const shortRes = validator.validate(tooShort);
      expect(shortRes.valid).toBe(false);
      expect(shortRes.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);

      const tooLong: Record<string, unknown> = { name: 'VeryLongNameExceeding', age: 20 };
      const longRes = validator.validate(tooLong);
      expect(longRes.valid).toBe(false);
      expect(longRes.errors.some((e) => e.field === 'name' && e.rule === 'maxLength')).toBe(true);
    });

      const smallRes = validator.validate(tooSmall);
      expect(smallRes.valid).toBe(false);
      expect(smallRes.errors.some((e) => e.field === 'age' && e.rule === 'min')).toBe(true);

      const tooLarge: Record<string, unknown> = { name: 'Bob', age: 100 };
      const largeRes = validator.validate(tooLarge);
      expect(largeRes.valid).toBe(false);
      expect(largeRes.errors.some((e) => e.field === 'age' && e.rule === 'max')).toBe(true);
    });

      validator = new Validator(schema as unknown as any);

      const bad: Record<string, unknown> = { name: 'Bob', age: 30, code: 'ab1' };
      const badRes = validator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.field === 'code' && e.rule === 'pattern')).toBe(true);

      const good: Record<string, unknown> = { name: 'Bob', age: 30, code: 'ABC' };
      const goodRes = validator.validate(good);
      expect(goodRes.valid).toBe(true);
      expect(goodRes.errors).toHaveLength(0);
    });

      validator = new Validator(schema as unknown as any);

      const data: Record<string, unknown> = { name: 'Sam', age: 20, tag: 'X-001' };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'tag' && e.message === 'Invalid tag format')).toBe(
        true,
      );
    });

      validator = new Validator(schema as unknown as any);

      const data: Record<string, unknown> = { name: 'Amy', age: 21, token: 'nope' };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'token' && e.rule === 'custom')).toBe(true);
    });

      validator = new Validator(schema as unknown as any);

      const data: Record<string, unknown> = { name: 'Eve', age: 22, meta: 'x' };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'meta' && e.rule === 'custom_error')).toBe(true);
      const err = res.errors.find((e) => e.field === 'meta' && e.rule === 'custom_error');
      expect(err?.message).toContain('validator failed');
    });

      const badRes = validator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.field === 'email' && e.rule === 'type')).toBe(true);

      const good: Record<string, unknown> = { name: 'Bob', age: 25, email: 'b@c.io' };
      const goodRes = validator.validate(good);
      expect(goodRes.valid).toBe(true);
      expect(goodRes.errors).toHaveLength(0);
    });

      const badRes = validator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.field === 'website' && e.rule === 'type')).toBe(true);

      const good: Record<string, unknown> = {
        name: 'Bob',
        age: 25,
        website: 'https://example.com/path?x=1',
      };
      const goodRes = validator.validate(good);
      expect(goodRes.valid).toBe(true);
      expect(goodRes.errors).toHaveLength(0);
    });

      schema.rules.push({ field: 'profile', type: 'object', required: true });
      validator = new Validator(schema as unknown as any);

      const bad: Record<string, unknown> = {
        name: 'Joe',
        age: 30,
        tags: 'not-an-array',
        profile: null,
      };
      const badRes = validator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
      expect(badRes.errors.some((e) => e.field === 'profile' && e.rule === 'type')).toBe(true);

      const good: Record<string, unknown> = {
        name: 'Joe',
        age: 30,
        tags: ['a', 'b'],
        profile: { city: 'NY' },
      };
      const goodRes = validator.validate(good);
      expect(goodRes.valid).toBe(true);
      expect(goodRes.errors).toHaveLength(0);
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'extras' && e.rule === 'unknown_field')).toBe(true);
      expect(res.warnings).toHaveLength(0);
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.warnings.some((w) => w.includes("Unknown field 'extras'"))).toBe(true);
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.sanitized).toBeUndefined();
    });
  });

  describe('validateData (helper)', (): void => {
      const data: Record<string, unknown> = { title: '  Hello  ' };
      const res = validateData(data, quickSchema as unknown as any);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.sanitized).toEqual({ title: 'Hello' });
    });
  });
});
