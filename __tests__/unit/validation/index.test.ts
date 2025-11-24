import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/validation/schemas.js', () => {
  const SchemaBuilder = vi.fn(() => {
    return {
      build: vi.fn(() => ({ built: true })),
    };
  });
vi.mock('../../src/validation/validator.js', () => {
  const validateData = vi.fn((input: unknown) => {
    if (input === '__throw__') {
      throw new Error('validation failed');
    }
    return { valid: true, input };
  });
vi.mock('../../src/validation/middleware.js', () => {
  let globalMw: unknown = { id: 'global-mw' };

  const ValidationMiddleware = vi.fn(function (_options?: Record<string, unknown>) {
    return {
      options: _options ?? {},
      run: vi.fn((payload: unknown) => payload),
    };
  });



  const ValidationLevel = {
    STRICT: 'strict',
    LAX: 'lax',
  };

  return {
    ValidationLevel,
    SchemaBuilder,
  };
});


  const Validator = vi.fn(() => {
    return {
      validate: vi.fn((val: unknown) => {
        if (val === '__throw__') {
          throw new Error('validator error');
        }
        return { valid: true, value: val };
      }),
    };
  });

  return {
    Validator,
    validateData,
  };
});


  const getGlobalMiddleware = vi.fn(() => globalMw);

  const resetGlobalMiddleware = vi.fn((): void => {
    globalMw = undefined;
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
    vi.resetModules();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('ValidationLevel', () => {
      expect(ValidationLevel).toBeDefined();
      expect(ValidationLevel.STRICT).toBe('strict');
      expect(ValidationLevel.LAX).toBe('lax');
    });
  });

  describe('SchemaBuilder', () => {
      const builder = new SchemaBuilder();
      const built = builder.build();
      expect(built).toEqual({ built: true });
    });
  });

  describe('Validator and validateData', () => {
      const result = validateData({ a: 1 });
      expect(result).toEqual({ valid: true, input: { a: 1 } });
    });

      expect(() => validateData('__throw__')).toThrowError('validation failed');
    });

      const instance = new Validator({});
      const result = instance.validate({ name: 'ok' });
      expect(result).toEqual({ valid: true, value: { name: 'ok' } });
    });

      const instance = new Validator({});
      expect(() => instance.validate('__throw__')).toThrowError('validator error');
    });
  });

  describe('Middleware exports', () => {
      const options = { level: 'strict', enabled: true };
      const mw = new ValidationMiddleware(options);
      expect(mw.options).toEqual(options);
    });

      const initial = getGlobalMiddleware();
      expect(initial).toEqual({ id: 'global-mw' });

      resetGlobalMiddleware();
      const afterReset = getGlobalMiddleware();
      expect(afterReset).toBeUndefined();
    });
  });
});
