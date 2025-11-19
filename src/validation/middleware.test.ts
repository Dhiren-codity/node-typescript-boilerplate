import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

type MockError = { field: string; message?: string };
type MockValidationResult = {
  valid: boolean;
  errors: MockError[];
  sanitized?: Record<string, unknown>;
};
type SchemaRule = { field: string };
type SchemaType = { rules: SchemaRule[] };
type MiddlewareOptions = {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  context?: Record<string, unknown>;
};

interface IMiddleware {
  registerSchema: (name: string, schema: SchemaType) => void;
  unregisterSchema: (name: string) => boolean;
  getSchema: (name: string) => SchemaType | undefined;
  validateWithSchema: (
    schemaName: string,
    data: Record<string, unknown>,
    options?: MiddlewareOptions
  ) => MockValidationResult;
  createMiddleware: (
    schemaName: string,
    options?: MiddlewareOptions
  ) => (data: Record<string, unknown>) => MockValidationResult;
  batchValidate: (
    schemaName: string,
    dataArray: Record<string, unknown>[]
  ) => MockValidationResult[];
  batchValidationPassed: (results: { valid: boolean }[]) => boolean;
  getSchemaNames: () => string[];
  getSchemaCount: () => number;
  clearAll: () => void;
}

// Resolve absolute paths so the mock matches the SUT's resolved import id.
const validatorModulePath = path.resolve(process.cwd(), 'src/validation/validator.js');
const middlewareModulePath = path.resolve(process.cwd(), 'src/validation/middleware.ts');

// Mock Validator dependency
const createdValidators: unknown[] = [];
const mockConstructor = vi.fn((schema: unknown): void => {});
const mockValidate = vi.fn((data: Record<string, unknown>): MockValidationResult => {
  return { valid: true, errors: [], sanitized: data };
});

class MockValidator {
  public schema: unknown;
  public validate: (data: Record<string, unknown>) => MockValidationResult;
  constructor(schema: unknown) {
    this.schema = schema;
    createdValidators.push(this);
    this.validate = (data: Record<string, unknown>): MockValidationResult => mockValidate(data);
    mockConstructor(schema);
  }
}

vi.mock(validatorModulePath, (): Record<string, unknown> => ({
  Validator: MockValidator,
}));

const {
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
}: {
  ValidationMiddleware: new () => IMiddleware;
  getGlobalMiddleware: () => IMiddleware;
  resetGlobalMiddleware: () => void;
} = await import(middlewareModulePath);

