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

  ValidationSchema,
  ValidationRule,
  ValidationResult,
  ValidationError,
} from '../../src/validation/schemas.js';



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


      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.field).toBe('name');
    });

      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: ValidationError): boolean => e.rule === 'minLength')).toBe(true);
    });

      const result: ValidationResult = validator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: ValidationError): boolean => e.rule === 'maxLength')).toBe(true);
    });

      const localValidator = new Validator(patternSchema);

      const bad: Record<string, unknown> = { username: 'bad name!' };
      const result: ValidationResult = localValidator.validate(bad);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('pattern');
      expect(result.errors[0]?.field).toBe('username');
    });

      const localValidator = new Validator(customSchema);

      const input: Record<string, unknown> = { code: 'OK' };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
      expect(result.errors[0]?.field).toBe('code');
    });

      const localValidator = new Validator(customSchema);

      const input: Record<string, unknown> = { code: 'OK' };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('boom');
    });

      const localValidator = new Validator(unknownSchema);

      const input: Record<string, unknown> = { unknown: 1 };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain("Unknown field 'unknown'");
      expect(result.sanitized).toEqual({});
    });

      const localValidator = new Validator(unknownSchema);

      const input: Record<string, unknown> = { unknown: 1 };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.rule).toBe('unknown_field');
      expect(result.errors[0]?.field).toBe('unknown');
      expect(result.sanitized).toBeUndefined();
    });

      const localValidator = new Validator(unknownSchema);

      const input: Record<string, unknown> = { unknown: 1 };
      const result: ValidationResult = localValidator.validate(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toEqual({});
    });

      const localValidator = new Validator(emailSchema);

      const good: Record<string, unknown> = { email: 'user@example.com' };
      const bad: Record<string, unknown> = { email: 'not-an-email' };

      const goodResult: ValidationResult = localValidator.validate(good);
      expect(goodResult.valid).toBe(true);

      const badResult: ValidationResult = localValidator.validate(bad);
      expect(badResult.valid).toBe(false);
      expect(badResult.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(urlSchema);

      const good: Record<string, unknown> = { site: 'https://example.com' };
      const bad: Record<string, unknown> = { site: 'not a url' };

      const goodResult: ValidationResult = localValidator.validate(good);
      expect(goodResult.valid).toBe(true);

      const badResult: ValidationResult = localValidator.validate(bad);
      expect(badResult.valid).toBe(false);
      expect(badResult.errors[0]?.rule).toBe('type');
    });

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

      const localValidator = new Validator(numberSchema);

      const result: ValidationResult = localValidator.validate({ n: Number.NaN });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(boolSchema);

      const ok: ValidationResult = localValidator.validate({ subscribe: true });
      expect(ok.valid).toBe(true);

      const bad: ValidationResult = localValidator.validate({ subscribe: 'true' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(arraySchema);

      const ok: ValidationResult = localValidator.validate({ tags: ['a', 'b'] });
      expect(ok.valid).toBe(true);

      const bad: ValidationResult = localValidator.validate({ tags: { a: 1 } });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(objectSchema);

      const ok: ValidationResult = localValidator.validate({ meta: { a: 1 } });
      expect(ok.valid).toBe(true);

      const badArray: ValidationResult = localValidator.validate({ meta: [] });
      expect(badArray.valid).toBe(false);
      expect(badArray.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(optSchema);

      const result: ValidationResult = localValidator.validate({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({});
    });

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

      schema,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.sanitized?.['name']).toBe('Bob');
    expect(result.sanitized?.['age']).toBe(10);
  });


    const result: ValidationResult = validateData({ age: 3 }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: ValidationError): boolean => e.rule === 'min')).toBe(true);
    expect(result.sanitized).toBeUndefined();
  });


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
