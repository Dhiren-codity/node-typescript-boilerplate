import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationResult, ValidationSchema } from './schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';

vi.mock('./validator.js', (): Record<string, unknown> => {
  const created: Array<{ schema: unknown; validate: ReturnType<typeof vi.fn> }> = [];

  const Validator = vi.fn(function (this: unknown, schema: unknown): void {
    const self = this as { schema: unknown; validate: ReturnType<typeof vi.fn> };
    self.schema = schema;
    self.validate = vi.fn().mockReturnValue({
      valid: true,
      errors: [],
      sanitized: {},
    });
    created.push(self);
  });

  return {
    Validator,
    __createdValidators: created,
  };
});

import { Validator as MockedValidator, __createdValidators } from './validator.js';

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  const getCreatedValidatorInstances = (): Array<{
    schema: unknown;
    validate: ReturnType<typeof vi.fn>;
  }> => __createdValidators as unknown as Array<{ schema: unknown; validate: ReturnType<typeof vi.fn> }>;

  const makeSchema = (fields: string[]): ValidationSchema =>
    ({ rules: fields.map((field) => ({ field })) } as unknown as ValidationSchema);

  beforeEach((): void => {
    vi.clearAllMocks();
    (getCreatedValidatorInstances().length = 0);
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with no schemas', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create a Validator instance', (): void => {
      const schema = makeSchema(['name', 'age']);
      middleware.registerSchema('user', schema);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaNames()).toEqual(['user']);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(MockedValidator).toHaveBeenCalledTimes(1);
      expect(MockedValidator).toHaveBeenCalledWith(schema);
    });


      middleware.registerSchema('dup', schemaB);
      expect(middleware.getSchema('dup')).toBe(schemaB);
      const secondInstance = getCreatedValidatorInstances()[1];
      secondInstance.validate.mockReturnValueOnce({ valid: false, errors: ['e1'] as unknown as unknown[], sanitized: { b: 2 } } as unknown as ValidationResult);

      const result = middleware.validateWithSchema('dup', { b: 2 } as Record<string, unknown>);
      expect(result.valid).toBe(false);
      expect(result.sanitized).toEqual({ b: 2 });
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and its validator', (): void => {
      const schema = makeSchema(['name']);
      middleware.registerSchema('s', schema);
      const deleted = middleware.unregisterSchema('s');
      expect(deleted).toBe(true);
      expect(middleware.getSchema('s')).toBeUndefined();
      expect(() => middleware.validateWithSchema('s', {})).toThrowError(/Schema 's' not found/);
    });

    test('should return false for non-existent schema', (): void => {
      const deleted = middleware.unregisterSchema('missing');
      expect(deleted).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => middleware.validateWithSchema('nope', {})).toThrowError(/Schema 'nope' not found/);
    });

      instance.validate.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema('user', { name: 'John', extra: 'x' } as Record<string, unknown>);
      expect(result).toBe(validatorResult);
    });

      instance.validate.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema('user', { name: 'J' } as Record<string, unknown>, { abortEarly: true });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ msg: 'err1' });
    });

      instance.validate.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema(
        'user',
        { name: 'John', age: 30, extra: 'remove', another: 1 } as Record<string, unknown>,
        { stripUnknown: true },
      );

      expect(result.sanitized).toEqual({ name: 'John', age: 30 });
    });

      instance.validate.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema('user', { name: 'A' } as Record<string, unknown>, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
    });

      instance.validate.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema(
        'user',
        { name: 'A', extra: 'x' } as Record<string, unknown>,
        { abortEarly: true, stripUnknown: true },
      );

      expect(result.errors).toEqual([{ code: 1 }]);
      expect(result.sanitized).toEqual({ name: 'A' });
    });
  });

  describe('createMiddleware', (): void => {
      const instance = getCreatedValidatorInstances()[0];
      instance.validate.mockReturnValueOnce(resultObj);

      const fn = middleware.createMiddleware('route', { abortEarly: true });
      const data = { x: 1 } as Record<string, unknown>;

      const out = fn(data);
      expect(spy).toHaveBeenCalledWith('route', data, { abortEarly: true });
      expect(out).toBe(resultObj);
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => middleware.batchValidate('missing', [])).toThrowError(/Schema 'missing' not found/);
    });


      const inputs = [{ id: 1 }, { nope: true }] as unknown as Array<Record<string, unknown>>;
      const results = middleware.batchValidate('items', inputs);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
    });
  });

  describe('batchValidationPassed', (): void => {
        { valid: true, errors: [], sanitized: {} },
      ] as unknown as ValidationResult[];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

        { valid: false, errors: ['e'], sanitized: {} },
      ] as unknown as ValidationResult[];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames and getSchemaCount', (): void => {
    test('should reflect registered schemas', (): void => {
      middleware.registerSchema('a', makeSchema(['a']));
      middleware.registerSchema('b', makeSchema(['b']));
      expect(middleware.getSchemaCount()).toBe(2);
      expect(middleware.getSchemaNames()).toEqual(['a', 'b']);
    });
  });

  describe('clearAll', (): void => {
    test('should remove all schemas and validators', (): void => {
      middleware.registerSchema('a', makeSchema(['a']));
      middleware.registerSchema('b', makeSchema(['b']));
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(() => middleware.validateWithSchema('a', {})).toThrowError(/Schema 'a' not found/);
    });
  });
});

describe('Global middleware functions', (): void => {
  beforeEach((): void => {
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return the same singleton instance on multiple calls', (): void => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).toBe(b);
    });

    test('should create a new instance after reset', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(second).not.toBe(first);
    });

      expect(instance1.getSchemaNames()).toEqual(['one']);

      resetGlobalMiddleware();

      const instance2 = getGlobalMiddleware();
      expect(instance2.getSchemaNames()).toEqual([]);
      instance2.registerSchema('two', { rules: [{ field: 'y' }] } as unknown as ValidationSchema);
      expect(instance2.getSchemaNames()).toEqual(['two']);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
      resetGlobalMiddleware();
      const after = getGlobalMiddleware();
      expect(after).not.toBe(before);
      expect(after.getSchemaNames()).toEqual([]);
    });
  });
});
