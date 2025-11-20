import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';
import type { ValidationSchema } from './schemas.js';
import { Validator as MockedValidator } from './validator.js';

vi.mock('./validator.js', (): Record<string, unknown> => {
  const ctor = vi.fn().mockImplementation((_schema: unknown) => {
    const validate = vi.fn((data: Record<string, unknown>) => {
      const shouldPass = Boolean((data as Record<string, unknown>).shouldPass);
      const noSanitized = Boolean((data as Record<string, unknown>).noSanitized);
      const errors = shouldPass ? [] : ['error1', 'error2'];
      const result: { valid: boolean; errors: string[]; sanitized?: Record<string, unknown> } = {
        valid: errors.length === 0,
        errors,
      };
      if (!noSanitized) {
        result.sanitized = { ...data };
      }
      return result;
    });


    return { schema: _schema, validate };
  });

  return {
    Validator: ctor,
  };
});

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schemas and validators', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {

      middleware.registerSchema('user', schema);
      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(MockedValidator).toHaveBeenCalledTimes(1);
      expect(MockedValidator).toHaveBeenCalledWith(schema);
    });

      const schema2: ValidationSchema = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;

      middleware.registerSchema('dup', schema1);
      middleware.registerSchema('dup', schema2);

      expect(middleware.getSchema('dup')).toBe(schema2);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(MockedValidator).toHaveBeenCalledTimes(2);
    });
  });

  describe('unregisterSchema', (): void => {
      middleware.registerSchema('profile', schema);

      const removed = middleware.unregisterSchema('profile');
      expect(removed).toBe(true);
      expect(middleware.getSchema('profile')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);

      // Attempting to validate after unregister should throw
      expect(() =>
        middleware.validateWithSchema('profile', { shouldPass: true }),
      ).toThrowError("Schema 'profile' not found");
    });

    test('should return false for non-existent schema', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
      middleware.registerSchema('account', schema);

      expect(middleware.getSchema('account')).toBe(schema);
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() =>
        middleware.validateWithSchema('not-found', { shouldPass: true }),
      ).toThrowError("Schema 'not-found' not found");
    });

      middleware.registerSchema('s1', schema);

      const result = middleware.validateWithSchema('s1', { shouldPass: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).toMatchObject({ shouldPass: true });
    });

      middleware.registerSchema('s2', schema);

      const result = middleware.validateWithSchema(
        's2',
        { shouldPass: false },
        { abortEarly: true },
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toBe('error1');
    });


      middleware.registerSchema('s3', schema);

      const data: Record<string, unknown> = { a: 1, b: 2, c: 3, shouldPass: true };
      const result = middleware.validateWithSchema('s3', data, {
        stripUnknown: true,
      });

      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

      middleware.registerSchema('s4', schema);

      const result = middleware.validateWithSchema(
        's4',
        { shouldPass: true, noSanitized: true },
        { stripUnknown: true },
      );

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('createMiddleware', (): void => {
      middleware.registerSchema('mw', schema);

      const mwFn = middleware.createMiddleware('mw', { abortEarly: true });
      const result = mwFn({ shouldPass: false });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toBe('error1');
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() =>
        middleware.batchValidate('nope', [{ shouldPass: true }]),
      ).toThrowError("Schema 'nope' not found");
    });

      middleware.registerSchema('batch', schema);

      const inputs: Record<string, unknown>[] = [
        { shouldPass: true },
        { shouldPass: false },
      ];

      const results = middleware.batchValidate('batch', inputs);
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(Array.isArray(results[1].errors)).toBe(true);
    });
  });

  describe('batchValidationPassed', (): void => {
        { valid: true, errors: [], sanitized: {} },
      ]);
      expect(allValid).toBe(true);
    });

        { valid: false, errors: ['e'], sanitized: {} },
      ]);
      expect(someInvalid).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
      const s2: ValidationSchema = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('one', s1);
      middleware.registerSchema('two', s2);

      const names = middleware.getSchemaNames();
      expect(names.sort()).toEqual(['one', 'two'].sort());
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      const schema: ValidationSchema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('count', schema);
      expect(middleware.getSchemaCount()).toBe(1);
    });
  });

  describe('clearAll', (): void => {
      middleware.registerSchema('to-clear', schema);
      expect(middleware.getSchemaCount()).toBe(1);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchema('to-clear')).toBeUndefined();
      expect(() =>
        middleware.validateWithSchema('to-clear', { shouldPass: true }),
      ).toThrowError("Schema 'to-clear' not found");
    });
  });
});

describe('Global middleware utilities', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).toBe(b);
      expect(a).toBeInstanceOf(ValidationMiddleware);
    });

    test('should return a new instance after reset', (): void => {
      const before = getGlobalMiddleware();
      resetGlobalMiddleware();
      const after = getGlobalMiddleware();
      expect(after).toBeInstanceOf(ValidationMiddleware);
      expect(after).not.toBe(before);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance so it reinitializes on next get', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(second).not.toBe(first);
    });
  });
});
