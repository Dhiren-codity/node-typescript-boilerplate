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
  const getGlobalMiddleware = vi.fn((): Record<string, unknown> => ({ global: true }));
  const resetGlobalMiddleware = vi.fn((): void => {
    return;
  });
  return {
    ValidationMiddleware: MockValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };

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


      expect(result).toEqual({ valid: true, schema });
    });

      mockedValidateData.mockReturnValueOnce(returnValue);

      const result = validateData(input);

      expect(mockedValidateData).toHaveBeenCalledTimes(1);
      expect(mockedValidateData).toHaveBeenCalledWith(input);
      expect(result).toBe(returnValue);
    });

      const error = new Error('validation failed');
      mockedValidateData.mockImplementationOnce((): never => {
        throw error;
      });

      expect(() => validateData(input)).toThrow(error);
    });

      expect(out).toEqual({ handled: { x: 1 }, opts: options });
    });



      expect(() => getGlobalMiddleware()).toThrow(error);
    });

  describe('resetGlobalMiddleware (re-exported function)', () => {
    test('should forward call to mocked resetGlobalMiddleware', (): void => {
      resetGlobalMiddleware();
      expect(mockedResetGlobalMiddleware).toHaveBeenCalledTimes(1);
    });
