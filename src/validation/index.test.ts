import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Resolve module paths relative to this test file
const baseDirUrl = new URL('../../src/validation/', import.meta.url);
const schemasPath = new URL('./schemas.js', baseDirUrl).pathname;
const validatorPath = new URL('./validator.js', baseDirUrl).pathname;
const middlewarePath = new URL('./middleware.js', baseDirUrl).pathname;
const indexPath = new URL('./index.ts', baseDirUrl).pathname;

// Mock implementations to be re-exported by the index module
const mockValidationLevel = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

class MockSchemaBuilder {
  public rules: string[] = [];
  public addRule(rule: string): this {
    this.rules.push(rule);
    return this;
  }
}

class MockValidator {
  public calls: unknown[] = [];
  public validate(data: unknown): boolean {
    this.calls.push(data);
    return data !== null;
  }
}

const validateDataMock = vi.fn((data: unknown): string => {
  if (data === 'bad') {
    throw new Error('invalid');
  }
  return 'ok';
});

class MockValidationMiddleware {
  public calls: unknown[] = [];
  public handle(data: unknown): boolean {
    this.calls.push(data);
    return true;
  }
}

let globalMiddlewareInstance: MockValidationMiddleware | null = null;

const getGlobalMiddlewareMock = vi.fn((): MockValidationMiddleware => {
  if (!globalMiddlewareInstance) {
    globalMiddlewareInstance = new MockValidationMiddleware();
  }
  return globalMiddlewareInstance;
});

const resetGlobalMiddlewareMock = vi.fn((): void => {
  globalMiddlewareInstance = null;
});

// Mock the modules that index.ts re-exports
vi.mock(schemasPath, () => ({
  ValidationLevel: mockValidationLevel,
  SchemaBuilder: MockSchemaBuilder,
}));

vi.mock(validatorPath, () => ({
  Validator: MockValidator,
  validateData: validateDataMock,
}));

vi.mock(middlewarePath, () => ({
  ValidationMiddleware: MockValidationMiddleware,
  getGlobalMiddleware: getGlobalMiddlewareMock,
  resetGlobalMiddleware: resetGlobalMiddlewareMock,
}));

interface APIShape {
  ValidationLevel: typeof mockValidationLevel;
  SchemaBuilder: typeof MockSchemaBuilder;
  Validator: typeof MockValidator;
  validateData: typeof validateDataMock;
  ValidationMiddleware: typeof MockValidationMiddleware;
  getGlobalMiddleware: typeof getGlobalMiddlewareMock;
  resetGlobalMiddleware: typeof resetGlobalMiddlewareMock;
}

describe('src/validation/index barrel exports', () => {
  beforeEach((): void => {
    vi.resetModules();
    vi.clearAllMocks();
    globalMiddlewareInstance = null;
  });

  afterEach((): void => {
    vi.clearAllMocks();
    globalMiddlewareInstance = null;
  });

  test('should re-export items with correct identity', async (): Promise<void> => {
    const api = (await import(indexPath)) as unknown as APIShape;

    expect(api.ValidationLevel).toBe(mockValidationLevel);
    expect(api.SchemaBuilder).toBe(MockSchemaBuilder);
    expect(api.Validator).toBe(MockValidator);
    expect(api.validateData).toBe(validateDataMock);
    expect(api.ValidationMiddleware).toBe(MockValidationMiddleware);
    expect(api.getGlobalMiddleware).toBe(getGlobalMiddlewareMock);
    expect(api.resetGlobalMiddleware).toBe(resetGlobalMiddlewareMock);
  });

  test('SchemaBuilder: can create instance and use mocked methods (happy path)', async (): Promise<void> => {
    const api = (await import(indexPath)) as unknown as APIShape;

    const builder = new api.SchemaBuilder();
    builder.addRule('required').addRule('email');

    const typedBuilder = builder as MockSchemaBuilder;
    expect(typedBuilder.rules).toEqual(['required', 'email']);
  });

  test('Validator: can create instance and validate data (happy path)', async (): Promise<void> => {
    const api = (await import(indexPath)) as unknown as APIShape;

    const validator = new api.Validator();
    const resultTrue = validator.validate('data');
    const resultFalse = validator.validate(null);

    const typedValidator = validator as MockValidator;
    expect(resultTrue).toBe(true);
    expect(resultFalse).toBe(false);
    expect(typedValidator.calls).toEqual(['data', null]);
  });

  test('validateData: returns expected value (happy path)', async (): Promise<void> => {
    const api = (await import(indexPath)) as unknown as APIShape;

    const out = api.validateData({ foo: 'bar' });
    expect(out).toBe('ok');
    expect(validateDataMock).toHaveBeenCalledTimes(1);
  });

  test('validateData: propagates errors (error path)', async (): Promise<void> => {
    const api = (await import(indexPath)) as unknown as APIShape;

    expect(() => api.validateData('bad')).toThrowError(/invalid/);
    expect(validateDataMock).toHaveBeenCalledTimes(1);
  });

  test('Middleware: getGlobalMiddleware returns singleton and reset replaces it', async (): Promise<void> => {
    const api = (await import(indexPath)) as unknown as APIShape;

    const inst1 = api.getGlobalMiddleware();
    const inst2 = api.getGlobalMiddleware();
    expect(inst1).toBe(inst2);

    api.resetGlobalMiddleware();
    const inst3 = api.getGlobalMiddleware();
    expect(inst3).not.toBe(inst1);

    const typedInst3 = inst3 as MockValidationMiddleware;
    typedInst3.handle({ ok: true } as Record<string, unknown>);
    expect(typedInst3.calls.length).toBe(1);
  });
});
