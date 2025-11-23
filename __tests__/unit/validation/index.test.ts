import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {

vi.mock(validatorJsPath, validatorFactory, { virtual: true });

// middleware mock (both .ts and .js ids)
const middlewareFactory = (): unknown => {
  type Options = Record<string, unknown>;
  const state: { lastOpts: Options | null } = { lastOpts: null };

  const ValidationMiddlewareMock = vi.fn((opts?: Options): string => {
    state.lastOpts = opts ?? null;
    return 'mw';
  });
vi.mock(middlewareJsPath, middlewareFactory, { virtual: true });

describe('validation/index barrel exports', (): void => {
  beforeEach((): void => {
    // No specific setup required beyond mocks
  });

  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from '../../src/validation/index';

// Resolve possible import ids and provide virtual mocks to intercept re-exports regardless of extension resolution
const schemasTsPath: string = new URL('../../src/validation/schemas.ts', import.meta.url).pathname;
const schemasJsPath: string = new URL('../../src/validation/schemas.js', import.meta.url).pathname;
const validatorTsPath: string = new URL('../../src/validation/validator.ts', import.meta.url).pathname;
const validatorJsPath: string = new URL('../../src/validation/validator.js', import.meta.url).pathname;
const middlewareTsPath: string = new URL('../../src/validation/middleware.ts', import.meta.url).pathname;
const middlewareJsPath: string = new URL('../../src/validation/middleware.js', import.meta.url).pathname;

// schemas mock (both .ts and .js ids)
const schemasFactory = (): unknown => {
  class MockSchemaBuilder {
    rules: unknown[] = [];
    // Using class fields to attach spies
    addRule = vi.fn((rule: unknown): MockSchemaBuilder => {
      this.rules.push(rule);
      return this;
    });
  }
  };
};
  });
  describe('schemas re-exports', (): void => {
    test('ValidationLevel should expose expected keys', (): void => {
      expect(ValidationLevel).toBeDefined();
      const levelObj = ValidationLevel as unknown as Record<string, unknown>;
      expect(levelObj.STRICT).toBe('strict');
      expect(levelObj.LENIENT).toBe('lenient');
    });

    test('SchemaBuilder should allow chaining and building', (): void => {
      type SB = {
        addRule: (rule: unknown) => SB;
        build: () => Record<string, unknown>;
      };
    });
    test('SchemaBuilder build should propagate errors', (): void => {
      type SB = {
        addRule: (rule: unknown) => SB;
        build: () => unknown;
      };
      });
    });
  describe('validator re-exports', (): void => {
    test('validateData should return expected result and record calls', (): void => {
      const data: Record<string, unknown> = { a: 1 };
      const schema: Record<string, unknown> = { type: 'object' };
      const result = validateData(data, schema);
      expect(result).toBe('validated');

      const validateSpy = validateData as unknown as ReturnType<typeof vi.fn>;
      expect(validateSpy.mock.calls.length).toBe(1);
      expect(validateSpy.mock.calls[0]?.[0]).toEqual(data);
      expect(validateSpy.mock.calls[0]?.[1]).toEqual(schema);
    });

    test('validateData should propagate errors', (): void => {
      const validateSpy = validateData as unknown as ReturnType<typeof vi.fn>;
      validateSpy.mockImplementationOnce((): never => {
        throw new Error('validation failed');
      });

      expect(() => validateData({} as Record<string, unknown>, {} as Record<string, unknown>)).toThrowError(
        'validation failed'
      );
    });

    test('Validator should initialize and call validate method', (): void => {
      type VInst = { validate: (data: unknown, schema: unknown) => boolean };
      const instance: VInst = new (Validator as unknown as new () => VInst)();
      const result1 = instance.validate({ foo: 'bar' }, { schema: true });
      expect(result1).toBe(true);

      const validateSpy = (instance.validate as unknown as ReturnType<typeof vi.fn>);
      expect(validateSpy.mock.calls.length).toBe(1);

      validateSpy.mockImplementationOnce((): boolean => false);
      const result2 = instance.validate({ foo: 'bar' }, { schema: true });
      expect(result2).toBe(false);
      expect(validateSpy.mock.calls.length).toBe(2);
    });
  });

  describe('middleware re-exports', (): void => {
    test('ValidationMiddleware should update global state via getGlobalMiddleware', (): void => {
      const result = ValidationMiddleware({ level: 'strict', enabled: true } as Record<string, unknown>);
      expect(result).toBe('mw');

      const state = getGlobalMiddleware() as { lastOpts: unknown };
      expect(state).toBeDefined();
      expect(state.lastOpts).toEqual({ level: 'strict', enabled: true });
    });

    test('resetGlobalMiddleware should reset global state', (): void => {
      ValidationMiddleware({ mode: 'test' } as Record<string, unknown>);
      let state = getGlobalMiddleware() as { lastOpts: unknown };
      expect(state.lastOpts).toEqual({ mode: 'test' });

      resetGlobalMiddleware();

      state = getGlobalMiddleware() as { lastOpts: unknown };
      expect(state.lastOpts).toBeNull();
    });
  });
