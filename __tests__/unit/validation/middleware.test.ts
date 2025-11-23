import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware, } from '../../src/validation/middleware.js';
import * as validatorModule from '../../src/validation/validator.js';

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  type MockValidationResult = {
    valid: boolean;
    errors: { message: string; field?: string }[];
    sanitized?: Record<string, unknown>;
  };
  type ValidateFn = (data: Record<string, unknown>) => MockValidationResult;

  const instances: { schema: unknown; validate: Mock<ValidateFn> }[] = [];

  class MockValidator {
    public schema: unknown;
    public validate: Mock<ValidateFn>;

    constructor(schema: unknown) {
      this.schema = schema;
      this.validate = vi
        .fn<ValidateFn>()


      instances.push({ schema, validate: this.validate });
    }
  }

  return {
    Validator: MockValidator,
    __getMockValidatorInstances: (): { schema: unknown; validate: Mock<ValidateFn> }[] => instances,
    __resetMockValidatorInstances: (): void => {
      instances.splice(0, instances.length);
    },
  };
});

  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,

type MockHelpers = {
  __getMockValidatorInstances: () => { schema: unknown; validate: Mock<(data: Record<string, unknown>) => { valid: boolean; errors: { message: string; field?: string }[]; sanitized?: Record<string, unknown> }> }[];
  __resetMockValidatorInstances: () => void;
};

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;
  const helpers = validatorModule as unknown as MockHelpers;

  const makeSchema = (fields: string[]): { rules: { field: string }[] } => ({
    rules: fields.map((f) => ({ field: f })),
  });

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
    helpers.__resetMockValidatorInstances();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
    helpers.__resetMockValidatorInstances();
  });

  describe('constructor', (): void => {
    test('should initialize empty registries', (): void => {
      expect(middleware).toBeInstanceOf(ValidationMiddleware);
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create validator instance', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as never);

      expect(middleware.getSchema('user')).toBe(schema as never);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['user']);

      const instances = helpers.__getMockValidatorInstances();
      expect(instances.length).toBe(1);
      expect(instances[0].schema).toBe(schema);
    });

    test('should overwrite existing schema and validator on re-register', (): void => {
      const schema1 = makeSchema(['name']);
      const schema2 = makeSchema(['name', 'email']);
      middleware.registerSchema('user', schema1 as never);
      middleware.registerSchema('user', schema2 as never);

      expect(middleware.getSchema('user')).toBe(schema2 as never);
      expect(middleware.getSchemaCount()).toBe(1);

      const instances = helpers.__getMockValidatorInstances();
      expect(instances.length).toBe(2); // constructor called twice
      expect(instances[1].schema).toBe(schema2);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should remove schema and its validator and return true', (): void => {
      const schema = makeSchema(['id']);
      middleware.registerSchema('item', schema as never);

      const removed = middleware.unregisterSchema('item');
      expect(removed).toBe(true);
      expect(middleware.getSchema('item')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);

      expect((): unknown => middleware.validateWithSchema('item', {})).toThrowError(
        "Schema 'item' not found",
      );
    });

    test('should return false when schema not found', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): unknown => middleware.validateWithSchema('missing', {})).toThrowError(
        "Schema 'missing' not found",
      );
    });

    test('should validate data using registered validator', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      expect(instances.length).toBe(1);

      const validationOutput = {
        valid: false,
        errors: [{ message: 'name required' }],
        sanitized: { name: 'Alice', age: 30 },
      };
      instances[0].validate.mockReturnValueOnce(validationOutput);

      const result = middleware.validateWithSchema('user', { name: 'Alice' });

      expect(instances[0].validate).toHaveBeenCalledTimes(1);
      expect(instances[0].validate).toHaveBeenCalledWith({ name: 'Alice' });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ message: 'name required' }]);
      expect(result.sanitized).toEqual({ name: 'Alice', age: 30 });
    });

    test('should honor abortEarly option by keeping only the first error', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      instances[0].validate.mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'e1' }, { message: 'e2' }, { message: 'e3' }],
        sanitized: { name: 'Bob' },
      });

      const result = middleware.validateWithSchema('user', { name: '' }, { abortEarly: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ message: 'e1' }]);
    });

    test('should keep errors empty when abortEarly is set but there are no errors', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      instances[0].validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: { name: 'Carol', extra: 'x' },
      });

      const result = middleware.validateWithSchema('user', { name: 'Carol' }, { abortEarly: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should strip unknown fields when stripUnknown is true and sanitized is provided', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      instances[0].validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: { name: 'Alice', age: 25, extra: 'remove-me' },
      });

      const result = middleware.validateWithSchema(
        'user',
        { name: 'Alice', age: 25, extra: 'remove-me' },
        { stripUnknown: true },
      );

      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({ name: 'Alice', age: 25 });
    });

    test('should do nothing on stripUnknown when sanitized is undefined', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      instances[0].validate.mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'bad' }],
        sanitized: undefined,
      });

      const result = middleware.validateWithSchema('user', { name: 123 } as unknown as Record<string, unknown>, {
        stripUnknown: true,
      });

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toEqual([{ message: 'bad' }]);
    });
  });

  describe('createMiddleware', (): void => {
    test('should create a function that validates with given schema and options', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      instances[0].validate.mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'e1' }, { message: 'e2' }],
        sanitized: { name: 'Alice', age: 20, extra: true },
      });

      const fn = middleware.createMiddleware('user', { abortEarly: true, stripUnknown: true });
      const input = { name: 'Alice', age: 20, extra: true };
      const result = fn(input);

      expect(instances[0].validate).toHaveBeenCalledTimes(1);
      expect(instances[0].validate).toHaveBeenCalledWith(input);
      expect(result.errors).toEqual([{ message: 'e1' }]);
      expect(result.sanitized).toEqual({ name: 'Alice', age: 20 });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): unknown => middleware.batchValidate('missing', [{}])).toThrowError(
        "Schema 'missing' not found",
      );
    });

    test('should validate an array of data with the same validator', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('user', schema as never);

      const instances = helpers.__getMockValidatorInstances();
      instances[0].validate
        .mockReturnValueOnce({ valid: true, errors: [], sanitized: { name: 'A' } })

      const dataArray: Record<string, unknown>[] = [{ name: 'A' }, { name: '' }];
      const results = middleware.batchValidate('user', dataArray);

      expect(instances[0].validate).toHaveBeenCalledTimes(2);
      expect(instances[0].validate).toHaveBeenNthCalledWith(1, { name: 'A' });
      expect(instances[0].validate).toHaveBeenNthCalledWith(2, { name: '' });

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].errors).toEqual([{ message: 'bad' }]);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results = [
        { valid: true, errors: [], sanitized: {} },
        { valid: true, errors: [], sanitized: {} },
      ] as unknown as ReturnType<ValidationMiddleware['batchValidate']>;
      const passed = middleware.batchValidationPassed(results);
      expect(passed).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results = [
        { valid: true, errors: [], sanitized: {} },
        { valid: false, errors: [{ message: 'e' }], sanitized: {} },
      ] as unknown as ReturnType<ValidationMiddleware['batchValidate']>;
      const passed = middleware.batchValidationPassed(results);
      expect(passed).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const s1 = makeSchema(['a']);
      const s2 = makeSchema(['b']);
      middleware.registerSchema('one', s1 as never);
      middleware.registerSchema('two', s2 as never);

      expect(middleware.getSchemaNames()).toEqual(['one', 'two']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('x', makeSchema(['x']) as never);
      middleware.registerSchema('y', makeSchema(['y']) as never);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear all schemas and validators', (): void => {
      middleware.registerSchema('a', makeSchema(['a']) as never);
      middleware.registerSchema('b', makeSchema(['b']) as never);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect((): unknown => middleware.validateWithSchema('a', {})).toThrowError(
        "Schema 'a' not found",
      );
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
      expect(a).toBeInstanceOf(ValidationMiddleware);
      expect(a).toBe(b);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance', (): void => {
      const first = getGlobalMiddleware();
      expect(first).toBeInstanceOf(ValidationMiddleware);

      resetGlobalMiddleware();

      const second = getGlobalMiddleware();
      expect(second).toBeInstanceOf(ValidationMiddleware);
      expect(second).not.toBe(first);
      expect(second.getSchemaCount()).toBe(0);
    });

    test('should be safe to call multiple times', (): void => {
      resetGlobalMiddleware();
      resetGlobalMiddleware();
      const instance = getGlobalMiddleware();
      expect(instance).toBeInstanceOf(ValidationMiddleware);
    });
  });
});
