import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Validator, validateData } from '../src/validation/validator.js';
import { ValidationLevel } from '../src/validation/schemas.js';

vi.mock('../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'strict',
    Lenient: 'lenient',
  },
}));


describe('Validator', (): void => {
  let validator: Validator;
  let baseSchema: {
    rules: Array<Record<string, unknown>>;
    allowUnknownFields: boolean;
    level: string;
  };

  beforeEach((): void => {
    baseSchema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
        { field: 'age', type: 'number', min: 18, max: 65 },
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict as string,
    };
    validator = new Validator(baseSchema);
  });


// Mock schemas module used by Validator

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('constructor and getters', (): void => {
    test('should initialize correctly and expose level via getters', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      const schema = validator.getSchema();
      expect(schema).toBeDefined();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('setLevel should update validation level', (): void => {
      validator.setLevel(ValidationLevel.Lenient);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });
  });

  describe('validate', (): void => {
    test('should validate valid data and produce sanitized output', (): void => {
      const result = validator.validate({ name: 'Alice', age: 30 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).toEqual({ name: 'Alice', age: 30 });
    });

    test('should fail when required field is missing', (): void => {
      const result = validator.validate({ age: 30 });
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
    });

    test('should fail when type does not match', (): void => {
      const result = validator.validate({ name: 123, age: 30 } as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.field).toBe('name');
    });

    test('should detect string minLength violation', (): void => {
      const result = validator.validate({ name: 'A' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('minLength');
    });

    test('should detect string maxLength violation', (): void => {
      const result = validator.validate({ name: 'averylongname' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('maxLength');
    });

    test('should detect number min violation', (): void => {
      const result = validator.validate({ name: 'Bob', age: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('min');
      expect(result.errors[0]?.field).toBe('age');
    });

    test('should detect number max violation', (): void => {
      const result = validator.validate({ name: 'Bob', age: 100 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('max');
      expect(result.errors[0]?.field).toBe('age');
    });

    test('should report unknown field as error in strict mode', (): void => {
      const result = validator.validate({ name: 'Bob', age: 30, ghost: 'nope' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'ghost')).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('should report unknown field as warning in lenient mode', (): void => {
      validator.setLevel(ValidationLevel.Lenient);
      const result = validator.validate({ name: 'Bob', age: 30, ghost: 'nope' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Unknown field 'ghost'");
      expect(result.sanitized).toEqual({ name: 'Bob', age: 30 });
    });

    test('should ignore unknown fields when allowUnknownFields is true', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);
      const result = localValidator.validate({ name: 'Ann', extra: 'ok' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Ann' });
    });

    test('should validate email type correctly', (): void => {
      const schema = {
        rules: [{ field: 'email', type: 'email', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ email: 'test@example.com' });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);

      const bad = localValidator.validate({ email: 'not-an-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
      expect(bad.sanitized).toBeUndefined();
    });

    test('should validate url type correctly', (): void => {
      const schema = {
        rules: [{ field: 'site', type: 'url', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ site: 'https://example.com/path?x=1' });
      expect(ok.valid).toBe(true);

      const bad = localValidator.validate({ site: 'ht!tp:/bad' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

    test('should validate boolean type', (): void => {
      const schema = {
        rules: [{ field: 'consent', type: 'boolean', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ consent: true });
      expect(ok.valid).toBe(true);

      const bad = localValidator.validate({ consent: 'true' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

    test('should validate array and object types', (): void => {
      const schema = {
        rules: [
          { field: 'tags', type: 'array', required: true },
          { field: 'profile', type: 'object', required: true },
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ tags: ['a', 'b'], profile: { ok: true } });
      expect(ok.valid).toBe(true);

      const badArray = localValidator.validate({ tags: 'not-array', profile: { ok: true } });
      expect(badArray.valid).toBe(false);
      expect(badArray.errors[0]?.field).toBe('tags');
      expect(badArray.errors[0]?.rule).toBe('type');

      const badObject = localValidator.validate({ tags: [], profile: ['no'] });
      expect(badObject.valid).toBe(false);
      expect(badObject.errors[0]?.field).toBe('profile');
      expect(badObject.errors[0]?.rule).toBe('type');
    });

    test('should validate pattern rule for strings', (): void => {
      const schema = {
        rules: [{ field: 'slug', type: 'string', required: true, pattern: /^[a-z-]+$/ }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ slug: 'valid-slug' });
      expect(ok.valid).toBe(true);

      const bad = localValidator.validate({ slug: 'Invalid_Slug' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
    });

    test('should apply string trimming in sanitized output when valid', (): void => {
      const schema = {
        rules: [{ field: 'nickname', type: 'string', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const result = localValidator.validate({ nickname: '  Alex  ' });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({ nickname: 'Alex' });
    });

    test('should handle custom validator failure', (): void => {
      const schema = {
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            customValidator: (value: unknown): boolean => value === 'ok',
          },
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const bad = localValidator.validate({ code: 'nope' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('custom');

      const ok = localValidator.validate({ code: 'ok' });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);
    });

    test('should catch and report errors thrown by custom validator', (): void => {
      const schema = {
        rules: [
          {
            field: 'code',
            type: 'string',
            required: true,
            customValidator: (_value: unknown): boolean => {
              throw new Error('boom');
            },
          },
        ],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const result = localValidator.validate({ code: 'anything' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('Custom validator threw error: boom');
    });

    test('should treat null optional field as absent and remain valid', (): void => {
      const schema = {
        rules: [{ field: 'note', type: 'string', required: false }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const localValidator = new Validator(schema);

      const result = localValidator.validate({ note: null });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({});
    });

    test('should reset errors and warnings across multiple validations', (): void => {
      validator.setLevel(ValidationLevel.Lenient);
      const first = validator.validate({ name: 'Alice', age: 30, extra: 'x' });
      expect(first.valid).toBe(true);
      expect(first.warnings).toHaveLength(1);

      const second = validator.validate({ name: 'Alice', age: 30 });
      expect(second.valid).toBe(true);
      expect(second.errors).toHaveLength(0);
      expect(second.warnings).toHaveLength(0);

      const third = validator.validate({ age: 30 }); // missing required 'name'
      expect(third.valid).toBe(false);
      expect(third.errors).toHaveLength(1);
    });
  });

  describe('validateData helper', (): void => {
    test('should validate using helper function', (): void => {
      const schema = {
        rules: [{ field: 'name', type: 'string', required: true }],
        allowUnknownFields: false,
        level: ValidationLevel.Strict,
      };
      const result = validateData({ name: 'Helper' }, schema as unknown as Record<string, unknown> as never);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Helper' });
    });
  });
});
