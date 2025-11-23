import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ValidationLevel, SchemaBuilder, Validator, validateData, ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware, } from '../../src/validation/index';

vi.mock('../../src/validation/schemas.js', () => {
  const ValidationLevel = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  } as const;

  class SchemaBuilder {
    private rules: unknown[];

    constructor() {
      this.rules = [];
    }

    public addRule(rule: unknown): this {
      this.rules.push(rule);
      return this;
    }

    public build(): Record<string, unknown> {
      return { rules: [...this.rules] };
    }
  }

  return {
    ValidationLevel,
    SchemaBuilder,
  };
});
vi.mock('../../src/validation/validator.js', () => {
  class Validator {
    private options: unknown;

    public validate: (data: unknown) => Promise<boolean>;

    constructor(options?: unknown) {
      this.options = options;
      this.validate = vi.fn(async (_data: unknown): Promise<boolean> => true);
    }

    public getOptions(): unknown {
      return this.options;
    }
  }

  const validateData = vi.fn(async (_data: unknown): Promise<{ valid: boolean }> => {
    return { valid: true };
  });
vi.mock('../../src/validation/middleware.js', () => {
  class ValidationMiddleware {
    private options: unknown;

    public execute: (data: unknown) => Promise<boolean>;

    constructor(options?: unknown) {
      this.options = options;
      this.execute = vi.fn(async (_data: unknown): Promise<boolean> => true);
    }

    public getOptions(): unknown {
      return this.options;
    }
  }

  let globalInstance: ValidationMiddleware | null = null;

  const getGlobalMiddleware = (): ValidationMiddleware => {
    if (!globalInstance) {
      globalInstance = new ValidationMiddleware({ global: true });




  return {
    Validator,
    validateData,
  };
});

    }
    return globalInstance;
  };

  const resetGlobalMiddleware = (): void => {
    globalInstance = null;
  };

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
    // No setup required beyond mocks; ensure clean state where needed
  });

  afterEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('ValidationLevel', () => {
    test('should expose known levels', (): void => {
      expect(ValidationLevel).toBeDefined();
      expect(ValidationLevel.LOW).toBe('low');
      expect(ValidationLevel.MEDIUM).toBe('medium');
      expect(ValidationLevel.HIGH).toBe('high');
    });
  });

  describe('SchemaBuilder', () => {

      expect(result).toBeDefined();
      expect(result).toHaveProperty('rules');
      const rules = (result as Record<string, unknown>).rules as unknown[];
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(2);
      expect(rules[0]).toEqual({ field: 'x', required: true });
      expect(rules[1]).toEqual({ field: 'y', type: 'number' });
    });

    test('should support empty schema', (): void => {
      const builder = new SchemaBuilder();
      const result = builder.build();
      expect(result).toEqual({ rules: [] });
    });
  });

  describe('Validator', () => {
      const instance = new Validator(options);

      const opt = (instance as unknown as { getOptions: () => unknown }).getOptions();
      expect(opt).toEqual(options);

      const isValid = await instance.validate({ name: 'alice' });
      expect(isValid).toBe(true);
      expect((instance.validate as unknown as Mock<[unknown], Promise<boolean>>).mock.calls.length).toBe(1);
    });

    test('should surface validation error from validate method', async (): Promise<void> => {
      const instance = new Validator();
      (instance.validate as unknown as Mock<[unknown], Promise<boolean>>).mockRejectedValueOnce(new Error('Invalid data'));

      await expect(instance.validate({})).rejects.toThrow('Invalid data');
      expect((instance.validate as unknown as Mock<[unknown], Promise<boolean>>).mock.calls.length).toBe(1);
    });
  });

  describe('validateData function', () => {
      expect(result).toEqual({ valid: true });
      expect((validateData as unknown as Mock<[unknown], Promise<{ valid: boolean }>>).mock.calls.length).toBe(1);
    });

      await expect(validateData({ cause: 'error' })).rejects.toThrow('Mock validation error');
      expect((validateData as unknown as Mock<[unknown], Promise<{ valid: boolean }>>).mock.calls.length).toBe(1);
    });
  });

  describe('ValidationMiddleware', () => {
      const middleware = new ValidationMiddleware(options);

      const opt = (middleware as unknown as { getOptions: () => unknown }).getOptions();
      expect(opt).toEqual(options);

      const executed = await middleware.execute({ payload: true });
      expect(executed).toBe(true);
      expect((middleware.execute as unknown as Mock<[unknown], Promise<boolean>>).mock.calls.length).toBe(1);
    });

    test('should propagate execution errors', async (): Promise<void> => {
      const middleware = new ValidationMiddleware();
      (middleware.execute as unknown as Mock<[unknown], Promise<boolean>>).mockRejectedValueOnce(new Error('Middleware failure'));

      await expect(middleware.execute({})).rejects.toThrow('Middleware failure');
      expect((middleware.execute as unknown as Mock<[unknown], Promise<boolean>>).mock.calls.length).toBe(1);
    });
  });

  describe('getGlobalMiddleware and resetGlobalMiddleware', () => {
    test('should return the same global instance until reset', (): void => {
      const first = getGlobalMiddleware();
      const second = getGlobalMiddleware();
      expect(first).toBe(second);

      resetGlobalMiddleware();

      const third = getGlobalMiddleware();
      expect(third).not.toBe(first);
      const fourth = getGlobalMiddleware();
      expect(third).toBe(fourth);
    });
  });
});
