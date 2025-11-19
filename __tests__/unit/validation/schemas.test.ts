import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from './src/validation/schemas';

vi.mock('non-existent-dependency', (): Record<string, unknown> => ({
  default: vi.fn(),
}));

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default level Moderate and no rules and unknown fields false', (): void => {
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided level', (): void => {
      const b = new SchemaBuilder('CustomSchema', ValidationLevel.Strict);
      const schema = b.build();
      expect(schema.name).toBe('CustomSchema');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule and support chaining', (): void => {
      const customRule = {
        field: 'score',
        type: 'number' as const,
        required: true,
        min: 0,
        max: 100,
        errorMessage: 'Score out of range',
      };
      const ret = builder.addRule(customRule);
      expect(ret).toBe(builder);

      const schema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toEqual(customRule);
    });

    test('should accept customValidator function in rule', (): void => {
      const customValidator = (_value: unknown): boolean => true;
      builder.addRule({
        field: 'custom',
        type: 'string',
        required: false,
        customValidator,
      });
      const schema = builder.build();
      expect(schema.rules[0]?.customValidator).toBe(customValidator);
    });
  });

  describe('stringField', (): void => {
    test('should add a required string field by default', (): void => {
      builder.stringField('username');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'username');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
      expect(rule?.minLength).toBeUndefined();
      expect(rule?.maxLength).toBeUndefined();
      expect(rule?.pattern).toBeUndefined();
      expect(rule?.errorMessage).toBeUndefined();
    });

    test('should add a string field with options', (): void => {
      const pattern = /^[a-z]+$/i;
      builder.stringField('password', true, {
        minLength: 8,
        maxLength: 64,
        pattern,
        errorMessage: 'Invalid password',
      });
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'password');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
      expect(rule?.minLength).toBe(8);
      expect(rule?.maxLength).toBe(64);
      expect(rule?.pattern).toBe(pattern);
      expect(rule?.errorMessage).toBe('Invalid password');
    });

    test('should allow optional string field when required is false', (): void => {
      builder.stringField('nickname', false);
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'nickname');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('numberField', (): void => {
    test('should add a required number field by default', (): void => {
      builder.numberField('age');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'age');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(true);
    });

    test('should add a number field with min, max, and custom error', (): void => {
      builder.numberField('rating', false, { min: 1, max: 5, errorMessage: 'Out of range' });
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'rating');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.min).toBe(1);
      expect(rule?.max).toBe(5);
      expect(rule?.errorMessage).toBe('Out of range');
    });
  });

  describe('emailField', (): void => {
    test('should add an email field with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'email');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern).toBeInstanceOf(RegExp);

      const valid = rule?.pattern?.test('user@example.com');
      const invalid = rule?.pattern?.test('not-an-email');
      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    test('should allow optional email with custom error message', (): void => {
      builder.emailField('backupEmail', false, 'Custom email error');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'backupEmail');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Custom email error');
    });
  });

  describe('urlField', (): void => {
    test('should add a required url field with default error message', (): void => {
      builder.urlField('website');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'website');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
    });

    test('should allow optional url field with custom error message', (): void => {
      builder.urlField('portfolio', false, 'Bad URL');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'portfolio');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add a required boolean field by default', (): void => {
      builder.booleanField('isActive');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'isActive');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional boolean field when required is false', (): void => {
      builder.booleanField('optIn', false);
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'optIn');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add a required array field by default', (): void => {
      builder.arrayField('items');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'items');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional array field when required is false', (): void => {
      builder.arrayField('tags', false);
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'tags');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add a required object field by default', (): void => {
      builder.objectField('profile');
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'profile');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional object field when required is false', (): void => {
      builder.objectField('metadata', false);
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'metadata');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should enable allowUnknownFields', (): void => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should disable allowUnknownFields', (): void => {
      builder.allowUnknown(true);
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level to Strict', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should set validation level to Lenient', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy where top-level is new object', (): void => {
      const s1 = builder.build();
      const s2 = builder.build();
      expect(s1).not.toBe(s2);
      // Shallow copy means nested arrays may be same reference; ensure not asserting deep copy here.
    });

    test('should not allow mutation of returned schema to affect internal state (top-level)', (): void => {
      const s1 = builder.build();
      s1.allowUnknownFields = true;
      const s2 = builder.build();
      expect(s2.allowUnknownFields).toBe(false);
    });
  });

  describe('chaining', (): void => {
    test('should support chaining multiple field definitions and configurations', (): void => {
      builder
        .stringField('title')
        .numberField('priority', true, { min: 1, max: 10 })
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict)
        .booleanField('published', false);

      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);

      const title = schema.rules.find((r) => r.field === 'title');
      const priority = schema.rules.find((r) => r.field === 'priority');
      const published = schema.rules.find((r) => r.field === 'published');

      expect(title?.type).toBe('string');
      expect(title?.required).toBe(true);

      expect(priority?.type).toBe('number');
      expect(priority?.min).toBe(1);
      expect(priority?.max).toBe(10);

      expect(published?.type).toBe('boolean');
      expect(published?.required).toBe(false);

      // Total field rules count should be 3
      expect(schema.rules.length).toBe(3);
    });
  });

  describe('edge cases and exception handling', (): void => {
    test('should not throw when setting an unexpected level value via cast', (): void => {
      expect((): void => {
        // Force an invalid level through casting to simulate runtime misuse
        builder.setLevel('unexpected' as unknown as ValidationLevel);
      }).not.toThrow();
      const schema = builder.build();
      expect(schema.level).toBe('unexpected' as unknown as ValidationLevel);
    });

    test('should not throw when adding a field with empty name', (): void => {
      expect((): void => {
        builder.stringField('');
      }).not.toThrow();
      const schema = builder.build();
      const rule = schema.rules.find((r) => r.field === '');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
    });
  });
});
