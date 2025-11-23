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
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).toEqual({ name: 'Alice', age: 30 });
    });

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('type');
      expect(result.errors[0]?.field).toBe('name');
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('minLength');
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('maxLength');
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('min');
      expect(result.errors[0]?.field).toBe('age');
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('max');
      expect(result.errors[0]?.field).toBe('age');
    });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'ghost')).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Unknown field 'ghost'");
      expect(result.sanitized).toEqual({ name: 'Bob', age: 30 });
    });

      const localValidator = new Validator(schema);
      const result = localValidator.validate({ name: 'Ann', extra: 'ok' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Ann' });
    });

      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ email: 'test@example.com' });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);

      const bad = localValidator.validate({ email: 'not-an-email' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
      expect(bad.sanitized).toBeUndefined();
    });

      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ site: 'https://example.com/path?x=1' });
      expect(ok.valid).toBe(true);

      const bad = localValidator.validate({ site: 'ht!tp:/bad' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ consent: true });
      expect(ok.valid).toBe(true);

      const bad = localValidator.validate({ consent: 'true' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');
    });

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

      const localValidator = new Validator(schema);

      const ok = localValidator.validate({ slug: 'valid-slug' });
      expect(ok.valid).toBe(true);

      const bad = localValidator.validate({ slug: 'Invalid_Slug' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');
    });

      const localValidator = new Validator(schema);

      const result = localValidator.validate({ nickname: '  Alex  ' });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({ nickname: 'Alex' });
    });

      const localValidator = new Validator(schema);

      const bad = localValidator.validate({ code: 'nope' });
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('custom');

      const ok = localValidator.validate({ code: 'ok' });
      expect(ok.valid).toBe(true);
      expect(ok.errors).toHaveLength(0);
    });

      const localValidator = new Validator(schema);

      const result = localValidator.validate({ code: 'anything' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('Custom validator threw error: boom');
    });

      const localValidator = new Validator(schema);

      const result = localValidator.validate({ note: null });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({});
    });

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
      const result = validateData({ name: 'Helper' }, schema as unknown as Record<string, unknown> as never);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'Helper' });
    });
  });
});
