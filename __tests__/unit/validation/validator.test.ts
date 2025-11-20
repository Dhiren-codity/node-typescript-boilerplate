import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Validator, validateData } from './validator.ts';
import type { ValidationLevel as ValidationLevelType } from './schemas.js';
import { ValidationLevel } from './schemas.js';

vi.mock('./schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Permissive: 'Permissive',
  },
}));

describe('Validator', (): void => {
  let validator: Validator;
  let schema: {
    rules: Array<Record<string, unknown>>;
    allowUnknownFields?: boolean;
    level: ValidationLevelType;
  };

  beforeEach((): void => {
    schema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
        { field: 'age', type: 'number', required: true, min: 0, max: 120 },
        { field: 'email', type: 'email', required: false },
        { field: 'website', type: 'url', required: false },
        { field: 'flag', type: 'boolean', required: false },
        { field: 'tags', type: 'array', required: false },
        { field: 'profile', type: 'object', required: false },
        { field: 'code', type: 'string', pattern: /^[A-Z]{3}-\d{3}$/ },
        {
          field: 'status',
          type: 'string',
          customValidator: (val: unknown): boolean => val === 'active' || val === 'inactive',
        },
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict as unknown as ValidationLevelType,
    };
    validator = new Validator(schema as unknown as Record<string, unknown> as never);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize correctly', (): void => {
      const currentSchema = validator.getSchema();
      expect(currentSchema).toBeDefined();
      expect(currentSchema.level).toBe(ValidationLevel.Strict);
      expect(Array.isArray((currentSchema as Record<string, unknown>).rules)).toBe(true);
    });
  });

  describe('validate', (): void => {
    test('should validate and sanitize valid data', (): void => {
      const data: Record<string, unknown> = {
        name: ' Alice ',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
        flag: true,
        tags: ['t1', 't2'],
        profile: { a: 1 },
        code: 'ABC-123',
        status: 'active',
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).toMatchObject({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
        flag: true,
        tags: ['t1', 't2'],
        profile: { a: 1 },
        code: 'ABC-123',
        status: 'active',
      });
    });

    test('should report required field missing', (): void => {
      const data: Record<string, unknown> = {
        age: 25,
        code: 'ABC-123',
        status: 'active',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            rule: 'required',
          }),
        ]),
      );
      expect(result.sanitized).toBeUndefined();
    });

    test('should trim string fields', (): void => {
      const data: Record<string, unknown> = {
        name: ' Bob  ',
        age: 20,
        code: 'ABC-123',
        status: 'inactive',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect((result.sanitized as Record<string, unknown>).name).toBe('Bob');
    });

    test('should validate string length boundaries (minLength, maxLength)', (): void => {
      const tooShort: Record<string, unknown> = {
        name: 'A',
        age: 20,
        code: 'ABC-123',
        status: 'active',
      };
      const shortRes = validator.validate(tooShort);
      expect(shortRes.valid).toBe(false);
      expect(shortRes.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'minLength' }),
        ]),
      );

      const tooLong: Record<string, unknown> = {
        name: 'VeryLongName',
        age: 20,
        code: 'ABC-123',
        status: 'active',
      };
      const longRes = validator.validate(tooLong);
      expect(longRes.valid).toBe(false);
      expect(longRes.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'maxLength' }),
        ]),
      );
    });

    test('should validate number range (min, max) including zero boundary', (): void => {
      const belowMin: Record<string, unknown> = {
        name: 'Ok',
        age: -1,
        code: 'ABC-123',
        status: 'active',
      };
      const belowRes = validator.validate(belowMin);
      expect(belowRes.valid).toBe(false);
      expect(belowRes.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'min' }),
        ]),
      );

      const aboveMax: Record<string, unknown> = {
        name: 'Ok',
        age: 130,
        code: 'ABC-123',
        status: 'active',
      };
      const aboveRes = validator.validate(aboveMax);
      expect(aboveRes.valid).toBe(false);
      expect(aboveRes.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'max' }),
        ]),
      );

      const boundary: Record<string, unknown> = {
        name: 'Ok',
        age: 0,
        code: 'ABC-123',
        status: 'active',
      };
      const boundaryRes = validator.validate(boundary);
      expect(boundaryRes.valid).toBe(true);
    });

    test('should validate pattern mismatch', (): void => {
      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 25,
        code: 'abc-123',
        status: 'active',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'code', rule: 'pattern' }),
        ]),
      );
    });

    test('should handle custom validator failure', (): void => {
      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 25,
        code: 'ABC-123',
        status: 'pending',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'status', rule: 'custom' }),
        ]),
      );
    });

    test('should catch custom validator exceptions (catch)', (): void => {
      const throwingSchema = {
        ...schema,
        rules: schema.rules.map((r) =>
          r.field === 'status'
            ? ({
                ...r,
                customValidator: (_val: unknown): boolean => {
                  throw new Error('boom');
                },
              } as Record<string, unknown>)
            : r,
        ),
      } as unknown as typeof schema;

      const throwingValidator = new Validator(
        throwingSchema as unknown as Record<string, unknown> as never,
      );

      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 22,
        code: 'ABC-123',
        status: 'active',
      };
      const result = throwingValidator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            rule: 'custom_error',
            message: expect.stringContaining('boom'),
          }),
        ]),
      );
    });

    test('should validate email and url types (switch branch coverage)', (): void => {
      const validData: Record<string, unknown> = {
        name: 'Ok',
        age: 25,
        email: 'user@example.com',
        website: 'https://valid.example',
        code: 'ABC-123',
        status: 'active',
      };
      const validRes = validator.validate(validData);
      expect(validRes.valid).toBe(true);

      const invalidData: Record<string, unknown> = {
        name: 'Ok',
        age: 25,
        email: 'not-an-email',
        website: 'ht!tp://bad',
        code: 'ABC-123',
        status: 'active',
      };
      const invalidRes = validator.validate(invalidData);
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', rule: 'type' }),
          expect.objectContaining({ field: 'website', rule: 'type' }),
        ]),
      );
    });

    test('should validate array, object, boolean type mismatches (switch branch coverage)', (): void => {
      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 25,
        code: 'ABC-123',
        status: 'active',
        tags: {} as unknown, // expected array
        profile: [] as unknown, // expected object (non-array)
        flag: 'true' as unknown, // expected boolean
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'tags', rule: 'type' }),
          expect.objectContaining({ field: 'profile', rule: 'type' }),
          expect.objectContaining({ field: 'flag', rule: 'type' }),
        ]),
      );
    });

    test('should treat unknown fields as errors in Strict mode', (): void => {
      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 20,
        code: 'ABC-123',
        status: 'active',
        unknownField: 123,
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'unknownField', rule: 'unknown_field' }),
        ]),
      );
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeUndefined();
    });

    test('should treat unknown fields as warnings in Permissive mode', (): void => {
      const permissiveValidator = new Validator({
        ...schema,
        level: ValidationLevel.Permissive as unknown as ValidationLevelType,
      } as unknown as Record<string, unknown> as never);

      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 20,
        code: 'ABC-123',
        status: 'active',
        extra: true,
      };
      const result = permissiveValidator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining("Unknown field 'extra'")]),
      );
      expect(result.sanitized).toBeDefined();
    });

    test('should skip unknown field checks when allowUnknownFields is true', (): void => {
      const allowUnknownSchema = {
        ...schema,
        allowUnknownFields: true,
      } as unknown as typeof schema;
      const allowUnknownValidator = new Validator(
        allowUnknownSchema as unknown as Record<string, unknown> as never,
      );

      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 20,
        code: 'ABC-123',
        status: 'active',
        extra: 'ignored',
      };
      const result = allowUnknownValidator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should not sanitize number from string when type is number (type mismatch)', (): void => {
      const data: Record<string, unknown> = {
        name: 'Ok',
        age: '42', // wrong type
        code: 'ABC-123',
        status: 'active',
      };
      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'age', rule: 'type' })]),
      );
      expect(result.sanitized).toBeUndefined();
    });

    test('should allow null when not required and omit from sanitized', (): void => {
      const optionalSchema = {
        ...schema,
        rules: schema.rules.map((r) =>
          r.field === 'email'
            ? ({ ...r, required: false } as Record<string, unknown>)
            : r,
        ),
      } as unknown as typeof schema;
      const optValidator = new Validator(
        optionalSchema as unknown as Record<string, unknown> as never,
      );

      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 33,
        code: 'ABC-123',
        status: 'active',
        email: null as unknown,
      };
      const result = optValidator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).email).toBeUndefined();
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy of schema', (): void => {
      const returned = validator.getSchema();
      expect(returned).not.toBe(schema);
      expect(returned.level).toBe(schema.level);
    });
  });

  describe('getLevel', (): void => {
    test('should get current validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      validator.setLevel(ValidationLevel.Permissive as unknown as ValidationLevelType);
      expect(validator.getLevel()).toBe(ValidationLevel.Permissive);
    });
  });

  describe('validateData function', (): void => {
    test('should validate via helper and match class behavior', (): void => {
      const data: Record<string, unknown> = {
        name: ' Carol ',
        age: 45,
        code: 'ABC-123',
        status: 'inactive',
      };

      const viaClass = validator.validate(data);
      const viaHelper = validateData(data, schema as unknown as Record<string, unknown> as never);
      expect(viaHelper.valid).toBe(true);
      expect(viaHelper).toMatchObject({
        valid: viaClass.valid,
        errors: viaClass.errors,
        warnings: viaClass.warnings,
      });
      expect((viaHelper.sanitized as Record<string, unknown>).name).toBe('Carol');
    });
  });
});
