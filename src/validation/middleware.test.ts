import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.ts';

type ValidateCall = {
  data: Record<string, unknown>;
  schema: unknown;
};

// Shared spy for Validator.validate return values
const validateSpy = vi.fn((_args: ValidateCall): unknown => ({
  valid: true,
  errors: [] as string[],
  sanitized: _args.data,
}));

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  class MockValidator {
    public schema: unknown;

    constructor(schema: unknown) {
      this.schema = schema;
    }

    validate(data: Record<string, unknown>): unknown {
      return validateSpy({ data, schema: this.schema });
    }
  }

  return {
    Validator: MockValidator,
  };
});

describe('ValidationMiddleware', (): void => {
  let instance: ValidationMiddleware;

  beforeEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
    instance = new ValidationMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize empty registry', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and make it retrievable', (): void => {
      const schema = { rules: [{ field: 'name' }] };
      instance.registerSchema('user', schema as unknown as never);

      expect(instance.getSchema('user')).toBe(schema);
      expect(instance.getSchemaCount()).toBe(1);
      expect(instance.getSchemaNames()).toEqual(['user']);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should unregister an existing schema and return true', (): void => {
      const schema = { rules: [{ field: 'name' }] };
      instance.registerSchema('user', schema as unknown as never);

      const res = instance.unregisterSchema('user');
      expect(res).toBe(true);
      expect(instance.getSchema('user')).toBeUndefined();
      expect(instance.getSchemaCount()).toBe(0);
    });

    test('should return false when trying to unregister non-existing schema', (): void => {
      const res = instance.unregisterSchema('unknown');
      expect(res).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(instance.getSchema('nope')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect((): unknown => instance.validateWithSchema('missing', {})).toThrowError(
        "Schema 'missing' not found",
      );
    });

    test('should return validator result without options changes', (): void => {
      const schema = { rules: [{ field: 'name' }, { field: 'age' }] };
      instance.registerSchema('user', schema as unknown as never);

      const baseResult = {
        valid: true,
        errors: [] as string[],
        sanitized: { name: 'John', age: 30, extra: 'x' } as Record<string, unknown>,
      };
      validateSpy.mockReturnValueOnce(baseResult);

      const result = instance.validateWithSchema('user', { name: 'John', age: 30 });
      expect(result).toBe(baseResult);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'John', age: 30, extra: 'x' });
    });

    test('should apply abortEarly option and keep only first error', (): void => {
      const schema = { rules: [{ field: 'email' }] };
      instance.registerSchema('auth', schema as unknown as never);

      const baseResult = {
        valid: false,
        errors: ['first error', 'second error', 'third error'],
        sanitized: { email: 'test@example.com' } as Record<string, unknown>,
      };
      validateSpy.mockReturnValueOnce(baseResult);

      const result = instance.validateWithSchema('auth', { email: 'bad' }, { abortEarly: true });
      expect(result.errors).toEqual(['first error']);
    });

    test('should apply stripUnknown option and remove fields not in schema rules', (): void => {
      const schema = { rules: [{ field: 'name' }, { field: 'age' }] };
      instance.registerSchema('user', schema as unknown as never);

      const baseResult = {
        valid: true,
        errors: [] as string[],
        sanitized: { name: 'Jane', age: 25, extra: 'remove', another: 123 } as Record<
          string,
          unknown
        >,
      };
      validateSpy.mockReturnValueOnce(baseResult);

      const result = instance.validateWithSchema('user', { name: 'Jane', age: 25 }, { stripUnknown: true });
      expect(result.sanitized).toEqual({ name: 'Jane', age: 25 });
    });

    test('should handle stripUnknown when sanitized is undefined (no crash)', (): void => {
      const schema = { rules: [{ field: 'name' }] };
      instance.registerSchema('user', schema as unknown as never);

      const baseResult = {
        valid: true,
        errors: [] as string[],
        sanitized: undefined,
      };
      validateSpy.mockReturnValueOnce(baseResult);

      const result = instance.validateWithSchema('user', { name: 'Jane' }, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
      expect(result.valid).toBe(true);
    });

    test('should apply both abortEarly and stripUnknown together', (): void => {
      const schema = { rules: [{ field: 'a' }, { field: 'b' }] };
      instance.registerSchema('combo', schema as unknown as never);

      const baseResult = {
        valid: false,
        errors: ['e1', 'e2'],
        sanitized: { a: 1, b: 2, c: 3 } as Record<string, unknown>,
      };
      validateSpy.mockReturnValueOnce(baseResult);

      const result = instance.validateWithSchema(
        'combo',
        { a: 1, b: 2, c: 3 },
        { abortEarly: true, stripUnknown: true },
      );

      expect(result.errors).toEqual(['e1']);
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });
  });

  describe('createMiddleware', (): void => {
    test('should return a function that validates with provided options', (): void => {
      const schema = { rules: [{ field: 'x' }, { field: 'y' }] };
      instance.registerSchema('mw', schema as unknown as never);

      const baseResult = {
        valid: false,
        errors: ['A', 'B'],
        sanitized: { x: 10, y: 20, z: 30 } as Record<string, unknown>,
      };
      validateSpy.mockReturnValueOnce(baseResult);

      const mwFn = instance.createMiddleware('mw', { abortEarly: true, stripUnknown: true });
      const result = mwFn({ x: 10, y: 20, z: 30 });
      expect(result.errors).toEqual(['A']);
      expect(result.sanitized).toEqual({ x: 10, y: 20 });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect((): unknown => instance.batchValidate('missing', [{}])).toThrowError(
        "Schema 'missing' not found",
      );
    });

    test('should validate each item in array and return results', (): void => {
      const schema = { rules: [{ field: 'v' }] };
      instance.registerSchema('batch', schema as unknown as never);

      const result1 = { valid: true, errors: [] as string[], sanitized: { v: 1 } as Record<string, unknown> };
      const result2 = { valid: false, errors: ['err'], sanitized: { v: 2 } as Record<string, unknown> };

      validateSpy
        .mockReturnValueOnce(result1)
        .mockReturnValueOnce(result2);

      const results = instance.batchValidate('batch', [{ v: 1 }, { v: 2 }]);
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(result1);
      expect(results[1]).toBe(result2);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true only if all results are valid', (): void => {
      const allValid = [
        { valid: true, errors: [] as string[] },
        { valid: true, errors: [] as string[] },
      ] as unknown as ReturnType<ValidationMiddleware['batchValidate']>;
      const someInvalid = [
        { valid: true, errors: [] as string[] },
        { valid: false, errors: ['e'] },
      ] as unknown as ReturnType<ValidationMiddleware['batchValidate']>;

      expect(instance.batchValidationPassed(allValid)).toBe(true);
      expect(instance.batchValidationPassed(someInvalid)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return names in registration order', (): void => {
      const s1 = { rules: [{ field: 'a' }] };
      const s2 = { rules: [{ field: 'b' }] };
      instance.registerSchema('first', s1 as unknown as never);
      instance.registerSchema('second', s2 as unknown as never);

      expect(instance.getSchemaNames()).toEqual(['first', 'second']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should reflect number of registered schemas', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      instance.registerSchema('one', { rules: [{ field: 'x' }] } as unknown as never);
      expect(instance.getSchemaCount()).toBe(1);
    });
  });

  describe('clearAll', (): void => {
    test('should clear all schemas and validators', (): void => {
      instance.registerSchema('toClear', { rules: [{ field: 'n' }] } as unknown as never);
      expect(instance.getSchemaCount()).toBe(1);

      instance.clearAll();
      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
      expect((): unknown => instance.validateWithSchema('toClear', {})).toThrowError(
        "Schema 'toClear' not found",
      );
    });
  });
});

describe('Global middleware instance', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should provide a singleton instance of ValidationMiddleware', (): void => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();

      expect(a).toBeInstanceOf(ValidationMiddleware);
      expect(b).toBe(a);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset global instance so next get returns a new one', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();

      expect(second).toBeInstanceOf(ValidationMiddleware);
      expect(second).not.toBe(first);
    });
  });
});
