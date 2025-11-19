import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Validator, validateData } from './validator.js';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('./schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Permissive: 'Permissive',
  },
}), { virtual: true });

import { ValidationLevel } from './schemas.js';

type RuleType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
interface TestValidationRule {
  field: string;
  type: RuleType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean;
  errorMessage?: string;
}
interface TestValidationSchema {
  rules: TestValidationRule[];
  level: 'Strict' | 'Permissive';
  allowUnknownFields?: boolean;
}

describe('Validator', (): void => {
  let schema: TestValidationSchema;
  let validator: Validator;

  beforeEach((): void => {
    schema = {
      level: ValidationLevel.Strict as 'Strict',
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
          required: true,
          min: 0,
          max: 120,
        },
      ],
    };
    validator = new Validator(schema as unknown as Record<string, unknown> as any);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor and configuration', (): void => {
    test('should initialize validator with schema and level', (): void => {
      expect(validator).toBeDefined();
      const currentSchema = validator.getSchema() as unknown as TestValidationSchema;
      expect(currentSchema).toBeDefined();
      expect(currentSchema.level).toBe(ValidationLevel.Strict);
      expect(Array.isArray(currentSchema.rules)).toBe(true);
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('getSchema returns a copy object (top-level)', (): void => {
      const copyA = validator.getSchema();
      const copyB = validator.getSchema();
      expect(copyA).not.toBe(copyB);
    });

    test('setLevel updates validation level', (): void => {
      validator.setLevel(ValidationLevel.Permissive);
      expect(validator.getLevel()).toBe(ValidationLevel.Permissive);
    });
  });

  describe('validate', (): void => {
    test('should validate correct data and return sanitized with trimmed strings', (): void => {
      const result = validator.validate({
        name: '  Alice  ',
        age: 30,
      } as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).name).toBe('Alice');
      expect((result.sanitized as Record<string, unknown>).age).toBe(30);
    });

    test('should return error when required field is missing', (): void => {
      const result = validator.validate({
        age: 22,
      } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

    test('should return type error when number provided as string', (): void => {
      const result = validator.validate({
        name: 'Bob',
        age: '42',
      } as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('age');
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce minLength and maxLength for strings', (): void => {
      const tooShort = validator.validate({
        name: 'A',
        age: 20,
      } as Record<string, unknown>);
      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors.some((e) => e.rule === 'minLength')).toBe(true);

      const within = validator.validate({
        name: 'Al',
        age: 20,
      } as Record<string, unknown>);
      expect(within.valid).toBe(true);

      const tooLong = validator.validate({
        name: 'A'.repeat(11),
        age: 20,
      } as Record<string, unknown>);
      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors.some((e) => e.rule === 'maxLength')).toBe(true);
    });

    test('should enforce min and max for numbers', (): void => {
      const tooSmall = validator.validate({
        name: 'Bob',
        age: -1,
      } as Record<string, unknown>);
      expect(tooSmall.valid).toBe(false);
      expect(tooSmall.errors.some((e) => e.rule === 'min')).toBe(true);

      const within = validator.validate({
        name: 'Bob',
        age: 0,
      } as Record<string, unknown>);
      expect(within.valid).toBe(true);

      const tooLarge = validator.validate({
        name: 'Bob',
        age: 121,
      } as Record<string, unknown>);
      expect(tooLarge.valid).toBe(false);
      expect(tooLarge.errors.some((e) => e.rule === 'max')).toBe(true);
    });

    test('should validate email type using regex', (): void => {
      const emailSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        allowUnknownFields: false,
        rules: [
          { field: 'email', type: 'email', required: true },
        ],
      };
      const emailValidator = new Validator(emailSchema as unknown as Record<string, unknown> as any);

      const ok = emailValidator.validate({ email: 'user@example.com' } as Record<string, unknown>);
      expect(ok.valid).toBe(true);

      const bad = emailValidator.validate({ email: 'not-an-email' } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.rule === 'type' || e.rule === 'pattern')).toBe(true);
    });

    test('should validate url type using URL constructor', (): void => {
      const urlSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        allowUnknownFields: false,
        rules: [
          { field: 'site', type: 'url', required: true },
        ],
      };
      const urlValidator = new Validator(urlSchema as unknown as Record<string, unknown> as any);

      const ok = urlValidator.validate({ site: 'https://example.com/path' } as Record<string, unknown>);
      expect(ok.valid).toBe(true);

      const bad = urlValidator.validate({ site: 'not-a-url' } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.rule === 'type')).toBe(true);
    });

    test('should validate boolean, array, and object types', (): void => {
      const mixedSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        allowUnknownFields: false,
        rules: [
          { field: 'flag', type: 'boolean', required: true },
          { field: 'tags', type: 'array', required: true },
          { field: 'profile', type: 'object', required: true },
        ],
      };
      const mixedValidator = new Validator(mixedSchema as unknown as Record<string, unknown> as any);

      const ok = mixedValidator.validate({
        flag: true,
        tags: ['a', 'b'],
        profile: { title: 'dev' },
      } as Record<string, unknown>);
      expect(ok.valid).toBe(true);

      const bad = mixedValidator.validate({
        flag: 'true',
        tags: 'not array',
        profile: null,
      } as unknown as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.field === 'flag' && e.rule === 'type')).toBe(true);
      expect(bad.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
      expect(bad.errors.some((e) => e.field === 'profile' && e.rule === 'type')).toBe(true);
    });

    test('should validate pattern rule for strings', (): void => {
      const patternSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            pattern: /^[A-Z]{3}$/,
          },
        ],
      };
      const patternValidator = new Validator(patternSchema as unknown as Record<string, unknown> as any);

      const ok = patternValidator.validate({ code: 'ABC' } as Record<string, unknown>);
      expect(ok.valid).toBe(true);

      const bad = patternValidator.validate({ code: 'Ab1' } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.rule === 'pattern')).toBe(true);
    });

    test('should use custom errorMessage for pattern or type violations when provided', (): void => {
      const customSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          {
            field: 'username',
            type: 'string',
            required: true,
            pattern: /^[a-z]+$/,
            errorMessage: 'username must be lowercase letters only',
          },
        ],
      };
      const customValidator = new Validator(customSchema as unknown as Record<string, unknown> as any);
      const res = customValidator.validate({ username: 'ABC' } as Record<string, unknown>);
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.message).toBe('username must be lowercase letters only');
    });

    test('should validate customValidator returning false as error', (): void => {
      const withCustom: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          {
            field: 'score',
            type: 'number',
            required: true,
            customValidator: (value: unknown): boolean => typeof value === 'number' && value % 2 === 0,
          },
        ],
      };
      const cv = new Validator(withCustom as unknown as Record<string, unknown> as any);

      const ok = cv.validate({ score: 4 } as Record<string, unknown>);
      expect(ok.valid).toBe(true);

      const bad = cv.validate({ score: 3 } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.rule === 'custom')).toBe(true);
    });

    test('should catch exception thrown by customValidator and report custom_error', (): void => {
      const throwingSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          {
            field: 'payload',
            type: 'object',
            required: true,
            customValidator: (_value: unknown): boolean => {
              throw new Error('boom');
            },
          },
        ],
      };
      const tv = new Validator(throwingSchema as unknown as Record<string, unknown> as any);

      const res = tv.validate({ payload: {} } as Record<string, unknown>);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'custom_error' && (e.message ?? '').includes('boom'))).toBe(true);
    });

    test('should produce error for unknown fields in Strict level', (): void => {
      validator.setLevel(ValidationLevel.Strict);
      const res = validator.validate({
        name: 'Ann',
        age: 20,
        extra: 'nope',
      } as Record<string, unknown>);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
      expect(res.warnings.length).toBe(0);
      expect(res.sanitized).toBeUndefined();
    });

    test('should produce warnings for unknown fields in Permissive level', (): void => {
      validator.setLevel(ValidationLevel.Permissive);
      const res = validator.validate({
        name: 'Ann',
        age: 20,
        unknownA: true,
      } as Record<string, unknown>);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(1);
      expect((res.sanitized as Record<string, unknown>).name).toBe('Ann');
      expect((res.sanitized as Record<string, unknown>).age).toBe(20);
    });

    test('should ignore optional null/undefined fields (not required)', (): void => {
      const optionalSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          { field: 'title', type: 'string', required: false },
          { field: 'count', type: 'number', required: true },
        ],
      };
      const optValidator = new Validator(optionalSchema as unknown as Record<string, unknown> as any);

      const res = optValidator.validate({ title: undefined, count: 1 } as Record<string, unknown>);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.sanitized).toBeDefined();
      expect((res.sanitized as Record<string, unknown>).count).toBe(1);

      const res2 = optValidator.validate({ title: null, count: 1 } as Record<string, unknown>);
      expect(res2.valid).toBe(true);
      expect(res2.errors.length).toBe(0);
      expect(res2.sanitized).toBeDefined();
    });
  });

  describe('validateData helper', (): void => {
    test('should validate using helper function and return same structure', (): void => {
      const res = validateData(
        { name: 'Zoe', age: 25 } as Record<string, unknown>,
        schema as unknown as Record<string, unknown> as any,
      );
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
      expect(res.sanitized).toBeDefined();
    });

    test('should surface errors via helper function', (): void => {
      const res = validateData(
        { name: 'Z', age: 25 } as Record<string, unknown>,
        schema as unknown as Record<string, unknown> as any,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors.some((e) => e.rule === 'minLength')).toBe(true);
    });
  });

  describe('indirect testing of private methods via public API', (): void => {
    test('validateType switch branches are covered by type scenarios', (): void => {
      const typesSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          { field: 's', type: 'string', required: true },
          { field: 'n', type: 'number', required: true },
          { field: 'b', type: 'boolean', required: true },
          { field: 'a', type: 'array', required: true },
          { field: 'o', type: 'object', required: true },
          { field: 'e', type: 'email', required: true },
          { field: 'u', type: 'url', required: true },
        ],
      };
      const typesValidator = new Validator(typesSchema as unknown as Record<string, unknown> as any);
      const ok = typesValidator.validate({
        s: ' str ',
        n: 1,
        b: false,
        a: [1],
        o: { k: 'v' },
        e: 'x@y.z',
        u: 'https://x.y',
      } as Record<string, unknown>);
      expect(ok.valid).toBe(true);
      expect((ok.sanitized as Record<string, unknown>).s).toBe('str'); // trimmed
    });

    test('sanitizeValue string trimming is applied only to strings', (): void => {
      const strSchema: TestValidationSchema = {
        level: ValidationLevel.Strict as 'Strict',
        rules: [
          { field: 'title', type: 'string', required: true },
        ],
      };
      const strValidator = new Validator(strSchema as unknown as Record<string, unknown> as any);
      const res = strValidator.validate({ title: '  hello  ' } as Record<string, unknown>);
      expect(res.valid).toBe(true);
      expect((res.sanitized as Record<string, unknown>).title).toBe('hello');
    });
  });
});
