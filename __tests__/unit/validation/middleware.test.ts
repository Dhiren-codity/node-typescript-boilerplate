import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema, ValidationResult } from './schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';
import { Validator } from './validator.js';

vi.mock('./validator.js', (): Record<string, unknown> => {
  const MockValidator = vi.fn().mockImplementation(function (_schema: unknown): void {
    (this as { validate: vi.Mock<ValidationResult, [Record<string, unknown>]> }).validate = vi.fn(
      (data: Record<string, unknown>): ValidationResult => ({
        valid: true,
        errors: [],
        sanitized: data,
      })
    );
  });


  return { Validator: MockValidator };
});


type ValidatorInstance = { validate: vi.Mock<ValidationResult, [Record<string, unknown>]> };

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with empty registry', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {

      middleware.registerSchema('user', schema);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaCount()).toBe(1);
      const ctor = Validator as unknown as vi.Mock;
      expect(ctor).toHaveBeenCalledTimes(1);
      expect(ctor).toHaveBeenCalledWith(schema);
      expect(middleware.getSchemaNames()).toEqual(['user']);
    });

      const schema2: ValidationSchema = { rules: [{ field: 'b' }] };

      middleware.registerSchema('shared', schema1);
      const ctor = Validator as unknown as vi.Mock;
      const firstInstance = ctor.mock.instances[0] as ValidatorInstance;
      firstInstance.validate.mockReturnValue({
        valid: true,
        errors: [],
        sanitized: { from: 'first' },
      });

      middleware.registerSchema('shared', schema2);
      const secondInstance = ctor.mock.instances[1] as ValidatorInstance;
      secondInstance.validate.mockReturnValue({
        valid: true,
        errors: [],
        sanitized: { from: 'second' },
      });

      const result = middleware.validateWithSchema('shared', {});
      expect(result.sanitized).toEqual({ from: 'second' });
      expect(firstInstance.validate).not.toHaveBeenCalled();
      expect(ctor).toHaveBeenNthCalledWith(1, schema1);
      expect(ctor).toHaveBeenNthCalledWith(2, schema2);
    });
  });

  describe('unregisterSchema', (): void => {
      middleware.registerSchema('user', schema);

      const removed = middleware.unregisterSchema('user');
      expect(removed).toBe(true);
      expect(middleware.getSchema('user')).toBeUndefined();
      expect(middleware.getSchemaNames()).toEqual([]);
    });

    test('should return false when schema does not exist', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });

      middleware.registerSchema('item', schema);
      expect(middleware.unregisterSchema('item')).toBe(true);

      expect((): void => {
        middleware.validateWithSchema('item', {});
      }).toThrow(new Error("Schema 'item' not found"));
    });
  });

  describe('getSchema', (): void => {
      middleware.registerSchema('x', schema);
      expect(middleware.getSchema('x')).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.validateWithSchema('nope', {});
      }).toThrow(new Error("Schema 'nope' not found"));
    });

      middleware.registerSchema('user', schema);
      const ctor = Validator as unknown as vi.Mock;
      const instance = ctor.mock.instances[0] as ValidatorInstance;

      const data: Record<string, unknown> = { name: 'Ada', extra: true };
      const mockResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'Ada', extra: true },
      };
    });
      middleware.registerSchema('user', schema);
      const ctor = Validator as unknown as vi.Mock;
      const instance = ctor.mock.instances[0] as ValidatorInstance;

      const mockResult: ValidationResult = {
        valid: false,
        errors: [{ message: 'e1' }, { message: 'e2' }],
        sanitized: { name: null },
      };
    });
      middleware.registerSchema('user', schema);
      const ctor = Validator as unknown as vi.Mock;
      const instance = ctor.mock.instances[0] as ValidatorInstance;

      const mockResult: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'Ada', age: 42, email: 'ada@example.com' },
      };
    });
      middleware.registerSchema('combo', schema);
      const ctor = Validator as unknown as vi.Mock;
      const instance = ctor.mock.instances[0] as ValidatorInstance;

      const mockResult: ValidationResult = {
        valid: false,
        errors: [{ message: 'first' }, { message: 'second' }],
        sanitized: { x: 1, y: 2 },
      };
    });
  });
  describe('createMiddleware', (): void => {
      middleware.registerSchema('mw', schema);
      const ctor = Validator as unknown as vi.Mock;
      const instance = ctor.mock.instances[0] as ValidatorInstance;

      const mockResult: ValidationResult = {
        valid: false,
        errors: [{ message: 'err1' }, { message: 'err2' }],
        sanitized: { keep: 1, drop: 2 },
      };
    });
  });
  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.batchValidate('missing', [{}]);
      }).toThrow(new Error("Schema 'missing' not found"));
    });

      middleware.registerSchema('user', schema);
      const ctor = Validator as unknown as vi.Mock;
      const instance = ctor.mock.instances[0] as ValidatorInstance;

      instance.validate.mockImplementation((data: Record<string, unknown>): ValidationResult => {
        const valid = typeof data.name === 'string';
        return {
          valid,
          errors: valid ? [] : [{ message: 'missing name' }],
          sanitized: data,
        };
      });

      const inputs: Record<string, unknown>[] = [{ name: 'Ada' }, { foo: 'bar' }];
      const results = middleware.batchValidate('user', inputs);

      expect(instance.validate).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].errors[0].message).toBe('missing name');
    });
  });

  describe('batchValidationPassed', (): void => {
        { valid: true, errors: [], sanitized: {} },
      ];
      const resultsSomeInvalid: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} },
        { valid: false, errors: [{ message: 'e' }], sanitized: {} },
      ];
      expect(middleware.batchValidationPassed(resultsAllValid)).toBe(true);
      expect(middleware.batchValidationPassed(resultsSomeInvalid)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
      const s2: ValidationSchema = { rules: [{ field: 'b' }] };
      middleware.registerSchema('first', s1);
      middleware.registerSchema('second', s2);

      expect(middleware.getSchemaNames()).toEqual(['first', 'second']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return total count of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', { rules: [] });
      middleware.registerSchema('two', { rules: [] });
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
      middleware.registerSchema('b', { rules: [] });

      middleware.clearAll();

      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect((): void => {
        middleware.validateWithSchema('a', {});
      }).toThrow(new Error("Schema 'a' not found"));
    });
  });
});

describe('Global middleware instance', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const m1 = getGlobalMiddleware();
      const m2 = getGlobalMiddleware();
      expect(m1).toBeInstanceOf(ValidationMiddleware);
      expect(m1).toBe(m2);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance and create a new one on next get', (): void => {
      const before = getGlobalMiddleware();
      resetGlobalMiddleware();
      const after = getGlobalMiddleware();
      expect(after).toBeInstanceOf(ValidationMiddleware);
      expect(after).not.toBe(before);
    });
  });
});
