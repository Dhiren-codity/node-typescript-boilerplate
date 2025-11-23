import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

vi.mock(middlewareModuleId, () => ({
  ValidationMiddleware: validationMiddlewareMock,
  getGlobalMiddleware: getGlobalMiddlewareMock,
  resetGlobalMiddleware: resetGlobalMiddlewareMock,
}));

type IndexExports = {
  ValidationLevel: unknown;
  SchemaBuilder: new () => unknown;
  Validator: new () => unknown;
  validateData: (...args: unknown[]) => unknown;
  ValidationMiddleware: (...args: unknown[]) => unknown;
  getGlobalMiddleware: () => unknown;
  resetGlobalMiddleware: () => void;
};

// Import the module under test after mocking its dependencies
const indexModule = (await import(indexModuleId)) as unknown as IndexExports;

const {
  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} = indexModule;

describe('validation index barrel exports', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });


// Resolve module IDs to absolute paths to ensure vi.mock matches resolved imports
const rootDir: string = process.cwd();
const srcValidationDir: string = path.resolve(rootDir, 'src', 'validation');
const schemasModuleId: string = path.resolve(srcValidationDir, 'schemas.js');
const validatorModuleId: string = path.resolve(srcValidationDir, 'validator.js');
const middlewareModuleId: string = path.resolve(srcValidationDir, 'middleware.js');
const indexModuleId: string = path.resolve(srcValidationDir, 'index.ts');

// Prepare mocks for re-exported modules
const validationLevelMock: Record<string, unknown> = Object.freeze({
  WARN: 'warn',
  ERROR: 'error',
  INFO: 'info',
});

class SchemaBuilderMock {
  public rules: unknown[];
  public constructor() {
    this.rules = [];
  }
  public addRule(rule: unknown): this {
    this.rules.push(rule);
    return this;
  }
}

class ValidatorMock {
  public validate: (_data: unknown) => { success: boolean };
  public constructor() {
    this.validate = vi.fn<[unknown], { success: boolean }>(() => ({ success: true }));
  }
}

type ValidateDataArgs = [data: unknown, schema?: unknown];
type ValidateDataReturn = { success: boolean };
const validateDataMock = vi.fn<ValidateDataArgs, ValidateDataReturn>((_data, _schema) => ({ success: true }));

const validationMiddlewareMock = vi.fn<[unknown, unknown?], unknown>((input: unknown) => input);
const getGlobalMiddlewareMock = vi.fn<[], unknown[]>(() => [validationMiddlewareMock]);
const resetGlobalMiddlewareMock = vi.fn<[], void>(() => {});

// Apply mocks for dependencies

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('re-exports identity', () => {
    test('should re-export ValidationLevel from schemas', (): void => {
      expect(ValidationLevel).toBe(validationLevelMock);
    });

    test('should re-export SchemaBuilder class from schemas', (): void => {
      expect(SchemaBuilder).toBe(SchemaBuilderMock);
    });

    test('should re-export Validator class from validator', (): void => {
      expect(Validator).toBe(ValidatorMock);
    });

    test('should re-export validateData function from validator', (): void => {
      expect(validateData).toBe(validateDataMock);
    });

    test('should re-export middleware exports', (): void => {
      expect(ValidationMiddleware).toBe(validationMiddlewareMock);
      expect(getGlobalMiddleware).toBe(getGlobalMiddlewareMock);
      expect(resetGlobalMiddleware).toBe(resetGlobalMiddlewareMock);
    });
  });

  describe('functional behavior through re-exports', () => {
    test('validateData happy path should call underlying implementation and return its value', (): void => {
      const input: Record<string, unknown> = { id: 1 };
      const schema: Record<string, unknown> = { required: ['id'] };
      const result = validateData(input, schema) as { success: boolean };

      expect(validateDataMock).toHaveBeenCalledTimes(1);
      expect(validateDataMock).toHaveBeenCalledWith(input, schema);
      expect(result).toEqual({ success: true });
    });

    test('validateData error path should propagate thrown errors from underlying implementation', (): void => {
      validateDataMock.mockImplementationOnce((): ValidateDataReturn => {
        throw new Error('validation failed');
      });

      const call = (): unknown => validateData({ test: true }, { rules: [] });

      expect(call).toThrowError('validation failed');
      expect(validateDataMock).toHaveBeenCalledTimes(1);
    });

    test('Validator instances should be constructible and callable', (): void => {
      const instance = new Validator() as unknown as { validate: (data: unknown) => { success: boolean } };
      const out = instance.validate({ x: 1 });

      expect(out).toEqual({ success: true });
    });

    test('SchemaBuilder instances should be constructible and chainable', (): void => {
      const builder = new SchemaBuilder() as unknown as { addRule: (rule: unknown) => unknown };
      const returned = builder.addRule({ field: 'name', required: true });

      expect(returned).toBe(builder);
    });

    test('ValidationMiddleware should be callable and used by getGlobalMiddleware', (): void => {
      const middlewares = getGlobalMiddleware() as unknown as Array<(...args: unknown[]) => unknown>;
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
      expect(middlewares[0]).toBe(ValidationMiddleware);

      const input: Record<string, unknown> = { ok: true };
      const output = ValidationMiddleware(input);
      expect(validationMiddlewareMock).toHaveBeenCalledTimes(1);
      expect(output).toBe(input);
    });

    test('resetGlobalMiddleware should be callable', (): void => {
      resetGlobalMiddleware();
      expect(resetGlobalMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });
});
