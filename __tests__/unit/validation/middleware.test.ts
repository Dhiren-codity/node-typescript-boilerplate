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

      middleware.registerSchema('user', schema);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['user']);

      const mockedValidator = Validator as unknown as vi.Mock;
      expect(mockedValidator).toHaveBeenCalledTimes(1);
      expect(mockedValidator).toHaveBeenCalledWith(schema);
    });

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

      middleware.registerSchema('existing', schema);
      expect(middleware.getSchema('existing')).toBe(schema);
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => middleware.validateWithSchema('missing', {})).toThrowError("Schema 'missing' not found");
    });

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
        { valid: true, errors: [], sanitized: {} as Record<string, unknown> } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

        { valid: false, errors: ['x'], sanitized: {} as Record<string, unknown> } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
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

    const globalInstance = getGlobalMiddleware();
    globalInstance.registerSchema('global', schema);
    expect(globalInstance.getSchemaCount()).toBe(1);
  });
});

describe('resetGlobalMiddleware', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

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
