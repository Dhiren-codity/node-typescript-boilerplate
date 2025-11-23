import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
import { Validator, validateData } from './validator.js';
import { ValidationLevel } from './schemas.js';

vi.mock('./schemas.js', (): Record<string, unknown> => ({
});



  ValidationSchema,
  ValidationResult,
  ValidationError,
} from './schemas.js';


  ValidationLevel: {
    Strict: 'Strict',
    Lenient: 'Lenient',
  },
}));


describe('Validator', (): void => {
  let schema: ValidationSchema;
  let validator: Validator;

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
          pattern: /^[A-Za-z ]+$/,
        },
        {
          field: 'age',
          type: 'number',
          required: true,
          min: 18,
          max: 99,
          customValidator: (v: unknown): boolean =>
            typeof v === 'number' && Number.isInteger(v),
        },
        {
          field: 'email',
          type: 'email',
          required: false,
        },
        {
          field: 'website',
          type: 'url',
          required: false,
        },
        {
          field: 'tags',
          type: 'array',
          required: false,
        },
        {
          field: 'meta',
          type: 'object',
          required: false,
        },
        {
          field: 'active',
          type: 'boolean',
          required: false,
        },
      ],
    };
    validator = new Validator(schema);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize correctly with provided schema', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getSchema()).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

  describe('validate', (): void => {
    test('should validate valid data and return sanitized output (string trimmed)', (): void => {
      const data: Record<string, unknown> = {
        name: ' Alice ',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
        tags: ['a', 'b'],
        meta: { key: 'value' },
        active: true,
      };

      const result: ValidationResult = validator.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).toEqual({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
        tags: ['a', 'b'],
        meta: { key: 'value' },
        active: true,
      });
    });

    test('should report error when required field is missing', (): void => {
      const data: Record<string, unknown> = {
        age: 25,
      };

      const result: ValidationResult = validator.validate(data);

      expect(result.valid).toBe(false);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'required',
      );
      expect(err).toBeDefined();
      expect(result.sanitized).toBeUndefined();
    });

    test('should report type error for mismatched number type', (): void => {
      const data: Record<string, unknown> = {
        name: 'Bob',
        age: '30',
      };

      const result: ValidationResult = validator.validate(data);

      expect(result.valid).toBe(false);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'type',
      );
      expect(err).toBeDefined();
      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce string minLength', (): void => {
      const data: Record<string, unknown> = {
        name: 'A',
        age: 30,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'minLength',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should enforce string maxLength', (): void => {
      const data: Record<string, unknown> = {
        name: 'NameIsTooLong',
        age: 30,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'maxLength',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should enforce number min range', (): void => {
      const data: Record<string, unknown> = {
        name: 'Bob',
        age: 16,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'min',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should enforce number max range', (): void => {
      const data: Record<string, unknown> = {
        name: 'Bob',
        age: 120,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'max',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should validate pattern for string fields', (): void => {
      const data: Record<string, unknown> = {
        name: 'Alice1',
        age: 30,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'pattern',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should validate email type', (): void => {
      const valid: Record<string, unknown> = {
        name: 'Bob',
        age: 30,
        email: 'bob@example.com',
      };
      const invalid: Record<string, unknown> = {
        name: 'Bob',
        age: 30,
        email: 'not-an-email',
      };

      const ok: ValidationResult = validator.validate(valid);
      expect(ok.valid).toBe(true);

      const bad: ValidationResult = validator.validate(invalid);
      const err: ValidationError | undefined = bad.errors.find(
        (e: ValidationError): boolean => e.field === 'email' && e.rule === 'type',
      );
      expect(bad.valid).toBe(false);
      expect(err).toBeDefined();
      expect((err as ValidationError).message).toContain("must be of type email");
    });

    test('should validate url type', (): void => {
      const invalid: Record<string, unknown> = {
        name: 'Bob',
        age: 30,
        website: 'ht!tp://bad url',
      };

      const bad: ValidationResult = validator.validate(invalid);
      const err: ValidationError | undefined = bad.errors.find(
        (e: ValidationError): boolean => e.field === 'website' && e.rule === 'type',
      );
      expect(bad.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should reject NaN for number type', (): void => {
      const data: Record<string, unknown> = {
        name: 'Bob',
        age: Number.NaN,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'type',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should handle optional null without errors and exclude from sanitized', (): void => {
      const data: Record<string, unknown> = {
        name: 'Carol',
        age: 35,
        meta: null,
      };

      const result: ValidationResult = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).meta).toBeUndefined();
    });

    test('should validate array and object types when provided', (): void => {
      const data: Record<string, unknown> = {
        name: 'Dave',
        age: 40,
        tags: [],
        meta: { ok: true },
      };

      const result: ValidationResult = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should surface custom validator failure as error', (): void => {
      const customSchema: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => false,
          },
        ],
      };
      const v: Validator = new Validator(customSchema);
      const data: Record<string, unknown> = { code: 'ABC' };

      const result: ValidationResult = v.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'code' && e.rule === 'custom',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

    test('should handle exceptions thrown by custom validator', (): void => {
      const customSchema: ValidationSchema = {
        level: ValidationLevel.Strict,
        allowUnknownFields: false,
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            customValidator: (_v: unknown): boolean => {
              throw new Error('boom');
            },
          },
        ],
      };
      const v: Validator = new Validator(customSchema);
      const data: Record<string, unknown> = { code: 'XYZ' };

      const result: ValidationResult = v.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'code' && e.rule === 'custom_error',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
      expect((err as ValidationError).message).toContain('boom');
    });

    test('should error on unknown fields in strict mode', (): void => {
      const data: Record<string, unknown> = {
        name: 'Eve',
        age: 28,
        unknownProp: 123,
      };

      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'unknownProp' && e.rule === 'unknown_field',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
      expect(result.warnings.length).toBe(0);
    });

    test('should warn (not error) on unknown fields in lenient mode', (): void => {
      validator.setLevel(ValidationLevel.Lenient);

      const data: Record<string, unknown> = {
        name: 'Frank',
        age: 33,
        extra: 'field',
      };

      const result: ValidationResult = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(1);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).extra).toBeUndefined();
    });
  });

  describe('getSchema, getLevel, setLevel', (): void => {
    test('getSchema returns a shallow copy; modifying it does not change internal state', (): void => {
      const s1: ValidationSchema = validator.getSchema();
      expect(s1).toEqual(schema);

      // mutate copy
      s1.level = ValidationLevel.Lenient;
      // original should remain unchanged
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('setLevel updates the validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Lenient);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });

  describe('validateData helper', (): void => {
    test('should validate using helper and return valid result', (): void => {
      const data: Record<string, unknown> = {
        name: ' Grace ',
        age: 45,
      };

      const result: ValidationResult = validateData(data, schema);
      expect(result.valid).toBe(true);
      expect((result.sanitized as Record<string, unknown>).name).toBe('Grace');
    });

    test('should return errors via helper for invalid input', (): void => {
      const data: Record<string, unknown> = {
        age: 10,
      };

      const result: ValidationResult = validateData(data, schema);
      expect(result.valid).toBe(false);
      const requiredErr: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'required',
      );
      const minErr: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'min',
      );
      expect(requiredErr).toBeDefined();
      expect(minErr).toBeDefined();
    });
  });
});
