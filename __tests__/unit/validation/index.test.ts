import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./schemas.js', () => {
  const ValidationLevel = Object.freeze({ NONE: 0, WARN: 1, ERROR: 2 });
vi.mock('./validator.js', () => {
  let validatorThrow = false;
  const __setValidatorThrow = (v: boolean): void => {
    validatorThrow = v;
  };

  class Validator {
    validate(data: unknown): { success: boolean; value: unknown } {
      if (validatorThrow) {
        throw new Error('validation failed');
      }
      return { success: true, value: data };
    }
  }

  const validateData = vi.fn((data: unknown) => {
    if (validatorThrow) {
      throw new Error('validation failed');
    }
    return { success: true, value: data };
  });
vi.mock('./middleware.js', () => {
  const state = { count: 0, global: 'initial' };

  const ValidationMiddleware = vi.fn((_options?: Record<string, unknown>) => {
    return vi.fn((_req?: unknown, _res?: unknown, _next?: unknown) => {
      state.count += 1;
    });



  class SchemaBuilder {
    static shouldThrow = false;
    private schema: Record<string, unknown>;
    constructor() {
      this.schema = {};
    }
    addRule(name: string, value: unknown): this {
      this.schema[name] = value;
      return this;
    }
    build(): Record<string, unknown> {
      if ((SchemaBuilder as unknown as { shouldThrow: boolean }).shouldThrow) {
        throw new Error('build failed');
      }
      return { ...this.schema };
    }
  }

  return {
    ValidationLevel,
    SchemaBuilder,
  };
});


  return {
    Validator,
    validateData,
    __setValidatorThrow,
  };
});

  });

  const getGlobalMiddleware = vi.fn(() => state.global);
  const resetGlobalMiddleware = vi.fn(() => {
    state.global = 'reset';
    state.count = 0;
  });

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
    __state: state,
  };
});

describe('validation index (re-exports)', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  test('should re-export all runtime items from underlying modules', async (): Promise<void> => {
    const indexMod = await import('./index');
    const schemasMod = await import('./schemas.js');
    const validatorMod = await import('./validator.js');
    const middlewareMod = await import('./middleware.js');

    expect(indexMod.ValidationLevel).toBe(schemasMod.ValidationLevel);
    expect(indexMod.SchemaBuilder).toBe(schemasMod.SchemaBuilder);

    expect(indexMod.Validator).toBe(validatorMod.Validator);
    expect(indexMod.validateData).toBe(validatorMod.validateData);

    expect(indexMod.ValidationMiddleware).toBe(middlewareMod.ValidationMiddleware);
    expect(indexMod.getGlobalMiddleware).toBe(middlewareMod.getGlobalMiddleware);
    expect(indexMod.resetGlobalMiddleware).toBe(middlewareMod.resetGlobalMiddleware);
  });

  describe('SchemaBuilder', () => {
    test('should build schema with added rules (happy path)', async (): Promise<void> => {
      const indexMod = await import('./index');
      const builder = new indexMod.SchemaBuilder();
      builder.addRule('min', 1).addRule('max', 10);
      const schema = builder.build();
      expect(schema).toEqual({ min: 1, max: 10 });
    });


      const indexMod = await import('./index');
      const builder = new indexMod.SchemaBuilder();

      expect(() => builder.build()).toThrow('build failed');

      // Reset flag for subsequent tests
      (schemasMod.SchemaBuilder as unknown as { shouldThrow: boolean }).shouldThrow = false;
    });
  });

  describe('Validator and validateData', () => {

      const resultInstance = instance.validate(input);
      expect(resultInstance).toEqual({ success: true, value: input });

      const resultFunc = indexMod.validateData(input);
      expect(resultFunc).toEqual({ success: true, value: input });
      expect(validatorMod.validateData).toHaveBeenCalledTimes(1);
      expect(validatorMod.validateData).toHaveBeenCalledWith(input);
    });


      expect(() => indexMod.validateData({})).toThrow('validateData boom');
    });

    test('Validator.validate should throw when underlying logic fails (error path)', async (): Promise<void> => {
      const validatorMod = await import('./validator.js');
      validatorMod.__setValidatorThrow(true);

      const indexMod = await import('./index');
      const instance = new indexMod.Validator();

      expect(() => instance.validate('x')).toThrow('validation failed');

      // Cleanup flag
      validatorMod.__setValidatorThrow(false);
    });
  });

  describe('Middleware exports', () => {
      expect(typeof mw).toBe('function');

      // Call the returned middleware function
      mw();

      expect(middlewareMod.__state.count).toBe(1);
      expect(indexMod.getGlobalMiddleware()).toBe('initial');

      indexMod.resetGlobalMiddleware();
      expect(indexMod.getGlobalMiddleware()).toBe('reset');
      expect(middlewareMod.__state.count).toBe(0);
    });


      expect(() => indexMod.ValidationMiddleware({})).toThrow('factory error');
    });

      expect(() => indexMod.getGlobalMiddleware()).toThrow('getGlobalMiddleware error');

      vi.mocked(middlewareMod.resetGlobalMiddleware).mockImplementationOnce(() => {
        throw new Error('resetGlobalMiddleware error');
      });
      expect(() => indexMod.resetGlobalMiddleware()).toThrow('resetGlobalMiddleware error');
    });
  });

  describe('ValidationLevel', () => {
    test('should be an object with expected keys', async (): Promise<void> => {
      const indexMod = await import('./index');
      const level = indexMod.ValidationLevel as Record<string, unknown>;
      expect(Object.keys(level)).toEqual(['NONE', 'WARN', 'ERROR']);
    });
  });
});
