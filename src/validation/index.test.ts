import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const schemasPath = '../../src/validation/schemas.js' as const;
const validatorPath = '../../src/validation/validator.js' as const;
const middlewarePath = '../../src/validation/middleware.js' as const;
const indexPath = '../../src/validation/index.js' as const;

type ValidationLevelType = Record<string, string>;

interface SchemaBuilderInstance {
  build: (input?: unknown) => unknown;
}
type SchemaBuilderClass = new (cfg?: unknown) => SchemaBuilderInstance;

interface ValidatorInstance {
  validate: (data?: unknown) => unknown;
}
type ValidatorClass = new (opt?: unknown) => ValidatorInstance;

interface ValidationMiddlewareInstance {
  apply: (target?: unknown) => unknown;
}
type ValidationMiddlewareClass = new (id?: unknown) => ValidationMiddlewareInstance;

interface IndexExports {
  ValidationLevel: ValidationLevelType;
  SchemaBuilder: SchemaBuilderClass;
  Validator: ValidatorClass;
  validateData: (...args: unknown[]) => unknown;
  ValidationMiddleware: ValidationMiddlewareClass;
  getGlobalMiddleware: (...args: unknown[]) => unknown;
  resetGlobalMiddleware: (...args: unknown[]) => unknown;
}

interface SchemasExports {
  ValidationLevel: ValidationLevelType;
  SchemaBuilder: SchemaBuilderClass;
}

interface ValidatorExports {
  Validator: ValidatorClass;
  validateData: (...args: unknown[]) => unknown;
}

interface MiddlewareExports {
  ValidationMiddleware: ValidationMiddlewareClass;
  getGlobalMiddleware: (...args: unknown[]) => unknown;
  resetGlobalMiddleware: (...args: unknown[]) => unknown;
}

// Mock underlying modules that index.ts re-exports
vi.mock(schemasPath, (): Record<string, unknown> => {
  const ValidationLevel: ValidationLevelType = { LOW: 'LOW', HIGH: 'HIGH' };

  class SchemaBuilder implements SchemaBuilderInstance {
    private readonly cfg: unknown;
    public constructor(cfg?: unknown) {
      if (cfg === 'throw') {
        throw new Error('SchemaBuilder: invalid config');
      }
      this.cfg = cfg;
    }
    public build(input?: unknown): unknown {
      return { config: this.cfg, input };
    }
  }

  return {
    ValidationLevel,
    SchemaBuilder,
  };
});

vi.mock(validatorPath, (): Record<string, unknown> => {
  class Validator implements ValidatorInstance {
    private readonly opt: unknown;
    public constructor(opt?: unknown) {
      if (opt === 'throw') {
        throw new Error('Validator: invalid option');
      }
      this.opt = opt;
    }
    public validate(data?: unknown): unknown {
      return { data, option: this.opt };
    }
  }

  const validateData = vi.fn((...args: unknown[]): unknown => {
    return { calledWith: args };
  });

  return {
    Validator,
    validateData,
  };
});

