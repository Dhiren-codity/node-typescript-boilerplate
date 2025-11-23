import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from './middleware.js';

vi.mock('./validator.js', (): Record<string, unknown> => {
  validateMock = vi.fn<ValidateFn>();
  ValidatorMock = vi.fn((_schema: unknown) => ({
    validate: validateMock,
  }));
  return {
    Validator: ValidatorMock,
  };


type ValidateFn = (data: Record<string, unknown>) => {
  valid: boolean;
  errors: { message: string }[];
  sanitized?: Record<string, unknown>;
};

let validateMock: Mock<Parameters<ValidateFn>, ReturnType<ValidateFn>>;

  describe('constructor', (): void => {
    test('should initialize with no schemas', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
    });



    test('should return false when unregistering non-existent schema', (): void => {
      const deleted = instance.unregisterSchema('missing');
      expect(deleted).toBe(false);
    });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(instance.getSchema('none')).toBeUndefined();
    });

      instance.registerSchema('s', schema);
      expect(instance.getSchema('s')).toBe(schema);
    });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => instance.validateWithSchema('missing', {})).toThrowError("Schema 'missing' not found");
    });

      instance.registerSchema('base', schema);

      const resultValue = {
        valid: true,
        errors: [],
        sanitized: { a: 'ok' },
      };
      validateMock.mockImplementation((_data: Record<string, unknown>): typeof resultValue => ({ ...resultValue }));

      const result = instance.validateWithSchema('base', { a: 'ok' });

      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(resultValue);
    });

      instance.registerSchema('early', schema);

      const multiErrorResult = {
        valid: false,
        errors: [{ message: 'e1' }, { message: 'e2' }, { message: 'e3' }],
        sanitized: { a: 'v' },
      };
      validateMock.mockImplementation((_data: Record<string, unknown>) => ({
        valid: multiErrorResult.valid,
        errors: [...multiErrorResult.errors],
        sanitized: { ...multiErrorResult.sanitized },
      }));

      const result = instance.validateWithSchema('early', { a: 'v' }, { abortEarly: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ message: 'e1' }]);
      expect(result.sanitized).toEqual({ a: 'v' });
    });

      instance.registerSchema('strip', schema);

      const res = {
        valid: true,
        errors: [],
        sanitized: { allowed1: 1, allowed2: 2, extra: 3, another: 4 },
      };
      validateMock.mockImplementation((_data: Record<string, unknown>) => ({
        valid: res.valid,
        errors: [...res.errors],
        sanitized: { ...res.sanitized },
      }));

      const result = instance.validateWithSchema('strip', { any: 'input' }, { stripUnknown: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({ allowed1: 1, allowed2: 2 });
    });

      instance.registerSchema('nosanitize', schema);

      const res = {
        valid: false,
        errors: [{ message: 'bad' }],
      };
      // @ts-expect-error purposely omitting sanitized
      validateMock.mockImplementation((_data: Record<string, unknown>) => ({
        valid: res.valid,
        errors: [...res.errors],
      }));

      const result = instance.validateWithSchema('nosanitize', { only: 'x' }, { stripUnknown: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ message: 'bad' }]);
      expect('sanitized' in result).toBe(false);
    });

      instance.registerSchema('both', schema);

      validateMock.mockImplementation((_data: Record<string, unknown>) => ({
        valid: false,
        errors: [{ message: 'first' }, { message: 'second' }],
        sanitized: { a: 1, b: 2, c: 3 },
      }));

      const result = instance.validateWithSchema('both', { any: 'data' }, { abortEarly: true, stripUnknown: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ message: 'first' }]);
      expect(result.sanitized).toEqual({ a: 1, b: 2 });
    });

      validateSpy.mockReturnValue({
        valid: expectedResult.valid,
        errors: [...expectedResult.errors],
        sanitized: { ...expectedResult.sanitized },
      });

      const options = { abortEarly: true, stripUnknown: true };
      const mw = instance.createMiddleware('mw', options);

      const input = { x: 1, y: 2 };
      const result = mw(input);

      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith('mw', input, options);
      expect(result).toEqual(expectedResult);
    });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => instance.batchValidate('nope', [{}])).toThrowError("Schema 'nope' not found");
    });

      instance.registerSchema('batch', schema);

      validateMock.mockImplementation((data: Record<string, unknown>) => {
        const ok = typeof data.v === 'number' && (data.v as number) > 0;
        return {
          valid: ok,
          errors: ok ? [] : [{ message: 'v must be > 0' }],
          sanitized: ok ? { v: data.v } : { v: data.v },
        };

      const inputs: Record<string, unknown>[] = [{ v: 1 }, { v: -1 }, { v: 2 }];
      const results = instance.batchValidate('batch', inputs);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });

      ];
      expect(instance.batchValidationPassed(results as unknown as { valid: boolean }[])).toBe(true);
    });

        { valid: false, errors: [{ message: 'e' }] },
      ];
      expect(instance.batchValidationPassed(results as unknown as { valid: boolean }[])).toBe(false);
    });

      instance.registerSchema('first', s1);
      instance.registerSchema('second', s2);

      expect(instance.getSchemaNames()).toEqual(['first', 'second']);
    });

  describe('getSchemaCount', (): void => {
    test('should return total number of registered schemas', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      const s1 = { rules: [{ field: 'a' }] } as unknown as never;
      instance.registerSchema('one', s1);
      expect(instance.getSchemaCount()).toBe(1);
      const s2 = { rules: [{ field: 'b' }] } as unknown as never;
      instance.registerSchema('two', s2);
      expect(instance.getSchemaCount()).toBe(2);
    });



  describe('getGlobalMiddleware', (): void => {
    test('should return the same instance across calls until reset', (): void => {
      const g1 = getGlobalMiddleware();
      const g2 = getGlobalMiddleware();
      expect(g1).toBe(g2);

      const schema = { rules: [{ field: 'g' }] } as unknown as never;
      g1.registerSchema('global', schema);
      expect(g2.getSchemaNames()).toEqual(['global']);
    });

      before.registerSchema('s', schema);
      expect(before.getSchemaCount()).toBe(1);

      resetGlobalMiddleware();

      const after = getGlobalMiddleware();
      expect(after).not.toBe(before);
      expect(after.getSchemaCount()).toBe(0);
      expect(after.getSchema('s')).toBeUndefined();
    });

  describe('resetGlobalMiddleware', (): void => {
    test('should be safe to call multiple times and recreate instance on next get', (): void => {
      resetGlobalMiddleware();
      resetGlobalMiddleware();

      const fresh = getGlobalMiddleware();
      expect(fresh).toBeDefined();
      expect(fresh.getSchemaCount()).toBe(0);
    });
