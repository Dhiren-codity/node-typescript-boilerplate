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

      const result = validator.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.name).toBe('Alice');
      expect(result.sanitized?.age).toBe(30);
    });


      const result = validator.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });


      const localValidator = new Validator(schema);
      const result = localValidator.validate({ mystery: 123 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('mystery');
      expect(result.errors[0]?.rule).toBe('type');
      expect(String(result.errors[0]?.message)).toContain("must be of type weird");
    });

      const dataTooLong: Record<string, unknown> = { name: 'A'.repeat(11) };

      const shortResult = validator.validate(dataTooShort);
      const longResult = validator.validate(dataTooLong);

      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors.some((e) => e.rule === 'minLength')).toBe(true);

      expect(longResult.valid).toBe(false);
      expect(longResult.errors.some((e) => e.rule === 'maxLength')).toBe(true);
    });

      const aboveMax = validator.validate({ name: 'Bob', age: 999 });
      const isNaNResult = validator.validate({ name: 'Bob', age: Number.NaN });

      expect(belowMin.valid).toBe(false);
      expect(belowMin.errors.some((e) => e.rule === 'min')).toBe(true);

      expect(aboveMax.valid).toBe(false);
      expect(aboveMax.errors.some((e) => e.rule === 'max')).toBe(true);

      expect(isNaNResult.valid).toBe(false);
      expect(isNaNResult.errors.some((e) => e.rule === 'type')).toBe(true);
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


      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ code: 'ABC' });
      const bad = localValidator.validate({ code: 'Abc123' });

      expect(ok.valid).toBe(true);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
    });


      const localValidator = new Validator(schema);
      const result = localValidator.validate({ x: 'not number' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.message).toBe('Custom type error');
    });


      const localValidator = new Validator(schema);
      const result = localValidator.validate({ score: 10 });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('score');
      expect(result.errors[0]?.rule).toBe('custom');
    });


      const localValidator = new Validator(schema);
      const result = localValidator.validate({ data: 'ok' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(String(result.errors[0]?.message)).toContain('boom');
    });


      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'unknownKey')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });


      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(1);
      expect(String(result.warnings[0])).toContain("Unknown field 'extra'");
      expect(result.sanitized).toBeDefined();
    });

      const localValidator = new Validator(schema);

      const result = localValidator.validate({
        name: 'User',
        extra: 123,
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });


      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('validateData helper', (): void => {

      const success = validateData({ name: 'John' }, schema);
      const failure = validateData({}, schema);

      expect(success.valid).toBe(true);
      expect(success.errors.length).toBe(0);

      expect(failure.valid).toBe(false);
      expect(failure.errors.some((e) => e.rule === 'required' && e.field === 'name')).toBe(true);
    });
  });
});
