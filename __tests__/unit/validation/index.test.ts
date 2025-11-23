import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

    vi.mock('../../src/validation/schemas.js', () => {
      class MockSchemaBuilder {
        build(): string {
          return 'built';
        }
      const ValidationLevel = { BASIC: 'basic', STRICT: 'strict' } as const;
      return { ValidationLevel, SchemaBuilder: MockSchemaBuilder };
    });
    vi.mock('../../src/validation/validator.js', () => {
      class MockValidator {
        validate: (input: unknown) => boolean;
        constructor() {
          this.validate = vi.fn((_input: unknown): boolean => true);
        }
      const validateData = vi.fn((_data: unknown): boolean => true);
      return { Validator: MockValidator, validateData };
    });
    vi.mock('../../src/validation/middleware.js', () => {
      class ValidationMiddleware {
        apply: (value: unknown) => unknown;
        constructor() {
          this.apply = vi.fn((value: unknown): unknown => value);
        }
      const getGlobalMiddleware = vi.fn((): string => 'global');
      const resetGlobalMiddleware = vi.fn((): void => {});
    vi.mock('../../src/validation/schemas.js', () => {
      class MockSchemaBuilder {
        build(): string {
          return 'built';
        }
      }
      const ValidationLevel = { BASIC: 'basic', STRICT: 'strict' } as const;
      return { ValidationLevel, SchemaBuilder: MockSchemaBuilder };
    });
    vi.mock('../../src/validation/validator.js', () => {
      class MockValidator {
        validate: (input: unknown) => boolean;
        constructor() {
          this.validate = vi.fn((_input: unknown): boolean => true);
        }
      }
      const validateData = vi.fn((_data: unknown): boolean => true);
      return { Validator: MockValidator, validateData };
    });
    vi.mock('../../src/validation/middleware.js', () => {
      class ValidationMiddleware {
        apply: (value: unknown) => unknown;
        constructor() {
          this.apply = vi.fn((value: unknown): unknown => value);
        }
      }
      const getGlobalMiddleware = vi.fn((): string => 'global');
      const resetGlobalMiddleware = vi.fn((): void => {});
    vi.mock('../../src/validation/schemas.js', () => {
      class MockSchemaBuilder {
        build(): string {
          return 'built';
        }
      }
      const ValidationLevel = { BASIC: 'basic', STRICT: 'strict' } as const;
      return { ValidationLevel, SchemaBuilder: MockSchemaBuilder };
    });
    vi.mock('../../src/validation/validator.js', () => {
      class MockValidator {
        validate: (input: unknown) => boolean;
        constructor() {
          this.validate = vi.fn((_input: unknown): boolean => true);
        }
      }
      const validateData = vi.fn((_data: unknown): boolean => true);
      return { Validator: MockValidator, validateData };
    });
    vi.mock('../../src/validation/middleware.js', () => {
      throw new Error('middleware load failure');
    });


type SchemasModule = {
  ValidationLevel: Record<string, string>;
  SchemaBuilder: new () => { build: () => string };
};

type ValidatorModule = {
  Validator: new () => { validate: (input: unknown) => boolean };
  validateData: (data: unknown) => boolean;
};

type MiddlewareModule = {
  ValidationMiddleware: new () => { apply: (value: unknown) => unknown };
  getGlobalMiddleware: () => unknown;
  resetGlobalMiddleware: () => void;
};

type IndexModule = SchemasModule & ValidatorModule & MiddlewareModule;


  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

    });

    const indexMod = (await import('../../src/validation/index.ts')) as unknown as IndexModule;
    const schemasMod = (await import('../../src/validation/schemas.js')) as unknown as SchemasModule;
    const validatorMod = (await import('../../src/validation/validator.js')) as unknown as ValidatorModule;
    const middlewareMod = (await import('../../src/validation/middleware.js')) as unknown as MiddlewareModule;

    expect(indexMod.ValidationLevel).toBe(schemasMod.ValidationLevel);
    expect(indexMod.SchemaBuilder).toBe(schemasMod.SchemaBuilder);

    expect(indexMod.Validator).toBe(validatorMod.Validator);
    expect(indexMod.validateData).toBe(validatorMod.validateData);

    expect(indexMod.ValidationMiddleware).toBe(middlewareMod.ValidationMiddleware);
    expect(indexMod.getGlobalMiddleware).toBe(middlewareMod.getGlobalMiddleware);
    expect(indexMod.resetGlobalMiddleware).toBe(middlewareMod.resetGlobalMiddleware);
  });

    });

    const indexMod = (await import('../../src/validation/index.ts')) as unknown as IndexModule;
    const validatorMod = (await import('../../src/validation/validator.js')) as unknown as ValidatorModule;
    const middlewareMod = (await import('../../src/validation/middleware.js')) as unknown as MiddlewareModule;

    const builderInstance = new indexMod.SchemaBuilder();
    const builtValue = builderInstance.build();
    expect(builtValue).toBe('built');

    const validatorInstance = new indexMod.Validator();
    const validated = validatorInstance.validate({ key: 'value' } as unknown);
    expect(validated).toBe(true);

    const inputData: Record<string, unknown> = { foo: 'bar' };
    const validateResult = indexMod.validateData(inputData);
    expect(validateResult).toBe(true);
    expect(validatorMod.validateData).toHaveBeenCalledTimes(1);
    expect(validatorMod.validateData).toHaveBeenCalledWith(inputData);

    const middlewareInstance = new indexMod.ValidationMiddleware();
    const applied = middlewareInstance.apply('payload');
    expect(applied).toBe('payload');

    const globalMw = indexMod.getGlobalMiddleware();
    expect(globalMw).toBe('global');
    expect(middlewareMod.getGlobalMiddleware).toHaveBeenCalledTimes(1);

    indexMod.resetGlobalMiddleware();
    expect(middlewareMod.resetGlobalMiddleware).toHaveBeenCalledTimes(1);
  });

  test('should fail to import when a dependency throws during module load', async (): Promise<void> => {



    await expect(import('../../src/validation/index.ts')).rejects.toThrow('middleware load failure');
  });
});
