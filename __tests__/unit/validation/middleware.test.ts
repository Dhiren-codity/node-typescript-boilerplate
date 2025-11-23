import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';

vi.mock('./validator.js', (): Record<string, unknown> => {
  class MockValidator {
    public schema: Record<string, unknown>;
    public validate: (data: Record<string, unknown>) => {
      valid: boolean;
      errors: { message: string }[];
      sanitized?: Record<string, unknown>;
    };

    constructor(schema: Record<string, unknown>) {
      this.schema = schema;
      this.validate = vi.fn((data: Record<string, unknown>) => {
        const invalidFlag = data.invalid === true;
        const errorCount =
          typeof data.errorCount === 'number' ? (data.errorCount as number) : (invalidFlag ? 1 : 0);
        const errors = Array.from({ length: errorCount }, (): { message: string } => ({ message: 'error' }));
        const sanitized =
          data.noSanitized === true
            ? undefined
            : (typeof data.sanitizedOverride === 'object' && data.sanitizedOverride !== null
                ? (data.sanitizedOverride as Record<string, unknown>)
                : (data as Record<string, unknown>));
        return {
          valid: errorCount === 0,
          errors,
          sanitized,
        };


// Mock the Validator dependency used by ValidationMiddleware

  return {
    Validator: MockValidator,
  };



  beforeEach((): void => {
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema registry', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });

  describe('registerSchema', (): void => {
    test('should register schema and create validator', (): void => {
      const schema = createSampleSchema();
      middleware.registerSchema('user', schema as unknown as never);
      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaNames()).toContain('user');
      expect(middleware.getSchemaCount()).toBe(1);
    });

  describe('unregisterSchema', (): void => {
    test('should unregister existing schema and return true', (): void => {
      const schema = createSampleSchema();
      middleware.registerSchema('user', schema as unknown as never);
      const deleted = middleware.unregisterSchema('user');
      expect(deleted).toBe(true);
      expect(middleware.getSchema('user')).toBeUndefined();
      expect((): void => {
        // Validate should now throw because validator is removed
        // Using a closure to test throw
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('user', {});
      }).toThrowError("Schema 'user' not found");
    });

    test('should return false for unknown schema', (): void => {
      const deleted = middleware.unregisterSchema('unknown');
      expect(deleted).toBe(false);
    });

  describe('getSchema', (): void => {
    test('should return undefined for non-existent schema', (): void => {
      expect(middleware.getSchema('missing')).toBeUndefined();
    });

    test('should return the registered schema', (): void => {
      const schema = createSampleSchema();
      middleware.registerSchema('user', schema as unknown as never);
      expect(middleware.getSchema('user')).toBe(schema);
    });

  describe('validateWithSchema', (): void => {
    test('should throw when schema is not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('none', {});
      }).toThrowError("Schema 'none' not found");
    });

      const result = middleware.validateWithSchema('user', data);

      expect(result.valid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual(data);
    });

      const result = middleware.validateWithSchema('user', data, { abortEarly: true });

      expect(result.errors).toHaveLength(1);
    });

      const result = middleware.validateWithSchema('user', data, { abortEarly: false });

      expect(result.errors).toHaveLength(2);
    });

      const data: Record<string, unknown> = { sanitizedOverride };
      const result = middleware.validateWithSchema('user', data, { stripUnknown: true });

      expect(result.sanitized).toEqual({ a: 1, b: 2 });
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'extra')).toBe(false);
    });

      const result = middleware.validateWithSchema('user', data, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
    });


      const result = await mw(data);
      expect(result.errors).toHaveLength(1);
    });

  describe('batchValidate', (): void => {
    test('should throw when schema is not found', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.batchValidate('missing', []);
      }).toThrowError("Schema 'missing' not found");
    });

        { errorCount: 1 },
        { errorCount: 0 },
      ];

      const results = middleware.batchValidate('user', dataArray);
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });

      ] as unknown as { valid: boolean; errors: unknown[] }[]);
      expect(allValid).toBe(true);
    });

        { valid: false, errors: [{ message: 'x' }] },
      ] as unknown as { valid: boolean; errors: unknown[] }[]);
      expect(notAllValid).toBe(false);
    });

    test('should return true for empty results', (): void => {
      const empty = middleware.batchValidationPassed([]);
      expect(empty).toBe(true);
    });

  describe('getSchemaNames', (): void => {
    test('should return all registered schema names', (): void => {
      const schemaA = createSampleSchema();
      const schemaB = createSampleSchema();
      middleware.registerSchema('userA', schemaA as unknown as never);
      middleware.registerSchema('userB', schemaB as unknown as never);

      const names = middleware.getSchemaNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('userA');
      expect(names).toContain('userB');
    });

  describe('getSchemaCount', (): void => {
    test('should return the count of registered schemas', (): void => {
      expect(middleware.getSchemaCount()).toBe(0);
      const schema = createSampleSchema();
      middleware.registerSchema('user', schema as unknown as never);
      expect(middleware.getSchemaCount()).toBe(1);
    });

  describe('clearAll', (): void => {
    test('should clear schemas and validators', (): void => {
      const schema = createSampleSchema();
      middleware.registerSchema('user', schema as unknown as never);
      expect(middleware.getSchemaCount()).toBe(1);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        middleware.validateWithSchema('user', {});
      }).toThrowError("Schema 'user' not found");
    });
  });
});


  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance', (): void => {
      const instance1 = getGlobalMiddleware();
      const instance2 = getGlobalMiddleware();
      expect(instance1).toBe(instance2);
    });

      instance1.registerSchema('globalUser', schema as unknown as never);

      const instance2 = getGlobalMiddleware();
      expect(instance2.getSchema('globalUser')).toBe(schema);
      expect(instance2.getSchemaCount()).toBe(1);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the global instance and create a new one on next call', (): void => {
      const beforeReset = getGlobalMiddleware();
      resetGlobalMiddleware();
      const afterReset = getGlobalMiddleware();

      expect(afterReset).not.toBe(beforeReset);
      expect(afterReset.getSchemaCount()).toBe(0);
    });
  });
});
