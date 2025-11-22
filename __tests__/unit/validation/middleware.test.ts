import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './src/validation/middleware.js';
import { Validator } from './src/validation/validator.js';

vi.mock('./src/validation/validator.js', (): Record<string, unknown> => {
  const ValidatorMock = vi.fn(function (this: { validate: vi.Mock }, _schema: unknown): void {
    this.validate = vi.fn();
  }) as unknown as vi.Mock;
  return {
    Validator: ValidatorMock,
  };
});

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  const getValidatorInstance = (): { validate: vi.Mock } => {
    const ValidatorMock = Validator as unknown as vi.Mock;
    const instance = ValidatorMock.mock.instances[0] as { validate: vi.Mock } | undefined;
    if (!instance) {
      throw new Error('Validator mock instance not found');
    }
    return instance;
  };

  beforeEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema and validator maps', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(middleware.getSchemaCount()).toBe(0);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create validator instance', (): void => {
      const schema = { rules: [{ field: 'name' }] } as unknown;
      middleware.registerSchema('user', schema as unknown as Record<string, unknown>);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaNames()).toEqual(['user']);
      expect(middleware.getSchemaCount()).toBe(1);

      const ValidatorMock = Validator as unknown as vi.Mock;
      expect(ValidatorMock).toHaveBeenCalledTimes(1);
      expect(ValidatorMock).toHaveBeenCalledWith(schema);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and its validator', (): void => {
      const schema = { rules: [{ field: 'id' }] } as unknown;
      middleware.registerSchema('idSchema', schema as unknown as Record<string, unknown>);

      const deleted = middleware.unregisterSchema('idSchema');
      expect(deleted).toBe(true);
      expect(middleware.getSchema('idSchema')).toBeUndefined();

      expect((): void => {
        middleware.validateWithSchema('idSchema', {});
      }).toThrowError("Schema 'idSchema' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const deleted = middleware.unregisterSchema('missing');
      expect(deleted).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return registered schema by name', (): void => {
      const schema = { rules: [{ field: 'email' }] } as unknown;
      middleware.registerSchema('emailSchema', schema as unknown as Record<string, unknown>);

      const returned = middleware.getSchema('emailSchema');
      expect(returned).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      const returned = middleware.getSchema('unknown');
      expect(returned).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.validateWithSchema('nope', {});
      }).toThrowError("Schema 'nope' not found");
    });

    test('should validate using the registered validator', (): void => {
      const schema = { rules: [{ field: 'name' }] } as unknown;
      middleware.registerSchema('user', schema as unknown as Record<string, unknown>);
      const validator = getValidatorInstance();

      const validationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'John' },
      } as unknown as Record<string, unknown>;

      validator.validate.mockReturnValueOnce(validationResult);

      const result = middleware.validateWithSchema('user', { name: 'John', extra: true });
      expect(validator.validate).toHaveBeenCalledTimes(1);
      expect(validator.validate).toHaveBeenCalledWith({ name: 'John', extra: true });
      expect(result).toBe(validationResult);
    });

    test('should honor abortEarly option by keeping only the first error', (): void => {
      const schema = { rules: [{ field: 'name' }] } as unknown;
      middleware.registerSchema('user', schema as unknown as Record<string, unknown>);
      const validator = getValidatorInstance();

      const validationResult = {
        valid: false,
        errors: ['err1', 'err2', 'err3'],
        sanitized: { name: '' },
      } as unknown as Record<string, unknown>;

      validator.validate.mockReturnValueOnce(validationResult);

      const result = middleware.validateWithSchema('user', { name: '' }, { abortEarly: true });
      expect(Array.isArray((result as { errors: unknown[] }).errors)).toBe(true);
      expect((result as { errors: unknown[] }).errors).toEqual(['err1']);
    });

    test('should strip unknown fields from sanitized result when stripUnknown is true', (): void => {
      const schema = { rules: [{ field: 'name' }, { field: 'age' }] } as unknown;
      middleware.registerSchema('user', schema as unknown as Record<string, unknown>);
      const validator = getValidatorInstance();

      const validationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'John', age: 30, extra: 'remove-me' },
      } as unknown as Record<string, unknown>;

      validator.validate.mockReturnValueOnce(validationResult);

      const result = middleware.validateWithSchema('user', { name: 'John', age: 30, extra: 'remove-me' }, { stripUnknown: true });
      expect((result as { sanitized: Record<string, unknown> }).sanitized).toEqual({ name: 'John', age: 30 });
    });

    test('should not modify sanitized when stripUnknown is false', (): void => {
      const schema = { rules: [{ field: 'x' }] } as unknown;
      middleware.registerSchema('test', schema as unknown as Record<string, unknown>);
      const validator = getValidatorInstance();

      const validationResult = {
        valid: true,
        errors: [],
        sanitized: { x: 1, y: 2 },
      } as unknown as Record<string, unknown>;

      validator.validate.mockReturnValueOnce(validationResult);

      const result = middleware.validateWithSchema('test', { x: 1, y: 2 }, { stripUnknown: false });
      expect((result as { sanitized: Record<string, unknown> }).sanitized).toEqual({ x: 1, y: 2 });
    });
  });

  describe('createMiddleware', (): void => {
    test('should return a function that validates with provided options', (): void => {
      const schema = { rules: [{ field: 'v' }] } as unknown;
      middleware.registerSchema('opt', schema as unknown as Record<string, unknown>);
      const validator = getValidatorInstance();

      const validationResult = {
        valid: false,
        errors: ['error-one', 'error-two'],
        sanitized: { v: 'bad' },
      } as unknown as Record<string, unknown>;

      validator.validate.mockReturnValueOnce(validationResult);

      const mw = middleware.createMiddleware('opt', { abortEarly: true });
      const result = mw({ v: 'bad' });

      expect(validator.validate).toHaveBeenCalledWith({ v: 'bad' });
      expect((result as { errors: unknown[] }).errors).toEqual(['error-one']);
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.batchValidate('missing', [{}, {}]);
      }).toThrowError("Schema 'missing' not found");
    });

    test('should validate all data items and return array of results', (): void => {
      const schema = { rules: [{ field: 'z' }] } as unknown;
      middleware.registerSchema('batch', schema as unknown as Record<string, unknown>);
      const validator = getValidatorInstance();

      const result1 = { valid: true, errors: [], sanitized: { z: 1 } } as unknown as Record<string, unknown>;
      const result2 = { valid: false, errors: ['e'], sanitized: { z: null } } as unknown as Record<string, unknown>;

      validator.validate.mockImplementationOnce(() => result1);
      validator.validate.mockImplementationOnce(() => result2);

      const outputs = middleware.batchValidate('batch', [{ z: 1 }, { z: null }]);
      expect(outputs).toEqual([result1, result2]);
      expect(validator.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results = [{ valid: true }, { valid: true }] as unknown as Array<Record<string, unknown>>;
      const passed = middleware.batchValidationPassed(results as unknown as Array<{ valid: boolean }>);
      expect(passed).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results = [{ valid: true }, { valid: false }] as unknown as Array<Record<string, unknown>>;
      const passed = middleware.batchValidationPassed(results as unknown as Array<{ valid: boolean }>);
      expect(passed).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      middleware.registerSchema('a', { rules: [] } as unknown as Record<string, unknown>);
      middleware.registerSchema('b', { rules: [] } as unknown as Record<string, unknown>);

      const names = middleware.getSchemaNames();
      expect(names).toEqual(expect.arrayContaining(['a', 'b']));
      expect(names.length).toBe(2);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', { rules: [] } as unknown as Record<string, unknown>);
      middleware.registerSchema('two', { rules: [] } as unknown as Record<string, unknown>);
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear all schemas and validators', (): void => {
      middleware.registerSchema('x', { rules: [{ field: 'x' }] } as unknown as Record<string, unknown>);
      middleware.registerSchema('y', { rules: [{ field: 'y' }] } as unknown as Record<string, unknown>);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);

      expect((): void => {
        middleware.validateWithSchema('x', {});
      }).toThrowError("Schema 'x' not found");
    });
  });
});

describe('Global middleware instance functions', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return the same instance across multiple calls until reset', (): void => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).toBeInstanceOf(ValidationMiddleware);
      expect(a).toBe(b);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset and create a new global instance on next get', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).not.toBe(second);
      expect(second).toBeInstanceOf(ValidationMiddleware);
    });
  });
});
