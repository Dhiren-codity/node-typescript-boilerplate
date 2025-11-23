import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Recordable } from 'vitest';

declare module '../../src/validation/schemas.js' {
  export enum ValidationLevel {
    Strict = 'strict',
    Lenient = 'lenient',
  }

  export type ValidationRule = {
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

  export type ValidationError = {
    field: string;
    value: unknown;
    message: string;
    rule: string;
  };

  export type ValidationSchema = {
    rules: ValidationRule[];
    allowUnknownFields?: boolean;
    level: ValidationLevel;
  };

  export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    sanitized?: Record<string, unknown>;
  };

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: { Strict: 'strict', Lenient: 'lenient' },
}));

import { Validator, validateData } from '../../src/validation/validator.js';
import { ValidationLevel } from '../../src/validation/schemas.js';
import type {
  ValidationSchema,
  ValidationRule,
  ValidationResult,
} from '../../src/validation/schemas.js';


  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });


  describe('getSchema', (): void => {
    test('should return a shallow copy of the schema', (): void => {
      const s1 = validator.getSchema();
      const s2 = validator.getSchema();
      expect(s1).not.toBe(s2);
      expect(s1.level).toBe(schema.level);
      expect(s1.rules.length).toBe(schema.rules.length);
    });

  describe('getLevel and setLevel', (): void => {
    test('should get the current level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('should update the validation level', (): void => {
      validator.setLevel(ValidationLevel.Lenient);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });


      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

      const numberValidator = new Validator(numberSchema);
      const data: Record<string, unknown> = { age: '42' };
      const result = numberValidator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.sanitized).toBeUndefined();
    });

      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);

      const tooLong = validator.validate({ name: 'ABCDEFGHIJK', email: 'a@b.co' });
      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors.some((e) => e.field === 'name' && e.rule === 'maxLength')).toBe(true);

      const boundaryOk = validator.validate({ name: 'AB', email: 'a@b.co' });
      expect(boundaryOk.valid).toBe(true);
      const boundaryOk2 = validator.validate({ name: 'ABCDEFGHIJ', email: 'a@b.co' });
      expect(boundaryOk2.valid).toBe(true);
    });

      const s: ValidationSchema = { level: ValidationLevel.Strict, rules: [rule] };
      const v = new Validator(s);

      const below = v.validate({ age: 17 });
      expect(below.valid).toBe(false);
      expect(below.errors.some((e) => e.rule === 'min')).toBe(true);

      const above = v.validate({ age: 66 });
      expect(above.valid).toBe(false);
      expect(above.errors.some((e) => e.rule === 'max')).toBe(true);

      const minBoundary = v.validate({ age: 18 });
      expect(minBoundary.valid).toBe(true);

      const maxBoundary = v.validate({ age: 65 });
      expect(maxBoundary.valid).toBe(true);
    });

      const s: ValidationSchema = { level: ValidationLevel.Strict, rules: [rule] };
      const v = new Validator(s);

      const bad = v.validate({ username: 'John1' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');

      const good = v.validate({ username: 'john' });
      expect(good.valid).toBe(true);
    });

      const s: ValidationSchema = { level: ValidationLevel.Strict, rules: [rule] };
      const v = new Validator(s);

      const result = v.validate({ score: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
    });

      const s: ValidationSchema = { level: ValidationLevel.Strict, rules: [rule] };
      const v = new Validator(s);

      const result = v.validate({ payload: { ok: true } });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('boom');
    });

      const s: ValidationSchema = { level: ValidationLevel.Strict, rules: [rule] };
      const v = new Validator(s);

      const result = v.validate({ contact: 'not-an-email' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.message).toBe('Invalid contact format');
    });

      expect(ok.valid).toBe(true);

      const bad = validator.validate({ name: 'Bob', email: 'not-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const s: ValidationSchema = { level: ValidationLevel.Strict, rules: [rule] };
      const v = new Validator(s);

      const good = v.validate({ site: 'https://example.com' });
      expect(good.valid).toBe(true);

      const bad = v.validate({ site: 'not-a-url' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const v = new Validator(s);

      const good = v.validate({ arr: [1, 2], obj: { a: 1 } });
      expect(good.valid).toBe(true);

      const badObj = v.validate({ arr: [1], obj: [1, 2] });
      expect(badObj.valid).toBe(false);
      expect(badObj.errors.some((e) => e.field === 'obj' && e.rule === 'type')).toBe(true);
    });

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("Unknown field 'unknownKey'"))).toBe(true);
    });

      const v = new Validator(s);
      const result = v.validate({ name: 'Eve', extra: 'allowed' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
    });

      expect(result.valid).toBe(true);
      expect(result.sanitized?.name).toBe('Frank');
    });

      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);

      const undefResult = validator.validate({ email: 'a@b.co' });
      expect(undefResult.valid).toBe(false);
      expect(undefResult.errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);
    });

      const dataBad: Record<string, unknown> = { title: 'Hi' };

      const classResult: ValidationResult = new Validator(localSchema).validate(dataOk);
      const helperResult: ValidationResult = validateData(dataOk, localSchema);
      expect(helperResult).toEqual(classResult);

      const badHelperResult: ValidationResult = validateData(dataBad, localSchema);
      expect(badHelperResult.valid).toBe(false);
      expect(badHelperResult.errors.some((e) => e.rule === 'minLength')).toBe(true);
    });
