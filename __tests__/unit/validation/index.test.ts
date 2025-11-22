import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
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
  );

  return {
    Validator: MockValidator,
    validateData,
  };
});

vi.mock('./middleware.js', () => {
  type Handler = (data: unknown) => { passed: boolean; level?: string };

  let globalMw: Handler | null = null;

  const ValidationMiddleware = (opts?: { level?: string }): Handler => {
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

    test('SchemaBuilder is re-exported and behaves as mocked', (): void => {
      const builder = new SchemaBuilder({ field: 'value' });
      const result = (builder as unknown as { build: () => unknown }).build();
      expect(result).toEqual({ built: true, rules: { field: 'value' } });
    });
  });

  describe('validator exports', () => {
    test('Validator class is re-exported and validate works', (): void => {
      const v = new Validator() as unknown as { validate: (input: unknown) => { ok: boolean; value: unknown } };
      const output = v.validate('input');
      expect(output).toEqual({ ok: true, value: 'input' });
    });

    test('validateData function is re-exported and returns expected result', (): void => {
      const output = validateData({ id: 123 });
      expect(output).toEqual({ ok: true, value: { id: 123 } });
      expect(vi.isMockFunction(validateData)).toBe(true);
      expect(validateData).toHaveBeenCalledTimes(1);
      expect(validateData).toHaveBeenCalledWith({ id: 123 });
    });

    test('validateData error case propagates thrown error', (): void => {
      const err = new Error('validation failed');
      const validateDataMock = validateData as unknown as Mock<[unknown], { ok: boolean; value: unknown }>;
      validateDataMock.mockImplementationOnce((_input: unknown) => {
        throw err;
      });

      expect(() => validateData('bad input')).toThrow(err);
      expect(validateData).toHaveBeenCalledTimes(1);
    });
  });

  describe('middleware exports', () => {
    test('ValidationMiddleware is re-exported and sets global middleware', (): void => {
      const handler = ValidationMiddleware({ level: 'high' });
      expect(typeof handler).toBe('function');

      const globalHandler = getGlobalMiddleware();
      expect(globalHandler).toBe(handler);

      const result = handler({ some: 'data' });
      expect(result).toEqual({ passed: true, level: 'high' });
    });

    test('ValidationMiddleware without options works and level is undefined', (): void => {
      const handler = ValidationMiddleware();
      const result = handler({ test: true });
      expect(result).toEqual({ passed: true, level: undefined });
    });

    test('resetGlobalMiddleware clears global handler', (): void => {
      const handler = ValidationMiddleware({ level: 'low' });
      expect(getGlobalMiddleware()).toBe(handler);

      resetGlobalMiddleware();
      expect(getGlobalMiddleware()).toBeNull();
    });
  });
});
