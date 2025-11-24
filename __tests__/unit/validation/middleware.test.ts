import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema } from '../src/validation/schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../src/validation/middleware.js';
import { __validatorInstances } from '../src/validation/validator.js';

vi.mock('../src/validation/validator.js', (): Record<string, unknown> => {
  const instances: unknown[] = [];
  class MockValidator {
    public schema: unknown;
    public validate: (data: Record<string, unknown>) => TestValidationResult;
    public constructor(schema: unknown) {
      this.schema = schema;
      this.validate = vi.fn<[(data: Record<string, unknown>)], TestValidationResult>(() => ({
        valid: true,
        errors: [],
        sanitized: {},
      }));
      (instances as MockValidator[]).push(this);
    }
  }
  return {
    Validator: MockValidator,
    __validatorInstances: instances,
  };
});


type TestValidationResult = {
  valid: boolean;
  errors: { field: string; message: string }[];
  sanitized?: Record<string, unknown>;
};



describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  const createSchema = (fields: string[]): ValidationSchema => {
    return {
      rules: fields.map((field) => ({ field })),
    } as unknown as ValidationSchema;
  };

  const getLastValidator = (): { validate: (data: Record<string, unknown>) => TestValidationResult } => {
    const arr = __validatorInstances as unknown[];
    const last = arr[arr.length - 1] as { validate: (data: Record<string, unknown>) => TestValidationResult };
    return last;
  };

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    // Reset mocks and internal mock state
    vi.clearAllMocks();
    const arr = __validatorInstances as unknown[];
    arr.length = 0;
    middleware.clearAll();
    resetGlobalMiddleware();
  });

  describe('constructor/initialization', (): void => {
    test('should initialize with no schemas', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create validator', (): void => {
      const schema = createSchema(['id', 'name']);
      middleware.registerSchema('user', schema);

      expect(middleware.getSchemaCount()).toBe(1);
      expect(middleware.getSchemaNames()).toEqual(['user']);
      expect(middleware.getSchema('user')).toBe(schema);

      const instances = __validatorInstances as unknown[];
      expect(instances.length).toBe(1);
    });

    test('should override existing schema with same name and use latest validator', (): void => {
      const firstSchema = createSchema(['a']);
      const secondSchema = createSchema(['b']);

      middleware.registerSchema('dup', firstSchema);
      const firstValidator = getLastValidator();
      const firstResult: TestValidationResult = {
        valid: false,
        errors: [{ field: 'a', message: 'first' }],
      };
      firstValidator.validate = vi.fn().mockReturnValue(firstResult);

      middleware.registerSchema('dup', secondSchema);
      const secondValidator = getLastValidator();
      const secondResult: TestValidationResult = {
        valid: true,
        errors: [],
        sanitized: { b: 1 },
      };
      secondValidator.validate = vi.fn().mockReturnValue(secondResult);

      const output = middleware.validateWithSchema('dup', { x: 1 });
      expect(secondValidator.validate).toHaveBeenCalledTimes(1);
      expect(secondValidator.validate).toHaveBeenCalledWith({ x: 1 });
      expect(output).toEqual(secondResult);
      expect((firstValidator.validate as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and return true', (): void => {
      const schema = createSchema(['id']);
      middleware.registerSchema('toRemove', schema);
      const removed = middleware.unregisterSchema('toRemove');
      expect(removed).toBe(true);
      expect(middleware.getSchema('toRemove')).toBeUndefined();
      expect((): void => {
        middleware.validateWithSchema('toRemove', {});
      }).toThrowError("Schema 'toRemove' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return schema by name', (): void => {
      const schema = createSchema(['id']);
      middleware.registerSchema('getMe', schema);
      expect(middleware.getSchema('getMe')).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.validateWithSchema('nope', {});
      }).toThrowError("Schema 'nope' not found");
    });

    test('should delegate to validator and return result', (): void => {
      middleware.registerSchema('user', createSchema(['id', 'name']));
      const validator = getLastValidator();
      const result: TestValidationResult = {
        valid: true,
        errors: [],
        sanitized: { id: 1, name: 'Jane', extra: true },
      };
      validator.validate = vi.fn().mockReturnValue(result);

      const output = middleware.validateWithSchema('user', { id: 1, name: 'Jane' });
      expect(validator.validate).toHaveBeenCalledWith({ id: 1, name: 'Jane' });
      expect(output).toEqual(result);
    });

    test('should apply abortEarly and keep only the first error', (): void => {
      middleware.registerSchema('user', createSchema(['id']));
      const validator = getLastValidator();
      const errors = [
        { field: 'id', message: 'required' },
        { field: 'id', message: 'must be number' },
      ];
      const result: TestValidationResult = {
        valid: false,
        errors,
      };
      validator.validate = vi.fn().mockReturnValue({ ...result });

      const output = middleware.validateWithSchema('user', {}, { abortEarly: true });
      expect(output.errors).toEqual([errors[0]]);
    });

    test('should strip unknown fields from sanitized when option enabled', (): void => {
      middleware.registerSchema('user', createSchema(['id', 'name']));
      const validator = getLastValidator();

      const result: TestValidationResult = {
        valid: true,
        errors: [],
        sanitized: { id: 1, name: 'Jane', extra: 'remove-me' },
      };
      validator.validate = vi.fn().mockReturnValue({ ...result });

      const output = middleware.validateWithSchema('user', {}, { stripUnknown: true });
      expect(output.sanitized).toEqual({ id: 1, name: 'Jane' });
    });

    test('should not fail when sanitized is undefined and stripUnknown is true', (): void => {
      middleware.registerSchema('user', createSchema(['id']));
      const validator = getLastValidator();

      const result: TestValidationResult = {
        valid: true,
        errors: [],
        // sanitized intentionally omitted
      };
      validator.validate = vi.fn().mockReturnValue({ ...result });

      const output = middleware.validateWithSchema('user', {}, { stripUnknown: true });
      expect(output.sanitized).toBeUndefined();
    });

    test('should accept options with context without affecting validation', (): void => {
      middleware.registerSchema('user', createSchema(['id']));
      const validator = getLastValidator();

      const result: TestValidationResult = { valid: true, errors: [] };
      validator.validate = vi.fn().mockReturnValue({ ...result });

      const output = middleware.validateWithSchema('user', { id: 1 }, { context: { role: 'admin' } });
      expect(output).toEqual(result);
    });
  });

  describe('createMiddleware', (): void => {
    test('should return a function that validates with provided schema and options', (): void => {
      middleware.registerSchema('user', createSchema(['id', 'name']));
      const validator = getLastValidator();

      const errors = [
        { field: 'id', message: 'required' },
        { field: 'name', message: 'required' },
      ];
      const result: TestValidationResult = {
        valid: false,
        errors: [...errors],
        sanitized: { id: 1, name: 'x', unknown: true },
      };
      validator.validate = vi.fn().mockReturnValue({ ...result });

      const mw = middleware.createMiddleware('user', { abortEarly: true, stripUnknown: true });
      const output = mw({ id: 1 } as Record<string, unknown>);
      expect(validator.validate).toHaveBeenCalledWith({ id: 1 });
      expect(output.errors).toEqual([errors[0]]);
      expect(output.sanitized).toEqual({ id: 1, name: 'x' });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): void => {
        middleware.batchValidate('missing', [{}, {}]);
      }).toThrowError("Schema 'missing' not found");
    });

    test('should validate each data item and return results array', (): void => {
      middleware.registerSchema('user', createSchema(['id']));
      const validator = getLastValidator();

      validator.validate = vi.fn().mockImplementation((data: Record<string, unknown>): TestValidationResult => {
        if (typeof data.id === 'number') {
          return { valid: true, errors: [], sanitized: { id: data.id } };
        }
        return { valid: false, errors: [{ field: 'id', message: 'must be number' }] };
      });

      const inputs: Record<string, unknown>[] = [{ id: 1 }, { id: 'x' }, {}];
      const results = middleware.batchValidate('user', inputs);

      expect(validator.validate).toHaveBeenCalledTimes(3);
      expect(results[0]).toEqual({ valid: true, errors: [], sanitized: { id: 1 } });
      expect(results[1]).toEqual({ valid: false, errors: [{ field: 'id', message: 'must be number' }] });
      expect(results[2]).toEqual({ valid: false, errors: [{ field: 'id', message: 'must be number' }] });
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results: TestValidationResult[] = [
        { valid: true, errors: [] },
        { valid: true, errors: [] },
      ];
      expect(middleware.batchValidationPassed(results as unknown as never)).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results: TestValidationResult[] = [
        { valid: true, errors: [] },
        { valid: false, errors: [{ field: 'id', message: 'error' }] },
      ];
      expect(middleware.batchValidationPassed(results as unknown as never)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return names of all registered schemas in insertion order', (): void => {
      middleware.registerSchema('first', createSchema(['a']));
      middleware.registerSchema('second', createSchema(['b']));
      middleware.registerSchema('third', createSchema(['c']));
      expect(middleware.getSchemaNames()).toEqual(['first', 'second', 'third']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return count of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', createSchema(['x']));
      expect(middleware.getSchemaCount()).toBe(1);
      middleware.registerSchema('two', createSchema(['y']));
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear schemas and validators', (): void => {
      middleware.registerSchema('one', createSchema(['x']));
      middleware.registerSchema('two', createSchema(['y']));
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
      expect((): void => {
        middleware.validateWithSchema('one', {});
      }).toThrowError("Schema 'one' not found");
    });
  });
});

describe('Global middleware instance', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const first = getGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).toBeInstanceOf(ValidationMiddleware);
      expect(first).toBe(second);
    });

    test('should return a fresh instance after reset', (): void => {
      const beforeReset = getGlobalMiddleware();
      resetGlobalMiddleware();
      const afterReset = getGlobalMiddleware();
      expect(afterReset).toBeInstanceOf(ValidationMiddleware);
      expect(afterReset).not.toBe(beforeReset);
    });

    test('global instance should be usable for schema registration and validation', (): void => {
      const global = getGlobalMiddleware();
      const schema = {
        rules: [{ field: 'id' }],
      } as unknown as ValidationSchema;
      global.registerSchema('globalUser', schema);

      // ensure Validator mock is used
      const validatorInstances = __validatorInstances as unknown[];
      const last = validatorInstances[validatorInstances.length - 1] as { validate: (data: Record<string, unknown>) => TestValidationResult };
      const result: TestValidationResult = { valid: true, errors: [], sanitized: { id: 42 } };
      last.validate = vi.fn().mockReturnValue(result);

      const output = global.validateWithSchema('globalUser', { id: 42 });
      expect(output).toEqual(result);
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
