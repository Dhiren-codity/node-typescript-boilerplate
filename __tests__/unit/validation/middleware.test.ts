import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.js';
import type { ValidationSchema, ValidationResult } from '../../src/validation/schemas.js';
import { Validator } from '../../src/validation/validator.js';

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  const ctor = vi.fn((_schema: unknown) => {
    return {
      validate: vi.fn((data: Record<string, unknown>) => ({
        valid: true,
        errors: [],
        sanitized: data,
      })),
    };
  });


  return { Validator: ctor };
});

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  beforeEach((): void => {
    vi.clearAllMocks();
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema and validator registries', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create a corresponding validator', (): void => {
      const schema = { rules: [{ field: 'name' }] } as unknown as ValidationSchema;

      middleware.registerSchema('user', schema);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['user']);

      const mockedValidator = Validator as unknown as vi.Mock;
      expect(mockedValidator).toHaveBeenCalledTimes(1);
      expect(mockedValidator).toHaveBeenCalledWith(schema);
    });

    test('should overwrite existing schema and validator with same name', (): void => {
      const schema1 = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      const schema2 = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;

      middleware.registerSchema('dup', schema1);
      middleware.registerSchema('dup', schema2);

      expect(middleware.getSchema('dup')).toBe(schema2);
      expect(middleware.getSchemaCount()).toBe(1);
      const mockedValidator = Validator as unknown as vi.Mock;
      expect(mockedValidator).toHaveBeenCalledTimes(2);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should remove schema and corresponding validator and return true', (): void => {
      const schema = { rules: [{ field: 'x' }] } as unknown as ValidationSchema;
      middleware.registerSchema('toRemove', schema);

      const result = middleware.unregisterSchema('toRemove');

      expect(result).toBe(true);
      expect(middleware.getSchema('toRemove')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);
    });

    test('should return false when removing non-existent schema', (): void => {
      const result = middleware.unregisterSchema('missing');
      expect(result).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unregistered schema', (): void => {
      expect(middleware.getSchema('none')).toBeUndefined();
    });

    test('should return the registered schema', (): void => {
      const schema = { rules: [{ field: 'id' }] } as unknown as ValidationSchema;
      middleware.registerSchema('existing', schema);
      expect(middleware.getSchema('existing')).toBe(schema);
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => middleware.validateWithSchema('missing', {})).toThrowError("Schema 'missing' not found");
    });

    test('should return validator result unchanged when no options provided', (): void => {
      const schema = { rules: [{ field: 'name' }, { field: 'age' }] } as unknown as ValidationSchema;
      middleware.registerSchema('user', schema);

      const mockedValidator = Validator as unknown as vi.Mock;
      const instance = mockedValidator.mock.instances[0] as { validate: vi.Mock };
      const returned: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'Alice', age: 30, extra: 'x' } as unknown as Record<string, unknown>,
      } as unknown as ValidationResult;
      instance.validate.mockReturnValueOnce(returned);

      const inputData: Record<string, unknown> = { name: 'Alice', age: 30, extra: 'x' };
      const result = middleware.validateWithSchema('user', inputData);

      expect(instance.validate).toHaveBeenCalledWith(inputData);
      expect(result).toBe(returned);
    });

    test('should honor abortEarly option and keep only the first error', (): void => {
      const schema = { rules: [{ field: 'email' }] } as unknown as ValidationSchema;
      middleware.registerSchema('account', schema);

      const mockedValidator = Validator as unknown as vi.Mock;
      const instance = mockedValidator.mock.instances[0] as { validate: vi.Mock };
      const initialResult = {
        valid: false,
        errors: ['first error', 'second error', 'third error'],
        sanitized: { email: 'invalid' },
      };
      instance.validate.mockReturnValueOnce(initialResult);

      const result = middleware.validateWithSchema('account', { email: 123 } as unknown as Record<string, unknown>, {
        abortEarly: true,
      });

      expect(result.errors).toEqual(['first error']);
    });

    test('should strip unknown fields when stripUnknown is true and sanitized exists', (): void => {
      const schema = {
        rules: [{ field: 'a' }, { field: 'b' }],
      } as unknown as ValidationSchema;
      middleware.registerSchema('stripSchema', schema);

      const mockedValidator = Validator as unknown as vi.Mock;
      const instance = mockedValidator.mock.instances[0] as { validate: vi.Mock };
      instance.validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2, c: 3, d: 4 },
      });

      const result = middleware.validateWithSchema('stripSchema', { a: 1, b: 2, c: 3, d: 4 }, { stripUnknown: true });

      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

    test('should not modify sanitized when stripUnknown is true but sanitized is undefined', (): void => {
      const schema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('noSan', schema);

      const mockedValidator = Validator as unknown as vi.Mock;
      const instance = mockedValidator.mock.instances[0] as { validate: vi.Mock };
      instance.validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: undefined,
      });

      const result = middleware.validateWithSchema('noSan', {}, { stripUnknown: true });

      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('createMiddleware', (): void => {
    test('should create a function that delegates to validateWithSchema with provided options', (): void => {
      const spy = vi.spyOn(middleware, 'validateWithSchema').mockReturnValue({
        valid: true,
        errors: [],
        sanitized: { ok: true },
      } as unknown as ValidationResult);

      const fn = middleware.createMiddleware('user', { abortEarly: true });
      const data: Record<string, unknown> = { sample: 1 };
      const output = fn(data);

      expect(spy).toHaveBeenCalledWith('user', data, { abortEarly: true });
      expect(output).toEqual({
        valid: true,
        errors: [],
        sanitized: { ok: true },
      });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => middleware.batchValidate('missing', [{}])).toThrowError("Schema 'missing' not found");
    });

    test('should validate each data entry and return results', (): void => {
      const schema = { rules: [{ field: 'x' }] } as unknown as ValidationSchema;
      middleware.registerSchema('batch', schema);

      const mockedValidator = Validator as unknown as vi.Mock;
      const instance = mockedValidator.mock.instances[0] as { validate: vi.Mock };

      const ret1 = { valid: true, errors: [], sanitized: { x: 1 } };
      const ret2 = { valid: false, errors: ['e'], sanitized: { x: 2 } };
      instance.validate
        .mockReturnValueOnce(ret1)

      const arr: Record<string, unknown>[] = [{ x: 1 }, { x: 2 }];
      const results = middleware.batchValidate('batch', arr);

      expect(instance.validate).toHaveBeenCalledTimes(2);
      expect(instance.validate).toHaveBeenNthCalledWith(1, arr[0]);
      expect(instance.validate).toHaveBeenNthCalledWith(2, arr[1]);
      expect(results).toEqual([ret1, ret2]);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} as Record<string, unknown> } as unknown as ValidationResult,
        { valid: true, errors: [], sanitized: {} as Record<string, unknown> } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} as Record<string, unknown> } as unknown as ValidationResult,
        { valid: false, errors: ['x'], sanitized: {} as Record<string, unknown> } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const s1 = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      const s2 = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('first', s1);
      middleware.registerSchema('second', s2);

      expect(middleware.getSchemaNames()).toEqual(['first', 'second']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return total number of schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', { rules: [{ field: 'x' }] } as unknown as ValidationSchema);
      middleware.registerSchema('two', { rules: [{ field: 'y' }] } as unknown as ValidationSchema);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear schemas and validators', (): void => {
      middleware.registerSchema('a', { rules: [{ field: 'x' }] } as unknown as ValidationSchema);
      middleware.registerSchema('b', { rules: [{ field: 'y' }] } as unknown as ValidationSchema);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();

      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(() => middleware.validateWithSchema('a', {})).toThrowError("Schema 'a' not found");
    });
  });
});

