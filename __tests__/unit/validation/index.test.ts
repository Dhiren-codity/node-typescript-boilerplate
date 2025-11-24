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
    test('should re-export ValidationLevel with expected values', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { ValidationLevel } = module as unknown as {
        ValidationLevel: { STRICT: string; LAX: string };
      };
      expect(ValidationLevel).toBeDefined();
      expect(ValidationLevel.STRICT).toBe('strict');
      expect(ValidationLevel.LAX).toBe('lax');
    });
  });

  describe('SchemaBuilder', () => {
    test('should re-export SchemaBuilder and instances can build a schema', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { SchemaBuilder } = module as unknown as {
        SchemaBuilder: new () => { build: () => Record<string, unknown> };
      };
      const builder = new SchemaBuilder();
      const built = builder.build();
      expect(built).toEqual({ built: true });
    });
  });

  describe('Validator and validateData', () => {
    test('should re-export validateData and return validation result for valid input', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { validateData } = module as unknown as {
        validateData: (input: unknown) => { valid: boolean; input: unknown };
      };
      const result = validateData({ a: 1 });
      expect(result).toEqual({ valid: true, input: { a: 1 } });
    });

    test('should re-export validateData and propagate errors from underlying implementation', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { validateData } = module as unknown as {
        validateData: (input: unknown) => unknown;
      };
      expect(() => validateData('__throw__')).toThrowError('validation failed');
    });

    test('should re-export Validator and instances can validate successfully', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { Validator } = module as unknown as {
        Validator: new (_schema?: unknown) => { validate: (val: unknown) => { valid: boolean; value: unknown } };
      };
      const instance = new Validator({});
      const result = instance.validate({ name: 'ok' });
      expect(result).toEqual({ valid: true, value: { name: 'ok' } });
    });

    test('should re-export Validator and propagate errors from instance method', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { Validator } = module as unknown as {
        Validator: new (_schema?: unknown) => { validate: (val: unknown) => unknown };
      };
      const instance = new Validator({});
      expect(() => instance.validate('__throw__')).toThrowError('validator error');
    });
  });

  describe('Middleware exports', () => {
    test('should re-export ValidationMiddleware and allow constructing with options', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const { ValidationMiddleware } = module as unknown as {
        ValidationMiddleware: new (_opts?: Record<string, unknown>) => { options: Record<string, unknown> };
      };
      const options = { level: 'strict', enabled: true };
      const mw = new ValidationMiddleware(options);
      expect(mw.options).toEqual(options);
    });

    test('should re-export getGlobalMiddleware and resetGlobalMiddleware and manage global state', async (): Promise<void> => {
      const module = await import('../../src/validation/index.ts');
      const {
        getGlobalMiddleware,
        resetGlobalMiddleware,
      } = module as unknown as {
        getGlobalMiddleware: () => unknown;
        resetGlobalMiddleware: () => void;
      };
      const initial = getGlobalMiddleware();
      expect(initial).toEqual({ id: 'global-mw' });

      resetGlobalMiddleware();
      const afterReset = getGlobalMiddleware();
      expect(afterReset).toBeUndefined();
    });
  });
});
