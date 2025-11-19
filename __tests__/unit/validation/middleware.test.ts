import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema } from '../../src/validation/schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.ts';

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  type ValidateFn = (data: Record<string, unknown>) => { valid: boolean; errors: unknown[]; sanitized?: Record<string, unknown> };
  let validateMap: WeakMap<object, ValidateFn> = new WeakMap<object, ValidateFn>();
  const constructedSchemas: unknown[] = [];

  class MockValidator {
    public schema: object;

    constructor(schema: object) {
      this.schema = schema;
      constructedSchemas.push(schema);
    }

    validate(data: Record<string, unknown>): { valid: boolean; errors: unknown[]; sanitized?: Record<string, unknown> } {
      const fn = validateMap.get(this.schema);
      if (fn) {
        return fn(data);
      }
      return { valid: true, errors: [], sanitized: data };
    }
  }

  const __setValidatorBehavior = (schema: unknown, fn: ValidateFn): void => {
    if (typeof schema !== 'object' || schema === null) {
      throw new Error('Schema must be a non-null object');
    }
    validateMap.set(schema as object, fn);
  };

  const __getConstructedSchemas = (): unknown[] => constructedSchemas.slice();

  const __resetMockValidator = (): void => {
    validateMap = new WeakMap<object, ValidateFn>();
    constructedSchemas.splice(0, constructedSchemas.length);
  };

  return {
    Validator: MockValidator,
    __setValidatorBehavior,
    __getConstructedSchemas,
    __resetMockValidator,
  } as Record<string, unknown>;
});


  beforeEach((): void => {
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with no schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });


      __resetMockValidator();

      middleware.registerSchema('user', schema1);
      __setValidatorBehavior(schema1, (_data: Record<string, unknown>) => ({ valid: false, errors: ['old'], sanitized: { x: 1 } }));

      // Re-register with a new schema; should replace validator
      middleware.registerSchema('user', schema2);
      __setValidatorBehavior(schema2, (_data: Record<string, unknown>) => ({ valid: true, errors: [], sanitized: { y: 2 } }));

      const result = middleware.validateWithSchema('user', { z: 3 });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ y: 2 });
      expect(middleware.getSchema('user')).toBe(schema2);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and return true', (): void => {
      const schema = makeSchema(['a']);
      middleware.registerSchema('one', schema);
      const removed = middleware.unregisterSchema('one');
      expect(removed).toBe(true);
      expect(middleware.getSchema('one')).toBeUndefined();
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(middleware.getSchemaCount()).toBe(0);
    });

    test('should return false when unregistering unknown schema', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return registered schema by name', (): void => {
      const schema = makeSchema(['a']);
      middleware.registerSchema('alpha', schema);
      expect(middleware.getSchema('alpha')).toBe(schema);
      expect(middleware.getSchema('beta')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('unknown', {});
      }).toThrowError("Schema 'unknown' not found");
    });

      const { __setValidatorBehavior, __resetMockValidator } = await vi.importMock('../../src/validation/validator.js') as unknown as {
        __setValidatorBehavior: (schema: unknown, fn: (data: Record<string, unknown>) => { valid: boolean; errors: unknown[]; sanitized?: Record<string, unknown> }) => void;
        __resetMockValidator: () => void;
      };
      __resetMockValidator();

      middleware.registerSchema('user', schema);
      __setValidatorBehavior(schema, (d: Record<string, unknown>) => ({
        valid: false,
        errors: ['e1', 'e2'],
        sanitized: d,
      }));

      const result = middleware.validateWithSchema('user', data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['e1', 'e2']);
      expect(result.sanitized).toEqual(data);
    });

      const { __setValidatorBehavior, __resetMockValidator } = await vi.importMock('../../src/validation/validator.js') as unknown as {
        __setValidatorBehavior: (schema: unknown, fn: (data: Record<string, unknown>) => { valid: boolean; errors: unknown[]; sanitized?: Record<string, unknown> }) => void;
        __resetMockValidator: () => void;
      };
      __resetMockValidator();

      middleware.registerSchema('user', schema);
      __setValidatorBehavior(schema, (_d: Record<string, unknown>) => ({
        valid: false,
        errors: ['first', 'second', 'third'],
        sanitized: { a: 1 },
      }));

      const result = middleware.validateWithSchema('user', data, { abortEarly: true });
      expect(result.errors).toEqual(['first']);
    });

      const { __setValidatorBehavior, __resetMockValidator } = await vi.importMock('../../src/validation/validator.js') as unknown as {
        __setValidatorBehavior: (schema: unknown, fn: (data: Record<string, unknown>) => { valid: boolean; errors: unknown[]; sanitized?: Record<string, unknown> }) => void;
        __resetMockValidator: () => void;
      };
      __resetMockValidator();

      middleware.registerSchema('user', schema);
      __setValidatorBehavior(schema, (d: Record<string, unknown>) => ({
        valid: true,
        errors: [],
        sanitized: d,
      }));

      const result = middleware.validateWithSchema('user', data, { stripUnknown: true });
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

      const { __setValidatorBehavior, __resetMockValidator } = await vi.importMock('../../src/validation/validator.js') as unknown as {
        __setValidatorBehavior: (schema: unknown, fn: (data: Record<string, unknown>) => { valid: boolean; errors: unknown[]; sanitized?: Record<string, unknown> }) => void;
        __resetMockValidator: () => void;
      };
      __resetMockValidator();

      middleware.registerSchema('user', schema);
      __setValidatorBehavior(schema, (_d: Record<string, unknown>) => ({
        valid: true,
        errors: [],
      }));

      const result = middleware.validateWithSchema('user', data, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
    });
  });

      __resetMockValidator();

      middleware.registerSchema('user', schema);
      __setValidatorBehavior(schema, (d: Record<string, unknown>) => ({
        valid: true,
        errors: [],
        sanitized: d,
      }));

      const mw = middleware.createMiddleware('user', { stripUnknown: true });
      const result = mw(data);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({ a: 1 });
    });
  });


      const inputs: Record<string, unknown>[] = [{ ok: true }, { ok: false }, { ok: true }];
      const results = middleware.batchValidate('batch', inputs);
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.valid)).toEqual([true, false, true]);
    });

    test('should throw for unknown schema', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.batchValidate('missing', [{}, {}]);
      }).toThrowError("Schema 'missing' not found");
    });
  });

      ] as unknown as Array<{ valid: boolean }>;
      expect(middleware.batchValidationPassed(results as unknown as Array<{ valid: boolean }>)).toBe(true);
    });

        { valid: false, errors: ['e'] },
      ] as unknown as Array<{ valid: boolean }>;
      expect(middleware.batchValidationPassed(results as unknown as Array<{ valid: boolean }>)).toBe(false);
    });
  });

  describe('getSchemaNames and getSchemaCount', (): void => {
    test('should return correct schema names and count', (): void => {
      const s1 = makeSchema(['a']);
      const s2 = makeSchema(['b']);
      middleware.registerSchema('one', s1);
      middleware.registerSchema('two', s2);

      expect(middleware.getSchemaNames()).toEqual(['one', 'two']);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should remove all schemas and validators', (): void => {
      const s1 = makeSchema(['a']);
      middleware.registerSchema('x', s1);
      expect(middleware.getSchemaCount()).toBe(1);

      middleware.clearAll();

      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('x', {});
      }).toThrowError("Schema 'x' not found");
    });
  });
});


  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).toBe(b);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).not.toBe(second);
    });
  });
});
