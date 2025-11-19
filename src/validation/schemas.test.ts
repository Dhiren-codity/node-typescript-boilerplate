import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../src/validation/schemas';

vi.mock('node:crypto', (): Record<string, unknown> => ({
  randomUUID: vi.fn(),
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
    test('should initialize with default values', (): void => {
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.rules.length).toBe(0);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided validation level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = custom.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should not throw during build even with no rules', (): void => {
      expect((): void => {
        const _schema = builder.build();
      }).not.toThrow();
    });
  });

  describe('addRule', (): void => {
    test('should add a generic rule with all properties set', (): void => {
      const customValidator = (_value: unknown): boolean => true;
      builder.addRule({
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 150,
        pattern: undefined,
        customValidator,
        errorMessage: 'Invalid age',
      });
      const schema = builder.build();
      expect(schema.rules.length).toBe(1);
      const rule = schema.rules[0];
      expect(rule.field).toBe('age');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(150);
      expect(rule.customValidator).toBe(customValidator);
      expect(rule.errorMessage).toBe('Invalid age');
    });

    test('should preserve rule insertion order', (): void => {
      builder.addRule({ field: 'first', type: 'string', required: true });
      builder.addRule({ field: 'second', type: 'number', required: false });
      const schema = builder.build();
      expect(schema.rules.map((r): string => r.field)).toEqual(['first', 'second']);
    });
  });

  describe('stringField', (): void => {
    test('should add required string field by default', (): void => {
      builder.stringField('name');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'name')!;
      expect(rule).toBeDefined();
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBeUndefined();
      expect(rule.maxLength).toBeUndefined();
      expect(rule.pattern).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });

    test('should set options minLength, maxLength, pattern, and errorMessage', (): void => {
      const pattern = /^[A-Z][a-z]+$/u;
      builder.stringField('firstName', true, {
        minLength: 2,
        maxLength: 50,
        pattern,
        errorMessage: 'Invalid name',
      });
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'firstName')!;
      expect(rule.minLength).toBe(2);
      expect(rule.maxLength).toBe(50);
      expect(rule.pattern).toBe(pattern);
      expect(rule.errorMessage).toBe('Invalid name');
    });

    test('should support optional string field', (): void => {
      builder.stringField('nickname', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'nickname')!;
      expect(rule.required).toBe(false);
    });
  });

  describe('numberField', (): void => {
    test('should add required number field with bounds', (): void => {
      builder.numberField('score', true, { min: 0, max: 100, errorMessage: 'Out of range' });
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'score')!;
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(100);
      expect(rule.errorMessage).toBe('Out of range');
    });

    test('should support optional number field', (): void => {
      builder.numberField('rating', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'rating')!;
      expect(rule.required).toBe(false);
      expect(rule.min).toBeUndefined();
      expect(rule.max).toBeUndefined();
    });
  });

  describe('emailField', (): void => {
    test('should add email field with default pattern and error message', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'email')!;
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.errorMessage).toBe('Invalid email format');

      const valid = (rule.pattern as RegExp).test('user@example.com');
      const invalid = (rule.pattern as RegExp).test('bad@com');
      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    test('should override email error message when provided', (): void => {
      builder.emailField('email', true, 'Custom email error');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'email')!;
      expect(rule.errorMessage).toBe('Custom email error');
    });

    test('should support optional email field', (): void => {
      builder.emailField('backupEmail', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'backupEmail')!;
      expect(rule.required).toBe(false);
    });
  });

  describe('urlField', (): void => {
    test('should add url field with default error message and no pattern', (): void => {
      builder.urlField('website');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'website')!;
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
      expect(rule.pattern).toBeUndefined();
    });

    test('should override url error message when provided', (): void => {
      builder.urlField('homepage', true, 'Custom URL error');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'homepage')!;
      expect(rule.errorMessage).toBe('Custom URL error');
    });

    test('should support optional url field', (): void => {
      builder.urlField('docs', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'docs')!;
      expect(rule.required).toBe(false);
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean field by default', (): void => {
      builder.booleanField('isActive');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'isActive')!;
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

    test('should support optional boolean field', (): void => {
      builder.booleanField('isTest', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'isTest')!;
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add required array field by default', (): void => {
      builder.arrayField('items');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'items')!;
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

    test('should support optional array field', (): void => {
      builder.arrayField('tags', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'tags')!;
      expect(rule.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add required object field by default', (): void => {
      builder.objectField('metadata');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'metadata')!;
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

    test('should support optional object field', (): void => {
      builder.objectField('config', false);
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'config')!;
      expect(rule.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should set allowUnknownFields to true', (): void => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should toggle allowUnknownFields to false', (): void => {
      builder.allowUnknown(true).allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should allow switching to lenient level', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a new object instance each time', (): void => {
      const s1 = builder.build();
      const s2 = builder.build();
      expect(s1).not.toBe(s2);
      // top-level copy is shallow, but objects are distinct
    });

    test('should be a shallow copy: mutating returned rules affects subsequent builds', (): void => {
      const schema1 = builder.build();
      expect(schema1.rules.length).toBe(0);

      // mutate the rules of the returned schema
      schema1.rules.push({ field: 'mutated', type: 'string', required: true });

      const schema2 = builder.build();
      expect(schema2.rules.length).toBe(1);
      expect(schema2.rules[0].field).toBe('mutated');
    });

    test('supports chaining multiple field definitions and preserves order', (): void => {
      const result = builder
        .stringField('title', true, { minLength: 3 })
        .numberField('views', true, { min: 0 })
        .booleanField('published', false)
        .allowUnknown(true)
        .setLevel(ValidationLevel.Lenient)
        .build();

      expect(result.level).toBe(ValidationLevel.Lenient);
      expect(result.allowUnknownFields).toBe(true);
      expect(result.rules.map((r): string => `${r.type}:${r.field}`)).toEqual([
        'string:title',
        'number:views',
        'boolean:published',
      ]);

      const titleRule = result.rules.find((r): boolean => r.field === 'title')!;
      expect(titleRule.minLength).toBe(3);

      const viewsRule = result.rules.find((r): boolean => r.field === 'views')!;
      expect(viewsRule.min).toBe(0);

      const publishedRule = result.rules.find((r): boolean => r.field === 'published')!;
      expect(publishedRule.required).toBe(false);
    });

    test('allows duplicate field names without throwing', (): void => {
      builder.stringField('dup').stringField('dup', false);
      expect((): void => {
        const _schema = builder.build();
      }).not.toThrow();

      const schema = builder.build();
      const dupRules = schema.rules.filter((r): boolean => r.field === 'dup');
      expect(dupRules.length).toBe(2);
      expect(dupRules[0].required).toBe(true);
      expect(dupRules[1].required).toBe(false);
    });
  });
});
