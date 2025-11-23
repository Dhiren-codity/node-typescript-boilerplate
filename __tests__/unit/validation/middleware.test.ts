import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidationSchema, ValidationResult } from '../../src/validation/schemas.js';
import { ValidationMiddleware, getGlobalMiddleware, resetGlobalMiddleware } from '../../src/validation/middleware.ts';
import { Validator as MockedValidator } from '../../src/validation/validator.js';

vi.mock('../../src/validation/validator.js', (): Record<string, unknown> => {
  const Validator = vi.fn().mockImplementation((_schema: unknown) => {
    return {
      validate: vi.fn(),
    };
  });


  return { Validator };
});

type MockFunction<TArgs extends unknown[], TReturn> = ((...args: TArgs) => TReturn) & {
  mockReturnValue: (value: TReturn) => unknown;
  mockReturnValueOnce: (value: TReturn) => unknown;
  mockImplementation: (impl: (...args: TArgs) => TReturn) => unknown;
  mockClear: () => unknown;
};

type MockValidatorInstance = {
  validate: MockFunction<[Record<string, unknown>], ValidationResult>;
};

const getValidatorCtor = (): { mock: { instances: MockValidatorInstance[]; calls: unknown[][] } } => {
  return MockedValidator as unknown as { mock: { instances: MockValidatorInstance[]; calls: unknown[][] } };
};

const getValidatorMockInstance = (index: number = 0): MockValidatorInstance => {
  const ctor = getValidatorCtor();
  return ctor.mock.instances[index];
};

const makeSchema = (fields: string[]): ValidationSchema => {
  const rules = fields.map((field) => ({ field }));
  return { rules } as unknown as ValidationSchema;
};

const makeResult = (overrides?: Partial<ValidationResult>): ValidationResult => {
  const base: ValidationResult = {
    valid: true,
    errors: [],
    sanitized: {},
  } as unknown as ValidationResult;
  return { ...base, ...overrides } as ValidationResult;
};

