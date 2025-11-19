import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';
import type { ValidationSchema, ValidationResult } from './schemas.js';

// Mock the dependency used in the constructor
vi.mock('./validator.js', (): Record<string, unknown> => {
  type TestValidationResult = {
    valid: boolean;
    errors: { field?: string; message?: string }[];
    sanitized?: Record<string, unknown>;
  };

  let validateImpl = (data: Record<string, unknown>): TestValidationResult => ({
    valid: true,
    errors: [],
    sanitized: data,
  });

  const instances: unknown[] = [];

  class MockValidator {
    public schema: unknown;
    public validate: (data: Record<string, unknown>) => TestValidationResult;
    constructor(schema: unknown) {
      this.schema = schema;
      instances.push(this);
      this.validate = vi.fn((data: Record<string, unknown>) => validateImpl(data));
    }
  }

  const setValidateImpl = (impl: (data: Record<string, unknown>) => TestValidationResult): void => {
    validateImpl = impl;
  };
  const getInstances = (): unknown[] => instances;
  const clearInstances = (): void => {
    instances.length = 0;
  };

  return {
    Validator: MockValidator,
    __setValidateImpl: setValidateImpl,
    __getInstances: getInstances,
    __clearInstances: clearInstances,
  };
});

import { __setValidateImpl, __getInstances, __clearInstances } from './validator.js';

