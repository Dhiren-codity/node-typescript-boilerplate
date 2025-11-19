import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  SchemaBuilder,
  ValidationLevel,
  type ValidationRule,
  type ValidationSchema,
} from '../../src/validation/schemas';

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  describe('constructor', (): void => {
    test('should initialize with default values', (): void => {
      const schema: ValidationSchema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided level', (): void => {
      const custom = new SchemaBuilder('CustomSchema', ValidationLevel.Strict);
      const schema: ValidationSchema = custom.build();
      expect(schema.name).toBe('CustomSchema');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule to the schema', (): void => {
      const rule: ValidationRule = {
        field: 'age',
        type: 'number',
        required: true,
        min: 18,
        max: 99,
      };
      builder.addRule(rule);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toMatchObject(rule);
    });

    test('should chain multiple addRule calls', (): void => {
      const rule1: ValidationRule = { field: 'a', type: 'string', required: true };
      const rule2: ValidationRule = { field: 'b', type: 'boolean', required: false };
      builder.addRule(rule1).addRule(rule2);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(2);
      expect(schema.rules[0]).toMatchObject(rule1);
      expect(schema.rules[1]).toMatchObject(rule2);
    });

    test('should preserve customValidator and pattern options', (): void => {
      const validator = (v: unknown): boolean => typeof v === 'number' && (v as number) % 2 === 0;
      const pattern = /^[a-z]+$/i;
      builder.addRule({
        field: 'code',
        type: 'string',
        required: true,
        pattern,
        customValidator: validator,
        errorMessage: 'Custom error',
      });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.pattern).toBe(pattern);
      expect(rule.customValidator).toBeTypeOf('function');
      expect(rule.customValidator?.(2)).toBe(true);
      expect(rule.customValidator?.(3)).toBe(false);
      expect(rule.errorMessage).toBe('Custom error');
    });

    test('should not throw when adding rule without optional properties', (): void => {
      const act = (): void => {
        builder.addRule({ field: 'simple', type: 'string', required: true });
      };
      expect(act).not.toThrow();
    });
  });

  describe('stringField', (): void => {
    test('should add a required string field by default', (): void => {
      builder.stringField('username');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule).toMatchObject<Partial<ValidationRule>>({
        field: 'username',
        type: 'string',
        required: true,
      });
      expect(rule.minLength).toBeUndefined();
      expect(rule.maxLength).toBeUndefined();
      expect(rule.pattern).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });

    test('should add an optional string field with constraints and errorMessage', (): void => {
      const pattern = /^[a-z0-9_]{3,16}$/i;
      builder.stringField('handle', false, {
        minLength: 3,
        maxLength: 16,
        pattern,
        errorMessage: 'Invalid handle',
      });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.minLength).toBe(3);
      expect(rule.maxLength).toBe(16);
      expect(rule.pattern).toBe(pattern);
      expect(rule.pattern?.test('ok_name')).toBe(true);
      expect(rule.pattern?.test('!bad')).toBe(false);
      expect(rule.errorMessage).toBe('Invalid handle');
    });

    test('should not throw when options are omitted', (): void => {
      const act = (): void => {
        builder.stringField('title', true);
      };
      expect(act).not.toThrow();
    });
  });

  describe('numberField', (): void => {
    test('should add a required number field by default', (): void => {
      builder.numberField('amount');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule).toMatchObject<Partial<ValidationRule>>({
        field: 'amount',
        type: 'number',
        required: true,
      });
      expect(rule.min).toBeUndefined();
      expect(rule.max).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });

    test('should add an optional number field with constraints', (): void => {
      builder.numberField('score', false, { min: 0, max: 100, errorMessage: 'Out of range' });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(100);
      expect(rule.errorMessage).toBe('Out of range');
    });
  });

  describe('emailField', (): void => {
    test('should add a required email field with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.pattern?.test('user@example.com')).toBe(true);
      expect(rule.pattern?.test('bad-email')).toBe(false);
    });

    test('should support custom error message and optional requirement', (): void => {
      builder.emailField('backupEmail', false, 'Bad email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad email');
    });
  });

  describe('urlField', (): void => {
    test('should add a required url field with default error message', (): void => {
      builder.urlField('homepage');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
      // urlField does not define a default pattern
      expect(rule.pattern).toBeUndefined();
    });

    test('should support custom error message and optional requirement', (): void => {
      builder.urlField('website', false, 'Bad URL');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add a required boolean field by default', (): void => {
      builder.booleanField('isActive');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule).toMatchObject<Partial<ValidationRule>>({
        field: 'isActive',
        type: 'boolean',
        required: true,
      });
    });

    test('should support optional boolean field', (): void => {
      builder.booleanField('isEnabled', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add a required array field by default', (): void => {
      builder.arrayField('items');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule).toMatchObject<Partial<ValidationRule>>({
        field: 'items',
        type: 'array',
        required: true,
      });
    });

    test('should support optional array field', (): void => {
      builder.arrayField('tags', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add a required object field by default', (): void => {
      builder.objectField('profile');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule).toMatchObject<Partial<ValidationRule>>({
        field: 'profile',
        type: 'object',
        required: true,
      });
    });

    test('should support optional object field', (): void => {
      builder.objectField('metadata', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should enable allowUnknownFields when called without arguments', (): void => {
      builder.allowUnknown();
      const schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should toggle allowUnknownFields according to argument', (): void => {
      builder.allowUnknown(true);
      expect(builder.build().allowUnknownFields).toBe(true);
      builder.allowUnknown(false);
      expect(builder.build().allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level to Strict', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should set validation level to Lenient', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a new object on each build call (shallow copy)', (): void => {
      builder.stringField('username');
      const schema1: ValidationSchema = builder.build();
      const schema2: ValidationSchema = builder.build();
      expect(schema1).not.toBe(schema2);
      expect(schema1.name).toBe(schema2.name);
      expect(schema1.rules).toBe(schema2.rules); // shallow copy: rules reference is the same
    });

    test('should not mutate internal schema when top-level properties of built schema are changed', (): void => {
      const built: ValidationSchema = builder.build();
      built.name = 'ChangedName';
      const after: ValidationSchema = builder.build();
      expect(after.name).toBe('TestSchema');
    });

    test('should reflect changes if rules array of built schema is mutated (shallow copy behavior)', (): void => {
      const built: ValidationSchema = builder.build();
      expect(built.rules).toHaveLength(0);
      const newRule: ValidationRule = { field: 'flag', type: 'boolean', required: true };
      built.rules.push(newRule);
      const after: ValidationSchema = builder.build();
      expect(after.rules).toHaveLength(1);
      expect(after.rules[0]).toMatchObject(newRule);
    });

    test('should handle chaining of multiple field definitions correctly', (): void => {
      builder
        .stringField('title', true, { minLength: 1, maxLength: 100 })
        .numberField('count', true, { min: 0, max: 1000 })
        .emailField('contact', false)
        .urlField('site', false)
        .booleanField('enabled', true)
        .arrayField('list', false)
        .objectField('config', true);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(7);
      const fields = schema.rules.map((r: ValidationRule): string => r.field);
      expect(fields).toEqual(['title', 'count', 'contact', 'site', 'enabled', 'list', 'config']);
    });

    test('should not throw when building without any rules', (): void => {
      const act = (): void => {
        const schema: ValidationSchema = builder.build();
        expect(schema.rules).toHaveLength(0);
      };
      expect(act).not.toThrow();
    });
  });
});
