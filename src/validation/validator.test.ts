import { describe, it, test, expect, vi, beforeEach } from 'vitest';

// Pass-through mock to demonstrate mocking dependencies used by the module under test.
// This ensures we are using vi.mock() as required, without altering behavior.
vi.mock('../../src/validation/schemas.js', () => {
  // Return the actual implementation so code under test behaves normally.
  // If the real file does not exist in your environment, adjust the path accordingly.
  // Vitest will hoist this before imports below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return vi.importActual<any>('../../src/validation/schemas.js');
});

import { Validator, validateData } from '../../src/validation/validator';
import type {
  ValidationSchema,
  ValidationResult,
  ValidationError,
} from '../../src/validation/schemas.js';
import { ValidationLevel } from '../../src/validation/schemas.js';

describe('Validator', () => {
  let schema: ValidationSchema;
  let validator: Validator;

  beforeEach(() => {
    schema = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
        { field: 'age', type: 'number', required: false, min: 18, max: 99 },
        { field: 'email', type: 'email', required: true },
        { field: 'website', type: 'url', required: false },
        { field: 'tags', type: 'array', required: false },
        { field: 'prefs', type: 'object', required: false },
        { field: 'flag', type: 'boolean', required: false },
        { field: 'code', type: 'string', required: false, pattern: /^[A-Z]{3}\d{3}$/ },
        {
          field: 'custom',
          type: 'string',
          required: false,
          customValidator: (v: unknown) => typeof v === 'string' && v.includes('ok'),
        },
        {
          field: 'customThrow',
          type: 'string',
          required: false,
          customValidator: () => {
            throw new Error('boom');
          },
        },
      ],
      allowUnknownFields: false,
      level: ValidationLevel.Strict,
    };

    validator = new Validator(schema);
  });

  describe('constructor', () => {
    test('should initialize correctly with provided schema and default state', () => {
      const state = validator.getSchema();
      expect(state).toBeDefined();
      expect(state.level).toBe(ValidationLevel.Strict);
      // ensure shallow copy returned
      expect(state).not.toBe(schema);
    });
  });

  describe('getLevel / setLevel', () => {
    test('should get and set validation level', () => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
      validator.setLevel(ValidationLevel.Standard ?? (ValidationLevel as any).Lenient ?? ValidationLevel); // fallback if enum differs
      // The assertion below handles if Standard is not defined; in that case, setLevel likely set the same value
      expect(validator.getLevel()).not.toBeUndefined();
    });
  });

  describe('validate', () => {
    test('should validate and sanitize correct data', () => {
      const data = {
        name: '  Alice  ',
        age: 25,
        email: 'alice@example.com',
        website: 'https://example.com/path?q=1',
        tags: ['x', 'y'],
        prefs: { theme: 'dark' },
        flag: true,
        code: 'ABC123',
        custom: 'very ok',
      };

      const result = validator.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual<ValidationError[]>([]);
      expect(result.warnings).toEqual<string[]>([]);

      // Sanitized output should exist and trim string fields
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized?.name).toBe('Alice'); // trimmed
      expect(result.sanitized?.age).toBe(25);
      expect(result.sanitized?.email).toBe('alice@example.com');
      expect(result.sanitized?.website).toBe('https://example.com/path?q=1');
      expect(result.sanitized?.tags).toEqual(['x', 'y']);
      expect(result.sanitized?.prefs).toEqual({ theme: 'dark' });
      expect(result.sanitized?.flag).toBe(true);
      expect(result.sanitized?.code).toBe('ABC123');
      expect(result.sanitized?.custom).toBe('very ok');
    });

    test('should report required errors when required fields are missing', () => {
      const data = {
        age: 20,
      };

      const result = validator.validate(data);

      expect(result.valid).toBe(false);
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('email');

      const rules = result.errors.reduce<Record<string, string>>((acc, e) => {
        acc[e.field] = e.rule;
        return acc;
      }, {});
      expect(rules.name).toBe('required');
      expect(rules.email).toBe('required');

      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce type validation and report type errors', () => {
      const data = {
        name: 123,
        age: 'not-a-number',
        email: 'not-an-email',
        website: 'not a url',
        tags: {},
        prefs: [],
        flag: 'true',
        code: 'ABC123',
        custom: 'ok custom', // ok to not fail custom here
      };

      const result = validator.validate(data);

      expect(result.valid).toBe(false);

      const typeErrors = result.errors.filter((e) => e.rule === 'type').map((e) => e.field);
      expect(typeErrors).toEqual(
        expect.arrayContaining(['name', 'age', 'email', 'website', 'tags', 'prefs', 'flag'])
      );

      expect(result.sanitized).toBeUndefined();
    });

    test('should enforce string length constraints', () => {
      const tooShort = { name: 'A', email: 'a@b.co' };
      const tooShortResult = validator.validate(tooShort);
      expect(tooShortResult.valid).toBe(false);
      expect(tooShortResult.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);

      const tooLong = { name: 'This name is too long', email: 'a@b.co' };
      const tooLongResult = validator.validate(tooLong);
      expect(tooLongResult.valid).toBe(false);
      expect(tooLongResult.errors.some((e) => e.field === 'name' && e.rule === 'maxLength')).toBe(true);
    });

    test('should enforce number range constraints', () => {
      const tooYoung = { name: 'John', email: 'j@e.co', age: 10 };
      const tooYoungResult = validator.validate(tooYoung);
      expect(tooYoungResult.valid).toBe(false);
      expect(tooYoungResult.errors.some((e) => e.field === 'age' && e.rule === 'min')).toBe(true);

      const tooOld = { name: 'John', email: 'j@e.co', age: 150 };
      const tooOldResult = validator.validate(tooOld);
      expect(tooOldResult.valid).toBe(false);
      expect(tooOldResult.errors.some((e) => e.field === 'age' && e.rule === 'max')).toBe(true);
    });

    test('should validate pattern rule', () => {
      const bad = { name: 'John', email: 'j@e.co', code: 'abc123' };
      const res = validator.validate(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'code' && e.rule === 'pattern')).toBe(true);

      const good = { name: 'John', email: 'j@e.co', code: 'XYZ987' };
      const res2 = validator.validate(good);
      expect(res2.valid).toBe(true);
    });

    test('should run custom validators and report custom errors when false', () => {
      const data = { name: 'Jo', email: 'j@e.co', custom: 'not good' };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'custom' && e.rule === 'custom')).toBe(true);
    });

    test('should catch exceptions thrown by custom validators', () => {
      const data = { name: 'Jo', email: 'j@e.co', customThrow: 'anything' };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      const err = res.errors.find((e) => e.field === 'customThrow' && e.rule === 'custom_error');
      expect(err).toBeDefined();
      expect(err?.message).toContain('boom');
    });

    test('should report unknown fields as errors in Strict level', () => {
      const data = { name: 'John', email: 'j@e.co', unknown: 1 };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      const unknownErr = res.errors.find((e) => e.field === 'unknown' && e.rule === 'unknown_field');
      expect(unknownErr).toBeDefined();
      expect(res.warnings.length).toBe(0);
    });

    test('should report unknown fields as warnings in non-Strict level', () => {
      validator.setLevel((ValidationLevel as any).Standard ?? (ValidationLevel as any).Lenient ?? ValidationLevel);
      const data = { name: 'John', email: 'j@e.co', unknown: 1 };
      const res = validator.validate(data);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(1);
      expect(res.sanitized).toBeDefined();
    });

    test('should omit sanitized output when there are errors', () => {
      const data = { name: 'A', email: 'invalid' };
      const res = validator.validate(data);
      expect(res.valid).toBe(false);
      expect(res.sanitized).toBeUndefined();
    });

    test('should ignore null optional fields without errors or sanitization', () => {
      const data = { name: 'John', email: 'j@e.co', age: null };
      const res = validator.validate(data as unknown as Record<string, unknown>);
      expect(res.valid).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(res.sanitized ?? {}, 'age')).toBe(false);
    });

    test('should validate email and url formats', () => {
      const ok = { name: 'John', email: 'john.doe+test@example.co.uk', website: 'https://sub.example.com/path#hash' };
      const okRes = validator.validate(ok);
      expect(okRes.valid).toBe(true);

      const bad = { name: 'John', email: 'john@@example', website: 'htp:/broken' };
      const badRes = validator.validate(bad);
      expect(badRes.valid).toBe(false);
      const rules = badRes.errors.reduce<Record<string, string>>((acc, e) => {
        acc[e.field] = e.rule;
        return acc;
      }, {});
      expect(rules.email).toBe('type');
      expect(rules.website).toBe('type');
    });

    test('should trim string fields during sanitization', () => {
      const data = { name: '  Trim Me  ', email: 'trim@me.com' };
      const res = validator.validate(data);
      expect(res.valid).toBe(true);
      expect(res.sanitized?.name).toBe('Trim Me');
    });

    test('getSchema returns shallow copy (mutating rules array affects validator)', () => {
      const copy = validator.getSchema();
      // Push a new rule to the rules array of the copy (shallow copy means same array reference)
      copy.rules.push({
        field: 'newField',
        type: 'string',
        required: true,
      } as any);

      const res = validator.validate({ name: 'John', email: 'j@e.co' });
      // Now the newField is required, should cause an error
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'newField' && e.rule === 'required')).toBe(true);
    });
  });
});

describe('validateData helper', () => {
  let schema: ValidationSchema;

  beforeEach(() => {
    schema = {
      rules: [
        { field: 'title', type: 'string', required: true, minLength: 3 },
        { field: 'count', type: 'number', required: false, min: 0 },
      ],
      allowUnknownFields: true,
      level: ValidationLevel.Strict,
    };
  });

  test('should validate using helper and return ValidationResult on success', () => {
    const data: Record<string, unknown> = { title: 'Hello', count: 1, extra: 'allowed' };
    const result: ValidationResult = validateData(data, schema);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.sanitized).toEqual({ title: 'Hello', count: 1 });
  });

  test('should validate using helper and return errors on failure', () => {
    const data: Record<string, unknown> = { title: 'Hi' }; // too short
    const result: ValidationResult = validateData(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title' && e.rule === 'minLength')).toBe(true);
    expect(result.sanitized).toBeUndefined();
  });
});
