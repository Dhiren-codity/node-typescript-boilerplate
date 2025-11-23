import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationLevel, SchemaBuilder, Validator, validateData, ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware, } from '../../src/validation/index.ts';

vi.mock('../../src/validation/schemas.js', () => {
  class MockSchemaBuilder {
    public name: string;
    public built: boolean;
    public constructor(name: string) {
      this.name = name;
      this.built = false;
    }
    public build(): Record<string, unknown> {
      if (this.name === 'bad') {
        throw new Error('invalid schema');
      }
      this.built = true;
      return { name: this.name, level: 'low' };
    }
  }

  const ValidationLevel = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  });
vi.mock('../../src/validation/validator.js', () => {
  class MockValidator {
    public lastValidated: unknown | undefined;
    public constructor(_schema?: unknown) {
      this.lastValidated = undefined;
    }
    public validate(data: unknown): { valid: boolean; errors: string[] } {
      this.lastValidated = data;
      if (
        typeof data === 'object' &&
        data !== null &&
        (data as Record<string, unknown>).invalid === true
      ) {
        return { valid: false, errors: ['invalid'] };
      }
      return { valid: true, errors: [] };
    }
  }

  const validateData = vi.fn((data: unknown): boolean => {
    if (data === 'throw') {
      throw new Error('validation failed');
    }
    return data !== null && data !== undefined;
  });
vi.mock('../../src/validation/middleware.js', () => {
  type Options = { strict?: boolean };
  let globalMiddleware: Array<(input: unknown) => unknown> = [];

  const ValidationMiddleware = vi.fn((options?: Options) => {
    const fn = (input: unknown): unknown => {
      if (options?.strict && input === null) {
        throw new Error('strict mode');
      }
      return input;
    };
    globalMiddleware.push(fn);
    return fn;
  });



  return {
    SchemaBuilder: MockSchemaBuilder,
    ValidationLevel,
  };
});


  return {
    Validator: MockValidator,
    validateData,
  };
});


  const getGlobalMiddleware = vi.fn(() => {
    return [...globalMiddleware];
  });

  const resetGlobalMiddleware = vi.fn(() => {
    globalMiddleware = [];
  });

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,

describe('validation/index re-exports', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    // Ensure middleware state is clean before each test
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  test('should export expected API symbols', (): void => {
    expect(ValidationLevel).toBeDefined();
    expect(SchemaBuilder).toBeDefined();
    expect(Validator).toBeDefined();
    expect(validateData).toBeDefined();
    expect(ValidationMiddleware).toBeDefined();
    expect(getGlobalMiddleware).toBeDefined();
    expect(resetGlobalMiddleware).toBeDefined();
  });

  describe('ValidationLevel', () => {
    test('should expose level constants', (): void => {
      expect(ValidationLevel).toHaveProperty('LOW', 'low');
      expect(ValidationLevel).toHaveProperty('MEDIUM', 'medium');
      expect(ValidationLevel).toHaveProperty('HIGH', 'high');
    });
  });

  describe('SchemaBuilder', () => {
    test('should build schema for valid name', (): void => {
      const builder = new SchemaBuilder('user');
      const schema = builder.build();
      expect(schema).toEqual({ name: 'user', level: 'low' });
    });

    test('should throw error when building invalid schema', (): void => {
      const builder = new SchemaBuilder('bad');
      expect(() => builder.build()).toThrowError('invalid schema');
    });
  });

  describe('Validator', () => {
    test('should validate valid data', (): void => {
      const validator = new Validator({} as unknown);
      const result = validator.validate({ ok: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return invalid for data with invalid flag', (): void => {
      const validator = new Validator({} as unknown);
      const result = validator.validate({ invalid: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['invalid']);
    });

    test('should track last validated value', (): void => {
      const validator = new Validator({} as unknown);
      const data: Record<string, unknown> = { value: 123 };
      validator.validate(data);
      expect(validator.lastValidated).toBe(data);
    });
  });

  describe('validateData', () => {
    test('should return true for non-nullish input', (): void => {
      expect(validateData(0)).toBe(true);
      expect(validateData(false)).toBe(true);
      expect(validateData('value')).toBe(true);
      expect(validateData({})).toBe(true);
    });

    test('should return false for nullish input', (): void => {
      expect(validateData(null)).toBe(false);
      expect(validateData(undefined)).toBe(false);
    });

    test('should throw error for specific "throw" input', (): void => {
      expect(() => validateData('throw')).toThrowError('validation failed');
    });
  });

  describe('Middleware exports', () => {
    test('ValidationMiddleware should register and return a middleware function', (): void => {
      resetGlobalMiddleware();
      const mw = ValidationMiddleware();
      expect(typeof mw).toBe('function');

      const middlewareListBefore = getGlobalMiddleware();
      expect(middlewareListBefore.length).toBe(1);
      expect(middlewareListBefore[0]).toBe(mw);

      const input: Record<string, unknown> = { a: 1 };
      const output = mw(input);
      expect(output).toBe(input);
    });

    test('ValidationMiddleware strict mode should throw on null', (): void => {
      resetGlobalMiddleware();
      const strictMw = ValidationMiddleware({ strict: true });
      expect(() => strictMw(null)).toThrowError('strict mode');
    });

    test('getGlobalMiddleware should reflect registered functions', (): void => {
      resetGlobalMiddleware();
      const mw1 = ValidationMiddleware();
      const mw2 = ValidationMiddleware();
      const list = getGlobalMiddleware();
      expect(list.length).toBe(2);
      expect(list[0]).toBe(mw1);
      expect(list[1]).toBe(mw2);
    });

    test('resetGlobalMiddleware should clear registered functions', (): void => {
      ValidationMiddleware();
      ValidationMiddleware();
      expect(getGlobalMiddleware().length).toBe(2);
      resetGlobalMiddleware();
      expect(getGlobalMiddleware().length).toBe(0);
    });
  });
});
