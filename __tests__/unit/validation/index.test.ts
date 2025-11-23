import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/validation/schemas.js', () => {
  class MockSchemaBuilder {
    public createdWith: unknown[];
    public built: boolean;
    constructor(...args: unknown[]) {
      this.createdWith = args;
      this.built = false;
    }
    build(): string {
      this.built = true;
      return 'built';
    }

  const ValidationLevel = Object.freeze({ NONE: 0, WARN: 1, ERROR: 2 });
vi.mock('../src/validation/validator.js', () => {
  class MockValidator {
    public schema: unknown;
    constructor(schema: unknown) {
      this.schema = schema;
    }
    validate(data: unknown): string {
      return `ok:${String(data)}`;
    }
  }

  const validateData = vi.fn((data: unknown) => {
    if (data === 'bad') {
      throw new Error('validation failed');
    }
    return { valid: true, data };
  });
vi.mock('../src/validation/middleware.js', () => {
  class MockValidationMiddleware {
    public options?: Record<string, unknown>;
    constructor(options?: Record<string, unknown>) {
      this.options = options;
    }
    handle(_input: unknown): string {
      return 'handled';
    }
  }

  const getGlobalMiddleware = vi.fn(() => ({ name: 'global' }));
  const resetGlobalMiddleware = vi.fn((): void => {
    // no-op
  });



  return {
    ValidationLevel,
    SchemaBuilder: MockSchemaBuilder,
  };
});


  return {
    Validator: MockValidator,
    validateData,
  };
});


  return {
    ValidationMiddleware: MockValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});


  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('exports shape', () => {
    test('should export expected runtime members', async (): Promise<void> => {
      const mod = await import('../src/validation/index');
      expect(mod.ValidationLevel).toBeDefined();
      expect(mod.SchemaBuilder).toBeDefined();
      expect(mod.Validator).toBeDefined();
      expect(mod.validateData).toBeDefined();
      expect(mod.ValidationMiddleware).toBeDefined();
      expect(mod.getGlobalMiddleware).toBeDefined();
      expect(mod.resetGlobalMiddleware).toBeDefined();

      expect(typeof mod.validateData).toBe('function');
      expect(typeof mod.getGlobalMiddleware).toBe('function');
      expect(typeof mod.resetGlobalMiddleware).toBe('function');
    });
  });

  describe('ValidationLevel re-export', () => {
    test('should be the same reference as in schemas module', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const schemas = await import('../src/validation/schemas.js');
      expect(sut.ValidationLevel).toBe(schemas.ValidationLevel);
      expect(sut.ValidationLevel).toEqual({ NONE: 0, WARN: 1, ERROR: 2 });
    });
  });

  describe('SchemaBuilder re-export', () => {
    test('should be the same class reference and construct instances', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const schemas = await import('../src/validation/schemas.js');
      expect(sut.SchemaBuilder).toBe(schemas.SchemaBuilder);

      const builder = new sut.SchemaBuilder('arg1', { key: 'value' });
      expect(builder).toBeInstanceOf(schemas.SchemaBuilder);
      expect('createdWith' in builder).toBe(true);
      const builtResult = (builder as unknown as { build: () => string }).build();
      expect(builtResult).toBe('built');
      expect((builder as unknown as { built: boolean }).built).toBe(true);
    });
  });

  describe('Validator re-export', () => {
    test('should be the same class reference and work as expected', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const validatorMod = await import('../src/validation/validator.js');
      expect(sut.Validator).toBe(validatorMod.Validator);

      const schema: Record<string, unknown> = { type: 'object' };
      const instance = new sut.Validator(schema);
      expect(instance).toBeInstanceOf(validatorMod.Validator);

      const validateMethod = instance as unknown as { validate: (data: unknown) => string };
      const output = validateMethod.validate('data');
      expect(output).toBe('ok:data');
      expect((instance as unknown as { schema: unknown }).schema).toBe(schema);
    });
  });

  describe('validateData re-export and behavior', () => {
    test('should be the same function reference and return value from mock', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const validatorMod = await import('../src/validation/validator.js');
      expect(sut.validateData).toBe(validatorMod.validateData);

      const result = sut.validateData({ a: 1 });
      expect(validatorMod.validateData).toHaveBeenCalledTimes(1);
      expect(validatorMod.validateData).toHaveBeenCalledWith({ a: 1 });
      expect(result).toEqual({ valid: true, data: { a: 1 } });
    });

    test('should propagate errors from underlying validateData', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      await expect(async (): Promise<void> => {
        // call inside async wrapper to use toThrowAsync-like pattern
        // but we can use expect(() => sut.validateData('bad')).toThrow()
      }).resolves.toBeUndefined();
      expect(() => sut.validateData('bad')).toThrow(new Error('validation failed'));
    });
  });

  describe('ValidationMiddleware re-export', () => {
    test('should be the same class reference and handle calls', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const middlewareMod = await import('../src/validation/middleware.js');
      expect(sut.ValidationMiddleware).toBe(middlewareMod.ValidationMiddleware);

      const options: Record<string, unknown> = { strict: true };
      const mw = new sut.ValidationMiddleware(options);
      expect(mw).toBeInstanceOf(middlewareMod.ValidationMiddleware);
      expect((mw as unknown as { options?: Record<string, unknown> }).options).toEqual(options);
      const handleResult = (mw as unknown as { handle: (input: unknown) => string }).handle({ x: 1 });
      expect(handleResult).toBe('handled');
    });
  });

  describe('global middleware functions re-export', () => {
    test('getGlobalMiddleware should proxy to underlying function', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const middlewareMod = await import('../src/validation/middleware.js');
      expect(sut.getGlobalMiddleware).toBe(middlewareMod.getGlobalMiddleware);

      const ret = sut.getGlobalMiddleware();
      expect(middlewareMod.getGlobalMiddleware).toHaveBeenCalledTimes(1);
      expect(ret).toEqual({ name: 'global' });
    });

    test('resetGlobalMiddleware should proxy and be callable', async (): Promise<void> => {
      const sut = await import('../src/validation/index');
      const middlewareMod = await import('../src/validation/middleware.js');
      expect(sut.resetGlobalMiddleware).toBe(middlewareMod.resetGlobalMiddleware);

      sut.resetGlobalMiddleware();
      expect(middlewareMod.resetGlobalMiddleware).toHaveBeenCalledTimes(1);
    });
  });
});
