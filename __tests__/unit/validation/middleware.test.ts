import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema, ValidationResult } from './schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';

const validateMock = vi.fn<(data: Record<string, unknown>) => ValidationResult>();
const ValidatorMock = vi.fn((schema: ValidationSchema) => ({
  validate: (data: Record<string, unknown>): ValidationResult => validateMock(data),
}));

vi.mock('./validator.js', () => ({
  Validator: ValidatorMock,
}));

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;
  let sampleSchema: ValidationSchema;

  beforeEach((): void => {
    validateMock.mockReset();
    ValidatorMock.mockReset();
    middleware = new ValidationMiddleware();
    sampleSchema = {
      rules: [{ field: 'a' }, { field: 'b' }],
    } as ValidationSchema;
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize empty schema and validator maps', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create validator', (): void => {
      middleware.registerSchema('test', sampleSchema);
      expect(ValidatorMock).toHaveBeenCalledTimes(1);
      expect(ValidatorMock).toHaveBeenCalledWith(sampleSchema);
      expect(middleware.getSchema('test')).toBe(sampleSchema);
      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['test']);
    });

    test('should replace existing schema and validator on duplicate name', (): void => {
      const schema1 = { rules: [{ field: 'x' }] } as ValidationSchema;
      const schema2 = { rules: [{ field: 'y' }] } as ValidationSchema;
      middleware.registerSchema('dup', schema1);
      middleware.registerSchema('dup', schema2);
      expect(ValidatorMock).toHaveBeenCalledTimes(2);
      expect(middleware.getSchema('dup')).toBe(schema2);
      expect(middleware.getSchemaCount()).toBe(1);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should return true when schema existed and was removed', (): void => {
      middleware.registerSchema('toRemove', sampleSchema);
      const removed = middleware.unregisterSchema('toRemove');
      expect(removed).toBe(true);
      expect(middleware.getSchema('toRemove')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(() => middleware.validateWithSchema('toRemove', {})).toThrowError("Schema 'toRemove' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });

    test('should return the registered schema', (): void => {
      middleware.registerSchema('known', sampleSchema);
      expect(middleware.getSchema('known')).toBe(sampleSchema);
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => middleware.validateWithSchema('nope', {})).toThrowError("Schema 'nope' not found");
    });

    test('should return validator result without options', (): void => {
      middleware.registerSchema('sch', sampleSchema);
      const validatorReturn: ValidationResult = { valid: true, errors: [], sanitized: { a: 1, c: 2 } };
      validateMock.mockReturnValueOnce(validatorReturn);

      const data: Record<string, unknown> = { input: 'value' };
      const result = middleware.validateWithSchema('sch', data);

      expect(result).toBe(validatorReturn);
      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(validateMock).toHaveBeenCalledWith(data);
    });

    test('should apply abortEarly option to keep only the first error', (): void => {
      middleware.registerSchema('abort', sampleSchema);
      const validatorReturn: ValidationResult = {
        valid: false,
        errors: ['e1', 'e2', 'e3'],
        sanitized: { a: 1 },
      };
      validateMock.mockReturnValueOnce(validatorReturn);

      const result = middleware.validateWithSchema('abort', { a: 'x' }, { abortEarly: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['e1']);
    });

    test('should not change errors when abortEarly is true but no errors', (): void => {
      middleware.registerSchema('noerrors', sampleSchema);
      const validatorReturn: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { a: 1 },
      };
      validateMock.mockReturnValueOnce(validatorReturn);

      const result = middleware.validateWithSchema('noerrors', { a: 'x' }, { abortEarly: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should strip unknown fields when stripUnknown is true and sanitized present', (): void => {
      middleware.registerSchema('strip', sampleSchema);
      const validatorReturn: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: { a: 1, c: 2, b: 3 },
      };
      validateMock.mockReturnValueOnce(validatorReturn);

      const result = middleware.validateWithSchema('strip', { a: 1, c: 2, b: 3 }, { stripUnknown: true });

      expect(result.sanitized).toEqual({ a: 1, b: 3 });
    });

    test('should not fail when stripUnknown true but sanitized is undefined', (): void => {
      middleware.registerSchema('strip2', sampleSchema);
      const validatorReturn: ValidationResult = {
        valid: true,
        errors: [],
        sanitized: undefined,
      };
      validateMock.mockReturnValueOnce(validatorReturn);

      const result = middleware.validateWithSchema('strip2', { x: 1 }, { stripUnknown: true });

      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('createMiddleware', (): void => {
    test('should create a function that delegates to validateWithSchema with options', (): void => {
      const options = { abortEarly: true, stripUnknown: true };
      const schemaName = 'mw';
      const data: Record<string, unknown> = { a: 1, extra: 'x' };
      const expected: ValidationResult = { valid: true, errors: [], sanitized: { a: 1 } };

      const spy = vi.spyOn(middleware, 'validateWithSchema').mockReturnValue(expected);
      const fn = middleware.createMiddleware(schemaName, options);
      const output = fn(data);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(schemaName, data, options);
      expect(output).toBe(expected);
      spy.mockRestore();
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => middleware.batchValidate('missing', [{}])).toThrowError("Schema 'missing' not found");
    });

    test('should validate each data set and return results array', (): void => {
      middleware.registerSchema('batch', sampleSchema);
      const r1: ValidationResult = { valid: true, errors: [], sanitized: { a: 1 } };
      const r2: ValidationResult = { valid: false, errors: ['err'], sanitized: { a: 2, c: 9 } };
      validateMock
        .mockImplementationOnce(() => r1)
        .mockImplementationOnce(() => r2);

      const inputs: Record<string, unknown>[] = [{ a: 1 }, { a: 2, c: 9 }];
      const results = middleware.batchValidate('batch', inputs);

      expect(results).toEqual([r1, r2]);
      expect(validateMock).toHaveBeenCalledTimes(2);
      expect(validateMock).toHaveBeenNthCalledWith(1, inputs[0]);
      expect(validateMock).toHaveBeenNthCalledWith(2, inputs[1]);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [] },
        { valid: true, errors: [] },
      ];
      expect(middleware.batchValidationPassed(results)).toBe(true);
    });

    test('should return false when at least one result is invalid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [] },
        { valid: false, errors: ['x'] },
      ];
      expect(middleware.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      middleware.registerSchema('s1', sampleSchema);
      middleware.registerSchema('s2', { rules: [{ field: 'z' }] } as ValidationSchema);
      const names = middleware.getSchemaNames();
      expect(names.length).toBe(2);
      expect(names).toContain('s1');
      expect(names).toContain('s2');
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('s1', sampleSchema);
      expect(middleware.getSchemaCount()).toBe(1);
    });
  });

  describe('clearAll', (): void => {
    test('should clear all registered schemas and validators', (): void => {
      middleware.registerSchema('s1', sampleSchema);
      middleware.registerSchema('s2', { rules: [{ field: 'z' }] } as ValidationSchema);
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();

      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect(middleware.getSchema('s1')).toBeUndefined();
      expect(() => middleware.validateWithSchema('s1', {})).toThrowError("Schema 's1' not found");
    });
  });
});

describe('Global middleware instance', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const g1 = getGlobalMiddleware();
      const g2 = getGlobalMiddleware();
      expect(g1).toBeDefined();
      expect(g1).toBe(g2);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance so that a new one is created next time', (): void => {
      const oldInstance = getGlobalMiddleware();
      resetGlobalMiddleware();
      const newInstance = getGlobalMiddleware();
      expect(newInstance).toBeDefined();
      expect(newInstance).not.toBe(oldInstance);
    });
  });
});
