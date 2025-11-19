import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Validator dependency used by the middleware
vi.mock('./validator.js', () => {
  const instances: any[] = [];
  class MockValidator {
    schema: any;
    validate: any;
    constructor(schema: any) {
      this.schema = schema;
      this.validate = vi.fn((data: Record<string, unknown>) => ({
        valid: true,
        errors: [],
        sanitized: data,
      }));
      instances.push(this);
    }
  }
  return { Validator: MockValidator, __instances: instances };
});

import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware';
import { __instances as validatorInstances } from './validator.js';

describe('ValidationMiddleware', () => {
  let middleware: ValidationMiddleware;

  beforeEach(() => {
    middleware = new ValidationMiddleware();
    vi.clearAllMocks();
    (validatorInstances as any[]).length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
    (validatorInstances as any[]).length = 0;
  });

  describe('constructor', () => {
    test('should initialize with no schemas', () => {
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', () => {
    test('should register schema and create a validator instance', () => {
      const schema: any = { rules: [{ field: 'name' }] };
      middleware.registerSchema('user', schema);

      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaNames()).toEqual(['user']);
      expect((validatorInstances as any[]).length).toBe(1);
      expect((validatorInstances as any[])[0].schema).toBe(schema);
    });
  });

  describe('unregisterSchema', () => {
    test('should remove schema and its validator, returning true', () => {
      const schema: any = { rules: [{ field: 'name' }] };
      middleware.registerSchema('user', schema);

      const result = middleware.unregisterSchema('user');
      expect(result).toBe(true);
      expect(middleware.getSchema('user')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);
    });

    test('should return false when schema does not exist', () => {
      const result = middleware.unregisterSchema('missing');
      expect(result).toBe(false);
    });
  });

  describe('getSchema', () => {
    test('should return registered schema by name', () => {
      const schema: any = { rules: [{ field: 'email' }] };
      middleware.registerSchema('emailSchema', schema);
      expect(middleware.getSchema('emailSchema')).toBe(schema);
    });

    test('should return undefined for unknown schema', () => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', () => {
    test('should throw if schema not found', () => {
      expect(() => middleware.validateWithSchema('missing', {})).toThrow(
        "Schema 'missing' not found",
      );
    });

    test('should return validator result without options', () => {
      const schema: any = { rules: [{ field: 'a' }] };
      middleware.registerSchema('simple', schema);

      const instance = (validatorInstances as any[])[0];
      instance.validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2 },
      });

      const result = middleware.validateWithSchema('simple', { a: 1, b: 2 });
      expect(result).toEqual({
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2 },
      });
      expect(instance.validate).toHaveBeenCalledWith({ a: 1, b: 2 });
    });

    test('should apply abortEarly option to keep only first error', () => {
      const schema: any = { rules: [{ field: 'a' }] };
      middleware.registerSchema('errs', schema);

      const instance = (validatorInstances as any[])[0];
      instance.validate.mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'e1' }, { message: 'e2' }, { message: 'e3' }],
        sanitized: { a: 1 },
      });

      const result = middleware.validateWithSchema('errs', { a: null }, { abortEarly: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ message: 'e1' });
    });

    test('should strip unknown fields from sanitized data when stripUnknown is true', () => {
      const schema: any = { rules: [{ field: 'name' }, { field: 'email' }] };
      middleware.registerSchema('user', schema);

      const instance = (validatorInstances as any[])[0];
      instance.validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: { name: 'Alice', email: 'a@example.com', extra: 'nope' },
      });

      const result = middleware.validateWithSchema(
        'user',
        { name: 'Alice', email: 'a@example.com', extra: 'nope' },
        { stripUnknown: true },
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'Alice', email: 'a@example.com' });
    });

    test('should not change sanitized when stripUnknown is true but no sanitized present', () => {
      const schema: any = { rules: [{ field: 'x' }] };
      middleware.registerSchema('noSan', schema);

      const instance = (validatorInstances as any[])[0];
      instance.validate.mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'bad' }],
        sanitized: undefined,
      });

      const result = middleware.validateWithSchema(
        'noSan',
        { y: 2 },
        { stripUnknown: true },
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ message: 'bad' }]);
      expect(result.sanitized).toBeUndefined();
    });

    test('should apply both abortEarly and stripUnknown together', () => {
      const schema: any = { rules: [{ field: 'name' }] };
      middleware.registerSchema('combo', schema);

      const instance = (validatorInstances as any[])[0];
      instance.validate.mockReturnValueOnce({
        valid: false,
        errors: ['err1', 'err2'],
        sanitized: { name: 'Bob', z: 9 },
      });

      const result = middleware.validateWithSchema(
        'combo',
        { name: 'Bob', z: 9 },
        { abortEarly: true, stripUnknown: true },
      );

      expect(result.errors).toEqual(['err1']);
      expect(result.sanitized).toEqual({ name: 'Bob' });
    });
  });

  describe('createMiddleware', () => {
    test('should create a function that calls validateWithSchema with provided options', () => {
      const schema: any = { rules: [{ field: 'x' }] };
      middleware.registerSchema('sch', schema);
      const data = { x: 1 };

      const spy = vi.spyOn(middleware, 'validateWithSchema').mockReturnValue({
        valid: true,
        errors: [],
        sanitized: { x: 1 },
      });

      const fn = middleware.createMiddleware('sch', { stripUnknown: true });
      const result = fn(data);

      expect(spy).toHaveBeenCalledWith('sch', data, { stripUnknown: true });
      expect(result).toEqual({ valid: true, errors: [], sanitized: { x: 1 } });
    });
  });

  describe('batchValidate', () => {
    test('should throw if schema not found', () => {
      expect(() => middleware.batchValidate('missing', [{}, {}])).toThrow(
        "Schema 'missing' not found",
      );
    });

    test('should validate each item and return array of results', () => {
      const schema: any = { rules: [{ field: 'a' }] };
      middleware.registerSchema('arr', schema);

      const instance = (validatorInstances as any[])[0];
      instance.validate
        .mockReturnValueOnce({ valid: true, errors: [], sanitized: { a: 1 } })
        .mockReturnValueOnce({ valid: false, errors: ['e'], sanitized: { a: null } });

      const results = middleware.batchValidate('arr', [{ a: 1 }, { a: null }]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ valid: true, errors: [], sanitized: { a: 1 } });
      expect(results[1]).toEqual({ valid: false, errors: ['e'], sanitized: { a: null } });
      expect(instance.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchValidationPassed', () => {
    test('should return true when all results are valid', () => {
      const results = [{ valid: true }, { valid: true }] as any[];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

    test('should return false when any result is invalid', () => {
      const results = [{ valid: true }, { valid: false }, { valid: true }] as any[];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', () => {
    test('should return array of all schema names in insertion order', () => {
      middleware.registerSchema('first', { rules: [] } as any);
      middleware.registerSchema('second', { rules: [] } as any);
      expect(middleware.getSchemaNames()).toEqual(['first', 'second']);
    });
  });

  describe('getSchemaCount', () => {
    test('should return number of registered schemas', () => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', { rules: [] } as any);
      middleware.registerSchema('two', { rules: [] } as any);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', () => {
    test('should remove all schemas and validators', () => {
      middleware.registerSchema('one', { rules: [{ field: 'a' }] } as any);
      middleware.registerSchema('two', { rules: [{ field: 'b' }] } as any);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(() => middleware.validateWithSchema('one', {})).toThrow(
        "Schema 'one' not found",
      );
      expect(() => middleware.validateWithSchema('two', {})).toThrow(
        "Schema 'two' not found",
      );
    });
  });
});

describe('Global middleware instance', () => {
  beforeEach(() => {
    resetGlobalMiddleware();
  });

  afterEach(() => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', () => {
    test('should create a global instance when none exists', () => {
      const instance = getGlobalMiddleware();
      expect(instance).toBeInstanceOf(ValidationMiddleware);
    });

    test('should return the same instance across calls until reset', () => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).toBe(b);

      resetGlobalMiddleware();

      const c = getGlobalMiddleware();
      expect(c).not.toBe(a);
      expect(c).toBeInstanceOf(ValidationMiddleware);
    });
  });

  describe('resetGlobalMiddleware', () => {
    test('should reset the singleton so a new instance is created next time', () => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(second).not.toBe(first);
    });
  });
});