vi.mock(middlewarePath, (): Record<string, unknown> => {
  class ValidationMiddleware implements ValidationMiddlewareInstance {
    private readonly id: unknown;
    public constructor(id?: unknown) {
      if (id === 'throw') {
        throw new Error('ValidationMiddleware: invalid id');
      }
      this.id = id;
    }
    public apply(target?: unknown): unknown {
      return { appliedTo: target, id: this.id };
    }
  }

  const getGlobalMiddleware = vi.fn((): unknown => ({ id: 'global-mw' }));
  const resetGlobalMiddleware = vi.fn((): void => {});

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

describe('validation index exports', () => {
  let indexModule: IndexExports;
  let schemasModule: SchemasExports;
  let validatorModule: ValidatorExports;
  let middlewareModule: MiddlewareExports;

  beforeEach(async (): Promise<void> => {
    vi.resetModules();
    schemasModule = (await import(schemasPath)) as unknown as SchemasExports;
    validatorModule = (await import(validatorPath)) as unknown as ValidatorExports;
    middlewareModule = (await import(middlewarePath)) as unknown as MiddlewareExports;
    indexModule = (await import(indexPath)) as unknown as IndexExports;
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('re-exports integrity', () => {
    test('should re-export ValidationLevel', (): void => {
      expect(indexModule.ValidationLevel).toBe(schemasModule.ValidationLevel);
      expect(indexModule.ValidationLevel).toEqual({ LOW: 'LOW', HIGH: 'HIGH' });
    });

    test('should re-export SchemaBuilder', (): void => {
      expect(indexModule.SchemaBuilder).toBe(schemasModule.SchemaBuilder);
    });

    test('should re-export Validator', (): void => {
      expect(indexModule.Validator).toBe(validatorModule.Validator);
    });

    test('should re-export validateData', (): void => {
      expect(indexModule.validateData).toBe(validatorModule.validateData);
    });

    test('should re-export ValidationMiddleware', (): void => {
      expect(indexModule.ValidationMiddleware).toBe(middlewareModule.ValidationMiddleware);
    });

    test('should re-export getGlobalMiddleware', (): void => {
      expect(indexModule.getGlobalMiddleware).toBe(middlewareModule.getGlobalMiddleware);
    });

    test('should re-export resetGlobalMiddleware', (): void => {
      expect(indexModule.resetGlobalMiddleware).toBe(middlewareModule.resetGlobalMiddleware);
    });
  });

  describe('validateData function', () => {
    test('should forward call and return value from underlying module', (): void => {
      const maybeMock = validatorModule.validateData as unknown;
      if (typeof maybeMock === 'function') {
        // Ensure no pre-set implementation is interfering
        (maybeMock as (...args: unknown[]) => unknown)('a', 1, true);
      }

      // Set a specific return for this call
      (validatorModule.validateData as unknown as { mockReturnValueOnce: (v: unknown) => unknown }).mockReturnValueOnce(
        { ok: true }
      );

      const result = indexModule.validateData('input', 42);
      expect(validatorModule.validateData).toHaveBeenCalledWith('input', 42);
      expect(result).toEqual({ ok: true });
    });

    test('should surface errors from underlying function', (): void => {
      (validatorModule.validateData as unknown as { mockImplementationOnce: (fn: (...args: unknown[]) => unknown) => unknown })
        .mockImplementationOnce((): unknown => {
          throw new Error('validateData failure');
        });

      expect(() => indexModule.validateData({ bad: true })).toThrow('validateData failure');
    });
  });

  describe('SchemaBuilder class', () => {
    test('should initialize and build schema', (): void => {
      const builder = new indexModule.SchemaBuilder({ strict: true });
      const result = builder.build({ fields: ['a'] });
      expect(result).toEqual({ config: { strict: true }, input: { fields: ['a'] } });
    });

    test('should throw on invalid config', (): void => {
      expect(() => new indexModule.SchemaBuilder('throw')).toThrow('SchemaBuilder: invalid config');
    });
  });

  describe('Validator class', () => {
    test('should initialize and validate data', (): void => {
      const validator = new indexModule.Validator({ level: 'HIGH' });
      const result = validator.validate({ foo: 'bar' });
      expect(result).toEqual({ data: { foo: 'bar' }, option: { level: 'HIGH' } });
    });

    test('should throw on invalid option', (): void => {
      expect(() => new indexModule.Validator('throw')).toThrow('Validator: invalid option');
    });
  });

  describe('ValidationMiddleware class', () => {
    test('should initialize and apply middleware', (): void => {
      const mw = new indexModule.ValidationMiddleware('mw-1');
      const result = mw.apply({ x: 1 });
      expect(result).toEqual({ appliedTo: { x: 1 }, id: 'mw-1' });
    });

    test('should throw on invalid id', (): void => {
      expect(() => new indexModule.ValidationMiddleware('throw')).toThrow('ValidationMiddleware: invalid id');
    });
  });

  describe('getGlobalMiddleware function', () => {
    test('should return global middleware', (): void => {
      (middlewareModule.getGlobalMiddleware as unknown as { mockReturnValueOnce: (v: unknown) => unknown }).mockReturnValueOnce(
        { id: 'custom-global' }
      );

      const mw = indexModule.getGlobalMiddleware();
      expect(middlewareModule.getGlobalMiddleware).toHaveBeenCalledTimes(1);
      expect(mw).toEqual({ id: 'custom-global' });
    });

    test('should propagate errors', (): void => {
      (middlewareModule.getGlobalMiddleware as unknown as { mockImplementationOnce: (fn: () => unknown) => unknown })
        .mockImplementationOnce((): unknown => {
          throw new Error('getGlobalMiddleware error');
        });

      expect(() => indexModule.getGlobalMiddleware()).toThrow('getGlobalMiddleware error');
    });
  });

  describe('resetGlobalMiddleware function', () => {
    test('should call underlying reset function', (): void => {
      indexModule.resetGlobalMiddleware();
      expect(middlewareModule.resetGlobalMiddleware).toHaveBeenCalledTimes(1);
    });

    test('should propagate errors', (): void => {
      (middlewareModule.resetGlobalMiddleware as unknown as { mockImplementationOnce: (fn: () => unknown) => unknown })
        .mockImplementationOnce((): unknown => {
          throw new Error('reset error');
        });

      expect(() => indexModule.resetGlobalMiddleware()).toThrow('reset error');
    });
  });
});
