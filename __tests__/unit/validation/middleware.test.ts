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

import type { ValidationResult, ValidationSchema } from '../src/validation/schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../src/validation/middleware.js';
import { Validator } from '../src/validation/validator.js';


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



    test('should return false when unregistering non-existent schema', (): void => {
      const deleted = middleware.unregisterSchema('missing');
      expect(deleted).toBe(false);
    });


    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('nope')).toBeUndefined();
    });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('unknown', {});
      }).toThrowError("Schema 'unknown' not found");
    });

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


      const mock = createdValidatorInstances[0];
      (mock.validate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(resultObj);

      const mwFn = middleware.createMiddleware('s', { stripUnknown: true });
      const returned = mwFn({ a: 1, b: 2, c: 3 });

      expect(returned.valid).toBe(true);
      expect(returned.sanitized).toEqual({ a: 1, b: 2 });
    });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.batchValidate('missing', [{}, {}]);
      }).toThrowError("Schema 'missing' not found");
    });

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

      ];
      expect(middleware.batchValidationPassed(allValid)).toBe(true);
    });

        { valid: false, errors: [{ message: 'x' }], sanitized: {} } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(mixed)).toBe(false);
    });

      middleware.registerSchema('first', s1);
      middleware.registerSchema('second', s2);

      const names = middleware.getSchemaNames();
      expect(names).toContain('first');
      expect(names).toContain('second');
      expect(names.length).toBe(2);
    });

  describe('getSchemaCount', (): void => {
    test('should return total number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('a', { rules: [{ field: 'a' }] } as unknown as ValidationSchema);
      middleware.registerSchema('b', { rules: [{ field: 'b' }] } as unknown as ValidationSchema);
      expect(middleware.getSchemaCount()).toBe(2);
    });

      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);

      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('a', {});
      }).toThrowError("Schema 'a' not found");
    });


  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const inst1 = getGlobalMiddleware();
      const inst2 = getGlobalMiddleware();
      expect(inst1).toBe(inst2);

      inst1.registerSchema('g1', { rules: [{ field: 'x' }] } as unknown as ValidationSchema);
      expect(inst2.getSchemaNames()).toContain('g1');
    });

