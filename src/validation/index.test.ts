import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./schemas.js', () => {
  class MockSchemaBuilder {
    public readonly steps: string[];
    public constructor() {
      this.steps = [];
    }
    public addStep(step: string): this {
      this.steps.push(step);
      return this;
    }
    public build(): Record<string, unknown> {
      return { built: true, steps: this.steps.slice() };
    }
  }
  const MockValidationLevel = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });

  return {
    SchemaBuilder: MockSchemaBuilder,
    ValidationLevel: MockValidationLevel,
  };
});

vi.mock('./validator.js', () => {
  class MockValidator {
    public readonly calledWith: unknown[];
    public constructor() {
      this.calledWith = [];
    }
    public validate(input: unknown): { ok: boolean } {
      this.calledWith.push(input);
      if (input === 'throw') {
        throw new Error('validation failed');
      }
      return { ok: true };
    }
  }

  const validateData = (data: unknown): string => {
    if (data === 'throw') {
      throw new Error('validateData error');
    }
    return 'validated';
  };

  return {
    Validator: MockValidator,
    validateData,
  };
});

vi.mock('./middleware.js', () => {
  type State = { mw: unknown | null };
  const state: State = { mw: null };

  const ValidationMiddleware = (opts?: Record<string, unknown>): string => {
    state.mw = opts ?? {};
    return 'middleware-applied';
  };

  const getGlobalMiddleware = (): unknown => state.mw;

  const resetGlobalMiddleware = (behavior?: string): void => {
    if (behavior === 'throw') {
      throw new Error('reset failed');
    }
    state.mw = null;
  };

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

import {
  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from './index';

import {
  ValidationLevel as MockValidationLevel,
  SchemaBuilder as MockSchemaBuilder,
} from './schemas.js';

import {
  Validator as MockValidator,
  validateData as mockValidateData,
} from './validator.js';

import {
  ValidationMiddleware as MockValidationMiddleware,
  getGlobalMiddleware as mockGetGlobalMiddleware,
  resetGlobalMiddleware as mockResetGlobalMiddleware,
} from './middleware.js';

describe('validation/index barrel exports', () => {
  beforeEach((): void => {
    try {
      resetGlobalMiddleware();
    } catch (_err: unknown) {
      // ignore if mock behavior altered
    }
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('re-exports', () => {
    test('should re-export ValidationLevel from schemas.js', () => {
      expect(ValidationLevel).toBe(MockValidationLevel);
      expect(ValidationLevel).toEqual({ LOW: 1, MEDIUM: 2, HIGH: 3 });
    });

    test('should re-export SchemaBuilder from schemas.js', () => {
      expect(SchemaBuilder).toBe(MockSchemaBuilder);
      const builder = new SchemaBuilder();
      expect(builder).toBeInstanceOf(MockSchemaBuilder);
    });

    test('should re-export Validator and validateData from validator.js', () => {
      expect(Validator).toBe(MockValidator);
      expect(validateData).toBe(mockValidateData);
    });

    test('should re-export middleware functions from middleware.js', () => {
      expect(ValidationMiddleware).toBe(MockValidationMiddleware);
      expect(getGlobalMiddleware).toBe(mockGetGlobalMiddleware);
      expect(resetGlobalMiddleware).toBe(mockResetGlobalMiddleware);
    });
  });

  describe('SchemaBuilder', () => {
    test('should build schema with added steps', () => {
      const builder = new SchemaBuilder();
      builder.addStep('a').addStep('b');
      const result = builder.build();
      expect(result).toEqual({ built: true, steps: ['a', 'b'] });
    });
  });

  describe('Validator', () => {
    test('should validate data successfully', () => {
      const validator = new Validator();
      const out = validator.validate({ foo: 'bar' });
      expect(out).toEqual({ ok: true });
      expect(validator.calledWith).toEqual([{ foo: 'bar' }]);
    });

    test('should throw on validation error', () => {
      const validator = new Validator();
      expect(() => validator.validate('throw')).toThrowError('validation failed');
    });
  });

  describe('validateData', () => {
    test('should return validated on success', () => {
      const out = validateData({ input: true });
      expect(out).toBe('validated');
    });

    test('should throw on error from underlying implementation', () => {
      expect(() => validateData('throw')).toThrowError('validateData error');
    });
  });

  describe('Middleware', () => {
    test('should apply middleware and set global state', () => {
      const res = ValidationMiddleware({ enabled: true });
      expect(res).toBe('middleware-applied');
      const global = getGlobalMiddleware();
      expect(global).toEqual({ enabled: true });
    });

    test('should reset global middleware state', () => {
      ValidationMiddleware({ any: 'value' });
      expect(getGlobalMiddleware()).toEqual({ any: 'value' });
      resetGlobalMiddleware();
      expect(getGlobalMiddleware()).toBeNull();
    });

    test('should propagate errors from resetGlobalMiddleware', () => {
      expect(() => resetGlobalMiddleware('throw')).toThrowError('reset failed');
    });
  });
});