describe('getGlobalMiddleware', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  test('should return a singleton instance', (): void => {
    const instance1 = getGlobalMiddleware();
    const instance2 = getGlobalMiddleware();

    expect(instance1).toBeDefined();
    expect(instance2).toBeDefined();
    expect(instance1).toBe(instance2);
  });

  test('should allow operations on the global instance', (): void => {
    const schema = { rules: [{ field: 'z' }] } as unknown as ValidationSchema;
    const globalInstance = getGlobalMiddleware();
    globalInstance.registerSchema('global', schema);
    expect(globalInstance.getSchemaCount()).toBe(1);
  });
});

describe('resetGlobalMiddleware', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  test('should reset the global instance so a new one is created next time', (): void => {
    const instance1 = getGlobalMiddleware();
    instance1.registerSchema('s', { rules: [{ field: 'a' }] } as unknown as ValidationSchema);
    expect(instance1.getSchemaCount()).toBe(1);

    resetGlobalMiddleware();

    const instance2 = getGlobalMiddleware();
    expect(instance2).not.toBe(instance1);
    expect(instance2.getSchemaCount()).toBe(0);
  });

  test('should be safe to call multiple times', (): void => {
    resetGlobalMiddleware();
    resetGlobalMiddleware();
    const instance = getGlobalMiddleware();
    expect(instance).toBeDefined();
  });
});
