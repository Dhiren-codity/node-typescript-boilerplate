import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('./schemas.js', () => {
  const ValidationLevel = Object.freeze({
    STRICT: 'strict',
    LENIENT: 'lenient',
  });

  class SchemaBuilder {
    private rules: Record<string, unknown>;

    constructor(rules?: Record<string, unknown>) {
      this.rules = rules ?? {};
    }

    public build(): Record<string, unknown> {
      if (this.rules.invalid === true) {
        throw new Error('Invalid schema');
      }
      return this.rules;
    }
  }

  return {
    ValidationLevel,
    SchemaBuilder,
  };
});

vi.mock('./validator.js', () => {
  class Validator {
    public validate(data: unknown): { ok: boolean; data: unknown } {
      if (data === 'bad') {
        throw new Error('Validator error');
      }
      return { ok: true, data };
    }
  }

  const validateData = vi.fn((data: unknown): { ok: boolean; data: unknown } => {
    return { ok: true, data };
  });

  return {
    Validator,
    validateData,
  };
});

vi.mock('./middleware.js', () => {
  class ValidationMiddleware {
    public handle(input: unknown): string {
      if (input === 'bad') {
        throw new Error('Middleware error');
      }
      return `handled:${String(input)}`;
    }
  }

  const getGlobalMiddleware = vi.fn((): { id: string } => {
    return { id: 'global' };
  });

  const resetGlobalMiddleware = vi.fn((): void => {
    // no-op
  });

  return {
    ValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };
});

import {
  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from './index.ts';


  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('schemas re-exports', () => {
    test('ValidationLevel should expose constants', () : void => {
      expect(ValidationLevel).toBeDefined();
      expect(ValidationLevel.STRICT).toBe('strict');
      expect(ValidationLevel.LENIENT).toBe('lenient');
    });

      const built = builder.build();
      expect(built).toEqual({ foo: 'bar' });
    });

      expect(() => builder.build()).toThrowError('Invalid schema');
    });
  });

    });

    test('Validator should throw on bad input', () : void => {
      const v = new Validator();
      expect(() => v.validate('bad')).toThrowError('Validator error');
    });

      expect(res).toEqual({ ok: true, data: { id: 1 } });
      const validateDataMock = validateData as unknown as Mock;
      expect(validateDataMock).toHaveBeenCalledTimes(1);
      expect(validateDataMock).toHaveBeenCalledWith({ id: 1 });
    });

      expect(() => validateData({})).toThrowError('validateData boom');
    });
  });

  describe('middleware re-exports', () => {
    test('ValidationMiddleware should handle input', () : void => {
      const mw = new ValidationMiddleware();
      const output = mw.handle('test');
      expect(output).toBe('handled:test');
    });

    test('ValidationMiddleware should throw on bad input', () : void => {
      const mw = new ValidationMiddleware();
      expect(() => mw.handle('bad')).toThrowError('Middleware error');
    });

    test('getGlobalMiddleware should return default object', () : void => {
      const gm = getGlobalMiddleware();
      expect(gm).toEqual({ id: 'global' });
      const getGlobalMiddlewareMock = getGlobalMiddleware as unknown as Mock;
      expect(getGlobalMiddlewareMock).toHaveBeenCalledTimes(1);
    });

      expect(() => getGlobalMiddleware()).toThrowError('getGlobalMiddleware boom');
    });

    test('resetGlobalMiddleware should be callable', () : void => {
      resetGlobalMiddleware();
      const resetGlobalMiddlewareMock = resetGlobalMiddleware as unknown as Mock;
      expect(resetGlobalMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });
});
