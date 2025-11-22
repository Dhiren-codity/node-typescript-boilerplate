import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import {

vi.mock('./schemas.js', () => {
  const ValidationLevel = { LOW: 'low', HIGH: 'high' } as const;

  class MockSchemaBuilder {
    public rules: unknown;

    public constructor(rules: unknown) {
      this.rules = rules;
    }

    public build(): { built: true; rules: unknown } {
      return { built: true, rules: this.rules };
    }
  }

  return {
    ValidationLevel,
    SchemaBuilder: MockSchemaBuilder,
  };
});
vi.mock('./validator.js', () => {
  class MockValidator {
    public calls: unknown[] = [];

    public validate(input: unknown): { ok: boolean; value: unknown } {
      this.calls.push(input);
      return { ok: true, value: input };
    }
  }

  const validateData = vi.fn(
    (input: unknown): { ok: boolean; value: unknown } => ({ ok: true, value: input }),
vi.mock('./middleware.js', () => {
  type Handler = (data: unknown) => { passed: boolean; level?: string };

  let globalMw: Handler | null = null;

  const ValidationMiddleware = (opts?: { level?: string }): Handler => {

  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from './index';


  );

  return {
    Validator: MockValidator,
    validateData,
  };
});

    const fn: Handler = (_data: unknown) => ({ passed: true, level: opts?.level });
    globalMw = fn;
    return fn;
  };

  const getGlobalMiddleware = (): Handler | null => globalMw;

  const resetGlobalMiddleware = (): void => {
    globalMw = null;
  };

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

describe('validation index re-exports', () => {
  beforeEach((): void => {
    // ensure clean global middleware state for each test
    resetGlobalMiddleware();
  });

  afterEach((): void => {
    vi.clearAllMocks();
    resetGlobalMiddleware();
  });

  describe('schemas exports', () => {
    test('ValidationLevel is re-exported from schemas', (): void => {
      expect(ValidationLevel).toEqual({ LOW: 'low', HIGH: 'high' });
      expect(ValidationLevel.LOW).toBe('low');
      expect(ValidationLevel.HIGH).toBe('high');
    });

      const result = (builder as unknown as { build: () => unknown }).build();
      expect(result).toEqual({ built: true, rules: { field: 'value' } });
    });
  });

  describe('validator exports', () => {
      const output = v.validate('input');
      expect(output).toEqual({ ok: true, value: 'input' });
    });

      expect(output).toEqual({ ok: true, value: { id: 123 } });
      expect(vi.isMockFunction(validateData)).toBe(true);
      expect(validateData).toHaveBeenCalledTimes(1);
      expect(validateData).toHaveBeenCalledWith({ id: 123 });
    });

      validateDataMock.mockImplementationOnce((_input: unknown) => {
        throw err;
      });

      expect(() => validateData('bad input')).toThrow(err);
      expect(validateData).toHaveBeenCalledTimes(1);
    });
  });

  describe('middleware exports', () => {
      expect(typeof handler).toBe('function');

      const globalHandler = getGlobalMiddleware();
      expect(globalHandler).toBe(handler);

      const result = handler({ some: 'data' });
      expect(result).toEqual({ passed: true, level: 'high' });
    });

      expect(result).toEqual({ passed: true, level: undefined });
    });

      expect(getGlobalMiddleware()).toBe(handler);

      resetGlobalMiddleware();
      expect(getGlobalMiddleware()).toBeNull();
    });
  });
});
