import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Track constructed mock validator instances
interface MockValidator {
  validate: (...args: unknown[]) => unknown;
}
const createdValidatorInstances: MockValidator[] = [];

vi.mock('../src/validation/validator.js', (): Record<string, unknown> => {
  return {
    Validator: vi.fn().mockImplementation((_schema: unknown) => {
      const instance: MockValidator = {
        validate: vi.fn(),
      };
      createdValidatorInstances.push(instance);
      return instance;
    }),
  };
});

import type { ValidationResult, ValidationSchema } from '../src/validation/schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../src/validation/middleware.js';
import { Validator } from '../src/validation/validator.js';

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
    createdValidatorInstances.length = 0;
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    createdValidatorInstances.length = 0;
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty registries', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create a Validator instance', (): void => {
      const schema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('test', schema);

      expect(middleware.getSchema('test')).toBe(schema);
      expect(middleware.getSchemaNames()).toEqual(['test']);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(Validator).toHaveBeenCalledTimes(1);
      expect(Validator).toHaveBeenCalledWith(schema);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and its validator', (): void => {
      const schema = { rules: [{ field: 'x' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s1', schema);
      expect(middleware.getSchemaCount()).toBe(1);

      const deleted = middleware.unregisterSchema('s1');
      expect(deleted).toBe(true);
      expect(middleware.getSchema('s1')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);

      expect((): void => {
        // Now throws because validator is removed
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('s1', {});
      }).toThrowError("Schema 's1' not found");
    });

    test('should return false when unregistering non-existent schema', (): void => {
      const deleted = middleware.unregisterSchema('missing');
      expect(deleted).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return the registered schema by name', (): void => {
      const schema = { rules: [{ field: 'id' }] } as unknown as ValidationSchema;
      middleware.registerSchema('byName', schema);
      expect(middleware.getSchema('byName')).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('nope')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('unknown', {});
      }).toThrowError("Schema 'unknown' not found");
    });

    test('should return validator result without options modifications', (): void => {
      const schema = { rules: [{ field: 'a' }, { field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const resultObj = {
        valid: false,
        errors: [{ message: 'e1' }, { message: 'e2' }],
        sanitized: { a: 1, b: 2, c: 3 },
      } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const returned = middleware.validateWithSchema('s', { a: 1, b: 2, c: 3 });
      expect(returned).toBe(resultObj);
      expect(returned).toEqual(resultObj);
    });

    test('should apply abortEarly option to keep only the first error', (): void => {
      const schema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const resultObj = {
        valid: false,
        errors: [{ message: 'first' }, { message: 'second' }, { message: 'third' }],
        sanitized: { a: 1 },
      } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const returned = middleware.validateWithSchema('s', { a: 1 }, { abortEarly: true });
      expect(returned.errors).toHaveLength(1);
      expect(returned.errors[0]).toEqual({ message: 'first' });
    });

    test('should strip unknown fields from sanitized when stripUnknown is true', (): void => {
      const schema = { rules: [{ field: 'a' }, { field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const resultObj = {
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2, c: 3, d: 4 },
      } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const returned = middleware.validateWithSchema('s', { a: 1, b: 2, c: 3, d: 4 }, { stripUnknown: true });
      expect(returned.sanitized).toEqual({ a: 1, b: 2 });
    });

    test('should not modify sanitized when it is undefined even if stripUnknown is true', (): void => {
      const schema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const resultObj = {
        valid: true,
        errors: [],
        sanitized: undefined,
      } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const returned = middleware.validateWithSchema('s', { a: 1 }, { stripUnknown: true });
      expect(returned.sanitized).toBeUndefined();
    });

    test('should apply both abortEarly and stripUnknown options together', (): void => {
      const schema = { rules: [{ field: 'x' }, { field: 'y' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const resultObj = {
        valid: false,
        errors: [{ message: 'only' }, { message: 'ignored' }],
        sanitized: { x: 'ok', y: 'ok', z: 'remove' },
      } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const returned = middleware.validateWithSchema('s', { x: 'ok', y: 'ok', z: 'remove' }, { abortEarly: true, stripUnknown: true });
      expect(returned.errors).toHaveLength(1);
      expect(returned.sanitized).toEqual({ x: 'ok', y: 'ok' });
    });
  });

  describe('createMiddleware', (): void => {
    test('should create a callable that validates with bound schema and options', (): void => {
      const schema = { rules: [{ field: 'a' }, { field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const resultObj = {
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2, c: 3 },
      } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const mwFn = middleware.createMiddleware('s', { stripUnknown: true });
      const returned = mwFn({ a: 1, b: 2, c: 3 });

      expect(returned.valid).toBe(true);
      expect(returned.sanitized).toEqual({ a: 1, b: 2 });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.batchValidate('missing', [{}, {}]);
      }).toThrowError("Schema 'missing' not found");
    });

    test('should validate each item in the array', (): void => {
      const schema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('s', schema);

      const r1 = { valid: true, errors: [], sanitized: { a: 1 } } as unknown as ValidationResult;
      const r2 = { valid: false, errors: [{ message: 'bad' }], sanitized: { a: 2 } } as unknown as ValidationResult;

      const mock = createdValidatorInstances[0];
      const validateFn = mock.validate as unknown as ReturnType<typeof vi.fn>;
      validateFn.mockImplementationOnce((_d: unknown) => r1).mockImplementationOnce((_d: unknown) => r2);

      const dataArray: Record<string, unknown>[] = [{ a: 1 }, { a: 2 }];
      const results = middleware.batchValidate('s', dataArray);

      expect(results).toEqual([r1, r2]);
      expect(validateFn).toHaveBeenCalledTimes(2);
      expect(validateFn).toHaveBeenNthCalledWith(1, { a: 1 });
      expect(validateFn).toHaveBeenNthCalledWith(2, { a: 2 });
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const allValid: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} } as unknown as ValidationResult,
        { valid: true, errors: [], sanitized: {} } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(allValid)).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const mixed: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} } as unknown as ValidationResult,
        { valid: false, errors: [{ message: 'x' }], sanitized: {} } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(mixed)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const s1 = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      const s2 = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('first', s1);
      middleware.registerSchema('second', s2);

      const names = middleware.getSchemaNames();
      expect(names).toContain('first');
      expect(names).toContain('second');
      expect(names.length).toBe(2);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return total number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('a', { rules: [{ field: 'a' }] } as unknown as ValidationSchema);
      middleware.registerSchema('b', { rules: [{ field: 'b' }] } as unknown as ValidationSchema);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear schemas and validators', (): void => {
      middleware.registerSchema('a', { rules: [{ field: 'a' }] } as unknown as ValidationSchema);
      middleware.registerSchema('b', { rules: [{ field: 'b' }] } as unknown as ValidationSchema);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);

      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('a', {});
      }).toThrowError("Schema 'a' not found");
    });
  });
});

describe('Global middleware instance', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const inst1 = getGlobalMiddleware();
      const inst2 = getGlobalMiddleware();
      expect(inst1).toBe(inst2);

      inst1.registerSchema('g1', { rules: [{ field: 'x' }] } as unknown as ValidationSchema);
      expect(inst2.getSchemaNames()).toContain('g1');
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance so a new one is created', (): void => {
      const before = getGlobalMiddleware();
      before.registerSchema('g2', { rules: [{ field: 'y' }] } as unknown as ValidationSchema);
      expect(before.getSchemaNames()).toContain('g2');

      resetGlobalMiddleware();

      const after = getGlobalMiddleware();
      expect(after).not.toBe(before);
      expect(after.getSchemaNames()).toEqual([]);
    });
  });
});
