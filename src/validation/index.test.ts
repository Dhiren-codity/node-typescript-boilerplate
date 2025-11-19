import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./schemas.js', () => {
  class MockSchemaBuilder {
    public arg: unknown;
    constructor(arg: unknown) {
      this.arg = arg;
    }
    public build(): Record<string, unknown> {
      return { built: true, arg: this.arg };
    }
  }

  const ValidationLevel = { LOW: 'low', HIGH: 'high' } as const;

  return {
    ValidationLevel,
    SchemaBuilder: MockSchemaBuilder,
  };
});

vi.mock('./validator.js', () => {
  class MockValidator {
    public validate = vi.fn((input: unknown): Record<string, unknown> => {
      return { ok: true, input };
    });
  }

  const validateData = vi.fn(
    (data: unknown, schema: unknown): Record<string, unknown> => {
      return { valid: true, data, schema };
    }
  );

  return {
    Validator: MockValidator,
    validateData,
  };
});

vi.mock('./middleware.js', () => {
  const ValidationMiddleware = vi.fn((_opts?: unknown): Record<string, unknown> => {
    return { id: 'mw', opts: _opts as unknown };
  });

  const getGlobalMiddleware = vi.fn((): Record<string, unknown> => {
    return { id: 'global-mw' };
  });

  const resetGlobalMiddleware = vi.fn((): void => {
    // no-op
  });

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

describe('validation index exports', () => {
  beforeEach((): void => {
    vi.resetModules();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('schemas re-exports', () => {
    test('should re-export ValidationLevel and SchemaBuilder', async (): Promise<void> => {
      const index = await import('./index.ts');
      const schemas = await import('./schemas.js');

      expect(index.ValidationLevel).toBe(schemas.ValidationLevel);
      expect(index.ValidationLevel.LOW).toBe('low');
      expect(index.ValidationLevel.HIGH).toBe('high');

      expect(index.SchemaBuilder).toBe(schemas.SchemaBuilder);
      const builderInstance = new index.SchemaBuilder('value');
      expect(builderInstance).toBeInstanceOf(schemas.SchemaBuilder as unknown as new (..._args: unknown[]) => unknown);

      const built = (builderInstance as unknown as { build: () => Record<string, unknown> }).build();
      expect(built).toEqual({ built: true, arg: 'value' });
    });
  });

  describe('validator re-exports', () => {
    test('should re-export Validator class and support validate method', async (): Promise<void> => {
      const index = await import('./index.ts');
      const validatorMod = await import('./validator.js');

      expect(index.Validator).toBe(validatorMod.Validator);

      const instance: unknown = new index.Validator();
      const result = (instance as { validate: (_: unknown) => Record<string, unknown> }).validate({ foo: 'bar' });
      expect(result).toEqual({ ok: true, input: { foo: 'bar' } });
    });

    test('should re-export validateData and forward calls', async (): Promise<void> => {
      const index = await import('./index.ts');
      const validatorMod = await import('./validator.js');

      const data: Record<string, unknown> = { a: 1 };
      const schema: Record<string, unknown> = { type: 'object' };

      const res = index.validateData(data, schema) as unknown as Record<string, unknown>;
      const mockedFn = validatorMod.validateData as unknown as ReturnType<typeof vi.fn>;

      expect(mockedFn).toHaveBeenCalledTimes(1);
      expect(mockedFn).toHaveBeenCalledWith(data, schema);
      expect(res).toEqual({ valid: true, data, schema });
    });

    test('should propagate errors from validateData', async (): Promise<void> => {
      const index = await import('./index.ts');
      const validatorMod = await import('./validator.js');

      const mockedFn = validatorMod.validateData as unknown as ReturnType<typeof vi.fn>;
      mockedFn.mockImplementationOnce((): never => {
        throw new Error('boom');
      });

      expect(() => index.validateData({}, {})).toThrow('boom');
    });
  });

  describe('middleware re-exports', () => {
    test('should re-export ValidationMiddleware function', async (): Promise<void> => {
      const index = await import('./index.ts');
      const middlewareMod = await import('./middleware.js');

      expect(index.ValidationMiddleware).toBe(middlewareMod.ValidationMiddleware);

      const result = index.ValidationMiddleware({ level: 'high' });
      const mockedFn = middlewareMod.ValidationMiddleware as unknown as ReturnType<typeof vi.fn>;

      expect(mockedFn).toHaveBeenCalledTimes(1);
      expect(mockedFn).toHaveBeenCalledWith({ level: 'high' });
      expect(result).toEqual({ id: 'mw', opts: { level: 'high' } });
    });

    test('should re-export getGlobalMiddleware and resetGlobalMiddleware', async (): Promise<void> => {
      const index = await import('./index.ts');
      const middlewareMod = await import('./middleware.js');

      expect(index.getGlobalMiddleware).toBe(middlewareMod.getGlobalMiddleware);
      expect(index.resetGlobalMiddleware).toBe(middlewareMod.resetGlobalMiddleware);

      const globalMw = index.getGlobalMiddleware() as unknown as Record<string, unknown>;
      expect(globalMw).toEqual({ id: 'global-mw' });

      index.resetGlobalMiddleware();
      const mockedReset = middlewareMod.resetGlobalMiddleware as unknown as ReturnType<typeof vi.fn>;
      expect(mockedReset).toHaveBeenCalledTimes(1);
    });

    test('should propagate errors from getGlobalMiddleware and resetGlobalMiddleware', async (): Promise<void> => {
      const index = await import('./index.ts');
      const middlewareMod = await import('./middleware.js');

      const mockedGet = middlewareMod.getGlobalMiddleware as unknown as ReturnType<typeof vi.fn>;
      mockedGet.mockImplementationOnce((): never => {
        throw new Error('nope');
      });

      expect(() => index.getGlobalMiddleware()).toThrow('nope');

      const mockedReset = middlewareMod.resetGlobalMiddleware as unknown as ReturnType<typeof vi.fn>;
      mockedReset.mockImplementationOnce((): never => {
        throw new Error('reset-fail');
      });

      expect(() => index.resetGlobalMiddleware()).toThrow('reset-fail');
    });
  });
});
