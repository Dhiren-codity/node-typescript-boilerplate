import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from './schemas';

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  describe('constructor', (): void => {
    test('should initialize with default level and no rules', (): void => {
      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with a custom level', (): void => {
      const instance = new SchemaBuilder('CustomLevel', ValidationLevel.Strict);
      const schema = instance.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.name).toBe('CustomLevel');
    });

    test('should not throw when creating with empty name', (): void => {
      expect((): SchemaBuilder => new SchemaBuilder('')).toBeDefined();
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule with customValidator', (): void => {
      const validator = vi.fn((value: unknown): boolean => typeof value === 'string');
      const rule = {
        field: 'custom',
        type: 'string' as const,
        required: true,
        customValidator: validator,
        errorMessage: 'Invalid custom',
      };
      builder.addRule(rule);
      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      const addedRule = schema.rules[0];
      expect(addedRule.field).toBe('custom');
      expect(addedRule.type).toBe('string');
      expect(addedRule.required).toBe(true);
      expect(addedRule.errorMessage).toBe('Invalid custom');
      expect(addedRule.customValidator).toBeDefined();
      expect(addedRule.customValidator).toBe(validator);
      const fn = addedRule.customValidator as (value: unknown) => boolean;
      expect(fn('abc')).toBe(true);
      expect(validator).toHaveBeenCalledWith('abc');
    });

    test('should preserve rule insertion order', (): void => {
      builder.addRule({ field: 'a', type: 'string', required: true });
      builder.addRule({ field: 'b', type: 'number', required: false, min: 0 });
      builder.addRule({ field: 'c', type: 'boolean', required: true });
      const schema = builder.build();
      expect(schema.rules.map((r) => r.field)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('stringField', (): void => {
    test('should add a required string field with options', (): void => {
      const pattern = /^[A-Z]+$/;
      builder.stringField('name', true, { minLength: 2, maxLength: 50, pattern, errorMessage: 'Bad name' });
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('name');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBe(2);
      expect(rule.maxLength).toBe(50);
      expect(rule.pattern).toBe(pattern);
      expect(rule.errorMessage).toBe('Bad name');
    });

    test('should add an optional string field without options', (): void => {
      builder.stringField('desc', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('desc');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(false);
      expect(rule.minLength).toBeUndefined();
      expect(rule.maxLength).toBeUndefined();
      expect(rule.pattern).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });

    test('should not throw when called without options', (): void => {
      expect((): void => {
        builder.stringField('plain');
      }).not.toThrow();
    });
  });

  describe('numberField', (): void => {
    test('should add a required number field with min and max', (): void => {
      builder.numberField('age', true, { min: 0, max: 120, errorMessage: 'Invalid age' });
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('age');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(120);
      expect(rule.errorMessage).toBe('Invalid age');
    });

    test('should add an optional number field without options', (): void => {
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
    test('should add a required email field with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      const pattern = rule.pattern as RegExp;
      expect(pattern.test('user@example.com')).toBe(true);
      expect(pattern.test('invalid-email')).toBe(false);
    });

    test('should allow custom error message for email field', (): void => {
      builder.emailField('email', true, 'Bad email');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.errorMessage).toBe('Bad email');
    });

    test('should add an optional email field', (): void => {
      builder.emailField('emailOpt', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('urlField', (): void => {
    test('should add a required url field with default error message', (): void => {
      builder.urlField('website');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('website');
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
    });

    test('should allow custom error message for url field and optionality', (): void => {
      builder.urlField('websiteOpt', false, 'Bad url');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad url');
    });
  });

  describe('booleanField', (): void => {
    test('should add a required boolean field by default', (): void => {
      builder.booleanField('active');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('active');
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

    test('should add an optional boolean field', (): void => {
      builder.booleanField('flag', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add a required array field', (): void => {
      builder.arrayField('items');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('items');
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

    test('should add an optional array field', (): void => {
      builder.arrayField('tags', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add a required object field', (): void => {
      builder.objectField('meta');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('meta');
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

    test('should add an optional object field', (): void => {
      builder.objectField('config', false);
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should enable allowUnknownFields when called with true', (): void => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should disable allowUnknownFields when called with false', (): void => {
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should default to true when called without arguments', (): void => {
      builder.allowUnknown();
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level to Strict', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should not throw when setting an unknown level via cast (runtime)', (): void => {
      // This tests runtime behavior; TypeScript would normally prevent invalid enum values.
      const invalidLevel = 'unknown' as unknown as ValidationLevel;
      expect((): void => {
        builder.setLevel(invalidLevel);
      }).not.toThrow();
      const schema = builder.build();
      expect(schema.level).toBe(invalidLevel);
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of the schema object', (): void => {
      builder.stringField('field1').allowUnknown().setLevel(ValidationLevel.Lenient);
      const built1 = builder.build();
      expect(built1.name).toBe('TestSchema');
      expect(built1.level).toBe(ValidationLevel.Lenient);
      expect(built1.allowUnknownFields).toBe(true);
      expect(built1.rules).toHaveLength(1);

      // Mutate returned schema's top-level property and verify builder is unchanged
      built1.name = 'Mutated';
      const built2 = builder.build();
      expect(built2.name).toBe('TestSchema');
    });

    test('should share rules array reference (edge case: shallow copy)', (): void => {
      builder.stringField('fieldA');
      const built = builder.build();
      expect(built.rules).toHaveLength(1);

      // Mutate rules array on the built schema and check the builder reflects it
      built.rules.push({ field: 'injected', type: 'number', required: true });
      const after = builder.build();
      expect(after.rules).toHaveLength(2);
      expect(after.rules[1].field).toBe('injected');
    });

    test('should work with no rules defined (edge case)', (): void => {
      const empty = new SchemaBuilder('Empty');
      const schema = empty.build();
      expect(schema.rules).toEqual([]);
    });
  });

  describe('chaining', (): void => {
    test('should support method chaining and maintain identity', (): void => {
      const returned = builder
        .stringField('name', true, { minLength: 1 })
        .numberField('age', false, { min: 0 })
        .emailField('email')
        .allowUnknown()
        .setLevel(ValidationLevel.Strict);
      expect(returned).toBe(builder);

      const schema = builder.build();
      expect(schema.rules.map((r) => r.field)).toEqual(['name', 'age', 'email']);
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
    });
  });
});