describe('ValidationMiddleware', (): void => {
  let instance: ValidationMiddleware;

  beforeEach((): void => {
    vi.clearAllMocks();
    instance = new ValidationMiddleware();
  });

  afterEach((): void => {
    resetGlobalMiddleware();
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with empty schema registry', (): void => {
      expect(instance).toBeDefined();
      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
    });
  });

  describe('registerSchema', (): void => {
    test('should store schema and create validator instance', (): void => {
      const schema = makeSchema(['id', 'name']);
      instance.registerSchema('user', schema);

      expect(instance.getSchema('user')).toBe(schema);

      const ctor = getValidatorCtor();
      expect(ctor.mock.instances.length).toBe(1);
      expect(ctor.mock.calls[0][0]).toBe(schema);
    });

    test('should overwrite existing schema and validator for same name', (): void => {
      const schemaA = makeSchema(['a']);
      const schemaB = makeSchema(['b']);

      instance.registerSchema('dup', schemaA);
      instance.registerSchema('dup', schemaB);

      expect(instance.getSchema('dup')).toBe(schemaB);
      const ctor = getValidatorCtor();
      expect(ctor.mock.instances.length).toBe(2);
      expect(ctor.mock.calls[1][0]).toBe(schemaB);
    });
  });

  describe('unregisterSchema', (): void => {
    test('should remove existing schema and return true', (): void => {
      const schema = makeSchema(['id']);
      instance.registerSchema('toRemove', schema);

      const removed = instance.unregisterSchema('toRemove');
      expect(removed).toBe(true);
      expect(instance.getSchema('toRemove')).toBeUndefined();
      expect((): void => {
        // no-op
      }).toBeDefined();
      expect(() => instance.validateWithSchema('toRemove', {})).toThrowError("Schema 'toRemove' not found");
    });

    test('should return false when schema does not exist', (): void => {
      const removed = instance.unregisterSchema('missing');
      expect(removed).toBe(false);
    });
  });

  describe('getSchema', (): void => {
    test('should return undefined for unknown schema', (): void => {
      expect(instance.getSchema('unknown')).toBeUndefined();
    });

    test('should return registered schema', (): void => {
      const schema = makeSchema(['x']);
      instance.registerSchema('known', schema);
      expect(instance.getSchema('known')).toBe(schema);
    });
  });

  describe('validateWithSchema', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => instance.validateWithSchema('none', {})).toThrowError("Schema 'none' not found");
    });

    test('should call validator and return its result', (): void => {
      const schema = makeSchema(['id', 'name']);
      instance.registerSchema('user', schema);

      const validatorInstance = getValidatorMockInstance(0);
      const expected = makeResult({ valid: true, errors: [], sanitized: { id: 1, name: 'Ada' } });
      validatorInstance.validate.mockReturnValue(expected);

      const result = instance.validateWithSchema('user', { id: 1, name: 'Ada' });
      expect(result).toBe(expected);
      expect(validatorInstance.validate).toHaveBeenCalledTimes(1);
      expect(validatorInstance.validate).toHaveBeenCalledWith({ id: 1, name: 'Ada' });
    });

    test('should apply abortEarly option to keep only the first error', (): void => {
      const schema = makeSchema(['f1']);
      instance.registerSchema('early', schema);

      const validatorInstance = getValidatorMockInstance(0);
      const resultWithManyErrors = makeResult({
        valid: false,
        errors: ['e1', 'e2', 'e3'] as unknown as string[],
        sanitized: { f1: 'v' },
      });
      validatorInstance.validate.mockReturnValue(resultWithManyErrors);

      const result = instance.validateWithSchema('early', { f1: 'v' }, { abortEarly: true });
      expect(result.errors).toEqual(['e1']);
    });

    test('should strip unknown fields when stripUnknown is true and sanitized is present', (): void => {
      const schema = makeSchema(['name', 'age']);
      instance.registerSchema('strip', schema);

      const validatorInstance = getValidatorMockInstance(0);
      const rawSanitized = { name: 'Ada', age: 25, extra: 'drop-me' };
      const base = makeResult({ valid: true, errors: [], sanitized: rawSanitized });
      validatorInstance.validate.mockReturnValue(base);

      const result = instance.validateWithSchema('strip', { name: 'Ada', age: 25, extra: 'drop-me' }, { stripUnknown: true });
      expect(result.sanitized).toEqual({ name: 'Ada', age: 25 });
    });

    test('should not fail stripUnknown when sanitized is undefined', (): void => {
      const schema = makeSchema(['a']);
      instance.registerSchema('noSan', schema);

      const validatorInstance = getValidatorMockInstance(0);
      const base = makeResult({ valid: true, errors: [], sanitized: undefined as unknown as Record<string, unknown> });
      validatorInstance.validate.mockReturnValue(base);

      const result = instance.validateWithSchema('noSan', { a: 1 }, { stripUnknown: true });
      expect(result.sanitized).toBeUndefined();
    });
  });

  describe('createMiddleware', (): void => {
    test('should return a function that delegates to validateWithSchema with provided options', (): void => {
      const schema = makeSchema(['field']);
      instance.registerSchema('mw', schema);

      const spy = vi.spyOn(instance, 'validateWithSchema');
      const expected = makeResult({ valid: true, errors: [], sanitized: { field: 1 } });
      spy.mockReturnValue(expected);

      const options = { abortEarly: true, stripUnknown: true };
      const middlewareFn = instance.createMiddleware('mw', options);

      const input = { field: 1, other: 2 };
      const output = middlewareFn(input);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('mw', input, options);
      expect(output).toBe(expected);
    });
  });

  describe('batchValidate', (): void => {
    test('should throw when schema not found', (): void => {
      expect(() => instance.batchValidate('missing', [{}])).toThrowError("Schema 'missing' not found");
    });

    test('should validate multiple data entries and return all results', (): void => {
      const schema = makeSchema(['n']);
      instance.registerSchema('batch', schema);

      const validatorInstance = getValidatorMockInstance(0);
      const r1 = makeResult({ valid: true, errors: [], sanitized: { n: 1 } });
      const r2 = makeResult({ valid: false, errors: ['bad'] as unknown as string[], sanitized: { n: 2 } });
      validatorInstance.validate.mockReturnValueOnce(r1).mockReturnValueOnce(r2);

      const results = instance.batchValidate('batch', [{ n: 1 }, { n: 2 }]);
      expect(results).toEqual([r1, r2]);
      expect(validatorInstance.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchValidationPassed', (): void => {
    test('should return true when all results are valid', (): void => {
      const results: ValidationResult[] = [
        makeResult({ valid: true }),
        makeResult({ valid: true }),
      ];
      expect(instance.batchValidationPassed(results)).toBe(true);
    });

    test('should return false when any result is invalid', (): void => {
      const results: ValidationResult[] = [
        makeResult({ valid: true }),
        makeResult({ valid: false }),
        makeResult({ valid: true }),
      ];
      expect(instance.batchValidationPassed(results)).toBe(false);
    });
  });

  describe('getSchemaNames', (): void => {
    test('should list registered schema names', (): void => {
      instance.registerSchema('one', makeSchema(['a']));
      instance.registerSchema('two', makeSchema(['b']));
      const names = instance.getSchemaNames();
      expect(names.sort()).toEqual(['one', 'two'].sort());
    });
  });

  describe('getSchemaCount', (): void => {
    test('should return the number of registered schemas', (): void => {
      expect(instance.getSchemaCount()).toBe(0);
      instance.registerSchema('s1', makeSchema(['x']));
      instance.registerSchema('s2', makeSchema(['y']));
      expect(instance.getSchemaCount()).toBe(2);
    });
  });

  describe('clearAll', (): void => {
    test('should remove all schemas and validators', (): void => {
      instance.registerSchema('a', makeSchema(['a']));
      instance.registerSchema('b', makeSchema(['b']));
      expect(instance.getSchemaCount()).toBe(2);

      instance.clearAll();
      expect(instance.getSchemaCount()).toBe(0);
      expect(instance.getSchemaNames()).toEqual([]);
      expect(instance.getSchema('a')).toBeUndefined();
      expect(() => instance.validateWithSchema('a', {})).toThrowError("Schema 'a' not found");
    });
  });
});

describe('Global ValidationMiddleware instance', (): void => {
  afterEach((): void => {
    resetGlobalMiddleware();
  });

  describe('getGlobalMiddleware', (): void => {
    test('should create and return a singleton instance', (): void => {
      const first = getGlobalMiddleware();
      const second = getGlobalMiddleware();

      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first).toBe(second);
      expect(first.getSchemaCount()).toBe(0);
    });
  });

  describe('resetGlobalMiddleware', (): void => {
    test('should reset the singleton so a new instance is created next time', (): void => {
      const before = getGlobalMiddleware();
      resetGlobalMiddleware();
      const after = getGlobalMiddleware();

      expect(after).toBeDefined();
      expect(before).not.toBe(after);
    });
  });
});
