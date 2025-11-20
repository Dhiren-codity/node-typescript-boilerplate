import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';

vi.mock('./validator.js', (): Record<string, unknown> => {
  class MockValidator {
    private schema: Record<string, unknown>;
    constructor(schema: Record<string, unknown>) {
      this.schema = schema;
    }
    validate(data: Record<string, unknown>): {
      valid: boolean;
      errors: { field: string; message: string }[];
      sanitized: Record<string, unknown>;
    } {
      const schemaAny = this.schema as Record<string, unknown>;
      const rulesRaw = schemaAny.rules as unknown;
      const rules = Array.isArray(rulesRaw)
        ? (rulesRaw as { field: string; required?: boolean }[])
        : [];
      const dataObj = data as Record<string, unknown>;
      const errors: { field: string; message: string }[] = [];
      for (const rule of rules) {
        const val = dataObj[rule.field];
        if (rule.required && (val === undefined || val === null)) {
          errors.push({ field: rule.field, message: 'Required' });
        }
      }
      return {
        valid: errors.length === 0,
        errors,
        sanitized: { ...dataObj },
      };
    }
  }
  return { Validator: MockValidator };
});

describe('ValidationMiddleware', (): void => {
  let middleware: ValidationMiddleware;

  beforeEach((): void => {
    middleware = new ValidationMiddleware();
  });

  afterEach((): void => {
    middleware.clearAll();
    resetGlobalMiddleware();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema registry', (): void => {
      expect(middleware).toBeDefined();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
      middleware.registerSchema('user', schema);
      expect(middleware.getSchema('user')).toBe(schema);
      expect(middleware.getSchemaCount()).toBe(1);

      const result = middleware.validateWithSchema('user', { name: 'Alice' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ name: 'Alice' });
    });

      const second = { rules: [{ field: 'two', required: true }] };
      middleware.registerSchema('dup', first);
      middleware.registerSchema('dup', second);

      const output = middleware.validateWithSchema(
        'dup',
        { one: 'ok', two: 'ok', extra: 1 },
        { stripUnknown: true },
      );
      expect(output.valid).toBe(true);
      expect(output.errors).toEqual([]);
      // Only 'two' should remain because the second schema overwrote the first
      expect(output.sanitized).toEqual({ two: 'ok' });
    });
  });

  describe('unregisterSchema', (): void => {
      middleware.registerSchema('user', schema);

      const removed = middleware.unregisterSchema('user');
      expect(removed).toBe(true);
      expect(middleware.getSchema('user')).toBeUndefined();
      expect(middleware.getSchemaCount()).toBe(0);

      expect(() => middleware.validateWithSchema('user', { name: 'A' })).toThrow(
        "Schema 'user' not found",
      );
    });

    test('should return false when schema does not exist', (): void => {
      const removed = middleware.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
      middleware.registerSchema('get', schema);
      expect(middleware.getSchema('get')).toBe(schema);
    });

    test('should return undefined for missing schema', (): void => {
      expect(middleware.getSchema('none')).toBeUndefined();
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => middleware.validateWithSchema('unknown', {})).toThrow(
        "Schema 'unknown' not found",
      );
    });

      middleware.registerSchema('user', schema);

      const result = middleware.validateWithSchema('user', {
        id: 1,
        name: 'Alice',
        age: 30,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ id: 1, name: 'Alice', age: 30 });
    });

      middleware.registerSchema('user', schema);

      const resultNoAbort = middleware.validateWithSchema('user', {});
      expect(resultNoAbort.valid).toBe(false);
      expect(resultNoAbort.errors.length).toBe(2);

      const resultAbort = middleware.validateWithSchema('user', {}, { abortEarly: true });
      expect(resultAbort.valid).toBe(false);
      expect(resultAbort.errors.length).toBe(1);
    });

      middleware.registerSchema('user', schema);

      const result = middleware.validateWithSchema(
        'user',
        { id: 1, name: 'Alice', extra: 'remove-me' },
        { stripUnknown: true },
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('createMiddleware', (): void => {
      middleware.registerSchema('pair', schema);

      const fn = middleware.createMiddleware('pair', { abortEarly: true });
      const result = fn({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });

    test('should throw when middleware is called with missing schema', (): void => {
      const fn = middleware.createMiddleware('missing');
      expect(() => fn({})).toThrow("Schema 'missing' not found");
    });
  });

  describe('batchValidate', (): void => {
      middleware.registerSchema('multi', schema);

      const results = middleware.batchValidate('multi', [{ name: 'A' }, { missing: true }]);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].errors.length).toBe(1);
    });

    test('should throw when schema not found', (): void => {
      expect(() => middleware.batchValidate('none', [{}])).toThrow("Schema 'none' not found");
    });
  });

  describe('batchValidationPassed', (): void => {
      middleware.registerSchema('b', schema);
      const results = middleware.batchValidate('b', [{ name: 'A' }, { name: 'B' }]);
      const passed = middleware.batchValidationPassed(results);
      expect(passed).toBe(true);
    });

      middleware.registerSchema('b2', schema);
      const results = middleware.batchValidate('b2', [{ name: 'A' }, {}]);
      const passed = middleware.batchValidationPassed(results);
      expect(passed).toBe(false);
    });
  });

  describe('getSchemaNames and getSchemaCount', (): void => {
      const s2 = { rules: [{ field: 'b' }] };
      middleware.registerSchema('s1', s1);
      middleware.registerSchema('s2', s2);

      const names = middleware.getSchemaNames();
      expect(names).toEqual(expect.arrayContaining(['s1', 's2']));
      expect(middleware.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
      middleware.registerSchema('two', { rules: [{ field: 'y' }] });
      expect(middleware.getSchemaCount()).toBe(2);

      middleware.clearAll();
      expect(middleware.getSchemaCount()).toBe(0);
      expect(middleware.getSchemaNames()).toEqual([]);

      expect(() => middleware.validateWithSchema('one', {})).toThrow("Schema 'one' not found");
      expect(() => middleware.validateWithSchema('two', {})).toThrow("Schema 'two' not found");
    });
  });
});

describe('Global middleware instance', (): void => {
  beforeEach((): void => {
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should return a singleton instance across calls', (): void => {
      const a = getGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).toBe(b);

      a.registerSchema('globalSchema', { rules: [{ field: 'name', required: true }] });
      expect(b.getSchemaCount()).toBe(1);
      expect(b.getSchema('globalSchema')).toBeDefined();
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset and create a new global instance', (): void => {
      const a = getGlobalMiddleware();
      resetGlobalMiddleware();
      const b = getGlobalMiddleware();
      expect(a).not.toBe(b);
      expect(b.getSchemaCount()).toBe(0);
    });
  });
});
