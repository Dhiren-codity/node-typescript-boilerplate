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

      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect((result.sanitized as Record<string, unknown>).name).toBe('Bob');
    });

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

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'code', rule: 'pattern' }),
        ]),
      );
    });

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'status', rule: 'custom' }),
        ]),
      );
    });


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

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'age', rule: 'type' })]),
      );
      expect(result.sanitized).toBeUndefined();
    });

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
