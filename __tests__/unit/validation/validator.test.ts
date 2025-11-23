import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema } from '../../src/validation/schemas.js';
import { Validator, validateData } from '../../src/validation/validator.ts';
import { ValidationLevel } from '../../src/validation/schemas.js';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Lenient: 'Lenient',
  },
}));


describe('Validator', (): void => {
  let validator: Validator;
  let baseSchema: ValidationSchema;

  beforeEach((): void => {
    baseSchema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
        { field: 'age', type: 'number', min: 0, max: 120 },
        { field: 'email', type: 'email' },
        { field: 'website', type: 'url' },
        { field: 'tags', type: 'array' },
        { field: 'profile', type: 'object' },
        { field: 'newsletter', type: 'boolean' },
      ],
      level: ValidationLevel.Strict,
      allowUnknownFields: false,
    } as ValidationSchema;

    validator = new Validator(baseSchema);
  });



  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema and default state', (): void => {
      expect(validator).toBeDefined();
      const schema = validator.getSchema();
      expect(schema).toBeDefined();
      expect(schema.rules.length).toBe(7);
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy and not the internal reference', (): void => {
      const returned1 = validator.getSchema();
      const returned2 = validator.getSchema();

      expect(returned1).not.toBe(returned2);

      // Mutating returned schema level should not change validator internal level
      returned1.level = ValidationLevel.Lenient;
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('getLevel and setLevel', (): void => {
    test('should get and set validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Lenient);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });

  describe('validate', (): void => {
    test('should validate correct data and return sanitized/trimmed strings', (): void => {
      const data: Record<string, unknown> = {
        name: '  Alice  ',
        age: 30,
        email: 'user@example.com',
        website: 'https://example.com',
        tags: ['a', 'b'],
        profile: { city: 'Paris' },
        newsletter: true,
      };

      const result = validator.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.name).toBe('Alice');
      expect(result.sanitized?.age).toBe(30);
    });

    test('should produce error when required field is missing', (): void => {
      const data: Record<string, unknown> = {
        // name missing
        age: 25,
      };

      const result = validator.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

    test('should fail type validation with informative message for unknown type', (): void => {
      const schema: ValidationSchema = {
        rules: [
          // Intentionally specify an unsupported type to reach default of switch()
          { field: 'mystery', type: 'weird' as unknown as 'string', required: true },
        ],
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
      } as unknown as ValidationSchema;

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ mystery: 123 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('mystery');
      expect(result.errors[0]?.rule).toBe('type');
      expect(String(result.errors[0]?.message)).toContain("must be of type weird");
    });

    test('should validate string length constraints', (): void => {
      const dataTooShort: Record<string, unknown> = { name: 'A' };
      const dataTooLong: Record<string, unknown> = { name: 'A'.repeat(11) };

      const shortResult = validator.validate(dataTooShort);
      const longResult = validator.validate(dataTooLong);

      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors.some((e) => e.rule === 'minLength')).toBe(true);

      expect(longResult.valid).toBe(false);
      expect(longResult.errors.some((e) => e.rule === 'maxLength')).toBe(true);
    });

    test('should validate number range and NaN', (): void => {
      const belowMin = validator.validate({ name: 'Bob', age: -1 });
      const aboveMax = validator.validate({ name: 'Bob', age: 999 });
      const isNaNResult = validator.validate({ name: 'Bob', age: Number.NaN });

      expect(belowMin.valid).toBe(false);
      expect(belowMin.errors.some((e) => e.rule === 'min')).toBe(true);

      expect(aboveMax.valid).toBe(false);
      expect(aboveMax.errors.some((e) => e.rule === 'max')).toBe(true);

      expect(isNaNResult.valid).toBe(false);
      expect(isNaNResult.errors.some((e) => e.rule === 'type')).toBe(true);
    });

    test('should validate email and url types', (): void => {
      const valid = validator.validate({
        name: 'User',
        email: 'user@example.com',
        website: 'https://example.com/path',
      });

      const invalid = validator.validate({
        name: 'User',
        email: 'invalid@',
        website: 'not a url',
      });

      expect(valid.valid).toBe(true);
      expect(valid.errors.length).toBe(0);

      expect(invalid.valid).toBe(false);
      // Expect at least one type error from email or url
      expect(invalid.errors.some((e) => e.rule === 'type')).toBe(true);
    });

    test('should validate array and object types', (): void => {
      const ok = validator.validate({
        name: 'Ok',
        tags: ['x'],
        profile: { role: 'dev' },
      });

      const arrayBad = validator.validate({
        name: 'Ok',
        tags: { not: 'array' },
      });

      const objBad = validator.validate({
        name: 'Ok',
        profile: ['not', 'object'],
      });

      expect(ok.valid).toBe(true);
      expect(arrayBad.valid).toBe(false);
      expect(arrayBad.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);

      expect(objBad.valid).toBe(false);
      expect(objBad.errors.some((e) => e.field === 'profile' && e.rule === 'type')).toBe(true);
    });

    test('should validate regex pattern', (): void => {
      const schema: ValidationSchema = {
        rules: [
          { field: 'code', type: 'string', pattern: /^[A-Z]+$/ },
        ],
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
      } as unknown as ValidationSchema;

      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ code: 'ABC' });
      const bad = localValidator.validate({ code: 'Abc123' });

      expect(ok.valid).toBe(true);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
    });

    test('should use custom errorMessage when provided', (): void => {
      const schema: ValidationSchema = {
        rules: [
          { field: 'x', type: 'number', required: true, errorMessage: 'Custom type error' },
        ],
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
      } as unknown as ValidationSchema;

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ x: 'not number' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.message).toBe('Custom type error');
    });

    test('should handle custom validator returning false', (): void => {
      const schema: ValidationSchema = {
        rules: [
          { field: 'score', type: 'number', customValidator: (_value: unknown): boolean => false },
        ],
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
      } as unknown as ValidationSchema;

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ score: 10 });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('score');
      expect(result.errors[0]?.rule).toBe('custom');
    });

    test('should catch and report errors thrown by custom validator', (): void => {
      const schema: ValidationSchema = {
        rules: [
          {
            field: 'data',
            type: 'string',
            customValidator: (_value: unknown): boolean => {
              throw new Error('boom');
            },
          },
        ],
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
      } as unknown as ValidationSchema;

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ data: 'ok' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(String(result.errors[0]?.message)).toContain('boom');
    });

    test('should error on unknown fields in Strict level when allowUnknownFields=false', (): void => {
      const result = validator.validate({
        name: 'User',
        unknownKey: 'value',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'unknownKey')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should warn on unknown fields in Lenient level when allowUnknownFields=false', (): void => {
      validator.setLevel(ValidationLevel.Lenient);
      const result = validator.validate({
        name: 'User',
        extra: 123,
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(1);
      expect(String(result.warnings[0])).toContain("Unknown field 'extra'");
      expect(result.sanitized).toBeDefined();
    });

    test('should not complain about unknown fields when allowUnknownFields=true', (): void => {
      const schema: ValidationSchema = {
        ...baseSchema,
        allowUnknownFields: true,
      } as ValidationSchema;
      const localValidator = new Validator(schema);

      const result = localValidator.validate({
        name: 'User',
        extra: 123,
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });

    test('should not include sanitized output when there are validation errors', (): void => {
      const result = validator.validate({
        name: 'A', // too short
      });

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('validateData helper', (): void => {
    test('should validate using helper and return consistent result', (): void => {
      const schema: ValidationSchema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        level: ValidationLevel.Strict,
        allowUnknownFields: true,
      } as unknown as ValidationSchema;

      const success = validateData({ name: 'John' }, schema);
      const failure = validateData({}, schema);

      expect(success.valid).toBe(true);
      expect(success.errors.length).toBe(0);

      expect(failure.valid).toBe(false);
      expect(failure.errors.some((e) => e.rule === 'required' && e.field === 'name')).toBe(true);
    });
  });
});
