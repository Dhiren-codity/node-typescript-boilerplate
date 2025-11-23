import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
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
  let baseSchema: ConstructorParameters<typeof Validator>[0];

  beforeEach((): void => {
    baseSchema = {
      rules: [
        {
          field: 'username',
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 10,
        },
        {
          field: 'age',
          type: 'number',
          min: 18,
          max: 60,
        },
        {
          field: 'email',
          type: 'email',
        },
        {
          field: 'website',
          type: 'url',
        },
        {
          field: 'tags',
          type: 'array',
        },
        {
          field: 'meta',
          type: 'object',
        },
        {
          field: 'isActive',
          type: 'boolean',
        },
        {
          field: 'code',
          type: 'string',
          pattern: /^[A-Z]{3}-\d{3}$/,
        },
        {
          field: 'custom',
          type: 'string',
          customValidator: (_value: unknown): boolean => true,
        },
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict,
    } as unknown as ConstructorParameters<typeof Validator>[0];

    validator = new Validator(baseSchema);
  });



  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema and level', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      const returnedSchema = validator.getSchema();
      expect(returnedSchema).toBeDefined();
      expect(Array.isArray(returnedSchema.rules)).toBe(true);
    });
  });

  describe('getSchema', (): void => {
    test('should return a new object (shallow copy)', (): void => {
      const s1 = validator.getSchema();
      const s2 = validator.getSchema();
      expect(s1).not.toBe(s2);
    });

    test('modifying returned schema level should not affect validator internal level', (): void => {
      const returned = validator.getSchema();
      returned.level = ValidationLevel.Lenient;
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
    test('should validate required fields and return error when missing', (): void => {
      const result = validator.validate({
        age: 30,
      } as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'username',
            rule: 'required',
          }),
        ]),
      );
    });

    test('should pass when optional fields are absent', (): void => {
      const result = validator.validate({
        username: 'Alice',
        age: 25,
      } as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.sanitized).toBeDefined();
    });

    test('should trim string values in sanitized output', (): void => {
      const data = {
        username: '  Alice  ',
        age: 25,
      } as Record<string, unknown>;
      const result = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.username).toBe('Alice');
    });

    test('should enforce string minLength and maxLength', (): void => {
      const tooShort = validator.validate({
        username: 'ab',
        age: 20,
      } as Record<string, unknown>);

      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username', rule: 'minLength' }),
        ]),
      );

      const tooLong = validator.validate({
        username: 'averylongusername',
        age: 20,
      } as Record<string, unknown>);

      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username', rule: 'maxLength' }),
        ]),
      );
    });

    test('should validate number min and max range', (): void => {
      const tooYoung = validator.validate({
        username: 'Bob',
        age: 17,
      } as Record<string, unknown>);

      expect(tooYoung.valid).toBe(false);
      expect(tooYoung.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'min' }),
        ]),
      );

      const tooOld = validator.validate({
        username: 'Bob',
        age: 61,
      } as Record<string, unknown>);

      expect(tooOld.valid).toBe(false);
      expect(tooOld.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'max' }),
        ]),
      );
    });

    test('should validate regex pattern for string field', (): void => {
      const badPattern = validator.validate({
        username: 'Bob',
        age: 30,
        code: 'abc-123',
      } as Record<string, unknown>);
      expect(badPattern.valid).toBe(false);
      expect(badPattern.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'code', rule: 'pattern' }),
        ]),
      );

      const goodPattern = validator.validate({
        username: 'Bob',
        age: 30,
        code: 'ABC-123',
      } as Record<string, unknown>);
      expect(goodPattern.valid).toBe(true);
      expect(goodPattern.errors.length).toBe(0);
    });

    test('should validate email and url types via switch(type)', (): void => {
      const invalids = validator.validate({
        username: 'Carl',
        age: 30,
        email: 'not-an-email',
        website: 'htp://bad url',
      } as Record<string, unknown>);

      expect(invalids.valid).toBe(false);
      expect(invalids.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', rule: 'type' }),
          expect.objectContaining({ field: 'website', rule: 'type' }),
        ]),
      );

      const valids = validator.validate({
        username: 'Carl',
        age: 30,
        email: 'carl@example.com',
        website: 'https://example.com/path?x=1',
      } as Record<string, unknown>);

      expect(valids.valid).toBe(true);
      expect(valids.errors.length).toBe(0);
    });

    test('should validate array, object, and boolean types', (): void => {
      const result = validator.validate({
        username: 'Dana',
        age: 30,
        tags: ['a', 'b'],
        meta: { a: 1 },
        isActive: true,
      } as Record<string, unknown>);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should fail when object field is an array', (): void => {
      const result = validator.validate({
        username: 'Eve',
        age: 30,
        meta: [],
      } as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'meta', rule: 'type' }),
        ]),
      );
    });

    test('should record unknown fields as errors in Strict level', (): void => {
      const result = validator.validate({
        username: 'Frank',
        age: 30,
        extra: 'nope',
      } as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'extra', rule: 'unknown_field' }),
        ]),
      );
      expect(result.warnings.length).toBe(0);
    });

    test('should record unknown fields as warnings in Lenient level', (): void => {
      validator.setLevel(ValidationLevel.Lenient);

      const result = validator.validate({
        username: 'Gina',
        age: 30,
        extra: 'ok',
      } as Record<string, unknown>);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining("Unknown field 'extra'")]),
      );
    });

    test('should ignore unknown fields when allowUnknownFields is true', (): void => {
      const localSchema = {
        ...(validator.getSchema() as Record<string, unknown>),
        allowUnknownFields: true,
      } as unknown as ConstructorParameters<typeof Validator>[0];

      const localValidator = new Validator(localSchema);
      const result = localValidator.validate({
        username: 'Hank',
        age: 30,
        unknown1: 1,
        unknown2: 2,
      } as Record<string, unknown>);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toBeDefined();
      // Unknowns are not included in sanitized output
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'unknown1')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'unknown2')).toBe(false);
    });

    test('should produce type error for unknown rule.type via switch default', (): void => {
      const unknownTypeSchema = {
        rules: [
          {
            field: 'mystery',
            // @ts-expect-error - intentionally using unknown type to trigger default case
            type: 'mystery-type',
            required: true,
          },
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      } as unknown as ConstructorParameters<typeof Validator>[0];

      const v = new Validator(unknownTypeSchema);
      const result = v.validate({ mystery: 123 } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'mystery', rule: 'type' }),
        ]),
      );
    });

    test('should add custom validation error when customValidator returns false', (): void => {
      const customFailSchema = {
        ...(validator.getSchema() as Record<string, unknown>),
      } as unknown as ConstructorParameters<typeof Validator>[0];

      // Replace custom rule with failing one
      const rules = (customFailSchema as unknown as { rules: Array<Record<string, unknown>> }).rules;
      const idx = rules.findIndex((r: Record<string, unknown>) => r.field === 'custom');
      rules[idx] = {
        field: 'custom',
        type: 'string',
        customValidator: (_value: unknown): boolean => false,
      };

      const v = new Validator(customFailSchema);
      const result = v.validate({
        username: 'Ivy',
        age: 30,
        custom: 'value',
      } as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'custom', rule: 'custom' }),
        ]),
      );
    });

    test('should capture exception thrown by customValidator and report custom_error', (): void => {
      const customThrowSchema = {
        ...(validator.getSchema() as Record<string, unknown>),
      } as unknown as ConstructorParameters<typeof Validator>[0];

      const rules = (customThrowSchema as unknown as { rules: Array<Record<string, unknown>> }).rules;
      const idx = rules.findIndex((r: Record<string, unknown>) => r.field === 'custom');
      rules[idx] = {
        field: 'custom',
        type: 'string',
        customValidator: (_value: unknown): boolean => {
          throw new Error('boom');
        },
      };

      const v = new Validator(customThrowSchema);
      const result = v.validate({
        username: 'Jay',
        age: 30,
        custom: 'value',
      } as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'custom',
            rule: 'custom_error',
            message: expect.stringContaining('boom'),
          }),
        ]),
      );
    });

    test('should not include undefined optional fields in sanitized output', (): void => {
      const result = validator.validate({
        username: 'Kim',
        age: 30,
      } as Record<string, unknown>);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'email')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'website')).toBe(false);
    });

    test('should report type errors for mismatched types', (): void => {
      const result = validator.validate({
        username: 'Leo',
        age: '25', // string instead of number
        tags: 'not-array',
        meta: 'not-object',
        isActive: 'true',
      } as unknown as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'age', rule: 'type' }),
          expect.objectContaining({ field: 'tags', rule: 'type' }),
          expect.objectContaining({ field: 'meta', rule: 'type' }),
          expect.objectContaining({ field: 'isActive', rule: 'type' }),
        ]),
      );
    });

    test('should not convert numeric strings to numbers due to type validation failure', (): void => {
      const result = validator.validate({
        username: 'Max',
        age: '42',
      } as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'age', rule: 'type' })]),
      );
    });
  });

  describe('validateData helper', (): void => {
    test('should validate using helper function and return sanitized output', (): void => {
      const simpleSchema = {
        rules: [
          { field: 'name', type: 'string', required: true },
          { field: 'count', type: 'number' },
        ],
        allowUnknownFields: true,
        level: ValidationLevel.Lenient,
      } as unknown as ConstructorParameters<typeof Validator>[0];

      const result = validateData(
        { name: '  Zara  ', count: 3 } as Record<string, unknown>,
        simpleSchema,
      );

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.sanitized?.name).toBe('Zara');
      expect(result.sanitized?.count).toBe(3);
    });

    test('should surface errors through helper when invalid', (): void => {
      const simpleSchema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      } as unknown as ConstructorParameters<typeof Validator>[0];

      const result = validateData({} as Record<string, unknown>, simpleSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name', rule: 'required' })]),
      );
      expect(result.sanitized).toBeUndefined();
    });
  });
});
