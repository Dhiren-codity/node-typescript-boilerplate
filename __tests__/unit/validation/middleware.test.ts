import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationResult } from '../../src/validation/schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.ts';

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  type ValidationResultShape = {
    valid: boolean;
    errors: unknown[];
    sanitized?: Record<string, unknown> | undefined;
  };

  const instances: {
    schema: unknown;
    validate: (data: Record<string, unknown>) => ValidationResultShape;
  }[] = [];

  class MockValidator {
    public schema: unknown;
    public validate: (data: Record<string, unknown>) => ValidationResultShape;

    constructor(schema: unknown) {
      this.schema = schema;

      this.validate = vi.fn((data: Record<string, unknown>): ValidationResultShape => {
        const rawErrors = (data as Record<string, unknown>).__errors;
        const errors = Array.isArray(rawErrors) ? rawErrors : [];
        const sanitizedCandidate = (data as Record<string, unknown>).__sanitized;
        const sanitized =
          (sanitizedCandidate as Record<string, unknown> | undefined) ??
          (data as Record<string, unknown>);
        const valid = errors.length === 0;

        return {
          valid,
          errors,
          sanitized,
        };



      instances.push({ schema, validate: this.validate });
    }

  const getMockValidatorInstances = (): Array<{
    schema: unknown;
    validate: (data: Record<string, unknown>) => ValidationResultShape;
  }> => instances;

  return {
    __esModule: true,
    Validator: MockValidator,
    getMockValidatorInstances,
  };


  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with no schemas', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(middleware.getSchemaCount()).toBe(0);
    });


      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaNames()).toEqual(['user']);
      expect(middleware.getSchemaCount()).toBe(1);
    });


      const deleted = middleware.unregisterSchema('profile');
      expect(deleted).toBe(true);

      expect(middleware.getSchema('profile')).toBeUndefined();
      expect((): void => {
        middleware.validateWithSchema('profile', {});
      }).toThrow("Schema 'profile' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const deleted = middleware.unregisterSchema('unknown');
      expect(deleted).toBe(false);
    });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('missing')).toBeUndefined();
    });

      middleware.registerSchema('entity', schema as unknown as { rules: { field: string }[] });
      expect(middleware.getSchema('entity')).toBe(schema);
    });

  describe('validateWithSchema', (): void => {
    test('should throw error when schema is not found', (): void => {
      expect((): void => {
        middleware.validateWithSchema('not-exist', {});
      }).toThrow("Schema 'not-exist' not found");
    });

      middleware.registerSchema('s1', schema as unknown as { rules: { field: string }[] });

      const data: Record<string, unknown> = { x: 1, y: 2 };
      const result = middleware.validateWithSchema('s1', data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual(data);
    });

      middleware.registerSchema('s2', schema as unknown as { rules: { field: string }[] });

      const error1 = { field: 'x', message: 'required' };
      const error2 = { field: 'y', message: 'invalid' };

      const data: Record<string, unknown> = {
        x: 1,
        __errors: [error1, error2],
      };

      const result = middleware.validateWithSchema('s2', data, { abortEarly: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([error1]);
      expect(result.sanitized).toEqual(data);
    });

      middleware.registerSchema('s3', schema as unknown as { rules: { field: string }[] });

      const sanitized: Record<string, unknown> = { a: 1, b: 2, c: 3, d: 4 };
      const data: Record<string, unknown> = {
        __errors: [],
        __sanitized: sanitized,
      };

      const result = middleware.validateWithSchema('s3', data, { stripUnknown: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

      middleware.registerSchema('s4', schema as unknown as { rules: { field: string }[] });

      const data: Record<string, unknown> = {
        __errors: [],
        __sanitized: undefined,
      };

      const result = middleware.validateWithSchema('s4', data, { stripUnknown: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toBeUndefined();
    });

      middleware.registerSchema('s5', schema as unknown as { rules: { field: string }[] });

      const errA = { field: 'a', message: 'bad' };
      const errB = { field: 'b', message: 'bad' };

      const data: Record<string, unknown> = {
        __errors: [errA, errB],
        __sanitized: { a: 1, b: 2, c: 3 },
      };

      const result = middleware.validateWithSchema('s5', data, {
        abortEarly: true,
        stripUnknown: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([errA]);
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });


      const spy = vi.spyOn(middleware, 'validateWithSchema').mockImplementation(
        (_schemaName: string, _data: Record<string, unknown>, _options?: Record<string, unknown>): ValidationResult => {
          return { valid: true, errors: [], sanitized: { ok: true } };
        },
      );

      const fn = middleware.createMiddleware('s6', { abortEarly: true });
      const result = fn({ z: 10 });

      expect(spy).toHaveBeenCalledWith('s6', { z: 10 }, { abortEarly: true });
      expect(result).toEqual({ valid: true, errors: [], sanitized: { ok: true } });
    });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.batchValidate('missing', [{}, {}]);
      }).toThrow("Schema 'missing' not found");
    });

      middleware.registerSchema('s7', schema as unknown as { rules: { field: string }[] });

      const data1: Record<string, unknown> = { p: 1 };
      const data2: Record<string, unknown> = { p: 2, __errors: [{ field: 'p', message: 'bad' }] };

      const results = middleware.batchValidate('s7', [data1, data2]);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[0].errors).toEqual([]);
      expect(results[0].sanitized).toEqual(data1);

      expect(results[1].valid).toBe(false);
      expect(Array.isArray(results[1].errors)).toBe(true);
      expect(results[1].errors).toEqual([{ field: 'p', message: 'bad' }]);
      expect(results[1].sanitized).toEqual(data2);
    });

      ];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

        { valid: false, errors: [{}], sanitized: {} },
      ];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });

      middleware.registerSchema('first', s1 as unknown as { rules: { field: string }[] });
      middleware.registerSchema('second', s2 as unknown as { rules: { field: string }[] });

      expect(middleware.getSchemaNames()).toEqual(['first', 'second']);
      expect(middleware.getSchemaCount()).toBe(2);
    });


      expect(middleware.getSchemaCount()).toBe(1);
      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect((): void => {
        middleware.validateWithSchema('toClear', {});
      }).toThrow("Schema 'toClear' not found");
    });


  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should create and return a global instance', (): void => {
      const instance = getGlobalMiddleware();
      expect(instance).toBeInstanceOf(ValidationMiddleware);
    });

    test('should return the same instance across calls', (): void => {
      const first = getGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).toBe(second);
    });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset global instance so new one is created', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();

      expect(first).not.toBe(second);
      expect(second).toBeInstanceOf(ValidationMiddleware);
    });
