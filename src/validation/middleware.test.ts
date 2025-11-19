import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './src/validation/middleware.js';
import type { ValidationSchema, ValidationResult } from './src/validation/schemas.js';
import { Validator } from './src/validation/validator.js';

vi.mock('./src/validation/validator.js', (): Record<string, unknown> => {
  return {
    Validator: vi.fn().mockImplementation((_schema: unknown) => {
      return {
        validate: vi.fn((data: Record<string, unknown>): ValidationResult => {
          return {
            valid: true,
            errors: [],
            sanitized: data,
          } as unknown as ValidationResult;
        }),
      };
    }),
  };
});

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  const getValidateMockAt = (index: number): vi.Mock => {
    const ctor = Validator as unknown as vi.Mock;
    const instance = ctor.mock.instances[index] as unknown as { validate: unknown };
    return instance.validate as vi.Mock;
  };

  beforeEach((): void => {
    vi.clearAllMocks();
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema registry', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(middleware.getSchemaCount()).toBe(0);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create validator instance', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }, { field: 'name' }] } as unknown as ValidationSchema;

      middleware.registerSchema('user', schema);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaNames()).toContain('user');
      expect(middleware.getSchemaCount()).toBe(1);

      const ctor = Validator as unknown as vi.Mock;
      expect(ctor).toHaveBeenCalledTimes(1);
      expect(ctor).toHaveBeenCalledWith(schema);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and prevent future validations', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }] } as unknown as ValidationSchema;
      middleware.registerSchema('user', schema);

      const result = middleware.unregisterSchema('user');

      expect(result).toBe(true);
      expect(middleware.getSchema('user')).toBeUndefined();
      expect(() => middleware.validateWithSchema('user', {})).toThrowError("Schema 'user' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const result = middleware.unregisterSchema('missing');
      expect(result).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return schema when registered', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'email' }] } as unknown as ValidationSchema;
      middleware.registerSchema('account', schema);

      const found = middleware.getSchema('account');
      expect(found).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      const found = middleware.getSchema('unknown');
      expect(found).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => middleware.validateWithSchema('nope', {})).toThrowError("Schema 'nope' not found");
    });

    test('should return validator result without options', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }, { field: 'name' }] } as unknown as ValidationSchema;
      middleware.registerSchema('user', schema);

      const validateMock = getValidateMockAt(0);
      const validatorResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { id: 1, name: 'A', extra: true },
      } as unknown as ValidationResult;
      validateMock.mockReturnValueOnce(validatorResult);

      const data: Record<string, unknown> = { id: 1, name: 'A', extra: true };
      const result = middleware.validateWithSchema('user', data);

      expect(result).toBe(validatorResult);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ id: 1, name: 'A', extra: true });
    });

    test('should apply abortEarly option to keep only the first error', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }] } as unknown as ValidationSchema;
      middleware.registerSchema('user', schema);

      const validateMock = getValidateMockAt(0);
      const validatorResult: ValidationResult = {
        valid: false,
        errors: ['first error', 'second error'],
        sanitized: { id: null },
      } as unknown as ValidationResult;
      validateMock.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema(
        'user',
        { id: null },
        { abortEarly: true },
      );

      expect(result.errors).toEqual(['first error']);
    });

    test('should strip unknown fields when stripUnknown option is true', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }, { field: 'name' }] } as unknown as ValidationSchema;
      middleware.registerSchema('user', schema);

      const validateMock = getValidateMockAt(0);
      const validatorResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { id: 1, name: 'Alice', extra: 'remove' },
      } as unknown as ValidationResult;
      validateMock.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema(
        'user',
        { id: 1, name: 'Alice', extra: 'remove' },
        { stripUnknown: true },
      );

      expect(result.sanitized).toEqual({ id: 1, name: 'Alice' });
    });

    test('should not strip when sanitized is undefined', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }] } as unknown as ValidationSchema;
      middleware.registerSchema('user', schema);

      const validateMock = getValidateMockAt(0);
      const validatorResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: undefined,
      } as unknown as ValidationResult;
      validateMock.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema(
        'user',
        { id: 1, extra: 'x' },
        { stripUnknown: true },
      );

      expect(result.sanitized).toBeUndefined();
    });

    test('should apply both abortEarly and stripUnknown options', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'a' }, { field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('pair', schema);

      const validateMock = getValidateMockAt(0);
      const validatorResult: ValidationResult = {
        valid: false,
        errors: ['E1', 'E2', 'E3'],
        sanitized: { a: 10, b: 20, c: 30 },
      } as unknown as ValidationResult;
      validateMock.mockReturnValueOnce(validatorResult);

      const result = middleware.validateWithSchema(
        'pair',
        { a: 10, b: 20, c: 30 },
        { abortEarly: true, stripUnknown: true },
      );

      expect(result.errors).toEqual(['E1']);
      expect(result.sanitized).toEqual({ a: 10, b: 20 });
    });
  });

  describe('createMiddleware', (): void => {
    test('should create a function that delegates to validateWithSchema with options', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'x' }] } as unknown as ValidationSchema;
      middleware.registerSchema('alpha', schema);

      const validateMock = getValidateMockAt(0);
      const validatorResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { x: 1 },
      } as unknown as ValidationResult;
      validateMock.mockReturnValueOnce(validatorResult);

      const spy = vi.spyOn(middleware, 'validateWithSchema');

      const mwFn = middleware.createMiddleware('alpha', { stripUnknown: true });
      const data: Record<string, unknown> = { x: 1, y: 2 };
      const result = mwFn(data);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('alpha', data, { stripUnknown: true });
      expect(result).toBe(validatorResult);
      spy.mockRestore();
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => middleware.batchValidate('unknown', [{}])).toThrowError("Schema 'unknown' not found");
    });

    test('should validate an array of data objects', (): void => {
      const schema: ValidationSchema = { rules: [{ field: 'id' }] } as unknown as ValidationSchema;
      middleware.registerSchema('list', schema);

      const validateMock = getValidateMockAt(0);
      const r1: ValidationResult = { valid: true, errors: [], sanitized: { id: 1 } } as unknown as ValidationResult;
      const r2: ValidationResult = { valid: false, errors: ['e'], sanitized: { id: 2 } } as unknown as ValidationResult;

      validateMock.mockImplementationOnce((_d: Record<string, unknown>) => r1);
      validateMock.mockImplementationOnce((_d: Record<string, unknown>) => r2);

      const input = [{ id: 1 }, { id: 2 }] as Record<string, unknown>[];
      const results = middleware.batchValidate('list', input);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(r1);
      expect(results[1]).toBe(r2);
      expect(validateMock).toHaveBeenCalledTimes(2);
      expect(validateMock).toHaveBeenNthCalledWith(1, input[0]);
      expect(validateMock).toHaveBeenNthCalledWith(2, input[1]);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all validations passed', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [] } as unknown as ValidationResult,
        { valid: true, errors: [] } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

    test('should return false when any validation failed', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [] } as unknown as ValidationResult,
        { valid: false, errors: ['e'] } as unknown as ValidationResult,
      ];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const s1: ValidationSchema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      const s2: ValidationSchema = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('one', s1);
      middleware.registerSchema('two', s2);

      const names = middleware.getSchemaNames();
      expect(names.sort()).toEqual(['one', 'two'].sort());
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return count of registered schemas', (): void => {
      const s1: ValidationSchema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      const s2: ValidationSchema = { rules: [{ field: 'b' }] } as unknown as ValidationSchema;
      middleware.registerSchema('one', s1);
      middleware.registerSchema('two', s2);

      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear schemas and validators', (): void => {
      const s1: ValidationSchema = { rules: [{ field: 'a' }] } as unknown as ValidationSchema;
      middleware.registerSchema('one', s1);
      expect(middleware.getSchemaCount()).toBe(1);

      middleware.clearAll();

      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(() => middleware.validateWithSchema('one', {})).toThrowError("Schema 'one' not found");
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
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance', (): void => {
      const a = getGlobalMiddleware();
      resetGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).not.toBe(b);
    });
  });
});
