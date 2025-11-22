import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./schemas.js', () => {
  class MockSchemaBuilder {
    private value: string;
    constructor(value: string) {
      this.value = value;
    }
    build(): string {
      return `built:${this.value}`;
    }
  const ValidationLevel = { LOW: 'low', HIGH: 'high' } as const;
  return {
    ValidationLevel,
    SchemaBuilder: MockSchemaBuilder,
  };

vi.mock('./validator.js', () => {
  class MockValidator {
    validateCalledWith: unknown[] | null;
    constructor() {
      this.validateCalledWith = null;
    }
    validate(data: unknown): string {
      this.validateCalledWith = [data];
      return 'ok';
    }
  const validateData = vi.fn((data: unknown): string => {
    if (data === 'bad') {
      throw new Error('invalid');
    }
    return 'validated';
  });
  return { Validator: MockValidator, validateData };
});

vi.mock('./middleware.js', () => {
  class MockValidationMiddleware {
    calls: unknown[];
    constructor() {
      this.calls = [];
    }
    use(input: unknown): void {
      this.calls.push(input);
    }
  const middlewareInstance = new MockValidationMiddleware();
  const getGlobalMiddleware = vi.fn((): MockValidationMiddleware => middlewareInstance);
  const resetGlobalMiddleware = vi.fn((): void => {
    middlewareInstance.calls = [];
  });
  return {
    ValidationMiddleware: MockValidationMiddleware,
    getGlobalMiddleware,
    resetGlobalMiddleware,
  };

import {
  ValidationLevel,
  SchemaBuilder,
  Validator,
  validateData,
  ValidationMiddleware,
  getGlobalMiddleware,
  resetGlobalMiddleware,
} from './index';
import {
  ValidationLevel as MockedValidationLevel,
  SchemaBuilder as MockedSchemaBuilder,
} from './schemas.js';
import {
  Validator as MockedValidator,
  validateData as validateDataMock,
} from './validator.js';
import {
  ValidationMiddleware as MockedValidationMiddleware,
  getGlobalMiddleware as getGlobalMiddlewareMock,
  resetGlobalMiddleware as resetGlobalMiddlewareMock,
} from './middleware.js';


  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('ValidationLevel', () => {
    test('should be re-exported with exact identity and shape', (): void => {
      expect(ValidationLevel).toBe(MockedValidationLevel);
      expect(ValidationLevel).toBeDefined();
      expect(ValidationLevel).toMatchObject({ LOW: 'low', HIGH: 'high' });
    });

  describe('SchemaBuilder', () => {
    test('should be re-exported with exact identity', (): void => {
      expect(SchemaBuilder).toBe(MockedSchemaBuilder);
    });

      const output = builder.build();
      expect(output).toBe('built:input');
    });

  describe('Validator', () => {
    test('should be re-exported with exact identity', (): void => {
      expect(Validator).toBe(MockedValidator);
    });

      const result = instance.validate({ key: 'value' });
      expect(result).toBe('ok');
      expect(instance.validateCalledWith).toEqual([{ key: 'value' }]);
    });

  describe('validateData', () => {
    test('should be re-exported with exact identity', (): void => {
      expect(validateData).toBe(validateDataMock);
    });

    test('should validate successfully for good input', (): void => {
      const result = validateData('good');
      expect(result).toBe('validated');
      expect(vi.isMockFunction(validateData)).toBe(true);
      const mock = validateData as unknown as { mock: { calls: unknown[][] } };
      expect(mock.mock.calls.length).toBeGreaterThan(0);
      expect(mock.mock.calls[mock.mock.calls.length - 1][0]).toBe('good');
    });

    test('should throw for bad input', (): void => {
      expect(() => validateData('bad')).toThrowError('invalid');
    });

  describe('ValidationMiddleware and global middleware helpers', () => {
    test('ValidationMiddleware should be re-exported with exact identity', (): void => {
      expect(ValidationMiddleware).toBe(MockedValidationMiddleware);
    });

    test('getGlobalMiddleware should be re-exported with exact identity', (): void => {
      expect(getGlobalMiddleware).toBe(getGlobalMiddlewareMock);
    });

    test('resetGlobalMiddleware should be re-exported with exact identity', (): void => {
      expect(resetGlobalMiddleware).toBe(resetGlobalMiddlewareMock);
    });

    test('should get the same global instance and record calls', (): void => {
      const m1 = getGlobalMiddleware();
      const m2 = getGlobalMiddleware();
      expect(m1).toBe(m2);

      const middlewareInstance = m1 as unknown as {
        use: (input: unknown) => void;
        calls: unknown[];
      };
      middlewareInstance.use('event-a');
      expect(middlewareInstance.calls).toEqual(['event-a']);
    });

      instanceBefore.use('event-b');
      expect(instanceBefore.calls).toEqual(['event-b']);

      resetGlobalMiddleware();

      const instanceAfter = getGlobalMiddleware() as unknown as { calls: unknown[] };
      expect(instanceAfter.calls).toEqual([]);
    });