describe('ValidationMiddleware', (): void => {
  let instance: ValidationMiddleware;

  const makeSchema = (fields: string[]): ValidationSchema =>
    ({ rules: fields.map((f) => ({ field: f })) } as unknown as ValidationSchema);

  const defaultValidateImpl = (data: Record<string, unknown>): ValidationResult => ({
    valid: true,
    errors: [],
    sanitized: data,
  });

  beforeEach((): void => {
    instance = new ValidationMiddleware();
    __setValidateImpl(defaultValidateImpl);
    __clearInstances();
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
    __clearInstances();
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
    test('should register schema and create corresponding validator instance', (): void => {
      const schema = makeSchema(['name', 'age']);
      instance.registerSchema('user', schema);

      expect(instance.getSchema('user')).toBe(schema);
      expect(instance.getSchemaCount()).toBe(1);
      expect(instance.getSchemaNames()).toEqual(['user']);

      const instances = __getInstances();
      expect(instances.length).toBe(1);
      const created = instances[0] as { schema: unknown };
      expect(created.schema).toBe(schema);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(instance.getSchema('missing')).toBeUndefined();
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and its validator', (): void => {
      const schema = makeSchema(['id']);
      instance.registerSchema('entity', schema);

      const deleted = instance.unregisterSchema('entity');
      expect(deleted).toBe(true);
      expect(instance.getSchema('entity')).toBeUndefined();
      expect(instance.getSchemaCount()).toBe(0);

      expect((): void => {
        instance.validateWithSchema('entity', {});
      }).toThrowError("Schema 'entity' not found");
    });

    test('should return false when unregistering unknown schema', (): void => {
      expect(instance.unregisterSchema('nope')).toBe(false);
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect((): void => {
        instance.validateWithSchema('not-registered', {});
      }).toThrowError("Schema 'not-registered' not found");
    });

    test('should call validator and return validation result', (): void => {
      const schema = makeSchema(['a']);
      instance.registerSchema('s', schema);

      const result = instance.validateWithSchema('s', { a: 1 });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ a: 1 });
    });

    test('should honor abortEarly option by keeping only the first error', (): void => {
      const schema = makeSchema(['a']);
      instance.registerSchema('s', schema);

      __setValidateImpl((_data: Record<string, unknown>): ValidationResult => ({
        valid: false,
        errors: [
          { field: 'a', message: 'First' },
          { field: 'a', message: 'Second' },
        ],
        sanitized: { a: 1 },
      }));

      const result = instance.validateWithSchema('s', { a: 1 }, { abortEarly: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ field: 'a', message: 'First' });
    });

    test('should strip unknown fields from sanitized data when stripUnknown is true', (): void => {
      const schema = makeSchema(['a']);
      instance.registerSchema('s', schema);

      __setValidateImpl((_data: Record<string, unknown>): ValidationResult => ({
        valid: true,
        errors: [],
        sanitized: { a: 1, b: 2 },
      }));

      const result = instance.validateWithSchema('s', { a: 1, b: 2 }, { stripUnknown: true });
      expect(result.sanitized).toEqual({ a: 1 });
    });

    test('should not fail stripUnknown when sanitized is undefined', (): void => {
      const schema = makeSchema(['a']);
      instance.registerSchema('s', schema);

      __setValidateImpl((_data: Record<string, unknown>): ValidationResult => ({
        valid: true,
        errors: [],
        sanitized: undefined,
      }));

      const result = instance.validateWithSchema('s', { a: 1, b: 2 }, { stripUnknown: true });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('createMiddleware', (): void => {
    test('should return a function that validates using provided schema and options', (): void => {
      const schema = makeSchema(['a', 'b']);
      instance.registerSchema('s', schema);

      __setValidateImpl((_data: Record<string, unknown>): ValidationResult => ({
        valid: false,
        errors: [
          { field: 'a', message: 'err1' },
          { field: 'b', message: 'err2' },
        ],
        sanitized: { a: 1, b: 2, c: 3 },
      }));

      const mw = instance.createMiddleware('s', { abortEarly: true, stripUnknown: true });
      const result = mw({ a: 1, b: 2, c: 3 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

    test('should throw inside returned function when schema is missing', (): void => {
      const mw = instance.createMiddleware('missing', { abortEarly: true });
      expect((): void => {
        mw({});
      }).toThrowError("Schema 'missing' not found");
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema is not found', (): void => {
      expect((): void => {
        instance.batchValidate('not-registered', [{}]);
      }).toThrowError("Schema 'not-registered' not found");
    });

    test('should validate each item in the array', (): void => {
      const schema = makeSchema(['x']);
      instance.registerSchema('s', schema);

      let callCount = 0;
      __setValidateImpl((data: Record<string, unknown>): ValidationResult => {
        callCount += 1;
        return { valid: true, errors: [], sanitized: data };
      });

      const results = instance.batchValidate('s', [{ x: 1 }, { x: 2 }]);
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(callCount).toBe(2);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} },
        { valid: true, errors: [], sanitized: {} },
      ];
      expect(instance.batchValidationPassed(results)).toBe(true);
    });

    test('should return true for empty results', (): void => {
      expect(instance.batchValidationPassed([])).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results: ValidationResult[] = [
        { valid: true, errors: [], sanitized: {} },
        { valid: false, errors: [{ message: 'bad' }], sanitized: {} },
      ];
      expect(instance.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      instance.registerSchema('a', makeSchema(['a']));
      instance.registerSchema('b', makeSchema(['b']));
      const names = instance.getSchemaNames().sort();
      expect(names).toEqual(['a', 'b']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the total count of registered schemas', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      instance.registerSchema('a', makeSchema(['a']));
      instance.registerSchema('b', makeSchema(['b']));
      expect(instance.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear all schemas and validators', (): void => {
      instance.registerSchema('a', makeSchema(['a']));
      instance.registerSchema('b', makeSchema(['b']));
      expect(instance.getSchemaCount()).toBe(2);

      instance.clearAll();

      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
      expect((): void => {
        instance.validateWithSchema('a', {});
      }).toThrowError("Schema 'a' not found");
    });
  });
});

describe('getGlobalMiddleware', (): void => {
  beforeEach((): void => {
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  test('should return the same singleton instance across calls', (): void => {
    const a = getGlobalMiddleware();
    const b = getGlobalMiddleware();
    expect(a).toBe(b);
  });

  test('should allow using the global instance', (): void => {
    const gm = getGlobalMiddleware();
    gm.registerSchema('x', ({ rules: [{ field: 'x' }] } as unknown) as ValidationSchema);

    const again = getGlobalMiddleware();
    expect(again.getSchema('x')).toBeDefined();
  });
});

describe('resetGlobalMiddleware', (): void => {
  beforeEach((): void => {
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  test('should reset the global instance', (): void => {
    const a = getGlobalMiddleware();
    a.registerSchema('y', ({ rules: [{ field: 'y' }] } as unknown) as ValidationSchema);

    resetGlobalMiddleware();

    const b = getGlobalMiddleware();
    expect(b).not.toBe(a);
    expect(b.getSchema('y')).toBeUndefined();
  });
});
