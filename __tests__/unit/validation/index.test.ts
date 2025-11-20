import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from './src/validation/index.ts';

vi.mock('./src/validation/schemas.js', () => {
  class MockSchemaBuilder {
    private schema: Record<string, unknown>;
    constructor(schema: Record<string, unknown> = {}) {
      if ((schema as { invalid?: unknown }).invalid === true) {
        throw new Error('invalid schema');
      }
      this.schema = schema;
    }
    build(): Record<string, unknown> {
      return this.schema;
    }
  }
  const ValidationLevelMock = Object.freeze({ LOW: 'low', HIGH: 'high' });

  return {
    ValidationLevel: ValidationLevelMock,
    SchemaBuilder: MockSchemaBuilder,
  };
});

vi.mock('./src/validation/validator.js', () => {
  class MockValidator {
    public validated: unknown[] = [];
    validate(input: unknown): { ok: boolean; input: unknown } {
      if (input === 'bad-validate') {
        throw new Error('validate error');
      }
      this.validated.push(input);
      return { ok: true, input };
    }
  }

  const validateDataMock = vi.fn((data: unknown) => {
    if (data === 'throw') {
      throw new Error('validation failed');
    }
    return { success: true, value: data };
  });

  return {
    Validator: MockValidator,
    validateData: validateDataMock,
  };
});

vi.mock('./src/validation/middleware.js', () => {
  class MockValidationMiddleware {
    public options: Record<string, unknown>;
    constructor(options?: Record<string, unknown>) {
      if (options && (options as { throw?: unknown }).throw === true) {
        throw new Error('middleware options invalid');
      }
      this.options = options ?? {};
    }
    handle(_input: unknown): string {
      return 'handled';
    }
  }

  let globalInstance: MockValidationMiddleware | null = null;

  const getGlobalMiddlewareMock = vi.fn(() => {
    if (!globalInstance) {
      globalInstance = new MockValidationMiddleware({ global: true });
    }
    return globalInstance;
  });

  const resetGlobalMiddlewareMock = vi.fn(() => {
    globalInstance = null;
  });

  return {
    ValidationMiddleware: MockValidationMiddleware,
    getGlobalMiddleware: getGlobalMiddlewareMock,
    resetGlobalMiddleware: resetGlobalMiddlewareMock,
  };
});

describe('validation/index re-exports', () => {
  beforeEach((): void => {
    // No-op setup; ensure clean calls per test
  });

  afterEach((): void => {
    vi.clearAllMocks();
    // Ensure global middleware state is cleaned up after each test
    resetGlobalMiddleware();
  });

  describe('ValidationLevel', () => {
    test('should be defined and match mocked object', (): void => {
      expect(ValidationLevel).toBeDefined();
      expect(typeof ValidationLevel).toBe('object');
      expect(ValidationLevel).toHaveProperty('LOW', 'low');
      expect(ValidationLevel).toHaveProperty('HIGH', 'high');
    });
  });

  describe('SchemaBuilder', () => {
    test('should initialize and build schema (happy path)', (): void => {
      const schemaInput: Record<string, unknown> = { field: 'value' };
      const builder = new SchemaBuilder(schemaInput);
      const built = builder.build();
      expect(built).toEqual(schemaInput);
    });

    test('should throw on invalid schema (error case)', (): void => {
      const badSchema: Record<string, unknown> = { invalid: true };
      expect(() => new SchemaBuilder(badSchema)).toThrowError('invalid schema');
    });
  });

  describe('Validator class', () => {
    test('should initialize and validate data (happy path)', (): void => {
      const validator = new Validator();
      const result = validator.validate({ a: 1 });
      expect(result).toEqual({ ok: true, input: { a: 1 } });
    });

    test('should throw when validate encounters bad input (error case)', (): void => {
      const validator = new Validator();
      expect(() => validator.validate('bad-validate')).toThrowError('validate error');
    });
  });

  describe('validateData function', () => {
    test('should call underlying function and return result (happy path)', (): void => {
      const input = { id: 123 };
      const result = validateData(input);
      expect(result).toEqual({ success: true, value: input });
      expect(validateData).toHaveBeenCalledTimes(1);
      expect(validateData).toHaveBeenCalledWith(input);
    });

    test('should throw error for invalid input (error case)', (): void => {
      expect(() => validateData('throw')).toThrowError('validation failed');
    });
  });

  describe('ValidationMiddleware class', () => {
    test('should initialize and handle data (happy path)', (): void => {
      const mw = new ValidationMiddleware({ mode: 'strict' });
      const handled = mw.handle({ payload: true });
      expect(handled).toBe('handled');
      expect(mw.options).toEqual({ mode: 'strict' });
    });

    test('should throw for invalid options (error case)', (): void => {
      expect(() => new ValidationMiddleware({ throw: true })).toThrowError(
        'middleware options invalid'
      );
    });
  });

  describe('Global middleware functions', () => {
    test('should get a singleton global middleware (happy path)', (): void => {
      resetGlobalMiddleware();
      const first = getGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(second).toBe(first);
      expect(getGlobalMiddleware).toHaveBeenCalledTimes(2);
    });

    test('should reset global middleware and create a new instance afterwards', (): void => {
      resetGlobalMiddleware();
      const beforeReset = getGlobalMiddleware();
      expect(beforeReset).toBeDefined();

      resetGlobalMiddleware();
      expect(resetGlobalMiddleware).toHaveBeenCalledTimes(2); // once from afterEach previous test, once here

      const afterReset = getGlobalMiddleware();
      expect(afterReset).toBeDefined();
      expect(afterReset).not.toBe(beforeReset);
      expect(getGlobalMiddleware).toHaveBeenCalledTimes(2);
    });
  });
});
