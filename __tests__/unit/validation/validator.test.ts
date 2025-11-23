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


// Mock the schemas module to control ValidationLevel values at runtime



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



      const result = validator.validate(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'username' && e.rule === 'required')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

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

      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'username' && e.rule === 'pattern')).toBe(true);
    });

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

      const res = validator.validate(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'isAdmin' && e.rule === 'type')).toBe(true);
      expect(res.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
      expect(res.errors.some((e) => e.field === 'profile' && e.rule === 'type')).toBe(true);
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      // Fails type validation before sanitization
      expect(res.errors.some((e) => e.field === 'age' && e.rule === 'type')).toBe(true);
      expect(res.sanitized).toBeUndefined();
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
    });

      const res = validator.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.some((w) => typeof w === 'string' && w.includes("Unknown field 'extra'"))).toBe(true);
    });

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
