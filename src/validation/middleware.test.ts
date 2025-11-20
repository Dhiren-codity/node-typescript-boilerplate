import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationResult } from '../../src/validation/schemas.js';

// Mock the validator dependency
vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  const ctorSpy = vi.fn((_schema: unknown): void => {
    // constructor spy
  });

  const validateFn = vi.fn((data: Record<string, unknown>): ValidationResult => {
    return {
      valid: true,
      errors: [],
      sanitized: data,
    } as unknown as ValidationResult;
  });

  class MockValidator {
    public schema: unknown;
    public validate: (data: Record<string, unknown>) => ValidationResult;

    constructor(schema: unknown) {
      ctorSpy(schema);
      this.schema = schema;
      this.validate = validateFn as (data: Record<string, unknown>) => ValidationResult;
    }
  }

  return {
    Validator: MockValidator,
    __mocks: {
      ctorSpy,
      validateFn,
    },
  };
});

import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.ts';
import * as ValidatorModule from '../../src/validation/validator.js';

type ValidatorMockModule = {
  __mocks: {
    ctorSpy: ReturnType<typeof vi.fn>;
    validateFn: ReturnType<typeof vi.fn>;
  };
};

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;
  const validatorMockModule = ValidatorModule as unknown as ValidatorMockModule;

  const makeSchema = (fields: string[]): unknown => ({
    rules: fields.map((f) => ({ field: f })),
  });

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
    validatorMockModule.__mocks.ctorSpy.mockReset();
    validatorMockModule.__mocks.validateFn.mockReset();
    validatorMockModule.__mocks.validateFn.mockImplementation(
      (data: Record<string, unknown>): ValidationResult =>
        ({
          valid: true,
          errors: [],
          sanitized: data,
        } as unknown as ValidationResult),
    );
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema maps', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create a Validator instance', (): void => {
      const schema = makeSchema(['name']) as unknown;
      middleware.registerSchema('user', schema as unknown as never);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(validatorMockModule.__mocks.ctorSpy).toHaveBeenCalledTimes(1);
      expect(validatorMockModule.__mocks.ctorSpy).toHaveBeenCalledWith(schema);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['user']);
    });

    test('should overwrite existing schema and create a new Validator', (): void => {
      const schema1 = makeSchema(['name']);
      const schema2 = makeSchema(['name', 'age']);

      middleware.registerSchema('user', schema1 as unknown as never);
      middleware.registerSchema('user', schema2 as unknown as never);

      expect(validatorMockModule.__mocks.ctorSpy).toHaveBeenCalledTimes(2);
      expect(validatorMockModule.__mocks.ctorSpy).toHaveBeenNthCalledWith(1, schema1);
      expect(validatorMockModule.__mocks.ctorSpy).toHaveBeenNthCalledWith(2, schema2);
      expect(middleware.getSchema('user')).toBe(schema2);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['user']);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and return true', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('user', schema as unknown as never);

      const result = middleware.unregisterSchema('user');
      expect(result).toBe(true);
      expect(middleware.getSchema('user')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);
    });

    test('should return false when unregistering non-existent schema', (): void => {
      const result = middleware.unregisterSchema('missing');
      expect(result).toBe(false);
    });

    test('should remove validator so subsequent validation fails', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('user', schema as unknown as never);
      middleware.unregisterSchema('user');

      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('user', {});
      }).toThrowError("Schema 'user' not found");
    });
  });

  describe('getSchema', (): void => {
    test('should return registered schema', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('user', schema as unknown as never);
      expect(middleware.getSchema('user')).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw error when schema is not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('unknown', {});
      }).toThrowError("Schema 'unknown' not found");
    });

    test('should return result from validator.validate', (): void => {
      const schema = makeSchema(['name']);
      const expected: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'Alice' },
      } as unknown as ValidationResult;

      validatorMockModule.__mocks.validateFn.mockReturnValueOnce(expected);
      middleware.registerSchema('user', schema as unknown as never);

      const result = middleware.validateWithSchema('user', { name: 'Alice' });
      expect(result).toBe(expected);
      expect(validatorMockModule.__mocks.validateFn).toHaveBeenCalledTimes(1);
      expect(validatorMockModule.__mocks.validateFn).toHaveBeenCalledWith({ name: 'Alice' });
    });

    test('should apply abortEarly option and keep only the first error', (): void => {
      const schema = makeSchema(['name']);
      const baseResult: ValidationResult = {
        valid: false,
        errors: [{ field: 'name', message: 'required' }, { field: 'age', message: 'invalid' }],
        sanitized: { name: '' },
      } as unknown as ValidationResult;

      validatorMockModule.__mocks.validateFn.mockReturnValueOnce({
        ...baseResult,
        errors: [...baseResult.errors],
      } as unknown as ValidationResult);

      middleware.registerSchema('user', schema as unknown as never);

      const result = middleware.validateWithSchema('user', { name: '' }, { abortEarly: true });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ field: 'name', message: 'required' });
    });

    test('should not modify errors when abortEarly is false or not set', (): void => {
      const schema = makeSchema(['name']);
      const baseResult: ValidationResult = {
        valid: false,
        errors: [{ field: 'name', message: 'required' }, { field: 'age', message: 'invalid' }],
        sanitized: { name: '' },
      } as unknown as ValidationResult;

      validatorMockModule.__mocks.validateFn.mockReturnValueOnce({
        ...baseResult,
        errors: [...baseResult.errors],
      } as unknown as ValidationResult);

      middleware.registerSchema('user', schema as unknown as never);

      const result = middleware.validateWithSchema('user', { name: '' });
      expect(result.errors).toHaveLength(2);
    });

    test('should strip unknown fields from sanitized output based on schema rules', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as unknown as never);

      const validationResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'Bob', age: 30, extra: 'remove-me' },
      } as unknown as ValidationResult;

      validatorMockModule.__mocks.validateFn.mockReturnValueOnce(validationResult);

      const result = middleware.validateWithSchema('user', { name: 'Bob', age: 30, extra: 'remove-me' }, { stripUnknown: true });
      expect(result.sanitized).toEqual({ name: 'Bob', age: 30 });
    });

    test('should not attempt stripUnknown if sanitized is undefined', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as unknown as never);

      const validationResult: ValidationResult = {
        valid: false,
        errors: [{ field: 'name', message: 'required' }],
        sanitized: undefined,
      } as unknown as ValidationResult;

      validatorMockModule.__mocks.validateFn.mockReturnValueOnce(validationResult);

      const result = middleware.validateWithSchema('user', {}, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('createMiddleware', (): void => {
    test('should return function that delegates to validateWithSchema with provided options', (): void => {
      const schemaName = 'account';
      const options = { abortEarly: true, stripUnknown: true };
      const data = { email: 'x@y.com' };

      const spy = vi.spyOn(middleware, 'validateWithSchema').mockImplementation(
        (_name: string, _data: Record<string, unknown>, _options?: unknown): ValidationResult =>
          ({
            valid: true,
            errors: [],
            sanitized: { email: 'x@y.com' },
          } as unknown as ValidationResult),
      );

      const mwFn = middleware.createMiddleware(schemaName, options);
      const result = mwFn(data);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(schemaName, data, options);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('batchValidate', (): void => {
    test('should throw error when schema is not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.batchValidate('missing', [{}]);
      }).toThrowError("Schema 'missing' not found");
    });

    test('should validate each data item and return results array', (): void => {
      const schema = makeSchema(['id']);
      middleware.registerSchema('item', schema as unknown as never);

      const result1: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { id: 1 },
      } as unknown as ValidationResult;

      const result2: ValidationResult = {
        valid: false,
        errors: [{ field: 'id', message: 'invalid' }],
        sanitized: { id: 'bad' },
      } as unknown as ValidationResult;

      validatorMockModule.__mocks.validateFn
        .mockReturnValueOnce(result1)
        .mockReturnValueOnce(result2);

      const inputs: Record<string, unknown>[] = [{ id: 1 }, { id: 'bad' }];
      const results = middleware.batchValidate('item', inputs);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(result1);
      expect(results[1]).toBe(result2);
      expect(validatorMockModule.__mocks.validateFn).toHaveBeenCalledTimes(2);
      expect(validatorMockModule.__mocks.validateFn).toHaveBeenNthCalledWith(1, inputs[0]);
      expect(validatorMockModule.__mocks.validateFn).toHaveBeenNthCalledWith(2, inputs[1]);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} } as unknown as ValidationResult,
        { valid: true, errors: [], sanitized: {} } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} } as unknown as ValidationResult,
        { valid: false, errors: [{ field: 'x' } as unknown as Record<string, unknown>], sanitized: {} } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });

    test('should return true for empty results array', (): void => {
      expect(middleware.batchValidationPassed([])).toBe(true);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const schema1 = makeSchema(['a']);
      const schema2 = makeSchema(['b']);
      middleware.registerSchema('one', schema1 as unknown as never);
      middleware.registerSchema('two', schema2 as unknown as never);
      expect(middleware.getSchemaNames().sort()).toEqual(['one', 'two']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', makeSchema(['a']) as unknown as never);
      expect(middleware.getSchemaCount()).toBe(1);
      middleware.registerSchema('two', makeSchema(['b']) as unknown as never);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should remove all schemas and validators', (): void => {
      middleware.registerSchema('one', makeSchema(['a']) as unknown as never);
      middleware.registerSchema('two', makeSchema(['b']) as unknown as never);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);

      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('one', {});
      }).toThrowError("Schema 'one' not found");
    });
  });
});

describe('Global middleware instance', (): void => {
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
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset and create a new instance on next get', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();

      expect(second).toBeInstanceOf(ValidationMiddleware);
      expect(second).not.toBe(first);
    });
  });
});
