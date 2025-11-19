import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Ambient module declaration to satisfy type-only imports in validator.ts
declare module './schemas.js' {
  export type ValidationRule = {
    field: string;
    type:
      | 'string'
      | 'number'
      | 'boolean'
      | 'array'
      | 'object'
      | 'email'
      | 'url';
    required?: boolean;
    errorMessage?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    customValidator?: (value: unknown) => boolean;
  };

  export type ValidationError = {
    field: string;
    value: unknown;
    message: string;
    rule: string;
  };

  export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    sanitized?: Record<string, unknown>;
  };

  export type ValidationSchema = {
    rules: ValidationRule[];
    allowUnknownFields?: boolean;
    level: ValidationLevel;
  };

  export const ValidationLevel: {
    Strict: 'Strict';
    Relaxed: 'Relaxed';
  };
}

// Mock the dependency used by the class under test
vi.mock('./schemas.js', (): Record<string, unknown> => {
  const ValidationLevel = {
    Strict: 'Strict',
    Relaxed: 'Relaxed',
  } as const;

  return {
    ValidationLevel,
  };
});

import { Validator, validateData } from './validator.ts';
import { ValidationLevel } from './schemas.js';


  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema', (): void => {
      const schema = validator.getSchema();
      expect(schema).toBeDefined();
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('getLevel and setLevel', (): void => {
    test('should get and set validation level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Relaxed);
      expect(validator.getLevel()).toBe(ValidationLevel.Relaxed);
    });
  });

  describe('getSchema', (): void => {
    test('should return a shallow copy of the schema', (): void => {
      const schema1 = validator.getSchema();
      const schema2 = validator.getSchema();
      expect(schema1).not.toBe(schema2);
      // ensure changing returned copy does not mutate internal schema
      (schema1 as { level: string }).level = 'Changed';
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });
  });

    });


      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      // should include at least age type error and name passes
      const ageTypeError = result.errors.find((e) => e.field === 'age' && e.rule === 'type');
      expect(ageTypeError).toBeDefined();
    });


      expect(result.valid).toBe(false);
      const requiredError = result.errors.find((e) => e.rule === 'required' && e.field === 'age');
      expect(requiredError).toBeDefined();
      expect(result.sanitized).toBeUndefined();
    });


      const result = v.validate({
        title: 123,
        count: '12',
        flag: 'true',
        items: {},
        meta: [],
        workEmail: 'not-an-email',
        homepage: 'not a url',
      } as unknown as Record<string, unknown>);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(7);

      const countError = result.errors.find((e) => e.field === 'count');
      expect(countError?.message).toBe('Count must be a number');

      for (const field of ['title', 'flag', 'items', 'meta', 'workEmail', 'homepage']) {
        const err = result.errors.find((e) => e.field === field);
        expect(err?.rule).toBe('type');
      }
    });


      const result = v.validate({
        short: 'abc',
        long: 'abcd',
      });

      expect(result.valid).toBe(false);
      const minLenErr = result.errors.find((e) => e.field === 'short' && e.rule === 'minLength');
      const maxLenErr = result.errors.find((e) => e.field === 'long' && e.rule === 'maxLength');
      expect(minLenErr).toBeDefined();
      expect(maxLenErr).toBeDefined();
    });


      const result = v.validate({
        low: 1,
        high: 10,
      });

      expect(result.valid).toBe(false);
      const minErr = result.errors.find((e) => e.field === 'low' && e.rule === 'min');
      const maxErr = result.errors.find((e) => e.field === 'high' && e.rule === 'max');
      expect(minErr).toBeDefined();
      expect(maxErr).toBeDefined();
    });


      const result = v.validate({ code: 'ab1' });
      expect(result.valid).toBe(false);
      const patternErr = result.errors.find((e) => e.field === 'code' && e.rule === 'pattern');
      expect(patternErr?.message).toBe('Code must be 3 uppercase letters');
    });


      const result = v.validate({ even: 3 });
      expect(result.valid).toBe(false);
      const customErr = result.errors.find((e) => e.field === 'even' && e.rule === 'custom');
      expect(customErr).toBeDefined();
    });


      const result = v.validate({ boom: 'data' });
      expect(result.valid).toBe(false);
      const customErr = result.errors.find((e) => e.field === 'boom' && e.rule === 'custom_error');
      expect(customErr?.message).toContain('Explosion');
    });


      const result = v.validate({ known: 'ok', unknown: 'nope' });
      expect(result.valid).toBe(false);
      const unknownErr = result.errors.find((e) => e.rule === 'unknown_field' && e.field === 'unknown');
      expect(unknownErr).toBeDefined();
      expect(result.warnings.length).toBe(0);
    });


      const result = v.validate({ known: 'ok', unknown: 'nope' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings[0]).toContain("Unknown field 'unknown'");
      expect(result.sanitized).toEqual({ known: 'ok' });
    });


      const result = v.validate({ known: ' ok ', extra: 123 });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
      expect(result.sanitized).toEqual({ known: 'ok' });
    });
  });


      const direct = new Validator(schema).validate(data);
      const helper = validateData(data, schema);

      expect(helper.valid).toBe(direct.valid);
      expect(helper.errors).toEqual(direct.errors);
      expect(helper.warnings).toEqual(direct.warnings);
      expect(helper.sanitized).toEqual(direct.sanitized);
    });

      const data = { x: 5 };

      const helper = validateData(data, schema);
      expect(helper.valid).toBe(false);
      const minError = helper.errors.find((e) => e.field === 'x' && e.rule === 'min');
      expect(minError).toBeDefined();
      expect(helper.sanitized).toBeUndefined();
    });
  });
});
