import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve absolute module ids to match the SUT imports
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const srcValidationDir = path.resolve(currentDir, '../src/validation');
const indexModuleId = path.join(srcValidationDir, 'index.ts');
const schemasModuleId = path.join(srcValidationDir, 'schemas.js');
const validatorModuleId = path.join(srcValidationDir, 'validator.js');
const middlewareModuleId = path.join(srcValidationDir, 'middleware.js');

// Shared spies and mocks for virtual modules
const mockValidationLevel = { STRICT: 'strict', LAX: 'lax' } as const;

const schemaBuilderBuildSpy = vi.fn((): Record<string, unknown> => ({ schema: true, options: null }));
class MockSchemaBuilder {
  public options?: unknown;
  public build: () => Record<string, unknown>;
  public constructor(options?: unknown) {
    this.options = options;
    // ensure build uses the shared spy but with correct options in return
    this.build = vi.fn((): Record<string, unknown> => ({ schema: true, options: this.options }));
    // also call the shared spy to track build creation calls, but not used in assertions
    schemaBuilderBuildSpy.mockImplementation((): Record<string, unknown> => ({ schema: true, options: this.options }));
  }
}

const validateDataMock = vi.fn((data: unknown): { ok: boolean; data: unknown } => ({ ok: true, data }));

const validatorValidateSpy = vi.fn((input: unknown): { valid: boolean; input: unknown } => ({ valid: true, input }));
class MockValidator {
  public validate: (input: unknown) => { valid: boolean; input: unknown };
  public constructor() {
    this.validate = validatorValidateSpy;
  }
}

const middlewareApplySpy = vi.fn((value: unknown): { applied: boolean; value: unknown } => ({ applied: true, value }));
class MockValidationMiddleware {
  public apply: (value: unknown) => { applied: boolean; value: unknown };
  public constructor() {
    this.apply = middlewareApplySpy;
  }
}

const getGlobalMiddlewareMock = vi.fn((): Record<string, unknown> => ({ global: true }));
const resetGlobalMiddlewareMock = vi.fn((): Record<string, unknown> => ({ reset: true }));

// Define virtual module mocks that index.ts re-exports from
vi.mock(schemasModuleId, () => ({
  ValidationLevel: mockValidationLevel,
  SchemaBuilder: MockSchemaBuilder,
}), { virtual: true });

vi.mock(validatorModuleId, () => ({
  Validator: MockValidator,
  validateData: validateDataMock,
}), { virtual: true });

vi.mock(middlewareModuleId, () => ({
  ValidationMiddleware: MockValidationMiddleware,
  getGlobalMiddleware: getGlobalMiddlewareMock,
  resetGlobalMiddleware: resetGlobalMiddlewareMock,
}), { virtual: true });

describe('validation/index re-exports', () => {
  beforeEach((): void => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('schemas exports', () => {
    test('should re-export ValidationLevel and SchemaBuilder and allow usage', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      expect(mod.ValidationLevel).toBe(mockValidationLevel);
      expect(mod.SchemaBuilder).toBe(MockSchemaBuilder);

      const instance = new mod.SchemaBuilder({ key: 'value' }) as unknown as { build: () => Record<string, unknown> };
      const built = instance.build();
      expect(built).toStrictEqual({ schema: true, options: { key: 'value' } });
    });

    test('SchemaBuilder.build error should propagate', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      const instance = new mod.SchemaBuilder() as unknown as { build: () => unknown };
      // Override this specific instance's build to throw once
      const throwingBuild = vi.fn((): unknown => {
        throw new Error('build failed');
      });
      // Replace method on instance
      (instance as Record<string, unknown>).build = throwingBuild as unknown;

      expect(() => instance.build()).toThrowError('build failed');
    });
  });

  describe('validator exports', () => {
    test('should re-export validateData and call underlying implementation', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      const input = { foo: 1 };
      const output = mod.validateData(input);
      expect(output).toStrictEqual({ ok: true, data: input });
      expect(validateDataMock).toHaveBeenCalledTimes(1);
      expect(validateDataMock).toHaveBeenCalledWith(input);
    });

    test('validateData error should propagate', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      validateDataMock.mockImplementationOnce((_data: unknown): never => {
        throw new Error('validation error');
      });

      expect(() => mod.validateData('bad input')).toThrowError('validation error');
    });

    test('should re-export Validator class and allow method calls', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      expect(mod.Validator).toBe(MockValidator);
      const validator = new mod.Validator() as unknown as { validate: (input: unknown) => Record<string, unknown> };

      const result = validator.validate('payload');
      expect(result).toStrictEqual({ valid: true, input: 'payload' });
      expect(validatorValidateSpy).toHaveBeenCalledTimes(1);
      expect(validatorValidateSpy).toHaveBeenCalledWith('payload');
    });

    test('Validator.validate error should propagate', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      // Make next call throw
      validatorValidateSpy.mockImplementationOnce((_input: unknown): never => {
        throw new Error('validator failed');
      });

      const validator = new mod.Validator() as unknown as { validate: (input: unknown) => unknown };
      expect(() => validator.validate({})).toThrowError('validator failed');
    });
  });

  describe('middleware exports', () => {
    test('should re-export ValidationMiddleware and allow usage', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      expect(mod.ValidationMiddleware).toBe(MockValidationMiddleware);

      const middleware = new mod.ValidationMiddleware() as unknown as { apply: (value: unknown) => Record<string, unknown> };
      const applied = middleware.apply(42);

      expect(applied).toStrictEqual({ applied: true, value: 42 });
      expect(middlewareApplySpy).toHaveBeenCalledTimes(1);
      expect(middlewareApplySpy).toHaveBeenCalledWith(42);
    });

    test('should re-export getGlobalMiddleware and resetGlobalMiddleware', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      const globalMw = mod.getGlobalMiddleware();
      expect(globalMw).toStrictEqual({ global: true });
      expect(getGlobalMiddlewareMock).toHaveBeenCalledTimes(1);

      const reset = mod.resetGlobalMiddleware();
      expect(reset).toStrictEqual({ reset: true });
      expect(resetGlobalMiddlewareMock).toHaveBeenCalledTimes(1);
    });

    test('getGlobalMiddleware error should propagate', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      getGlobalMiddlewareMock.mockImplementationOnce((): never => {
        throw new Error('no global middleware');
      });

      expect(() => mod.getGlobalMiddleware()).toThrowError('no global middleware');
    });

    test('resetGlobalMiddleware error should propagate', async (): Promise<void> => {
      const mod = await import(indexModuleId);

      resetGlobalMiddlewareMock.mockImplementationOnce((): never => {
        throw new Error('cannot reset');
      });

      expect(() => mod.resetGlobalMiddleware()).toThrowError('cannot reset');
    });
  });
});
