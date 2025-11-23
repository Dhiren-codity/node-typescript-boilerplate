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


      const result: ValidationResult = validator.validate(data);

      expect(result.valid).toBe(false);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'required',
      );
      expect(err).toBeDefined();
      expect(result.sanitized).toBeUndefined();
    });


      const result: ValidationResult = validator.validate(data);

      expect(result.valid).toBe(false);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'type',
      );
      expect(err).toBeDefined();
      expect(result.sanitized).toBeUndefined();
    });


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'minLength',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'maxLength',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'min',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'max',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'name' && e.rule === 'pattern',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

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


      const bad: ValidationResult = validator.validate(invalid);
      const err: ValidationError | undefined = bad.errors.find(
        (e: ValidationError): boolean => e.field === 'website' && e.rule === 'type',
      );
      expect(bad.valid).toBe(false);
      expect(err).toBeDefined();
    });


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'age' && e.rule === 'type',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });


      const result: ValidationResult = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).meta).toBeUndefined();
    });


      const result: ValidationResult = validator.validate(data);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

      const v: Validator = new Validator(customSchema);
      const data: Record<string, unknown> = { code: 'ABC' };

      const result: ValidationResult = v.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'code' && e.rule === 'custom',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
    });

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


      const result: ValidationResult = validator.validate(data);
      const err: ValidationError | undefined = result.errors.find(
        (e: ValidationError): boolean => e.field === 'unknownProp' && e.rule === 'unknown_field',
      );
      expect(result.valid).toBe(false);
      expect(err).toBeDefined();
      expect(result.warnings.length).toBe(0);
    });


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

      const result: ValidationResult = validateData(data, schema);
      expect(result.valid).toBe(true);
      expect((result.sanitized as Record<string, unknown>).name).toBe('Grace');
    });


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
