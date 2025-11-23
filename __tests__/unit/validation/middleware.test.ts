import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.js';
import { Validator } from '../../src/validation/validator.js';

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  const Validator = vi.fn().mockImplementation((_schema: unknown) => {
    return {
      validate: vi.fn(),
    };
  });


  return { Validator };
});


type ValidatorMockType = {
  mock: {
    instances: Array<{ validate: Mock<[Record<string, unknown>], { valid: boolean; errors: string[]; sanitized?: Record<string, unknown> }> }>;
    calls: unknown[];
  };
};

describe('ValidationMiddleware', (): void => {
  let instance: ValidationMiddleware;

  const validatorMock = Validator as unknown as ValidatorMockType;

  beforeEach((): void => {
    vi.clearAllMocks();
    instance = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize empty schema and validator maps', (): void => {
      expect(instance).toBeDefined();
      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {

      instance.registerSchema('user', schema);

      expect(instance.getSchema('user')).toBe(schema);
      expect(instance.getSchemaCount()).toBe(1);
      expect(instance.getSchemaNames()).toEqual(['user']);

      expect(validatorMock.mock.instances.length).toBe(1);
      expect(validatorMock.mock.calls[0][0]).toBe(schema);
    });
  });

  describe('unregisterSchema', (): void => {
      instance.registerSchema('user', schema);

      const removed = instance.unregisterSchema('user');
      expect(removed).toBe(true);
      expect(instance.getSchema('user')).toBeUndefined();
      expect(instance.getSchemaCount()).toBe(0);

      expect(() => instance.validateWithSchema('user', {})).toThrowError("Schema 'user' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const removed = instance.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for non-existent schema', (): void => {
      expect(instance.getSchema('nope')).toBeUndefined();
    });

      instance.registerSchema('test', schema);
      expect(instance.getSchema('test')).toBe(schema);
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => instance.validateWithSchema('missing', {})).toThrowError("Schema 'missing' not found");
    });

      instance.registerSchema('s1', schema);

      const validatorInstance = validatorMock.mock.instances[0];
      const expected = { valid: true, errors: [] as string[], sanitized: { a: 1 } };
      validatorInstance.validate.mockReturnValueOnce(expected);

      const data = { a: 1, extra: 2 };
      const result = instance.validateWithSchema('s1', data);

      expect(validatorInstance.validate).toHaveBeenCalledTimes(1);
      expect(validatorInstance.validate).toHaveBeenCalledWith(data);
      expect(result).toBe(expected);
    });

      instance.registerSchema('s2', schema);

      const validatorInstance = validatorMock.mock.instances[0];
      const resultObj = { valid: false, errors: ['e1', 'e2', 'e3'], sanitized: { a: 1, b: 2 } };
      validatorInstance.validate.mockReturnValueOnce(resultObj);

      const result = instance.validateWithSchema('s2', { a: 1 }, { abortEarly: true });

      expect(result.errors).toEqual(['e1']);
    });

      instance.registerSchema('s3', schema);

      const validatorInstance = validatorMock.mock.instances[0];
      validatorInstance.validate.mockReturnValueOnce({
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2, c: 3 },
      });

      const result = instance.validateWithSchema('s3', { a: 1, b: 2, c: 3 }, { stripUnknown: true });

      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

      instance.registerSchema('s4', schema);

      const validatorInstance = validatorMock.mock.instances[0];
      validatorInstance.validate.mockReturnValueOnce({
        valid: false,
        errors: ['err1', 'err2'],
        sanitized: { x: 'ok', y: 'ok', z: 'nope' },
      });

      const result = instance.validateWithSchema('s4', { x: 'ok', y: 'ok', z: 'nope' }, { abortEarly: true, stripUnknown: true, context: { test: true } });

      expect(result.errors).toEqual(['err1']);
      expect(result.sanitized).toEqual({ x: 'ok', y: 'ok' });
    });
  });

  describe('createMiddleware', (): void => {
      instance.registerSchema('mw', schema);

      const validatorInstance = validatorMock.mock.instances[0];
      validatorInstance.validate.mockReturnValueOnce({
        valid: false,
        errors: ['first', 'second'],
        sanitized: { a: 1, b: 2, c: 3 },
      });

      const middlewareFn = instance.createMiddleware('mw', { abortEarly: true, stripUnknown: true });
      const output = middlewareFn({ a: 1, b: 2, c: 3 });

      expect(output.errors).toEqual(['first']);
      expect(output.sanitized).toEqual({ a: 1, b: 2 });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema is not found', (): void => {
      expect(() => instance.batchValidate('missing', [])).toThrowError("Schema 'missing' not found");
    });

      instance.registerSchema('batch', schema);

      const validatorInstance = validatorMock.mock.instances[0];
      validatorInstance.validate.mockImplementation((data: Record<string, unknown>) => {
        const ok = !!data.flag;
        return {
          valid: ok,
          errors: ok ? [] : ['missing flag'],
          sanitized: data,
        };
      });

      const inputs = [{ flag: true }, { other: 1 }, { flag: false }];
      const results = instance.batchValidate('batch', inputs);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].errors).toEqual(['missing flag']);
      expect(results[2].valid).toBe(false);
    });
  });

  describe('batchValidationPassed', (): void => {
        { valid: true, errors: [] as string[] },
      ];
      expect(instance.batchValidationPassed(results)).toBe(true);
    });

        { valid: false, errors: ['e'] },
      ];
      expect(instance.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
      instance.registerSchema('b', { rules: [{ field: 'y' }] });
      expect(instance.getSchemaNames()).toEqual(['a', 'b']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return number of registered schemas', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      instance.registerSchema('one', { rules: [{ field: 'a' }] });
      instance.registerSchema('two', { rules: [{ field: 'b' }] });
      expect(instance.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
      instance.registerSchema('y', { rules: [{ field: 'b' }] });

      expect(instance.getSchemaCount()).toBe(2);

      instance.clearAll();

      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
      expect(() => instance.validateWithSchema('x', {})).toThrowError("Schema 'x' not found");
      expect(() => instance.validateWithSchema('y', {})).toThrowError("Schema 'y' not found");
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
    test('should reset global instance so a new one is created next call', (): void => {
      const initial = getGlobalMiddleware();
      resetGlobalMiddleware();
      const next = getGlobalMiddleware();
      expect(next).toBeInstanceOf(ValidationMiddleware);
      expect(next).not.toBe(initial);
    });

      expect(globalInstance.getSchemaCount()).toBe(1);

      resetGlobalMiddleware();

      const newGlobal = getGlobalMiddleware();
      expect(newGlobal.getSchemaCount()).toBe(0);
      expect(() => newGlobal.validateWithSchema('g1', {})).toThrowError("Schema 'g1' not found");
    });
  });
});
