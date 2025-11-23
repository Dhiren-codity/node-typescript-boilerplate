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
      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: '  Alice  ' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Alice' });
    });

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

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ age: null });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.errors[0]?.field).toBe('age');
    });

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

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ value: Number.NaN });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.message).toBe("Field 'value' must be of type number");
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ flag: true, items: [1, 2], meta: { a: 1 } });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual({ flag: true, items: [1, 2], meta: { a: 1 } });
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const bad = v.validate({ email: 'not-an-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');

      const good = v.validate({ email: 'user@example.com' });
      expect(good.valid).toBe(true);
      expect(good.errors).toHaveLength(0);
      expect(good.sanitized).toEqual({ email: 'user@example.com' });
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const bad = v.validate({ homepage: 'invalid url' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');

      const good = v.validate({ homepage: 'https://example.org/path?q=1' });
      expect(good.valid).toBe(true);
      expect(good.errors).toHaveLength(0);
      expect(good.sanitized).toEqual({ homepage: 'https://example.org/path?q=1' });
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const bad = v.validate({ code: 'ab1' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
      expect(bad.errors[0]?.message).toBe('Code must be three uppercase letters');

      const good = v.validate({ code: 'ABC' });
      expect(good.valid).toBe(true);
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ token: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
      expect(result.errors[0]?.message).toBe('Token failed validation');
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ payload: { ok: true } });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toBe(`Custom validator threw error: ${errorMessage}`);
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: 'Bob', extra: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors.find((e) => e.rule === 'unknown_field')?.field).toBe('extra');
      expect(result.sanitized).toBeUndefined();
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: 'Bob', unknown: 'x' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toEqual(["Unknown field 'unknown' found in data"]);
      expect(result.sanitized).toEqual({ name: 'Bob' });
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ name: 'Bob', extra: 1 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Bob' });
    });

      const v = new Validator(schema as unknown as ValidationSchema);

      const result = v.validate({ mystery: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.message).toBe("Field 'mystery' must be of type unknown_type");
    });
  });

  describe('getSchema', (): void => {
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

    const result = validateData({ title: '  Hello  ' }, schema as unknown as ValidationSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized).toEqual({ title: 'Hello' });
  });


    const result = validateData({ age: '20' as unknown }, schema as unknown as ValidationSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.sanitized).toBeUndefined();
  });
});
