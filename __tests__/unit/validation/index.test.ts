import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./schemas.js', () => {
  class MockSchemaBuilder {
    cfg?: unknown;
    constructor(cfg?: unknown) {
      this.cfg = cfg;
    }
    build(): Record<string, unknown> {
      return { built: true, cfg: this.cfg as unknown };
    }
  }
  const ValidationLevel = { LOW: 'low', HIGH: 'high' } as const;
  return { ValidationLevel, SchemaBuilder: MockSchemaBuilder };
});

vi.mock('./validator.js', () => {
  class MockValidator {
    schema?: unknown;
    constructor(schema?: unknown) {
      this.schema = schema;
    }
    validate(_data: unknown): Record<string, unknown> {
      return { valid: true, schema: this.schema as unknown };
    }
  }
  const validateData = vi.fn((data: unknown): Record<string, unknown> => ({ ok: true, data }));
  return { Validator: MockValidator, validateData };
});

vi.mock('./middleware.js', () => {
  class MockValidationMiddleware {
    opts?: Record<string, unknown>;
    constructor(opts?: Record<string, unknown>) {
      this.opts = opts;
    }
    handle(input: unknown): Record<string, unknown> {
      return { handled: input as unknown, opts: this.opts as unknown } as Record<string, unknown>;
    }
  }
  const getGlobalMiddleware = vi.fn((): Record<string, unknown> => ({ global: true }));
  const resetGlobalMiddleware = vi.fn((): void => {
    return;
  });
  return {
    ValidationMiddleware: MockValidationMiddleware,
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
} from './index.ts';

import {
  ValidationLevel as MockValidationLevel,
  SchemaBuilder as MockSchemaBuilder,
} from './schemas.js';
import {
  Validator as MockValidator,
  validateData as mockedValidateData,
} from './validator.js';
import {
  ValidationMiddleware as MockValidationMiddleware,
  getGlobalMiddleware as mockedGetGlobalMiddleware,
  resetGlobalMiddleware as mockedResetGlobalMiddleware,
} from './middleware.js';

describe('validation/index barrel exports', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('re-export identities', () => {
    test('should re-export ValidationLevel by reference', (): void => {
      expect(ValidationLevel).toBe(MockValidationLevel);
    });

    test('should re-export SchemaBuilder class by reference', (): void => {
      expect(SchemaBuilder).toBe(MockSchemaBuilder);
    });

    test('should re-export Validator class by reference', (): void => {
      expect(Validator).toBe(MockValidator);
    });

    test('should re-export validateData function by reference', (): void => {
      expect(validateData).toBe(mockedValidateData);
    });

    test('should re-export ValidationMiddleware class by reference', (): void => {
      expect(ValidationMiddleware).toBe(MockValidationMiddleware);
    });

    test('should re-export getGlobalMiddleware function by reference', (): void => {
      expect(getGlobalMiddleware).toBe(mockedGetGlobalMiddleware);
    });

    test('should re-export resetGlobalMiddleware function by reference', (): void => {
      expect(resetGlobalMiddleware).toBe(mockedResetGlobalMiddleware);
    });
  });

  describe('SchemaBuilder (re-exported)', () => {
    test('should create instance and call methods from mocked class', (): void => {
      const config: Record<string, unknown> = { strict: true };
      const builder = new SchemaBuilder(config);
      expect(builder).toBeInstanceOf(MockSchemaBuilder);
      // @ts-expect-error - using known mock method for test verification
      const built = builder.build();
      expect(built).toEqual({ built: true, cfg: config });
    });
  });

  describe('Validator (re-exported)', () => {
    test('should create instance and call validate from mocked class', (): void => {
      const schema: Record<string, unknown> = { fields: ['id'] };
      const instance = new Validator(schema);
      expect(instance).toBeInstanceOf(MockValidator);
      // @ts-expect-error - using known mock method for test verification
      const result = instance.validate({ id: 1 });
      expect(result).toEqual({ valid: true, schema });
    });
  });

  describe('validateData (re-exported function)', () => {
    test('should forward call to mocked validateData and return its value', (): void => {
      const input: Record<string, unknown> = { name: 'test' };
      const returnValue: Record<string, unknown> = { ok: true, from: 'mock' };
      mockedValidateData.mockReturnValueOnce(returnValue);

      const result = validateData(input);

      expect(mockedValidateData).toHaveBeenCalledTimes(1);
      expect(mockedValidateData).toHaveBeenCalledWith(input);
      expect(result).toBe(returnValue);
    });

    test('should propagate errors thrown by mocked validateData', (): void => {
      const input: Record<string, unknown> = { bad: true };
      const error = new Error('validation failed');
      mockedValidateData.mockImplementationOnce((): never => {
        throw error;
      });

      expect(() => validateData(input)).toThrow(error);
    });
  });

  describe('ValidationMiddleware (re-exported)', () => {
    test('should create instance and use mocked handle method', (): void => {
      const options: Record<string, unknown> = { mode: 'global' };
      const instance = new ValidationMiddleware(options);
      expect(instance).toBeInstanceOf(MockValidationMiddleware);
      // @ts-expect-error - using known mock method for test verification
      const out = instance.handle({ x: 1 });
      expect(out).toEqual({ handled: { x: 1 }, opts: options });
    });
  });

  describe('getGlobalMiddleware (re-exported function)', () => {
    test('should forward call and return mocked value', (): void => {
      const value: Record<string, unknown> = { mid: 'global' };
      mockedGetGlobalMiddleware.mockReturnValueOnce(value);

      const result = getGlobalMiddleware();

      expect(mockedGetGlobalMiddleware).toHaveBeenCalledTimes(1);
      expect(result).toBe(value);
    });

    test('should propagate errors from mocked getGlobalMiddleware', (): void => {
      const error = new Error('no middleware');
      mockedGetGlobalMiddleware.mockImplementationOnce((): never => {
        throw error;
      });

      expect(() => getGlobalMiddleware()).toThrow(error);
    });
  });

  describe('resetGlobalMiddleware (re-exported function)', () => {
    test('should forward call to mocked resetGlobalMiddleware', (): void => {
      resetGlobalMiddleware();
      expect(mockedResetGlobalMiddleware).toHaveBeenCalledTimes(1);
    });
  });
});
