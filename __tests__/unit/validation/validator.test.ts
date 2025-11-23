import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema } from '../../src/validation/schemas.js';
import { Validator, validateData } from '../../src/validation/validator.js';
import { ValidationLevel } from '../../src/validation/schemas.js';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'strict',
    Lenient: 'lenient',
  },
}));


describe('Validator', (): void => {
  let validator: Validator;
  let baseSchema: unknown;

  beforeEach((): void => {
    baseSchema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict,
    };
    validator = new Validator(baseSchema as unknown as ValidationSchema);
  });


// Mock schemas dependency used by the Validator

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize correctly with provided schema', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);

      const schemaCopy = validator.getSchema() as Record<string, unknown>;
      expect(Array.isArray(schemaCopy.rules as unknown[])).toBe(true);
      expect(schemaCopy.level).toBe(ValidationLevel.Strict);
      expect(schemaCopy.allowUnknownFields).toBe(false);
    });
  });

  describe('validate', (): void => {
    test('should validate and sanitize a valid string field (trimmed)', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: '  Alice  ' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Alice' });
    });

    test('should report required error when field is missing (undefined)', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({});
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toEqual([
        {
          field: 'name',
          value: undefined,
          message: "Field 'name' is required",
          rule: 'required',
        },
      ]);
    });

    test('should report required error when field is null', (): void => {
      const schema = {
        rules: [{ field: 'age', type: 'number', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ age: null });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.errors[0]?.field).toBe('age');
    });

    test('should enforce string length boundaries', (): void => {
      const schema = {
        rules: [{ field: 'username', type: 'string', required: true, minLength: 3, maxLength: 5 }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const tooShort = v.validate({ username: 'ab' });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors.find((e) => e.rule === 'minLength')?.message).toBe("Field 'username' must be at least 3 characters");

      const tooLong = v.validate({ username: 'abcdef' });
      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors.find((e) => e.rule === 'maxLength')?.message).toBe("Field 'username' must not exceed 5 characters");

      const ok = v.validate({ username: 'abcd' });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);
      expect(ok.sanitized).toEqual({ username: 'abcd' });
    });

    test('should validate number type and enforce range', (): void => {
      const schema = {
        rules: [{ field: 'score', type: 'number', required: true, min: 10, max: 20 }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const below = v.validate({ score: 5 });
      expect(below.valid).toBe(false);
      expect(below.errors.find((e) => e.rule === 'min')?.message).toBe("Field 'score' must be at least 10");

      const above = v.validate({ score: 30 });
      expect(above.valid).toBe(false);
      expect(above.errors.find((e) => e.rule === 'max')?.message).toBe("Field 'score' must not exceed 20");

      const ok = v.validate({ score: 15 });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);
      expect(ok.sanitized).toEqual({ score: 15 });
    });

    test('should treat NaN as invalid number type', (): void => {
      const schema = {
        rules: [{ field: 'value', type: 'number', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ value: Number.NaN });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.message).toBe("Field 'value' must be of type number");
    });

    test('should validate boolean, array, and object types', (): void => {
      const schema = {
        rules: [
          { field: 'flag', type: 'boolean', required: true },
          { field: 'items', type: 'array', required: true },
          { field: 'meta', type: 'object', required: true },
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ flag: true, items: [1, 2], meta: { a: 1 } });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual({ flag: true, items: [1, 2], meta: { a: 1 } });
    });

    test('should validate email type correctly', (): void => {
      const schema = {
        rules: [{ field: 'email', type: 'email', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const bad = v.validate({ email: 'not-an-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');

      const good = v.validate({ email: 'user@example.com' });
      expect(good.valid).toBe(true);
      expect(good.errors).toHaveLength(0);
      expect(good.sanitized).toEqual({ email: 'user@example.com' });
    });

    test('should validate url type using URL parser', (): void => {
      const schema = {
        rules: [{ field: 'homepage', type: 'url', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const bad = v.validate({ homepage: 'invalid url' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');

      const good = v.validate({ homepage: 'https://example.org/path?q=1' });
      expect(good.valid).toBe(true);
      expect(good.errors).toHaveLength(0);
      expect(good.sanitized).toEqual({ homepage: 'https://example.org/path?q=1' });
    });

    test('should apply pattern validation and use custom error message', (): void => {
      const schema = {
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            pattern: /^[A-Z]{3}$/,
            errorMessage: 'Code must be three uppercase letters',
          },
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const bad = v.validate({ code: 'ab1' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
      expect(bad.errors[0]?.message).toBe('Code must be three uppercase letters');

      const good = v.validate({ code: 'ABC' });
      expect(good.valid).toBe(true);
    });

    test('should handle customValidator returning false', (): void => {
      const schema = {
        rules: [
          {
            field: 'token',
            type: 'string',
            required: true,
            customValidator: (_value: unknown): boolean => false,
            errorMessage: 'Token failed validation',
          },
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ token: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
      expect(result.errors[0]?.message).toBe('Token failed validation');
    });

    test('should catch errors thrown by customValidator and report custom_error', (): void => {
      const errorMessage = 'boom';
      const schema = {
        rules: [
          {
            field: 'payload',
            type: 'object',
            required: true,
            customValidator: (): boolean => {
              throw new Error(errorMessage);
            },
          },
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ payload: { ok: true } });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toBe(`Custom validator threw error: ${errorMessage}`);
    });

    test('should produce errors for unknown fields in Strict level', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: 'Bob', extra: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors.find((e) => e.rule === 'unknown_field')?.field).toBe('extra');
      expect(result.sanitized).toBeUndefined();
    });

    test('should produce warnings (not errors) for unknown fields when not Strict', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Lenient,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: 'Bob', unknown: 'x' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toEqual(["Unknown field 'unknown' found in data"]);
      expect(result.sanitized).toEqual({ name: 'Bob' });
    });

    test('should ignore unknown fields completely when allowUnknownFields is true', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: 'Bob', extra: 1 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Bob' });
    });

    test('should report type error for unsupported rule type (default switch branch)', (): void => {
      const schema = {
        rules: [{ field: 'mystery', type: 'unknown_type', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ mystery: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.message).toBe("Field 'mystery' must be of type unknown_type");
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy of schema (top-level mutation does not affect internal schema)', (): void => {
      const schemaCopy = validator.getSchema() as { level: unknown; allowUnknownFields: unknown };
      const originalLevel = validator.getLevel();
      expect(schemaCopy.level).toBe(originalLevel);

      // Mutate copy and verify validator's schema is not changed at top level
      schemaCopy.level = ValidationLevel.Lenient;
      schemaCopy.allowUnknownFields = true;
      expect(validator.getLevel()).toBe(originalLevel);
      const schemaCopy2 = validator.getSchema() as { allowUnknownFields: unknown };
      expect(schemaCopy2.allowUnknownFields).toBe(false);
    });
  });

  describe('getLevel', (): void => {
    test('should return current validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      validator.setLevel(ValidationLevel.Lenient);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });
});

describe('validateData helper', (): void => {
  test('should validate data and return sanitized output when valid', (): void => {
    const schema = {
      rules: [{ field: 'title', type: 'string', required: true }],
      allowUnknownFields: true,
      level: ValidationLevel.Strict,
    };

    const result = validateData({ title: '  Hello  ' }, schema as unknown as ValidationSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized).toEqual({ title: 'Hello' });
  });

  test('should return errors and no sanitized output when invalid', (): void => {
    const schema = {
      rules: [{ field: 'age', type: 'number', required: true }],
      allowUnknownFields: true,
      level: ValidationLevel.Strict,
    };

    const result = validateData({ age: '20' as unknown }, schema as unknown as ValidationSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.sanitized).toBeUndefined();
  });
});
