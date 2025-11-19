import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Record } from 'typescript';

// Ambient type declarations for the mocked module
declare module '../../src/validation/schemas.js' {
  export interface ValidationError {
    field: string;
    value: unknown;
    message: string;
    rule: string;
  }

  export interface ValidationRule {
    field: string;
    type:
      | 'string'
      | 'number'
      | 'boolean'
      | 'array'
      | 'object'
      | 'email'
      | 'url'
      | string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    customValidator?: (value: unknown) => boolean;
    errorMessage?: string;
  }

  export interface ValidationSchema {
    level: 'STRICT' | 'WARN';
    allowUnknownFields: boolean;
    rules: ValidationRule[];
  }

  export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    sanitized?: Record<string, unknown>;
  }

  export const ValidationLevel: { Strict: 'STRICT'; Warn: 'WARN' };
}

// Mock runtime dependency
vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: { Strict: 'STRICT', Warn: 'WARN' },
}));

import { Validator, validateData } from '../../src/validation/validator.ts';
import { ValidationLevel } from '../../src/validation/schemas.js';
import type { ValidationSchema, ValidationResult } from '../../src/validation/schemas.js';

describe('Validator', (): void => {
  let validator: Validator;
  let schema: ValidationSchema;

  beforeEach((): void => {
    schema = {
      level: ValidationLevel.Strict,
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
    validator = new Validator(schema);
  });

  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('constructor', (): void => {
    test('should initialize with schema and default state', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);

      const returned = validator.getSchema();
      expect(returned).toBeDefined();
      expect(returned.level).toBe(ValidationLevel.Strict);
      expect(returned.allowUnknownFields).toBe(false);
      expect(Array.isArray(returned.rules)).toBe(true);
      expect(returned.rules.length).toBe(2);
    });

    test('getSchema should return a copy, not the original reference', (): void => {
      const s1 = validator.getSchema();
      expect(s1).not.toBe(schema);
      s1.level = ValidationLevel.Warn;
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('getLevel/setLevel', (): void => {
    test('getLevel should reflect current level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('setLevel should update the level', (): void => {
      validator.setLevel(ValidationLevel.Warn);
      expect(validator.getLevel()).toBe(ValidationLevel.Warn);
    });
  });

  describe('validate', (): void => {
    test('should validate correct data and sanitize strings (trim)', (): void => {
      const data: Record<string, unknown> = { name: ' Alice ', age: 30 };
      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toEqual({ name: 'Alice', age: 30 });
    });

    test('should produce error when required field is missing', (): void => {
      const data: Record<string, unknown> = { age: 25 };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'required' && e.field === 'name')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should report type error for incorrect type', (): void => {
      const data: Record<string, unknown> = { name: 123, age: 25 };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'type' && e.field === 'name')).toBe(true);
    });

    test('should report NaN as invalid number type', (): void => {
      const data: Record<string, unknown> = { name: 'Bob', age: NaN };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'type' && e.field === 'age')).toBe(true);
    });

    test('should enforce string minLength', (): void => {
      const data: Record<string, unknown> = { name: 'A', age: 25 };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'minLength' && e.field === 'name')).toBe(true);
    });

    test('should enforce string maxLength', (): void => {
      const data: Record<string, unknown> = { name: 'VeryLongNameHere', age: 25 };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'maxLength' && e.field === 'name')).toBe(true);
    });

    test('should enforce number min range', (): void => {
      const data: Record<string, unknown> = { name: 'Alice', age: -1 };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'min' && e.field === 'age')).toBe(true);
    });

    test('should enforce number max range', (): void => {
      const data: Record<string, unknown> = { name: 'Alice', age: 999 };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'max' && e.field === 'age')).toBe(true);
    });

    test('should validate string pattern', (): void => {
      schema.rules.push({
        field: 'code',
        type: 'string',
        pattern: /^[A-Z]{3}-\d{2}$/,
      });
      const localValidator = new Validator(schema);

      const bad: Record<string, unknown> = { name: 'Ok', age: 20, code: 'abc-12' };
      const badRes = localValidator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.rule === 'pattern' && e.field === 'code')).toBe(true);

      const good: Record<string, unknown> = { name: 'Ok', age: 20, code: 'ABC-12' };
      const goodRes = localValidator.validate(good);
      expect(goodRes.valid).toBe(true);
      expect(goodRes.errors.length).toBe(0);
    });

    test('should validate customValidator returning false', (): void => {
      schema.rules.push({
        field: 'even',
        type: 'number',
        customValidator: (v: unknown): boolean => typeof v === 'number' && v % 2 === 0,
      });
      const localValidator = new Validator(schema);

      const data: Record<string, unknown> = { name: 'Ok', age: 20, even: 3 };
      const result = localValidator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'custom' && e.field === 'even')).toBe(true);
    });

    test('should capture exception thrown by customValidator as custom_error', (): void => {
      schema.rules.push({
        field: 'willThrow',
        type: 'string',
        customValidator: (_v: unknown): boolean => {
          throw new Error('boom');
        },
      });
      const localValidator = new Validator(schema);
      const data: Record<string, unknown> = { name: 'Ok', age: 20, willThrow: 'x' };
      const result = localValidator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'custom_error' && e.field === 'willThrow')).toBe(true);
      expect(result.errors.find((e) => e.field === 'willThrow')?.message).toContain('boom');
    });

    test('should validate email type (pass and fail)', (): void => {
      const emailSchema: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [{ field: 'email', type: 'email', required: true }],
      };
      const localValidator = new Validator(emailSchema);

      const good: Record<string, unknown> = { email: 'user@example.com' };
      const goodRes = localValidator.validate(good);
      expect(goodRes.valid).toBe(true);

      const bad: Record<string, unknown> = { email: 'not-an-email' };
      const badRes = localValidator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.rule === 'type' && e.field === 'email')).toBe(true);
    });

    test('should validate url type (pass and fail)', (): void => {
      const urlSchema: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [{ field: 'site', type: 'url', required: true }],
      };
      const localValidator = new Validator(urlSchema);

      const good: Record<string, unknown> = { site: 'https://example.com' };
      const goodRes = localValidator.validate(good);
      expect(goodRes.valid).toBe(true);

      const bad: Record<string, unknown> = { site: 'not a url' };
      const badRes = localValidator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.rule === 'type' && e.field === 'site')).toBe(true);
    });

    test('should validate array and object types', (): void => {
      const schemaAO: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          { field: 'tags', type: 'array', required: true },
          { field: 'meta', type: 'object', required: true },
        ],
      };
      const localValidator = new Validator(schemaAO);

      const good: Record<string, unknown> = { tags: [1, 2], meta: { a: 1 } };
      const goodRes = localValidator.validate(good);
      expect(goodRes.valid).toBe(true);

      const badArr: Record<string, unknown> = { tags: { a: 1 }, meta: { a: 1 } };
      const badArrRes = localValidator.validate(badArr);
      expect(badArrRes.valid).toBe(false);
      expect(badArrRes.errors.some((e) => e.rule === 'type' && e.field === 'tags')).toBe(true);

      const badObj: Record<string, unknown> = { tags: [1], meta: [1, 2] };
      const badObjRes = localValidator.validate(badObj);
      expect(badObjRes.valid).toBe(false);
      expect(badObjRes.errors.some((e) => e.rule === 'type' && e.field === 'meta')).toBe(true);
    });

    test('should mark unknown fields as errors in Strict level', (): void => {
      const data: Record<string, unknown> = { name: 'Ok', age: 20, extra: true };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
    });

    test('should mark unknown fields as warnings in non-Strict level', (): void => {
      validator.setLevel(ValidationLevel.Warn);
      const data: Record<string, unknown> = { name: 'Ok', age: 20, extra: true };
      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("Unknown field 'extra'"))).toBe(true);
      expect(result.sanitized).toEqual({ name: 'Ok', age: 20 });
    });

    test('should ignore unknown fields when allowUnknownFields is true', (): void => {
      const schemaLocal: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          { field: 'title', type: 'string', required: true },
        ],
      };
      const localValidator = new Validator(schemaLocal);
      const res = localValidator.validate({ title: ' T ', extra: 1 });
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(0);
      expect(res.sanitized).toEqual({ title: 'T' });
    });

    test('should not attempt to coerce number from string (type error instead)', (): void => {
      const data: Record<string, unknown> = { name: 'Ok', age: '42' };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'type' && e.field === 'age')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should handle unknown rule type as type error (default switch case)', (): void => {
      const customSchema: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [{ field: 'weird', type: 'date' }],
      };
      const localValidator = new Validator(customSchema);
      const res = localValidator.validate({ weird: new Date() as unknown });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'type' && e.field === 'weird')).toBe(true);
    });

    test('should aggregate multiple errors for same field when applicable', (): void => {
      const s: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
        rules: [
          { field: 'short', type: 'string', minLength: 5, pattern: /^HELLO/ },
        ],
      };
      const v = new Validator(s);
      const res = v.validate({ short: 'hey' });
      expect(res.valid).toBe(false);
      const rules = res.errors.filter((e) => e.field === 'short').map((e) => e.rule);
      expect(rules).toContain('minLength');
      expect(rules).toContain('pattern');
    });
  });

  describe('validateData helper', (): void => {
    test('should produce the same result as Validator.validate', (): void => {
      const helperSchema: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [{ field: 'ok', type: 'boolean', required: true }],
      };
      const input: Record<string, unknown> = { ok: true };

      const v = new Validator(helperSchema);
      const direct: ValidationResult = v.validate(input);
      const viaHelper: ValidationResult = validateData(input, helperSchema);

      expect(viaHelper.valid).toBe(direct.valid);
      expect(viaHelper.errors).toEqual(direct.errors);
      expect(viaHelper.warnings).toEqual(direct.warnings);
      expect(viaHelper.sanitized).toEqual(direct.sanitized);
    });
  });
});
