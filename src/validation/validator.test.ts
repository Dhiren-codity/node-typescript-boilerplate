import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Validator, validateData } from '../../src/validation/validator.ts';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Relaxed: 'Relaxed',
  },
}));

// Import runtime enum from the mocked module
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ValidationLevel } from '../../src/validation/schemas.js';

describe('Validator', (): void => {
  let schemaObj: Record<string, unknown>;
  let instance: Validator;

  beforeEach((): void => {
    schemaObj = {
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
      ],
    } as Record<string, unknown>;
    instance = new Validator(schemaObj as unknown as never);
  });

  describe('constructor and getters', (): void => {
    test('should initialize and expose schema and level', (): void => {
      expect(instance).toBeDefined();
      expect(instance.getLevel()).toBe(ValidationLevel.Strict);

      const exportedSchema = instance.getSchema() as unknown as Record<string, unknown>;
      expect(exportedSchema).toBeDefined();
      expect(exportedSchema.level).toBe(ValidationLevel.Strict);
    });

    test('getSchema should return a copy (mutations to returned object do not change internal level)', (): void => {
      const schemaCopy = instance.getSchema() as unknown as Record<string, unknown>;
      (schemaCopy as Record<string, unknown>).level = ValidationLevel.Relaxed;
      expect(instance.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('setLevel and getLevel', (): void => {
    test('should update and return updated level', (): void => {
      expect(instance.getLevel()).toBe(ValidationLevel.Strict);
      instance.setLevel(ValidationLevel.Relaxed);
      expect(instance.getLevel()).toBe(ValidationLevel.Relaxed);
    });
  });

  describe('validate', (): void => {
    test('should validate and sanitize valid string field (trim)', (): void => {
      const result = instance.validate({ name: '  John  ' } as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'John' });
    });

    test('should error when required field is missing', (): void => {
      const result = instance.validate({} as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce string length constraints (minLength)', (): void => {
      const result = instance.validate({ name: 'A' } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e): boolean => e.rule === 'minLength')).toBe(true);
    });

    test('should enforce string length constraints (maxLength)', (): void => {
      const result = instance.validate({ name: 'averyverylong' } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e): boolean => e.rule === 'maxLength')).toBe(true);
    });

    test('should reset errors and warnings between validate calls', (): void => {
      const badFirst = instance.validate({ name: '' } as Record<string, unknown>);
      expect(badFirst.valid).toBe(false);
      expect(badFirst.errors.length).toBeGreaterThan(0);

      const goodSecond = instance.validate({ name: 'Alice' } as Record<string, unknown>);
      expect(goodSecond.valid).toBe(true);
      expect(goodSecond.errors.length).toBe(0);
      expect(goodSecond.warnings.length).toBe(0);
    });

    test('should not include sanitized when there are errors', (): void => {
      const result = instance.validate({ name: 'A' } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
    });

    test('should handle unknown fields as errors in Strict level', (): void => {
      const result = instance.validate({ name: 'John', extra: 1 } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e): boolean => e.rule === 'unknown_field')).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    test('should handle unknown fields as warnings in Relaxed level', (): void => {
      const relaxedSchema = {
        ...schemaObj,
        level: ValidationLevel.Relaxed,
      } as Record<string, unknown>;
      const relaxedValidator = new Validator(relaxedSchema as unknown as never);

      const result = relaxedValidator.validate({ name: 'John', extra: 1 } as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain("Unknown field 'extra'");
      expect(result.sanitized).toEqual({ name: 'John' });
    });

    test('should ignore unknown fields when allowUnknownFields is true (no errors or warnings)', (): void => {
      const schemaAllow = {
        ...schemaObj,
        allowUnknownFields: true,
      } as Record<string, unknown>;
      const allowValidator = new Validator(schemaAllow as unknown as never);

      const result = allowValidator.validate({
        name: 'John',
        extra: 'ok',
      } as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toEqual({ name: 'John' });
    });

    test('should validate number type and range', (): void => {
      const schemaNum = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          { field: 'age', type: 'number', required: true, min: 18, max: 65 },
        ],
      } as Record<string, unknown>;
      const v = new Validator(schemaNum as unknown as never);

      const tooYoung = v.validate({ age: 16 } as Record<string, unknown>);
      expect(tooYoung.valid).toBe(false);
      expect(tooYoung.errors.some((e): boolean => e.rule === 'min')).toBe(true);

      const tooOld = v.validate({ age: 80 } as Record<string, unknown>);
      expect(tooOld.valid).toBe(false);
      expect(tooOld.errors.some((e): boolean => e.rule === 'max')).toBe(true);

      const ok = v.validate({ age: 30 } as Record<string, unknown>);
      expect(ok.valid).toBe(true);
      expect(ok.sanitized).toEqual({ age: 30 });
    });

    test('should treat NaN as invalid number type', (): void => {
      const schemaNum = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [{ field: 'n', type: 'number', required: true }],
      } as Record<string, unknown>;
      const v = new Validator(schemaNum as unknown as never);

      const res = v.validate({ n: Number.NaN } as Record<string, unknown>);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e): boolean => e.rule === 'type')).toBe(true);
    });

    test('should validate boolean, array, and object types', (): void => {
      const schemaTypes = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          { field: 'active', type: 'boolean', required: true },
          { field: 'tags', type: 'array', required: true },
          { field: 'profile', type: 'object', required: true },
        ],
      } as Record<string, unknown>;
      const v = new Validator(schemaTypes as unknown as never);

      const invalid = v.validate({
        active: 'yes',
        tags: 'not-array',
        profile: null,
      } as Record<string, unknown>);
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.filter((e): boolean => e.rule === 'type').length).toBe(3);

      const valid = v.validate({
        active: true,
        tags: ['a', 'b'],
        profile: { a: 1 },
      } as Record<string, unknown>);
      expect(valid.valid).toBe(true);
      expect(valid.sanitized).toEqual({
        active: true,
        tags: ['a', 'b'],
        profile: { a: 1 },
      });
    });

    test('should validate email type', (): void => {
      const schemaEmail = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [{ field: 'email', type: 'email', required: true }],
      } as Record<string, unknown>;
      const v = new Validator(schemaEmail as unknown as never);

      const bad = v.validate({ email: 'not@valid' } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e): boolean => e.rule === 'type')).toBe(true);

      const good = v.validate({ email: 'john@example.com' } as Record<string, unknown>);
      expect(good.valid).toBe(true);
      expect(good.sanitized).toEqual({ email: 'john@example.com' });
    });

    test('should validate url type', (): void => {
      const schemaUrl = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [{ field: 'website', type: 'url', required: true }],
      } as Record<string, unknown>;
      const v = new Validator(schemaUrl as unknown as never);

      const bad = v.validate({ website: 'htp:/broken' } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e): boolean => e.rule === 'type')).toBe(true);

      const good = v.validate({ website: 'https://example.com/path?x=1' } as Record<string, unknown>);
      expect(good.valid).toBe(true);
      expect(good.sanitized).toEqual({ website: 'https://example.com/path?x=1' });
    });

    test('should validate pattern for strings', (): void => {
      const schemaPattern = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [{ field: 'code', type: 'string', required: true, pattern: /^[A-Z]{3}\d{3}$/ }],
      } as Record<string, unknown>;
      const v = new Validator(schemaPattern as unknown as never);

      const bad = v.validate({ code: 'ab123' } as Record<string, unknown>);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e): boolean => e.rule === 'pattern')).toBe(true);

      const good = v.validate({ code: 'ABC123' } as Record<string, unknown>);
      expect(good.valid).toBe(true);
      expect(good.sanitized).toEqual({ code: 'ABC123' });
    });

    test('should handle custom validator returning false', (): void => {
      const schemaCustom = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          {
            field: 'custom',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => false,
          },
        ],
      } as Record<string, unknown>;
      const v = new Validator(schemaCustom as unknown as never);

      const res = v.validate({ custom: 'ok' } as Record<string, unknown>);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e): boolean => e.rule === 'custom')).toBe(true);
    });

    test('should handle custom validator throwing an error', (): void => {
      const schemaCustom = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          {
            field: 'custom',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => {
              throw new Error('Boom');
            },
          },
        ],
      } as Record<string, unknown>;
      const v = new Validator(schemaCustom as unknown as never);

      const res = v.validate({ custom: 'value' } as Record<string, unknown>);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e): boolean => e.rule === 'custom_error')).toBe(true);
      const errorMsg = res.errors.find((e): boolean => e.rule === 'custom_error')?.message ?? '';
      expect(errorMsg).toContain('Custom validator threw error: Boom');
    });

    test('should not include missing non-required fields in sanitized output', (): void => {
      const schemaOptional = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          { field: 'name', type: 'string', required: true },
          { field: 'nickname', type: 'string', required: false },
        ],
      } as Record<string, unknown>;
      const v = new Validator(schemaOptional as unknown as never);

      const res = v.validate({ name: 'Bob' } as Record<string, unknown>);
      expect(res.valid).toBe(true);
      expect(res.sanitized).toEqual({ name: 'Bob' });
    });

    test('setLevel should affect unknown field handling', (): void => {
      instance.setLevel(ValidationLevel.Relaxed);
      const res = instance.validate({ name: 'Jo', extra: 'x' } as Record<string, unknown>);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(1);
    });
  });

  describe('validateData helper', (): void => {
    test('should produce same result as using Validator directly', (): void => {
      const schema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          { field: 'name', type: 'string', required: true, minLength: 2 },
          { field: 'email', type: 'email', required: true },
        ],
      } as Record<string, unknown>;

      const direct = new Validator(schema as unknown as never).validate({
        name: 'Alice',
        email: 'alice@example.com',
      } as Record<string, unknown>);

      const helper = validateData(
        { name: 'Alice', email: 'alice@example.com' } as Record<string, unknown>,
        schema as unknown as never,
      );

      expect(helper.valid).toBe(direct.valid);
      expect(helper.errors.length).toBe(direct.errors.length);
      expect(helper.warnings.length).toBe(direct.warnings.length);
      expect(helper.sanitized).toEqual(direct.sanitized);
    });

    test('should collect errors similarly for invalid data', (): void => {
      const schema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          { field: 'name', type: 'string', required: true, minLength: 3 },
          { field: 'email', type: 'email', required: true },
        ],
      } as Record<string, unknown>;

      const res = validateData(
        { name: 'Al', email: 'invalid' } as Record<string, unknown>,
        schema as unknown as never,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
      expect(res.sanitized).toBeUndefined();
    });
  });
});
