import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from 'src/validation/schemas';

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default level and empty rules', (): void => {
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
    test('should add rule and return this for chaining', (): void => {
      const rule = {
        field: 'age',
        type: 'number',
        required: true,
        min: 18,
        max: 99,
      };
      const returned = builder.addRule(rule);
      expect(returned).toBe(builder);

      const schema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toMatchObject(rule);
    });

    test('should not throw when adding a complex rule with customValidator', (): void => {
      const complexRule = {
        field: 'meta',
        type: 'object',
        required: false,
        customValidator: (value: unknown): boolean => typeof value === 'object' && value !== null,
        errorMessage: 'Invalid meta',
      };
      expect((): void => {
        builder.addRule(complexRule);
      }).not.toThrow();

      const schema = builder.build();
      expect(schema.rules[0].field).toBe('meta');
      expect(typeof schema.rules[0].customValidator).toBe('function');
    });
  });

  describe('stringField', (): void => {
    test('should add required string field with options', (): void => {
      const pattern = /^[A-Z][a-z]+$/;
      builder.stringField('firstName', true, {
        minLength: 2,
        maxLength: 30,
        pattern,
        errorMessage: 'Invalid name',
      });
      const schema = builder.build();
      expect(schema.rules.length).toBe(1);
      const rule = schema.rules[0];
      expect(rule.field).toBe('firstName');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBe(2);
      expect(rule.maxLength).toBe(30);
      expect(rule.pattern).toBe(pattern);
      expect(rule.errorMessage).toBe('Invalid name');
      expect(rule.pattern?.test('John')).toBe(true);
      expect(rule.pattern?.test('john')).toBe(false);
    });

    test('should add optional string field with pattern and custom message', (): void => {
      const pattern = /^\d{3}$/;
      builder.stringField('code', false, { pattern, errorMessage: 'Invalid code' });
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.pattern).toBe(pattern);
      expect(rule.errorMessage).toBe('Invalid code');
    });
  });

  describe('numberField', (): void => {
    test('should add number field with min and max', (): void => {
      builder.numberField('age', true, { min: 0, max: 120, errorMessage: 'Invalid age' });
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('age');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(120);
      expect(rule.errorMessage).toBe('Invalid age');
    });

    test('should add optional number field', (): void => {
      builder.numberField('score', false);
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('score');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(false);
      expect(rule.min).toBeUndefined();
      expect(rule.max).toBeUndefined();
    });
  });

  describe('emailField', (): void => {
    test('should add email field with default regex and message', (): void => {
      builder.emailField('email');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.pattern?.test('user@example.com')).toBe(true);
      expect(rule.pattern?.test('userexample.com')).toBe(false);
    });

    test('should add optional email field with custom message', (): void => {
      builder.emailField('contactEmail', false, 'Custom invalid email');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Custom invalid email');
    });
  });

  describe('urlField', (): void => {
    test('should add required url field with default message and no pattern', (): void => {
      builder.urlField('website');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('website');
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
      expect(rule.pattern).toBeUndefined();
    });

    test('should add optional url field with custom message', (): void => {
      builder.urlField('homepage', false, 'Custom URL error');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Custom URL error');
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean field by default', (): void => {
      builder.booleanField('isActive');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('isActive');
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

    test('should add optional boolean field', (): void => {
      builder.booleanField('isOptional', false);
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add required array field by default', (): void => {
      builder.arrayField('tags');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('tags');
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

    test('should add optional array field', (): void => {
      builder.arrayField('items', false);
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add required object field by default', (): void => {
      builder.objectField('profile');
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.field).toBe('profile');
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

    test('should add optional object field', (): void => {
      builder.objectField('settings', false);
      const { rules } = builder.build();
      const rule = rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should allow unknown fields when set to true', (): void => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should disallow unknown fields when set to false', (): void => {
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should enable chaining with allowUnknown', (): void => {
      const returned = builder.allowUnknown(true);
      expect(returned).toBe(builder);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level and support chaining', (): void => {
      const returned = builder.setLevel(ValidationLevel.Strict);
      expect(returned).toBe(builder);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('build', (): void => {
    test('should return a new object each time (shallow copy)', (): void => {
      const schema1 = builder.build();
      const schema2 = builder.build();
      expect(schema1).not.toBe(schema2);
      expect(schema1.name).toBe(schema2.name);
      expect(schema1.level).toBe(schema2.level);
    });

    test('should reflect mutations to rules due to shallow copy', (): void => {
      builder.stringField('name');
      const schema1 = builder.build();
      const originalLength = schema1.rules.length;

      const extraRule = {
        field: 'extra',
        type: 'string' as const,
        required: true,
      };
      schema1.rules.push(extraRule);

      const schema2 = builder.build();
      expect(schema2.rules.length).toBe(originalLength + 1);
      expect(schema2.rules[schema2.rules.length - 1].field).toBe('extra');
    });
  });
});
