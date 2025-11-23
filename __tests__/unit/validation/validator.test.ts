import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema, ValidationRule } from '../../src/validation/schemas.js';
import { Validator, validateData } from '../../src/validation/validator.ts';
import { ValidationLevel } from '../../src/validation/schemas.js';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => {
  return {
    ValidationLevel: {
      Strict: 'strict',
      Loose: 'loose',
    },
  };
});


// Mock the schemas module to control ValidationLevel values at runtime


describe('Validator', (): void => {
  let schema: ValidationSchema;
  let validator: Validator;

  beforeEach((): void => {
    const rules: ValidationRule[] = [
      {
        field: 'username',
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 10,
        pattern: /^[A-Za-z]+$/,
      },
      {
        field: 'age',
        type: 'number',
        min: 18,
        max: 99,
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
        field: 'isAdmin',
        type: 'boolean',
      },
      {
        field: 'tags',
        type: 'array',
      },
      {
        field: 'profile',
        type: 'object',
      },
    ];

    schema = {
      rules,
      allowUnknownFields: false,
      level: ValidationLevel.Strict,
    };

    validator = new Validator(schema);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor and accessors', (): void => {
    test('should initialize correctly and expose schema and level', (): void => {
      expect(validator).toBeDefined();
      const currentSchema = validator.getSchema();
      expect(Array.isArray(currentSchema.rules)).toBe(true);
      expect(currentSchema.rules.length).toBe(schema.rules.length);
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('getSchema returns a shallow copy (mutations do not affect internal schema)', (): void => {
      const returned = validator.getSchema();
      returned.level = ValidationLevel.Loose;
      // Ensure original validator level is unchanged
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('setLevel updates validation behavior', (): void => {
      validator.setLevel(ValidationLevel.Loose);
      expect(validator.getLevel()).toBe(ValidationLevel.Loose);
    });
  });

  describe('validate', (): void => {
    test('should validate valid data and sanitize strings (trim)', (): void => {
      const data: Record<string, unknown> = {
        username: '  Alice  ',
        age: 30,
        email: 'alice@example.com',
        website: 'https://example.com',
        isAdmin: true,
        tags: ['one', 'two'],
        profile: { city: 'Paris' },
      };

      const result = validator.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).username).toBe('Alice');
      expect((result.sanitized as Record<string, unknown>).age).toBe(30);
    });

    test('should return error when required field is missing', (): void => {
      const data: Record<string, unknown> = {
        age: 30,
      };

      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'username' && e.rule === 'required')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce string length constraints', (): void => {
      const tooShort: Record<string, unknown> = {
        username: 'Al',
        age: 30,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const shortRes = validator.validate(tooShort);
      expect(shortRes.valid).toBe(false);
      expect(shortRes.errors.some((e) => e.field === 'username' && e.rule === 'minLength')).toBe(true);

      const tooLong: Record<string, unknown> = {
        username: 'VeryLongNameHere',
        age: 30,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const longRes = validator.validate(tooLong);
      expect(longRes.valid).toBe(false);
      expect(longRes.errors.some((e) => e.field === 'username' && e.rule === 'maxLength')).toBe(true);
    });

    test('should enforce number range constraints', (): void => {
      const tooYoung: Record<string, unknown> = {
        username: 'Alice',
        age: 15,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const youngRes = validator.validate(tooYoung);
      expect(youngRes.valid).toBe(false);
      expect(youngRes.errors.some((e) => e.field === 'age' && e.rule === 'min')).toBe(true);

      const tooOld: Record<string, unknown> = {
        username: 'Alice',
        age: 120,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const oldRes = validator.validate(tooOld);
      expect(oldRes.valid).toBe(false);
      expect(oldRes.errors.some((e) => e.field === 'age' && e.rule === 'max')).toBe(true);
    });

    test('should validate regex pattern for strings', (): void => {
      const data: Record<string, unknown> = {
        username: 'Bob123', // violates /^[A-Za-z]+$/
        age: 30,
        email: 'b@b.com',
        website: 'https://example.com',
        isAdmin: true,
        tags: [],
        profile: {},
      };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'username' && e.rule === 'pattern')).toBe(true);
    });

    test('should validate email type including custom errorMessage override', (): void => {
      const customSchema: ValidationSchema = {
        ...schema,
        rules: [
          ...schema.rules.filter((r) => r.field !== 'email'),
          {
            field: 'email',
            type: 'email',
            errorMessage: 'Invalid email address',
          },
        ],
      };
      const customValidator = new Validator(customSchema);
      const data: Record<string, unknown> = {
        username: 'Alice',
        age: 30,
        email: 'not-an-email',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const res = customValidator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'email' && e.rule === 'type' && e.message === 'Invalid email address')).toBe(true);
    });

    test('should validate URL type', (): void => {
      const bad: Record<string, unknown> = {
        username: 'Alice',
        age: 30,
        email: 'a@b.com',
        website: 'ht!tp://bad',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const badRes = validator.validate(bad);
      expect(badRes.valid).toBe(false);
      expect(badRes.errors.some((e) => e.field === 'website' && e.rule === 'type')).toBe(true);

      const good: Record<string, unknown> = {
        ...bad,
        website: 'https://valid.example.com/path?x=1',
      };
      const goodRes = validator.validate(good);
      expect(goodRes.valid).toBe(true);
    });

    test('should enforce boolean, array, and object types', (): void => {
      const bad: Record<string, unknown> = {
        username: 'Alice',
        age: 30,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: 'yes',
        tags: 'not-an-array',
        profile: null,
      };
      const res = validator.validate(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'isAdmin' && e.rule === 'type')).toBe(true);
      expect(res.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
      expect(res.errors.some((e) => e.field === 'profile' && e.rule === 'type')).toBe(true);
    });

    test('should reject NaN as number type', (): void => {
      const data: Record<string, unknown> = {
        username: 'Alice',
        age: Number.NaN,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
    });

    test('should not convert numeric strings to numbers due to type validation (sanitization is not applied in that case)', (): void => {
      const data: Record<string, unknown> = {
        username: 'Alice',
        age: '42',
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      // Fails type validation before sanitization
      expect(res.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
      expect(res.sanitized).toBeUndefined();
    });

    test('should produce errors for unknown fields in Strict level', (): void => {
      const data: Record<string, unknown> = {
        username: 'Alice',
        age: 30,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
        extra: 'not-allowed',
      };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
    });

    test('should produce warnings (not errors) for unknown fields in Loose level', (): void => {
      validator.setLevel(ValidationLevel.Loose);
      const data: Record<string, unknown> = {
        username: 'Alice',
        age: 30,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
        extra: 'allowed as warning',
      };
      const res = validator.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.some((w) => typeof w === 'string' && w.includes("Unknown field 'extra'"))).toBe(true);
    });

    test('should ignore unknown fields when allowUnknownFields is true', (): void => {
      const allowUnknownSchema: ValidationSchema = {
        ...schema,
        allowUnknownFields: true,
      };
      const allowUnknownValidator = new Validator(allowUnknownSchema);
      const data: Record<string, unknown> = {
        username: 'Alice',
        age: 30,
        email: 'a@b.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
        extra: 'ignored',
      };
      const res = allowUnknownValidator.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(0);
    });

    test('should use custom errorMessage for required and pattern/type rules', (): void => {
      const customRules: ValidationRule[] = [
        {
          field: 'title',
          type: 'string',
          required: true,
          errorMessage: 'Title is mandatory',
          pattern: /^[A-Z].*$/,
        },
        {
          field: 'homepage',
          type: 'url',
          errorMessage: 'Homepage URL is invalid',
        },
      ];
      const customSchema: ValidationSchema = {
        rules: customRules,
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const customValidator = new Validator(customSchema);

      const data: Record<string, unknown> = {
        title: 'nope', // fails pattern (does not start with uppercase)
        homepage: 'bad-url',
      };
      const res = customValidator.validate(data);
      // For pattern, errorMessage is used (falls under 'pattern' block using rule.errorMessage if provided earlier? Pattern block uses rule.errorMessage || default)
      expect(res.errors.some((e) => e.field === 'homepage' && e.rule === 'type' && e.message === 'Homepage URL is invalid')).toBe(true);
      expect(res.errors.some((e) => e.field === 'title' && e.rule === 'pattern')).toBe(true);

      const missing: Record<string, unknown> = {
        homepage: 'https://ok.example',
      };
      const resMissing = customValidator.validate(missing);
      expect(resMissing.errors.some((e) => e.field === 'title' && e.rule === 'required' && e.message === 'Title is mandatory')).toBe(true);
    });

    test('should handle custom validator returning false and throwing error', (): void => {
      const rules: ValidationRule[] = [
        {
          field: 'code',
          type: 'string',
          customValidator: (_value: unknown): boolean => false,
          errorMessage: 'Custom rule failed',
        },
        {
          field: 'throws',
          type: 'string',
          customValidator: (_value: unknown): boolean => {
            throw new Error('Boom');
          },
        },
      ];
      const customSchema: ValidationSchema = {
        rules,
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const customValidator = new Validator(customSchema);

      const data: Record<string, unknown> = {
        code: 'ABC',
        throws: 'X',
      };
      const res = customValidator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'code' && e.rule === 'custom' && e.message === 'Custom rule failed')).toBe(true);
      expect(res.errors.some((e) => e.field === 'throws' && e.rule === 'custom_error' && typeof e.message === 'string' && e.message.includes('Boom'))).toBe(true);
    });
  });

  describe('validateData helper', (): void => {
    test('should validate using helper and return same shape as Validator.validate', (): void => {
      const data: Record<string, unknown> = {
        username: 'Bob',
        age: 25,
        email: 'bob@example.com',
        website: 'https://example.com',
        isAdmin: false,
        tags: [],
        profile: {},
      };

      const direct = validator.validate(data);
      const viaHelper = validateData(data, schema);
      expect(viaHelper.valid).toBe(direct.valid);
      expect(viaHelper.errors).toEqual(direct.errors);
      expect(viaHelper.warnings).toEqual(direct.warnings);
      expect(viaHelper.sanitized).toEqual(direct.sanitized);
    });
  });

  describe('type coverage via switch in validateType', (): void => {
    test('should validate boolean, array, object, string, number, email, url branches', (): void => {
      const allRules: ValidationRule[] = [
        { field: 's', type: 'string' },
        { field: 'n', type: 'number' },
        { field: 'b', type: 'boolean' },
        { field: 'arr', type: 'array' },
        { field: 'obj', type: 'object' },
        { field: 'mail', type: 'email' },
        { field: 'link', type: 'url' },
      ];
      const allSchema: ValidationSchema = {
        rules: allRules,
        allowUnknownFields: true,
        level: ValidationLevel.Strict,
      };
      const v = new Validator(allSchema);
      const goodData: Record<string, unknown> = {
        s: 'x',
        n: 1,
        b: true,
        arr: [],
        obj: {},
        mail: 'x@y.z',
        link: 'https://example.com',
      };
      const goodRes = v.validate(goodData);
      expect(goodRes.valid).toBe(true);

      const badData: Record<string, unknown> = {
        s: 1,
        n: 'NaN',
        b: 'false',
        arr: {},
        obj: [],
        mail: 'not@mail',
        link: 'ht!tp://',
      };
      const badRes = v.validate(badData);
      expect(badRes.valid).toBe(false);
      // Each field should have a type error
      expect(badRes.errors.filter((e) => e.rule === 'type').length).toBeGreaterThanOrEqual(6);
    });
  });
});