describe('ValidationMiddleware', (): void => {
  let middleware: IMiddleware;

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
    mockValidate.mockReset();
    mockConstructor.mockReset();
    (createdValidators as unknown[]).splice(0, createdValidators.length);
  });

  afterEach((): void => {
    resetGlobalMiddleware();
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize empty registries', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should register schema and create a Validator instance', (): void => {
      const schema: SchemaType = { rules: [{ field: 'name' }] };

      middleware.registerSchema('user', schema);

      expect(middleware.getSchema('user')).toBe(schema);
      expect(createdValidators.length).toBe(1);
      expect(mockConstructor).toHaveBeenCalledTimes(1);
      expect(mockConstructor).toHaveBeenCalledWith(schema);
    });

    test('should overwrite existing schema with the same name', (): void => {
      const schema1: SchemaType = { rules: [{ field: 'a' }] };
      const schema2: SchemaType = { rules: [{ field: 'b' }] };

      middleware.registerSchema('dup', schema1);
      middleware.registerSchema('dup', schema2);

      expect(middleware.getSchema('dup')).toBe(schema2);
      expect(createdValidators.length).toBe(2);
      expect(mockConstructor).toHaveBeenNthCalledWith(1, schema1);
      expect(mockConstructor).toHaveBeenNthCalledWith(2, schema2);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should remove schema and return true when present', (): void => {
      const schema: SchemaType = { rules: [{ field: 'x' }] };
      middleware.registerSchema('toRemove', schema);

      const removed: boolean = middleware.unregisterSchema('toRemove');

      expect(removed).toBe(true);
      expect(middleware.getSchema('toRemove')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);
    });

    test('should return false when schema is not registered', (): void => {
      const removed: boolean = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return registered schema by name', (): void => {
      const schema: SchemaType = { rules: [{ field: 'q' }] };
      middleware.registerSchema('query', schema);

      expect(middleware.getSchema('query')).toBe(schema);
    });

    test('should return undefined for unknown schema', (): void => {
      expect(middleware.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw error if schema is not found', (): void => {
      expect((): void => {
        middleware.validateWithSchema('none', {});
      }).toThrowError("Schema 'none' not found");
    });

    test('should validate data and return validator result', (): void => {
      const schema: SchemaType = { rules: [{ field: 'name' }] };
      middleware.registerSchema('user', schema);

      const expected: MockValidationResult = {
        valid: true,
        errors: [],
        sanitized: { name: 'Alice', extra: 1 },
      };
      mockValidate.mockImplementation((): MockValidationResult => expected);

      const result: MockValidationResult = middleware.validateWithSchema('user', { name: 'Alice', extra: 1 });
      expect(result).toBe(expected);
      expect(mockValidate).toHaveBeenCalledTimes(1);
    });

    test('should respect abortEarly option by keeping only the first error', (): void => {
      const schema: SchemaType = { rules: [{ field: 'name' }, { field: 'age' }] };
      middleware.registerSchema('user', schema);

      const validation: MockValidationResult = {
        valid: false,
        errors: [
          { field: 'name', message: 'name required' },
          { field: 'age', message: 'age invalid' },
        ],
        sanitized: { name: '' },
      };
      mockValidate.mockImplementation((): MockValidationResult => ({ ...validation }));

      const result: MockValidationResult = middleware.validateWithSchema('user', { name: '' }, { abortEarly: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual(validation.errors[0]);
    });

    test('should respect stripUnknown option by removing fields not in schema.rules', (): void => {
      const schema: SchemaType = { rules: [{ field: 'name' }, { field: 'age' }] };
      middleware.registerSchema('user', schema);

      mockValidate.mockImplementation(
        (): MockValidationResult => ({
          valid: true,
          errors: [],
          sanitized: { name: 'Alice', age: 30, extra: 'remove me' },
        })
      );

      const result: MockValidationResult = middleware.validateWithSchema(
        'user',
        { name: 'Alice', age: 30, extra: 'remove me' },
        { stripUnknown: true }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'Alice', age: 30 });
    });

    test('should keep sanitized undefined when stripUnknown is true but sanitized not provided', (): void => {
      const schema: SchemaType = { rules: [{ field: 'a' }] };
      middleware.registerSchema('sample', schema);

      mockValidate.mockImplementation(
        (): MockValidationResult => ({
          valid: true,
          errors: [],
          sanitized: undefined,
        })
      );

      const result: MockValidationResult = middleware.validateWithSchema('sample', {}, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
    });

    test('should keep all errors when abortEarly is false', (): void => {
      const schema: SchemaType = { rules: [{ field: 'x' }, { field: 'y' }] };
      middleware.registerSchema('multi', schema);

      const validation: MockValidationResult = {
        valid: false,
        errors: [{ field: 'x', message: 'bad' }, { field: 'y', message: 'worse' }],
        sanitized: {},
      };
      mockValidate.mockImplementation((): MockValidationResult => ({ ...validation }));

      const result: MockValidationResult = middleware.validateWithSchema('multi', {});

      expect(result.errors).toHaveLength(2);
      expect(result.errors).toEqual(validation.errors);
    });
  });

  describe('createMiddleware', (): void => {
    test('should return a function that validates using provided schema and options', (): void => {
      const schema: SchemaType = { rules: [{ field: 'name' }, { field: 'age' }] };
      middleware.registerSchema('user', schema);

      mockValidate.mockImplementation(
        (): MockValidationResult => ({
          valid: false,
          errors: [{ field: 'name', message: 'required' }, { field: 'age', message: 'invalid' }],
          sanitized: { age: -1 },
        })
      );

      const fn = middleware.createMiddleware('user', { abortEarly: true });
      const result: MockValidationResult = fn({});

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ field: 'name', message: 'required' });
    });
  });

  describe('batchValidate', (): void => {
    test('should throw error if schema is not found', (): void => {
      expect((): void => {
        middleware.batchValidate('missing', [{}]);
      }).toThrowError("Schema 'missing' not found");
    });

    test('should validate each item and return results array', (): void => {
      const schema: SchemaType = { rules: [{ field: 'f' }] };
      middleware.registerSchema('bulk', schema);

      mockValidate.mockImplementation((data: Record<string, unknown>): MockValidationResult => {
        const isValid: boolean = Boolean(data.valid);
        return {
          valid: isValid,
          errors: isValid ? [] : [{ field: 'f', message: 'bad' }],
          sanitized: isValid ? { ok: true } : { ok: false },
        };
      });

      const input: Record<string, unknown>[] = [{ valid: true }, { valid: false }, { valid: true }];
      const results: MockValidationResult[] = middleware.batchValidate('bulk', input);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.valid)).toEqual([true, false, true]);
      expect(results[1].errors).toEqual([{ field: 'f', message: 'bad' }]);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const res: { valid: boolean }[] = [{ valid: true }, { valid: true }];
      expect(middleware.batchValidationPassed(res)).toBe(true);
    });

    test('should return false when at least one result is invalid', (): void => {
      const res: { valid: boolean }[] = [{ valid: true }, { valid: false }];
      expect(middleware.batchValidationPassed(res)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const schemaA: SchemaType = { rules: [{ field: 'a' }] };
      const schemaB: SchemaType = { rules: [{ field: 'b' }] };
      middleware.registerSchema('A', schemaA);
      middleware.registerSchema('B', schemaB);

      const names: string[] = middleware.getSchemaNames();
      expect(names).toEqual(['A', 'B']);
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the number of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      middleware.registerSchema('one', { rules: [{ field: 'x' }] });
      middleware.registerSchema('two', { rules: [{ field: 'y' }] });
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should clear schemas and validators', (): void => {
      middleware.registerSchema('one', { rules: [{ field: 'x' }] });
      middleware.registerSchema('two', { rules: [{ field: 'y' }] });
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();

      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });
});

describe('Global middleware functions', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const first = getGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).toBe(second);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance', (): void => {
      const first = getGlobalMiddleware();
      resetGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).not.toBe(second);
    });
  });
});
