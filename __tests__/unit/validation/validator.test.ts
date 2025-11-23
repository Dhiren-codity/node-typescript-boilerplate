import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Validator, validateData } from './validator.ts';
import { ValidationLevel } from './schemas.js';
import type { ValidationSchema, ValidationRule, ValidationResult } from './schemas.js';

vi.mock('./schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Relaxed: 'Relaxed',
  },
}));


describe('Validator', (): void => {
  let schema: ValidationSchema;
  let validator: Validator;

  beforeEach((): void => {
    const rules: ValidationRule[] = [
      { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 10 },
      { field: 'age', type: 'number', required: true, min: 18, max: 99 },
      { field: 'email', type: 'email', required: true },
      { field: 'website', type: 'url', required: false },
      { field: 'tags', type: 'array', required: false },
      { field: 'profile', type: 'object', required: false },
      { field: 'code', type: 'string', required: false, pattern: /^\d{3}$/ },
      { field: 'flag', type: 'boolean', required: false },
      { field: 'token', type: 'string', required: false, customValidator: (v: unknown): boolean => typeof v === 'string' && v.startsWith('tok_') },
    ];

    schema = {
      rules,
      level: ValidationLevel.Strict,
      allowUnknownFields: false,
    };

    validator = new Validator(schema as ConstructorParameters<typeof Validator>[0]);
  });


// Type declarations for the mocked module to satisfy TypeScript
declare module './schemas.js' {
  export type PrimitiveTypes = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';

  export interface ValidationRule {
    field: string;
    type: PrimitiveTypes;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    customValidator?: (value: unknown) => boolean;
    errorMessage?: string;
  }

  export interface ValidationError {
    field: string;
    value: unknown;
    message: string;
    rule: string;
  }

  export enum ValidationLevel {
    Strict = 'Strict',
    Relaxed = 'Relaxed',
  }

  export interface ValidationSchema {
    rules: ValidationRule[];
    level: ValidationLevel;
    allowUnknownFields?: boolean;
  }

  export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    sanitized?: Record<string, unknown>;
  }
}

// Runtime mock for the dependency module

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('constructor and configuration', (): void => {
    test('should initialize and expose level and schema correctly', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);

      const returnedSchema = validator.getSchema();
      expect(returnedSchema).toBeDefined();
      expect(returnedSchema).not.toBe(schema);
      // Shallow copy: rules array is same reference
      expect((returnedSchema as ValidationSchema).rules).toBe(schema.rules);
    });

    test('should update validation level', (): void => {
      validator.setLevel(ValidationLevel.Relaxed);
      expect(validator.getLevel()).toBe(ValidationLevel.Relaxed);
    });
  });

  describe('validate', (): void => {

      const result = validator.validate(data) as ValidationResult;
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Unknown field should be a warning in Relaxed mode
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Unknown field 'extra'");

      expect(result.sanitized).toBeDefined();
      const sanitized = result.sanitized as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'extra')).toBe(false);
      expect(sanitized.name).toBe('Alice'); // trimmed
      expect(sanitized.age).toBe(30);
      expect(sanitized.email).toBe('alice@example.com');
      expect(sanitized.website).toBe('https://example.com');
      expect(sanitized.code).toBe('123');
      expect(sanitized.flag).toBe(true);
      expect(sanitized.token).toBe('tok_123');
    });


      const result = validator.validate(data) as ValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'extra')).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeUndefined();
    });


      const result = validator.validate(data) as ValidationResult;
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(result.sanitized as Record<string, unknown>, 'extra')).toBe(false);
    });

      };
    });

      const result = validator.validate(data) as ValidationResult;
      expect(result.valid).toBe(false);
      // tags should have type error
      expect(result.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
      // profile should have type error (array provided but object expected)
      expect(result.errors.some((e) => e.field === 'profile' && e.rule === 'type')).toBe(true);
      // flag should have type error
      expect(result.errors.some((e) => e.field === 'flag' && e.rule === 'type')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

      };
    });
      };
      };
    });

      // Add a rule whose validator throws
      schema.rules.push({
        field: 'customThrow',
        type: 'string',
        required: false,
        customValidator: (_v: unknown): boolean => {
          throw new Error('boom');
        },
      });

      validator = new Validator(schema as ConstructorParameters<typeof Validator>[0]);

      const data: Record<string, unknown> = {
        name: 'Ok',
        age: 25,
        email: 'x@y.com',
        code: '123',
        token: 'tok_abc',
        customFail: 'x',
        customThrow: 'y',
      };

      const result = validator.validate(data) as ValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'customFail' && e.rule === 'custom')).toBe(true);
      const throwErr = result.errors.find((e) => e.field === 'customThrow');
      expect(throwErr?.rule).toBe('custom_error');
      expect(throwErr?.message).toContain('Custom validator threw error: boom');
      expect(result.sanitized).toBeUndefined();
    });

    });
  describe('validateData helper', (): void => {

      const data: Record<string, unknown> = { name: '  John  ' };
      const result = validateData(data, localSchema) as ValidationResult;

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as Record<string, unknown>).name).toBe('John');
    });


      const data: Record<string, unknown> = { name: 'Al' };
      const result = validateData(data, localSchema) as ValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });
  });
