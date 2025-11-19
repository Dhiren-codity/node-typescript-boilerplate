import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the modules re-exported by index.ts
vi.mock('./schemas.js', () => {
  class SchemaBuilder {
    rules: any[];
    constructor() {
      this.rules = [];
    }
    addRule(rule: any) {
      this.rules.push(rule);
      return this;
    }
    build() {
      return { built: true, rules: this.rules };
    }
  }

  const ValidationLevel = Object.freeze({
    LOW: 'LOW',
    HIGH: 'HIGH',
  });

  return {
    SchemaBuilder,
    ValidationLevel,
  };
});

vi.mock('./validator.js', () => {
  const validateData = vi.fn(async (data: any, schema?: any) => {
    if (data === 'throw') {
      throw new Error('validation failed');
    }
    return { valid: true, errors: [], data, schema };
  });

  class Validator {
    schema: any;
    validate: (data: any) => Promise<any>;
    constructor(schema?: any) {
      this.schema = schema;
      this.validate = vi.fn(async (data: any) => validateData(data, this.schema));
    }
  }

  return {
    Validator,
    validateData,
  };
});

vi.mock('./middleware.js', () => {
  const state: { global: any } = { global: null };

  const ValidationMiddleware = vi.fn((options?: { shouldThrow?: boolean }) => {
    const handler = vi.fn(async (_req?: any, _res?: any, next?: Function) => {
      if (options?.shouldThrow) {
        throw new Error('middleware error');
      }
      if (typeof next === 'function') next();
      return 'ok';
    });
    state.global = handler;
    return handler;
  });

  const getGlobalMiddleware = vi.fn(() => state.global);
  const resetGlobalMiddleware = vi.fn(() => {
    state.global = null;
  });

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

describe('src/validation/index.ts (barrel exports)', () => {
  let indexModule: any;
  let schemasModule: any;
  let validatorModule: any;
  let middlewareModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    indexModule = await import('./index');
    schemasModule = await import('./schemas.js');
    validatorModule = await import('./validator.js');
    middlewareModule = await import('./middleware.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should export expected symbols', () => {
    // Value exports
    expect(indexModule.ValidationLevel).toBeDefined();
    expect(indexModule.SchemaBuilder).toBeDefined();
    expect(indexModule.Validator).toBeDefined();
    expect(indexModule.validateData).toBeDefined();
    expect(indexModule.ValidationMiddleware).toBeDefined();
    expect(indexModule.getGlobalMiddleware).toBeDefined();
    expect(indexModule.resetGlobalMiddleware).toBeDefined();

    // Type-only exports should not exist at runtime
    const typeOnly = [
      'ValidationRule',
      'ValidationSchema',
      'ValidationError',
      'ValidationResult',
      'MiddlewareOptions',
    ];
    for (const t of typeOnly) {
      expect(indexModule[t]).toBeUndefined();
    }
  });

  describe('schemas re-exports', () => {
    test('ValidationLevel identity and values', () => {
      expect(indexModule.ValidationLevel).toBe(schemasModule.ValidationLevel);
      expect(indexModule.ValidationLevel.LOW).toBe('LOW');
      expect(indexModule.ValidationLevel.HIGH).toBe('HIGH');
    });

    test('SchemaBuilder functionality via re-export', () => {
      const builder = new indexModule.SchemaBuilder();
      expect(builder).toBeInstanceOf(schemasModule.SchemaBuilder);

      builder.addRule({ field: 'name', required: true }).addRule({ field: 'age', min: 18 });
      const schema = builder.build();

      expect(schema).toEqual({
        built: true,
        rules: [
          { field: 'name', required: true },
          { field: 'age', min: 18 },
        ],
      });
    });
  });

  describe('validator re-exports', () => {
    test('Validator identity and validateData delegation', async () => {
      expect(indexModule.Validator).toBe(validatorModule.Validator);
      expect(indexModule.validateData).toBe(validatorModule.validateData);

      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      const validator = new indexModule.Validator(schema);

      const res = await validator.validate({ name: 'Alice' });
      expect(res).toEqual({
        valid: true,
        errors: [],
        data: { name: 'Alice' },
        schema,
      });

      expect(validatorModule.validateData).toHaveBeenCalledTimes(1);
      expect(validatorModule.validateData).toHaveBeenCalledWith({ name: 'Alice' }, schema);
    });

    test('validateData re-export handles happy path', async () => {
      const schema = { fields: ['x'] };
      const result = await indexModule.validateData({ x: 1 }, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(validatorModule.validateData).toHaveBeenCalledWith({ x: 1 }, schema);
    });

    test('validateData re-export propagates errors', async () => {
      await expect(indexModule.validateData('throw', {})).rejects.toThrowError('validation failed');
      expect(validatorModule.validateData).toHaveBeenCalledWith('throw', {});
    });
  });

  describe('middleware re-exports', () => {
    test('ValidationMiddleware and global getters', async () => {
      const mw = indexModule.ValidationMiddleware({ shouldThrow: false });

      expect(indexModule.ValidationMiddleware).toBe(middlewareModule.ValidationMiddleware);
      expect(typeof mw).toBe('function');

      // should set global middleware internally
      const global = indexModule.getGlobalMiddleware();
      expect(global).toBe(mw);

      const next = vi.fn();
      const result = await mw({}, {}, next);
      expect(result).toBe('ok');
      expect(next).toHaveBeenCalledTimes(1);

      indexModule.resetGlobalMiddleware();
      expect(indexModule.getGlobalMiddleware()).toBeNull();
    });

    test('ValidationMiddleware propagates error from handler', async () => {
      const mw = indexModule.ValidationMiddleware({ shouldThrow: true });
      const next = vi.fn();

      await expect(mw({}, {}, next)).rejects.toThrowError('middleware error');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('public API consistency', () => {
    test('barrel re-export maintains identity of original members', () => {
      expect(indexModule.SchemaBuilder).toBe(schemasModule.SchemaBuilder);
      expect(indexModule.ValidationLevel).toBe(schemasModule.ValidationLevel);
      expect(indexModule.Validator).toBe(validatorModule.Validator);
      expect(indexModule.validateData).toBe(validatorModule.validateData);
      expect(indexModule.ValidationMiddleware).toBe(middlewareModule.ValidationMiddleware);
      expect(indexModule.getGlobalMiddleware).toBe(middlewareModule.getGlobalMiddleware);
      expect(indexModule.resetGlobalMiddleware).toBe(middlewareModule.resetGlobalMiddleware);
    });
  });
});
