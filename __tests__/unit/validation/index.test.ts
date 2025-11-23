import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

type ObjectConstructorType = new (...args: never[]) => object;

let validationLevelMock: Record<string, unknown>;
let SchemaBuilderClass: ObjectConstructorType;
let ValidatorClass: ObjectConstructorType;
let ValidationMiddlewareClass: ObjectConstructorType;

const validateDataMock = vi.fn<[(unknown)?], unknown>();
const getGlobalMiddlewareMock = vi.fn<[], unknown>();
const resetGlobalMiddlewareMock = vi.fn<[], void>();

vi.mock('./schemas.js', () => {
  // Mock an object-like enum
  const ValidationLevel = { NONE: 'none', STRICT: 'strict' } as const;
  // Mock a class
  class SchemaBuilder {
    public built: boolean;
    constructor() {
      this.built = false;
    }
    build(): string {
      this.built = true;
      return 'built';
    }
  }
  validationLevelMock = ValidationLevel as unknown as Record<string, unknown>;
  SchemaBuilderClass = SchemaBuilder as unknown as ObjectConstructorType;
  return {
    ValidationLevel,
    SchemaBuilder,
  };
}, { virtual: true });

vi.mock('./validator.js', () => {
  class Validator {
    public validated: boolean;
    constructor() {
      this.validated = false;
    }
    validate(_input: unknown): boolean {
      this.validated = true;
      return true;
    }
  }
  ValidatorClass = Validator as unknown as ObjectConstructorType;
  return {
    Validator,
    validateData: validateDataMock,
  };
}, { virtual: true });

vi.mock('./middleware.js', () => {
  class ValidationMiddleware {
    public options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
    }
    handle(_ctx: unknown): boolean {
      return true;
    }
  }
  ValidationMiddlewareClass = ValidationMiddleware as unknown as ObjectConstructorType;
  return {
    ValidationMiddleware,
    getGlobalMiddleware: getGlobalMiddlewareMock,
    resetGlobalMiddleware: resetGlobalMiddlewareMock,
  };
}, { virtual: true });

describe('src/validation/index.ts barrel exports', () => {
  beforeEach((): void => {
    validateDataMock.mockReset();
    getGlobalMiddlewareMock.mockReset();
    resetGlobalMiddlewareMock.mockReset();

    validateDataMock.mockImplementation((input?: unknown): unknown => {
      return { ok: true, input } as Record<string, unknown>;
    });
    getGlobalMiddlewareMock.mockImplementation((): symbol => {
      return Symbol('global-middleware');
    });
    resetGlobalMiddlewareMock.mockImplementation((): void => {
      // no-op
    });
  });

  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('ValidationLevel', () => {
    test('should re-export ValidationLevel from schemas.js', async (): Promise<void> => {
      const mod = await import('./index');
      expect(mod.ValidationLevel).toBe(validationLevelMock);
      expect(Object.keys(mod.ValidationLevel as Record<string, unknown>).length).toBe(2);
    });
  });

  describe('SchemaBuilder', () => {
    test('should re-export SchemaBuilder class and instantiate', async (): Promise<void> => {
      const mod = await import('./index');
      expect(mod.SchemaBuilder).toBe(SchemaBuilderClass);
      const instance = new (mod.SchemaBuilder as unknown as ObjectConstructorType)();
      // Verify constructor identity without relying on instanceof
      expect((instance as { constructor: unknown }).constructor).toBe(mod.SchemaBuilder);
      // Check a method works on the mock class
      const built = (instance as unknown as { build: () => string }).build();
      expect(built).toBe('built');
      expect((instance as unknown as { built: boolean }).built).toBe(true);
    });
  });

  describe('Validator', () => {
    test('should re-export Validator class and instantiate', async (): Promise<void> => {
      const mod = await import('./index');
      expect(mod.Validator).toBe(ValidatorClass);
      const instance = new (mod.Validator as unknown as ObjectConstructorType)();
      expect((instance as { constructor: unknown }).constructor).toBe(mod.Validator);
      const result = (instance as unknown as { validate: (_input: unknown) => boolean }).validate({ foo: 'bar' });
      expect(result).toBe(true);
      expect((instance as unknown as { validated: boolean }).validated).toBe(true);
    });
  });

  describe('validateData', () => {
    test('should re-export validateData function and forward return value', async (): Promise<void> => {
      const mod = await import('./index');
      expect(mod.validateData).toBe(validateDataMock);
      const arg = { a: 1 };
      const fn = mod.validateData as unknown as (input?: unknown) => unknown;
      const result = fn(arg);
      expect(validateDataMock).toHaveBeenCalledTimes(1);
      expect(validateDataMock).toHaveBeenCalledWith(arg);
      expect(result).toEqual({ ok: true, input: arg });
    });

    test('should forward thrown errors from underlying function', async (): Promise<void> => {
      validateDataMock.mockImplementation((): unknown => {
        throw new Error('validation failed');
      });
      const mod = await import('./index');
      const fn = mod.validateData as unknown as (input?: unknown) => unknown;
      expect(() => fn({})).toThrowError('validation failed');
      expect(validateDataMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('ValidationMiddleware', () => {
    test('should re-export ValidationMiddleware class and instantiate with options', async (): Promise<void> => {
      const mod = await import('./index');
      expect(mod.ValidationMiddleware).toBe(ValidationMiddlewareClass);
      const options = { enabled: true } as Record<string, unknown>;
      const instance = new (mod.ValidationMiddleware as unknown as new (_opts: Record<string, unknown>) => object)(options);
      expect((instance as { constructor: unknown }).constructor).toBe(mod.ValidationMiddleware);
      expect((instance as unknown as { options: Record<string, unknown> }).options).toEqual(options);
      const handled = (instance as unknown as { handle: (_ctx: unknown) => boolean }).handle({ path: '/x' });
      expect(handled).toBe(true);
    });
  });

  describe('getGlobalMiddleware', () => {
    test('should re-export getGlobalMiddleware and return inner value', async (): Promise<void> => {
      const mwSymbol = Symbol('mw-return');
      getGlobalMiddlewareMock.mockImplementationOnce((): symbol => mwSymbol);
      const mod = await import('./index');
      expect(mod.getGlobalMiddleware).toBe(getGlobalMiddlewareMock);
      const fn = mod.getGlobalMiddleware as unknown as () => unknown;
      const result = fn();
      expect(result).toBe(mwSymbol);
      expect(getGlobalMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetGlobalMiddleware', () => {
    test('should re-export resetGlobalMiddleware and invoke underlying function', async (): Promise<void> => {
      const mod = await import('./index');
      expect(mod.resetGlobalMiddleware).toBe(resetGlobalMiddlewareMock);
      const fn = mod.resetGlobalMiddleware as unknown as () => void;
      fn();
      expect(resetGlobalMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });
});
