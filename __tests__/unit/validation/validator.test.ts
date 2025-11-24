import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
import { Validator, validateData } from '../../src/validation/validator.ts';
import { ValidationLevel } from '../../src/validation/schemas.js';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => {
  return {
    ValidationLevel: {
      Strict: 'Strict',
      Lenient: 'Lenient',
    },
  };
});

  ValidationSchema,
  ValidationRule,
  ValidationResult,
  ValidationError,
} from '../../src/validation/schemas.js';


describe('Validator', (): void => {
  let schema: ValidationSchema;
  let validator: Validator;

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
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Lenient as unknown as ValidationLevel,
    } as ValidationSchema;

    validator = new Validator(schema);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema and default state', (): void => {
      expect(validator).toBeDefined();
      const currentSchema = validator.getSchema();
      expect(currentSchema.rules).toBe(schema.rules);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });

  describe('validate', (): void => {
    test('should validate and sanitize valid string data (trimming)', (): void => {
      const input: Record<string, unknown> = { name: '  Alice  ' };
      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.['name']).toBe('Alice');
    });

    test('should produce required error when field is missing', (): void => {
      const input: Record<string, unknown> = {};
      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

    test('should produce type error for invalid type', (): void => {
      const input: Record<string, unknown> = { name: 123 };
      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.field).toBe('name');
    });

    test('should enforce string minLength', (): void => {
      const input: Record<string, unknown> = { name: 'a' };
      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: ValidationError): boolean => e.rule === 'minLength')).toBe(true);
    });

    test('should enforce string maxLength', (): void => {
      const input: Record<string, unknown> = { name: 'abcdefghijkl' };
      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: ValidationError): boolean => e.rule === 'maxLength')).toBe(true);
    });

    test('should validate pattern mismatch', (): void => {
      const patternSchema: ValidationSchema = {
        rules: [
          {
            field: 'username',
            type: 'string',
            required: true,
            pattern: /^[a-z0-9_]+$/i,
          } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(patternSchema);

      const bad: Record<string, unknown> = { username: 'bad name!' };
      const result: ValidationResult = localValidator.validate(bad);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('pattern');
      expect(result.errors[0]?.field).toBe('username');
    });

    test('should add error when custom validator returns false', (): void => {
      const customSchema: ValidationSchema = {
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => false,
          } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(customSchema);

      const input: Record<string, unknown> = { code: 'OK' };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
      expect(result.errors[0]?.field).toBe('code');
    });

    test('should capture thrown error from custom validator (custom_error)', (): void => {
      const customSchema: ValidationSchema = {
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => {
              throw new Error('boom');
            },
          } as ValidationRule,
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(customSchema);

      const input: Record<string, unknown> = { code: 'OK' };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('boom');
    });

    test('should warn on unknown fields when level is Lenient', (): void => {
      const unknownSchema: ValidationSchema = {
        rules: [],
        allowUnknownFields: false,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(unknownSchema);

      const input: Record<string, unknown> = { unknown: 1 };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain("Unknown field 'unknown'");
      expect(result.sanitized).toEqual({});
    });

    test('should error on unknown fields when level is Strict', (): void => {
      const unknownSchema: ValidationSchema = {
        rules: [],
        allowUnknownFields: false,
        level: ValidationLevel.Strict as unknown as ValidationLevel,
      };
      const localValidator = new Validator(unknownSchema);

      const input: Record<string, unknown> = { unknown: 1 };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.rule).toBe('unknown_field');
      expect(result.errors[0]?.field).toBe('unknown');
      expect(result.sanitized).toBeUndefined();
    });

    test('should allow unknown fields when allowUnknownFields is true', (): void => {
      const unknownSchema: ValidationSchema = {
        rules: [],
        allowUnknownFields: true,
        level: ValidationLevel.Strict as unknown as ValidationLevel,
      };
      const localValidator = new Validator(unknownSchema);

      const input: Record<string, unknown> = { unknown: 1 };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toEqual({});
    });

    test('should validate email type correctly', (): void => {
      const emailSchema: ValidationSchema = {
        rules: [
          {
            field: 'email',
            type: 'email',
            required: true,
          } as ValidationRule,
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(emailSchema);

      const good: Record<string, unknown> = { email: 'user@example.com' };
      const bad: Record<string, unknown> = { email: 'not-an-email' };

      const goodResult: ValidationResult = localValidator.validate(good);
      expect(goodResult.valid).toBe(true);

      const badResult: ValidationResult = localValidator.validate(bad);
      expect(badResult.valid).toBe(false);
      expect(badResult.errors[0]?.rule).toBe('type');
    });

    test('should validate url type correctly', (): void => {
      const urlSchema: ValidationSchema = {
        rules: [
          {
            field: 'site',
            type: 'url',
            required: true,
          } as ValidationRule,
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(urlSchema);

      const good: Record<string, unknown> = { site: 'https://example.com' };
      const bad: Record<string, unknown> = { site: 'not a url' };

      const goodResult: ValidationResult = localValidator.validate(good);
      expect(goodResult.valid).toBe(true);

      const badResult: ValidationResult = localValidator.validate(bad);
      expect(badResult.valid).toBe(false);
      expect(badResult.errors[0]?.rule).toBe('type');
    });

    test('should validate number with min and max', (): void => {
      const numberSchema: ValidationSchema = {
        rules: [
          { field: 'age', type: 'number', required: true, min: 18, max: 65 } as ValidationRule,
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(numberSchema);

      const ok: ValidationResult = localValidator.validate({ age: 30 });
      expect(ok.valid).toBe(true);

      const tooYoung: ValidationResult = localValidator.validate({ age: 17 });
      expect(tooYoung.valid).toBe(false);
      expect(tooYoung.errors.some((e: ValidationError): boolean => e.rule === 'min')).toBe(true);

      const tooOld: ValidationResult = localValidator.validate({ age: 70 });
      expect(tooOld.valid).toBe(false);
      expect(tooOld.errors.some((e: ValidationError): boolean => e.rule === 'max')).toBe(true);
    });

    test('should fail number type when NaN is provided', (): void => {
      const numberSchema: ValidationSchema = {
        rules: [{ field: 'n', type: 'number', required: true } as ValidationRule],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(numberSchema);

      const result: ValidationResult = localValidator.validate({ n: Number.NaN });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
    });

    test('should validate boolean type', (): void => {
      const boolSchema: ValidationSchema = {
        rules: [{ field: 'subscribe', type: 'boolean', required: true } as ValidationRule],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(boolSchema);

      const ok: ValidationResult = localValidator.validate({ subscribe: true });
      expect(ok.valid).toBe(true);

      const bad: ValidationResult = localValidator.validate({ subscribe: 'true' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

    test('should validate array type', (): void => {
      const arraySchema: ValidationSchema = {
        rules: [{ field: 'tags', type: 'array', required: true } as ValidationRule],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(arraySchema);

      const ok: ValidationResult = localValidator.validate({ tags: ['a', 'b'] });
      expect(ok.valid).toBe(true);

      const bad: ValidationResult = localValidator.validate({ tags: { a: 1 } });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

    test('should validate object type', (): void => {
      const objectSchema: ValidationSchema = {
        rules: [{ field: 'meta', type: 'object', required: true } as ValidationRule],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(objectSchema);

      const ok: ValidationResult = localValidator.validate({ meta: { a: 1 } });
      expect(ok.valid).toBe(true);

      const badArray: ValidationResult = localValidator.validate({ meta: [] });
      expect(badArray.valid).toBe(false);
      expect(badArray.errors[0]?.rule).toBe('type');
    });

    test('should not error when optional field is missing and should not include it in sanitized', (): void => {
      const optSchema: ValidationSchema = {
        rules: [{ field: 'nickname', type: 'string', required: false } as ValidationRule],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(optSchema);

      const result: ValidationResult = localValidator.validate({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({});
    });
  });

  describe('getLevel / setLevel', (): void => {
    test('should update validation level and affect unknown fields behavior', (): void => {
      // Start lenient: unknown -> warning
      const lenientSchema: ValidationSchema = {
        rules: [],
        allowUnknownFields: false,
        level: ValidationLevel.Lenient as unknown as ValidationLevel,
      };
      const localValidator = new Validator(lenientSchema);

      let result: ValidationResult = localValidator.validate({ extra: 1 });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(1);

      // Switch to Strict: unknown -> error
      localValidator.setLevel(ValidationLevel.Strict as unknown as ValidationLevel);
      expect(localValidator.getLevel()).toBe(ValidationLevel.Strict);

      result = localValidator.validate({ extra: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.rule).toBe('unknown_field');
    });
  });
});

describe('validateData helper', (): void => {
  test('should validate via helper and return expected result', (): void => {
    const schema: ValidationSchema = {
      rules: [
        { field: 'name', type: 'string', required: true } as ValidationRule,
        { field: 'age', type: 'number', required: true, min: 1 } as ValidationRule,
      ],
      allowUnknownFields: true,
      level: ValidationLevel.Lenient as unknown as ValidationLevel,
    };

    const result: ValidationResult = validateData(
      { name: '  Bob ', age: 10 },
      schema,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.sanitized?.['name']).toBe('Bob');
    expect(result.sanitized?.['age']).toBe(10);
  });

  test('should capture errors via helper when invalid', (): void => {
    const schema: ValidationSchema = {
      rules: [{ field: 'age', type: 'number', required: true, min: 5 } as ValidationRule],
      allowUnknownFields: true,
      level: ValidationLevel.Lenient as unknown as ValidationLevel,
    };

    const result: ValidationResult = validateData({ age: 3 }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: ValidationError): boolean => e.rule === 'min')).toBe(true);
    expect(result.sanitized).toBeUndefined();
  });

  test('should handle unknown field behavior based on provided level', (): void => {
    const schemaStrict: ValidationSchema = {
      rules: [],
      allowUnknownFields: false,
      level: ValidationLevel.Strict as unknown as ValidationLevel,
    };

    const strictResult: ValidationResult = validateData({ unknown: true }, schemaStrict);
    expect(strictResult.valid).toBe(false);
    expect(strictResult.errors[0]?.rule).toBe('unknown_field');

    const schemaLenient: ValidationSchema = {
      rules: [],
      allowUnknownFields: false,
      level: ValidationLevel.Lenient as unknown as ValidationLevel,
    };

    const lenientResult: ValidationResult = validateData({ unknown: true }, schemaLenient);
    expect(lenientResult.valid).toBe(true);
    expect(lenientResult.warnings.length).toBe(1);
  });
});
