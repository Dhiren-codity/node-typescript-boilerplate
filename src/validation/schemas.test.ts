import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule } from '../../src/validation/schemas';

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  afterEach((): void => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default values', (): void => {
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should set provided level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = custom.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule and return the same instance (chainable)', (): void => {
      const rule: ValidationRule = {
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 120,
      };
      const returned = builder.addRule(rule);
      expect(returned).toBe(builder);

      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toEqual(rule);
    });

    test('should support customValidator reference', (): void => {
      const validator = (value: unknown): boolean => typeof value === 'string';
      const rule: ValidationRule = {
        field: 'nickname',
        type: 'string',
        required: false,
        customValidator: validator,
      };
      builder.addRule(rule);
      const schema = builder.build();
      expect(schema.rules[0].customValidator).toBe(validator);
      // Indirect check: call the stored validator
      const result = schema.rules[0].customValidator ? schema.rules[0].customValidator('john') : false;
      expect(result).toBe(true);
    });

    test('should not throw when adding rule with minimal properties', (): void => {
      const rule: ValidationRule = {
        field: 'flag',
        type: 'boolean',
        required: true,
      };
      expect((): void => {
        builder.addRule(rule);
      }).not.toThrow();
    });
  });

  describe('stringField', (): void => {
    test('should add required string field with options', (): void => {
      const pattern = /^[A-Z][a-z]+$/;
      builder.stringField('name', true, {
        minLength: 2,
        maxLength: 50,
        pattern,
        errorMessage: 'Invalid name',
      });
      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      const rule = schema.rules[0];
      expect(rule.field).toBe('name');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBe(2);
      expect(rule.maxLength).toBe(50);
      expect(rule.pattern).toBe(pattern);
      expect(rule.errorMessage).toBe('Invalid name');
    });

    test('should add optional string field without options', (): void => {
      builder.stringField('bio', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('bio');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(false);
      expect(rule.minLength).toBeUndefined();
      expect(rule.maxLength).toBeUndefined();
      expect(rule.pattern).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });
  });

  describe('numberField', (): void => {
    test('should add number field with min and max', (): void => {
      builder.numberField('age', true, { min: 18, max: 99, errorMessage: 'Invalid age' });
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('age');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBe(18);
      expect(rule.max).toBe(99);
      expect(rule.errorMessage).toBe('Invalid age');
    });

    test('should add optional number field without options', (): void => {
      builder.numberField('score', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('score');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(false);
      expect(rule.min).toBeUndefined();
      expect(rule.max).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });
  });

  describe('emailField', (): void => {
    test('should add email field with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      const isValid = rule.pattern ? rule.pattern.test('user@example.com') : false;
      const isInvalid = rule.pattern ? rule.pattern.test('invalid-email') : true;
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should add optional email field with custom error message', (): void => {
      builder.emailField('backupEmail', false, 'Bad email');
      const rule = builder.build().rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad email');
    });
  });

  describe('urlField', (): void => {
    test('should add url field with default error message', (): void => {
      builder.urlField('website');
      const rule = builder.build().rules[0];
      expect(rule.field).toBe('website');
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
      // No pattern enforced by builder for URL
      expect(rule.pattern).toBeUndefined();
    });

    test('should add optional url field with custom error message', (): void => {
      builder.urlField('portfolio', false, 'Bad URL');
      const rule = builder.build().rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean field', (): void => {
      builder.booleanField('isActive');
      const rule = builder.build().rules[0];
      expect(rule.field).toBe('isActive');
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

    test('should add optional boolean field', (): void => {
      builder.booleanField('isVerified', false);
      const rule = builder.build().rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add required array field', (): void => {
      builder.arrayField('tags');
      const rule = builder.build().rules[0];
      expect(rule.field).toBe('tags');
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

    test('should add optional array field', (): void => {
      builder.arrayField('items', false);
      const rule = builder.build().rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add required object field', (): void => {
      builder.objectField('profile');
      const rule = builder.build().rules[0];
      expect(rule.field).toBe('profile');
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

    test('should add optional object field', (): void => {
      builder.objectField('metadata', false);
      const rule = builder.build().rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should default to false and allow enabling', (): void => {
      expect(builder.build().allowUnknownFields).toBe(false);
      builder.allowUnknown();
      expect(builder.build().allowUnknownFields).toBe(true);
    });

    test('should be able to explicitly disable', (): void => {
      builder.allowUnknown(true);
      expect(builder.build().allowUnknownFields).toBe(true);
      builder.allowUnknown(false);
      expect(builder.build().allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      expect(builder.build().level).toBe(ValidationLevel.Strict);
      builder.setLevel(ValidationLevel.Lenient);
      expect(builder.build().level).toBe(ValidationLevel.Lenient);
    });

    test('should not throw when setting an invalid level (runtime misuse)', (): void => {
      // Cast to bypass TS at compile-time; builder does not validate at runtime
      const invalidLevel = 'unknown' as unknown as ValidationLevel;
      expect((): void => {
        builder.setLevel(invalidLevel);
      }).not.toThrow();
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of internal schema', (): void => {
      builder.stringField('name').numberField('age');
      const schema1 = builder.build();
      const schema2 = builder.build();
      expect(schema1).not.toBe(schema2);
      expect(schema1.rules).toBe(schema2.rules); // shallow copy keeps array reference
    });

    test('mutating returned schema name should not affect builder', (): void => {
      const schema1 = builder.build();
      schema1.name = 'Altered';
      const schema2 = builder.build();
      expect(schema2.name).toBe('TestSchema');
    });

    test('mutating returned rules array should affect builder due to shallow copy', (): void => {
      const schema1 = builder.build();
      const additional: ValidationRule = {
        field: 'extra',
        type: 'string',
        required: false,
      };
      schema1.rules.push(additional);
      const schema2 = builder.build();
      expect(schema2.rules.some((r): boolean => r.field === 'extra')).toBe(true);
    });
  });

  describe('chaining', (): void => {
    test('should support chained field definitions and configuration', (): void => {
      builder
        .stringField('name', true, { minLength: 1 })
        .numberField('age', true, { min: 0 })
        .emailField('email')
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict);

      const schema = builder.build();
      expect(schema.rules.map((r): string => r.field)).toEqual(['name', 'age', 'email']);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });
});
