import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
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

  beforeEach((): void => {
    const schema = {
      level: ValidationLevel.Strict,
      allowUnknownFields: false,
      rules: [
        {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 2,
          maxLength: 10,
        },
      ],
    };
    validator = new Validator(schema);
  });

  afterEach((): void => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor and accessors', (): void => {
    test('should initialize and expose schema and level', (): void => {
      expect(validator).toBeDefined();
      const schemaCopy = validator.getSchema();
      expect(schemaCopy).toBeDefined();
      expect(Array.isArray(schemaCopy.rules)).toBe(true);
      expect(schemaCopy.rules.length).toBe(1);
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('setLevel should update the validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Lenient);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });

  describe('validate', (): void => {
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'Alice' });
    });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('required');
      expect(result.sanitized).toBeUndefined();
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
    });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'minLength')).toBe(true);
    });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'maxLength')).toBe(true);
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ name: 'Sam', extra: 1 });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain("Unknown field 'extra'");
      expect(result.sanitized).toEqual({ name: 'Sam' });
    });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field')).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeUndefined();
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ name: 'Sam', another: 'field' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'Sam' });
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ email: 'user@example.com' });
      expect(ok.valid).toBe(true);
      const bad = localValidator.validate({ email: 'not-an-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ site: 'https://example.com/path' });
      expect(ok.valid).toBe(true);
      const bad1 = localValidator.validate({ site: 'invalid-url' });
      expect(bad1.valid).toBe(false);
      expect(bad1.errors[0]?.rule).toBe('type');
      const bad2 = localValidator.validate({ site: 'http://exa mple.com' });
      expect(bad2.valid).toBe(false);
      expect(bad2.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ active: false });
      expect(ok.valid).toBe(true);
      const bad = localValidator.validate({ active: 'true' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ tags: ['a', 'b'] });
      expect(ok.valid).toBe(true);
      const bad = localValidator.validate({ tags: {} });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ meta: { a: 1 } });
      expect(ok.valid).toBe(true);
      const bad1 = localValidator.validate({ meta: null });
      expect(bad1.valid).toBe(false);
      expect(bad1.errors[0]?.rule).toBe('type');
      const bad2 = localValidator.validate({ meta: [] });
      expect(bad2.valid).toBe(false);
      expect(bad2.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ age: 30 });
      expect(ok.valid).toBe(true);
      const low = localValidator.validate({ age: 10 });
      expect(low.valid).toBe(false);
      expect(low.errors[0]?.rule).toBe('min');
      const high = localValidator.validate({ age: 120 });
      expect(high.valid).toBe(false);
      expect(high.errors[0]?.rule).toBe('max');
      const notNumber = localValidator.validate({ age: '42' });
      expect(notNumber.valid).toBe(false);
      expect(notNumber.errors[0]?.rule).toBe('type');
      const isNaNNumber = localValidator.validate({ age: Number.NaN });
      expect(isNaNNumber.valid).toBe(false);
      expect(isNaNNumber.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const ok = localValidator.validate({ code: 'AB123' });
      expect(ok.valid).toBe(true);
      const bad = localValidator.validate({ code: 'AX123' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ pin: '1234' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ value: 'x' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('Custom validator threw error: boom');
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ qty: '123' });
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ name: 'John', nickname: null });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'John' });
    });

      const localValidator = new Validator(schema as unknown as {
        level: string;
        allowUnknownFields: boolean;
        rules: Array<Record<string, unknown>>;
      });
      const result = localValidator.validate({ x: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
    });
  });

  describe('validateData helper', (): void => {
      const helperResult = validateData({ title: 'Ok' }, schema);
      const directResult = new Validator(schema).validate({ title: 'Ok' });
      expect(helperResult).toEqual(directResult);
      expect(helperResult.valid).toBe(true);
      expect(helperResult.sanitized).toEqual({ title: 'Ok' });
    });

      const result = validateData({ extra: 1 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'required')).toBe(true);
      expect(result.errors.some((e) => e.rule === 'unknown_field')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });
  });
});
