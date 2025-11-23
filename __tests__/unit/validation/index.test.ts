import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/validation/schemas.js', () => {
  const ValidationLevel = { LOW: 'LOW', HIGH: 'HIGH' } as const;

  class SchemaBuilder {
    private readonly label: string;
    constructor(label: string) {
      this.label = label;
    }
    build(): { name: string } {
      return { name: this.label };
    }

  return {
    ValidationLevel,
    SchemaBuilder,
  };
vi.mock('../src/validation/validator.js', () => {
  class Validator {
    private readonly schema: unknown;
    public readonly validate: (data: unknown) => { valid: boolean; schema: unknown; data: unknown };
    constructor(schema?: unknown) {
      this.schema = schema;
      this.validate = vi.fn((data: unknown) => {
        if (data === 'throw') {
          throw new Error('Validator validate error');
        }
        return { valid: true, schema: this.schema, data };
      });
vi.mock('../src/validation/middleware.js', () => {
  let throwFlag = false;

  class ValidationMiddleware {
    private readonly options?: Record<string, unknown>;
    public readonly handle: (req: unknown, _res: unknown, next: unknown) => unknown;
    constructor(options?: Record<string, unknown>) {
      this.options = options;
      this.handle = vi.fn((req: unknown, _res: unknown, next: unknown) => {
        const maybeReq = req as Record<string, unknown>;
        if (maybeReq && maybeReq.shouldThrow === true) {
          throw new Error('Middleware error');
        }
        return next;
      });





// Mocks for the underlying modules that index.ts re-exports


  const validateData = vi.fn((data: unknown) => {
    if (data === 'throw') {
      throw new Error('validateData error');
    }
    return { ok: true, data };
  });

  return {
    Validator,
    validateData,
  };


  const globalMiddleware = { name: 'global-mw' };

  const getGlobalMiddleware = vi.fn(() => {
    if (throwFlag) {
      throw new Error('getGlobalMiddleware error');
    }
    return globalMiddleware;
  });

  const resetGlobalMiddleware = vi.fn((): void => {
    throwFlag = false;
  });

  const __setThrowFlag = (value: boolean): void => {
    throwFlag = value;
  };

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
    __setThrowFlag,
  };


  afterEach((): void => {
    vi.clearAllMocks();
  });

  test('should export expected named members', async (): Promise<void> => {
    const api = await import('../src/validation/index.ts');
    const exportedKeys = Object.keys(api).sort();

    expect(exportedKeys).toEqual(
      [
        'SchemaBuilder',
        'ValidationLevel',
        'ValidationMiddleware',
        'Validator',
        'getGlobalMiddleware',
        'resetGlobalMiddleware',
        'validateData',
      ].sort(),
    );
  });

  test('re-exports should be the same references as underlying modules', async (): Promise<void> => {
    const api = await import('../src/validation/index.ts');
    const schemas = await import('../src/validation/schemas.js');
    const validator = await import('../src/validation/validator.js');
    const middleware = await import('../src/validation/middleware.js');

    expect(api.ValidationLevel).toBe(schemas.ValidationLevel);
    expect(api.SchemaBuilder).toBe(schemas.SchemaBuilder);
    expect(api.Validator).toBe(validator.Validator);
    expect(api.validateData).toBe(validator.validateData);
    expect(api.ValidationMiddleware).toBe(middleware.ValidationMiddleware);
    expect(api.getGlobalMiddleware).toBe(middleware.getGlobalMiddleware);
    expect(api.resetGlobalMiddleware).toBe(middleware.resetGlobalMiddleware);
  });

  describe('ValidationLevel', () => {
    test('should expose correct keys', async (): Promise<void> => {
      const api = await import('../src/validation/index.ts');
      const levels = api.ValidationLevel as Record<string, string>;
      expect(levels.LOW).toBe('LOW');
      expect(levels.HIGH).toBe('HIGH');
      expect(Object.keys(levels).sort()).toEqual(['HIGH', 'LOW']);
    });


      const result = instance.validate({ foo: 'bar' });
      const validateSpy = instance.validate as unknown as MockedFn;

      expect(result.valid).toBe(true);
      expect(result.schema).toEqual({ type: 'object' });
      expect(result.data).toEqual({ foo: 'bar' });
      expect(vi.isMockFunction(validateSpy)).toBe(true);
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith({ foo: 'bar' });
    });


      const instance = new ValidatorCtor();
      expect(() => instance.validate('throw')).toThrow('Validator validate error');
    });
  });


      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ a: 1 });
    });

    test('should propagate errors from underlying function', async (): Promise<void> => {
      const api = await import('../src/validation/index.ts');
      const validateData = api.validateData as (data: unknown) => unknown;

      expect(() => validateData('throw')).toThrow('validateData error');
    });
  });

      const nextValue = { next: true };
      const returned = instance.handle({ shouldThrow: false }, {}, nextValue);
      const handleSpy = instance.handle as unknown as MockedFn;

      expect(returned).toBe(nextValue);
      expect(vi.isMockFunction(handleSpy)).toBe(true);
      expect(handleSpy).toHaveBeenCalledTimes(1);
    });


      const instance = new MiddlewareCtor();
      expect(() => instance.handle({ shouldThrow: true }, {}, {})).toThrow('Middleware error');
    });
  });

  describe('getGlobalMiddleware and resetGlobalMiddleware', () => {
    test('getGlobalMiddleware should return global instance and be callable', async (): Promise<void> => {
      const api = await import('../src/validation/index.ts');
      const middlewareMock = await import('../src/validation/middleware.js');
      const setThrowFlag = middlewareMock.__setThrowFlag as (value: boolean) => void;
      type MockedFn = ReturnType<typeof vi.fn>;

      // Ensure no error
      setThrowFlag(false);
      const mw = api.getGlobalMiddleware();
      const getSpy = api.getGlobalMiddleware as unknown as MockedFn;

      expect(mw).toEqual({ name: 'global-mw' });
      expect(vi.isMockFunction(getSpy)).toBe(true);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    test('getGlobalMiddleware should propagate errors when internal state set to throw', async (): Promise<void> => {
      const api = await import('../src/validation/index.ts');
      const middlewareMock = await import('../src/validation/middleware.js');
      const setThrowFlag = middlewareMock.__setThrowFlag as (value: boolean) => void;

      setThrowFlag(true);
      expect(() => api.getGlobalMiddleware()).toThrow('getGlobalMiddleware error');
    });

    test('resetGlobalMiddleware should reset throwing state', async (): Promise<void> => {
      const api = await import('../src/validation/index.ts');
      const middlewareMock = await import('../src/validation/middleware.js');
      const setThrowFlag = middlewareMock.__setThrowFlag as (value: boolean) => void;

      setThrowFlag(true);
      api.resetGlobalMiddleware();
      expect(() => api.getGlobalMiddleware()).not.toThrow();
      const mw = api.getGlobalMiddleware();
      expect(mw).toEqual({ name: 'global-mw' });
    });
  });
});
