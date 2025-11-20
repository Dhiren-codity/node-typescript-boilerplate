import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from './index';

vi.mock('./schemas.js', () => {
  const ValidationLevel = { INFO: 'info', ERROR: 'error' } as const;

  class SchemaBuilder {
    public config: Record<string, unknown>;
    constructor(config: Record<string, unknown> = {}) {
      this.config = config;
    }
    build(): Record<string, unknown> {
      return this.config;
    }
  }

  return {
    ValidationLevel,
    SchemaBuilder,
  };
});

vi.mock('./validator.js', () => {
  class Validator {
    public options: Record<string, unknown>;
    constructor(options: Record<string, unknown> = {}) {
      this.options = options;
    }
    run(value: unknown): boolean {
      return value != null;
    }
  }

  const validateData = vi.fn((_data: unknown): boolean => true);

  return {
    Validator,
    validateData,
  };
});

vi.mock('./middleware.js', () => {
  type MiddlewareFn = (input: unknown) => boolean;

  const baseMiddleware: MiddlewareFn = vi.fn((_input: unknown) => true);
  let currentGlobal: MiddlewareFn = baseMiddleware;

  const ValidationMiddleware = baseMiddleware;
  const getGlobalMiddleware = vi.fn((): MiddlewareFn => currentGlobal);
  const resetGlobalMiddleware = vi.fn((): void => {
    currentGlobal = baseMiddleware;
  });

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

describe('validation/index barrel exports', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('schemas.js re-exports', () => {
    test('should re-export ValidationLevel object', (): void => {
      expect(ValidationLevel).toBeDefined();
      expect(ValidationLevel).toEqual({ INFO: 'info', ERROR: 'error' });
    });

    test('should re-export SchemaBuilder class and allow building schemas', (): void => {
      const inputConfig: Record<string, unknown> = { required: true, min: 1 };
      const builder = new SchemaBuilder(inputConfig);
      const result = builder.build();
      expect(result).toEqual(inputConfig);
    });

    test('SchemaBuilder with default constructor returns empty schema', (): void => {
      const builder = new SchemaBuilder();
      const result = builder.build();
      expect(result).toEqual({});
    });
  });

  describe('validator.js re-exports', () => {
    test('should re-export Validator class and run validation (happy path)', (): void => {
      const validator = new Validator({ strict: true });
      const isValid = validator.run('value');
      expect(isValid).toBe(true);
      expect(validator.options).toEqual({ strict: true });
    });

    test('Validator run returns false for nullish input (error path)', (): void => {
      const validator = new Validator();
      const isValidNull = validator.run(null);
      const isValidUndefined = validator.run(undefined);
      expect(isValidNull).toBe(false);
      expect(isValidUndefined).toBe(false);
    });

    test('should re-export validateData function and call underlying mock', (): void => {
      const data: Record<string, unknown> = { name: 'Alice' };
      const result = validateData(data);
      expect(result).toBe(true);
      const validateMock = validateData as unknown as ReturnType<typeof vi.fn>;
      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(validateMock).toHaveBeenCalledWith(data);
    });

    test('validateData propagates thrown errors from underlying mock', (): void => {
      const validateMock = validateData as unknown as ReturnType<typeof vi.fn>;
      validateMock.mockImplementationOnce((): boolean => {
        throw new Error('boom');
      });

      expect(() => validateData({})).toThrowError('boom');
    });
  });

  describe('middleware.js re-exports', () => {
    test('should re-export ValidationMiddleware and be callable (happy path)', (): void => {
      expect(typeof ValidationMiddleware).toBe('function');
      const result = ValidationMiddleware({ field: 'value' });
      expect(result).toBe(true);
      const mwMock = ValidationMiddleware as unknown as ReturnType<typeof vi.fn>;
      expect(mwMock).toHaveBeenCalledTimes(1);
      expect(mwMock).toHaveBeenCalledWith({ field: 'value' });
    });

    test('ValidationMiddleware propagates thrown errors (error path)', (): void => {
      const mwMock = ValidationMiddleware as unknown as ReturnType<typeof vi.fn>;
      mwMock.mockImplementationOnce((): boolean => {
        throw new Error('middleware failed');
      });

      expect(() => ValidationMiddleware('input')).toThrowError('middleware failed');
    });

    test('should re-export getGlobalMiddleware and return a function reference', (): void => {
      const mw = getGlobalMiddleware();
      expect(typeof mw).toBe('function');
      const expected = ValidationMiddleware;
      expect(mw).toBe(expected);
      const getMock = getGlobalMiddleware as unknown as ReturnType<typeof vi.fn>;
      expect(getMock).toHaveBeenCalledTimes(1);
    });

    test('should re-export resetGlobalMiddleware and be callable', (): void => {
      resetGlobalMiddleware();
      const resetMock = resetGlobalMiddleware as unknown as ReturnType<typeof vi.fn>;
      expect(resetMock).toHaveBeenCalledTimes(1);
      // After reset, getGlobalMiddleware should still return a function (default)
      const mw = getGlobalMiddleware();
      expect(typeof mw).toBe('function');
    });
  });
});
