import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationSchema, type ValidationRule } from '../../src/validation/schemas';

vi.mock('../../src/validation/nonexistent-dependency', (): Record<string, unknown> => ({
  default: vi.fn((): void => {}),
}));

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

    test('should accept custom validation level in constructor', (): void => {
      const customBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema: ValidationSchema = customBuilder.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('build should return a new object each time (shallow copy)', (): void => {
      const schema1: ValidationSchema = builder.build();
      const schema2: ValidationSchema = builder.build();
      expect(schema1).not.toBe(schema2);
      expect(schema1).toEqual(schema2);
    });
  });

  describe('addRule', (): void => {
    test('should add custom rule and be chainable', (): void => {
      const rule: ValidationRule = {
        field: 'custom',
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 10,
        customValidator: (_value: unknown): boolean => true,
        errorMessage: 'Custom error',
      };
      const returned = builder.addRule(rule);
      expect(returned).toBe(builder);

      const schema: ValidationSchema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toMatchObject(rule);
    });

    test('should allow adding multiple rules including duplicates', (): void => {
      const rule1: ValidationRule = { field: 'dup', type: 'string', required: true };
      const rule2: ValidationRule = { field: 'dup', type: 'number', required: false };
      builder.addRule(rule1).addRule(rule2);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules.length).toBe(2);
      expect(schema.rules[0]).toMatchObject(rule1);
      expect(schema.rules[1]).toMatchObject(rule2);
    });
  });

  describe('stringField', (): void => {
    test('should add a required string rule with options', (): void => {
      const pattern = /^[A-Za-z]+$/u;
      builder.stringField('name', true, { minLength: 2, maxLength: 50, pattern, errorMessage: 'Invalid name' });
      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(1);
      const rule = schema.rules[0] as ValidationRule;
      expect(rule).toMatchObject({
        field: 'name',
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 50,
        errorMessage: 'Invalid name',
      });
      expect(rule.pattern).toBe(pattern);
    });

    test('should default to required=true and handle undefined options', (): void => {
      builder.stringField('title');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.required).toBe(true);
      expect(rule.minLength).toBeUndefined();
      expect(rule.maxLength).toBeUndefined();
      expect(rule.pattern).toBeUndefined();
    });

    test('should allow required=false', (): void => {
      builder.stringField('nickname', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.field).toBe('nickname');
      expect(rule.required).toBe(false);
    });
  });

  describe('numberField', (): void => {
    test('should add a number rule with min and max', (): void => {
      builder.numberField('age', true, { min: 0, max: 150, errorMessage: 'Invalid age' });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule).toMatchObject({
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 150,
        errorMessage: 'Invalid age',
      });
    });

    test('should default to required=true and handle no options', (): void => {
      builder.numberField('count');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.required).toBe(true);
      expect(rule.min).toBeUndefined();
      expect(rule.max).toBeUndefined();
    });

    test('should allow required=false', (): void => {
      builder.numberField('score', false, { min: 1 });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.required).toBe(false);
      expect(rule.min).toBe(1);
    });
  });

  describe('emailField', (): void => {
    test('should add an email rule with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect((rule.pattern as RegExp).test('user@example.com')).toBe(true);
      expect((rule.pattern as RegExp).test('invalid-email')).toBe(false);
    });

    test('should accept custom error message and required=false', (): void => {
      builder.emailField('contact', false, 'Bad email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad email');
    });
  });

  describe('urlField', (): void => {
    test('should add a url rule with default error message', (): void => {
      builder.urlField('homepage');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule).toMatchObject({
        field: 'homepage',
        type: 'url',
        required: true,
        errorMessage: 'Invalid URL format',
      });
    });

    test('should accept custom error message and required=false', (): void => {
      builder.urlField('website', false, 'Bad url');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad url');
    });
  });

  describe('booleanField', (): void => {
    test('should add a boolean rule with default required', (): void => {
      builder.booleanField('active');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule).toMatchObject({ field: 'active', type: 'boolean', required: true });
    });

    test('should allow required=false', (): void => {
      builder.booleanField('deleted', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add an array rule', (): void => {
      builder.arrayField('tags');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule).toMatchObject({ field: 'tags', type: 'array', required: true });
    });
  });

  describe('objectField', (): void => {
    test('should add an object rule', (): void => {
      builder.objectField('profile', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules[0] as ValidationRule;
      expect(rule).toMatchObject({ field: 'profile', type: 'object', required: false });
    });
  });

  describe('allowUnknown', (): void => {
    test('should toggle allowUnknownFields flag', (): void => {
      let schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);

      builder.allowUnknown(true);
      schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);

      builder.allowUnknown(false);
      schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set the validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);

      builder.setLevel(ValidationLevel.Lenient);
      const schema2: ValidationSchema = builder.build();
      expect(schema2.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should build a schema after chaining methods', (): void => {
      const built: ValidationSchema = builder
        .stringField('name', true, { minLength: 1 })
        .numberField('age', false, { min: 0 })
        .booleanField('verified', true)
        .allowUnknown(true)
        .setLevel(ValidationLevel.Lenient)
        .build();

      expect(built.name).toBe('TestSchema');
      expect(built.level).toBe(ValidationLevel.Lenient);
      expect(built.allowUnknownFields).toBe(true);
      expect(built.rules).toHaveLength(3);
      expect(built.rules.map((r: ValidationRule) => r.field)).toEqual(['name', 'age', 'verified']);
    });

    test('should not throw when building with no rules', (): void => {
      expect((): ValidationSchema => builder.build()).not.toThrowError();
    });

    test('edge: shallow copy means rules array is shared between builds', (): void => {
      const before: ValidationSchema = builder.build();
      expect(before.rules).toHaveLength(0);

      builder.stringField('later');
      const after: ValidationSchema = builder.build();
      expect(after.rules).toHaveLength(1);

      // Because build() returns a shallow copy, both schemas share the same rules array reference.
      expect(before.rules).toBe(after.rules);
      expect(before.rules).toHaveLength(1);
    });
  });

  describe('chainability', (): void => {
    test('all builder methods should return the same instance', (): void => {
      const returned = builder
        .stringField('a')
        .numberField('b')
        .emailField('c')
        .urlField('d')
        .booleanField('e')
        .arrayField('f')
        .objectField('g')
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict);

      expect(returned).toBe(builder);
    });
  });

  describe('error handling behavior', (): void => {
    test('methods should not throw when optional params are omitted', (): void => {
      expect((): SchemaBuilder => builder.stringField('opt')).not.toThrowError();
      expect((): SchemaBuilder => builder.numberField('n')).not.toThrowError();
      expect((): SchemaBuilder => builder.emailField('e')).not.toThrowError();
      expect((): SchemaBuilder => builder.urlField('u')).not.toThrowError();
    });
  });
});
