import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {

vi.mock(validatorJsPath, validatorFactory, { virtual: true });

// middleware mock (both .ts and .js ids)
const middlewareFactory = (): unknown => {
  type Options = Record<string, unknown>;
  const state: { lastOpts: Options | null } = { lastOpts: null };

vi.mock(middlewareJsPath, middlewareFactory, { virtual: true });


  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from '../../src/validation/index';

// Resolve possible import ids and provide virtual mocks to intercept re-exports regardless of extension resolution

// schemas mock (both .ts and .js ids)
  class MockSchemaBuilder {
    rules: unknown[] = [];
    // Using class fields to attach spies
    addRule = vi.fn((rule: unknown): MockSchemaBuilder => {
      this.rules.push(rule);
      return this;
    });
  describe('schemas re-exports', (): void => {
    test('ValidationLevel should expose expected keys', (): void => {
      expect(ValidationLevel).toBeDefined();
      const levelObj = ValidationLevel as unknown as Record<string, unknown>;
      expect(levelObj.STRICT).toBe('strict');
      expect(levelObj.LENIENT).toBe('lenient');
    });

      const result = validateData(data, schema);
      expect(result).toBe('validated');

      const validateSpy = validateData as unknown as ReturnType<typeof vi.fn>;
      expect(validateSpy.mock.calls.length).toBe(1);
      expect(validateSpy.mock.calls[0]?.[0]).toEqual(data);
      expect(validateSpy.mock.calls[0]?.[1]).toEqual(schema);
    });


      expect(() => validateData({} as Record<string, unknown>, {} as Record<string, unknown>)).toThrowError(
        'validation failed'
      );
    });

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

      expect(state).toBeDefined();
      expect(state.lastOpts).toEqual({ level: 'strict', enabled: true });
    });

      let state = getGlobalMiddleware() as { lastOpts: unknown };
      expect(state.lastOpts).toEqual({ mode: 'test' });

      resetGlobalMiddleware();

      state = getGlobalMiddleware() as { lastOpts: unknown };
      expect(state.lastOpts).toBeNull();
    });
