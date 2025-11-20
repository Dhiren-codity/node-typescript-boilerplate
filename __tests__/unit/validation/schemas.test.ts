import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../../src/validation/schemas';

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with defaults correctly', (): void => {
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should allow setting initial validation level', (): void => {
      const local = new SchemaBuilder('WithLevel', ValidationLevel.Strict);
      const schema = local.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {

      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      const rule = schema.rules[0];
      expect(rule.field).toBe('username');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBe(3);
      expect(rule.maxLength).toBe(20);
      expect(rule.pattern?.test('User_123')).toBe(true);
      expect(rule.errorMessage).toBe('Invalid username');
      expect(rule.customValidator).toBe(customValidator);
      expect(rule.customValidator?.('abc')).toBe(true);
      expect(rule.customValidator?.(123)).toBe(false);
    });

    test('should not throw when adding unusual numeric constraints', (): void => {
      expect((): void => {
        builder.addRule({
          field: 'age',
          type: 'number',
          required: false,
          min: -1000,
          max: 1_000_000,
        });
      }).not.toThrow();
    });
  });

  describe('stringField', (): void => {
      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      const rule = schema.rules[0];
      expect(rule.field).toBe('title');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBe(5);
      expect(rule.maxLength).toBe(100);
      expect(rule.pattern?.test('Hello')).toBe(true);
      expect(rule.pattern?.test('hello')).toBe(false);
      expect(rule.errorMessage).toBe('Title must start with uppercase');
    });

      expect(rules).toHaveLength(1);
      expect(rules[0].required).toBe(true);
      expect(rules[0].minLength).toBeUndefined();
      expect(rules[0].maxLength).toBeUndefined();
      expect(rules[0].pattern).toBeUndefined();
    });

      expect(rules[0].required).toBe(false);
    });

    test('should not throw with empty field name', (): void => {
      expect((): void => {
        builder.stringField('', true);
      }).not.toThrow();
    });
  });

  describe('numberField', (): void => {
      const { rules } = builder.build();
      expect(rules).toHaveLength(1);
      const rule = rules[0];
      expect(rule.field).toBe('age');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(120);
      expect(rule.errorMessage).toBe('Invalid age');
    });

      const { rules } = builder.build();
      expect(rules[0].required).toBe(false);
    });

    test('should not throw with negative min and large max', (): void => {
      expect((): void => {
        builder.numberField('temperature', true, { min: -273.15, max: 10_000 });
      }).not.toThrow();
    });
  });

  describe('emailField', (): void => {
      expect(rules).toHaveLength(1);
      const rule = rules[0];
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      // Compare regex by string representation
      expect(rule.pattern?.toString()).toBe('/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/');
    });

      const rule = rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad email');
    });
  });

  describe('urlField', (): void => {
      const rule = rules[0];
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
    });

      const rule = rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('URL not valid');
    });
  });

  describe('booleanField', (): void => {
      const rule = rules[0];
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

      expect(rules[0].required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
      const rule = rules[0];
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

      expect(rules[0].required).toBe(false);
    });
  });

  describe('objectField', (): void => {
      const rule = rules[0];
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

      expect(rules[0].required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should default to allowUnknownFields=false and set to true', (): void => {
      let schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);

      builder.allowUnknown();
      schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields explicitly to false', (): void => {
      builder.allowUnknown(true);
      let schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);

      builder.allowUnknown(false);
      schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      let schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);

      builder.setLevel(ValidationLevel.Lenient);
      schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of schema (top-level object cloned)', (): void => {
      builder.stringField('name');
      const schemaA = builder.build();
      const schemaB = builder.build();

      expect(schemaA).not.toBe(schemaB);
      expect(schemaA.rules).toBe(schemaB.rules);
    });

    test('mutating returned rules array should affect subsequent builds (shallow copy)', (): void => {
      builder.stringField('name');
      const schemaA = builder.build();
      expect(schemaA.rules).toHaveLength(1);

      schemaA.rules.push({ field: 'extra', type: 'string', required: true });
      expect(schemaA.rules).toHaveLength(2);

      const schemaB = builder.build();
      // Because rules array is shared, the new rule should appear in subsequent builds
      expect(schemaB.rules).toHaveLength(2);
      const extra = schemaB.rules.find((r): boolean => r.field === 'extra')!;
      expect(extra.type).toBe('string');
      expect(extra.required).toBe(true);
    });

        .booleanField('available', false)
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict);

      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules).toHaveLength(3);
      expect(schema.rules.map((r): string => r.field)).toEqual(['title', 'price', 'available']);
    });
  });

  describe('chaining and robustness', (): void => {
    test('methods should be chainable (return this) and not throw', (): void => {
      expect((): void => {
        builder
          .stringField('s1')
          .numberField('n1', false, { min: -1, max: 1 })
          .emailField('e1', false)
          .urlField('u1', true, 'bad url')
          .booleanField('b1', false)
          .arrayField('a1')
          .objectField('o1', false)
          .allowUnknown(true)
          .setLevel(ValidationLevel.Moderate);
      }).not.toThrow();

      const schema = builder.build();
      expect(schema.rules).toHaveLength(7);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.level).toBe(ValidationLevel.Moderate);
    });
  });
});
