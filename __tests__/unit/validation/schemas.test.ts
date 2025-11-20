import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule } from '../../src/validation/schemas';

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
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should allow custom level in constructor', (): void => {
      builder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule to schema', (): void => {
      const customValidator = vi.fn((_value: unknown): boolean => true);
      const rule: ValidationRule = {
        field: 'age',
        type: 'number',
        required: true,
        min: 18,
        max: 99,
        customValidator,
        errorMessage: 'Age must be between 18 and 99',
      };

      builder.addRule(rule);
      const schema = builder.build();

      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toEqual(rule);
      expect(typeof schema.rules[0].customValidator).toBe('function');
    });

    test('should reflect shared rules array between built schema and builder (shallow copy)', (): void => {
      const before = builder.build();
      expect(before.rules).toHaveLength(0);
      builder.stringField('name');
      expect(before.rules).toHaveLength(1);
      expect(before.rules[0]).toEqual({
        field: 'name',
        type: 'string',
        required: true,
      });
    });

    test('should throw TypeError when rules array is frozen via built schema', (): void => {
      const frozenSchema = builder.build();
      Object.freeze(frozenSchema.rules);

      expect((): void => {
        builder.stringField('name');
      }).toThrow(TypeError);
    });
  });

  describe('stringField', (): void => {
    test('should add a required string field with constraints', (): void => {
      const pattern = /^[a-z]+$/i;
      builder.stringField('username', true, {
        minLength: 3,
        maxLength: 20,
        pattern,
        errorMessage: 'Invalid username',
      });
      const schema = builder.build();

      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toEqual({
        field: 'username',
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern,
        errorMessage: 'Invalid username',
      });
    });

    test('should add an optional string field without options', (): void => {
      builder.stringField('nickname', false);
      const schema = builder.build();

      expect(schema.rules[0]).toEqual({
        field: 'nickname',
        type: 'string',
        required: false,
      });
    });
  });

  describe('numberField', (): void => {
    test('should add number field with min and max', (): void => {
      builder.numberField('age', true, { min: 0, max: 120, errorMessage: 'Invalid age' });
      const schema = builder.build();

      expect(schema.rules[0]).toEqual({
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 120,
        errorMessage: 'Invalid age',
      });
    });

    test('should add optional number field without constraints', (): void => {
      builder.numberField('score', false);
      const schema = builder.build();

      expect(schema.rules[0]).toEqual({
        field: 'score',
        type: 'number',
        required: false,
      });
    });
  });

  describe('emailField', (): void => {
    test('should add email field with default error message and regex', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules[0];

      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect((rule.pattern as RegExp).test('user@example.com')).toBe(true);
      expect((rule.pattern as RegExp).test('bad@com')).toBe(false);
    });

    test('should override error message when provided', (): void => {
      builder.emailField('email', true, 'Custom email error');
      const rule = builder.build().rules[0];

      expect(rule.errorMessage).toBe('Custom email error');
    });

    test('should add optional email field', (): void => {
      builder.emailField('backupEmail', false);
      const rule = builder.build().rules[0];

      expect(rule.required).toBe(false);
    });
  });

  describe('urlField', (): void => {
    test('should add url field with default error message', (): void => {
      builder.urlField('website');
      const rule = builder.build().rules[0];

      expect(rule).toEqual({
        field: 'website',
        type: 'url',
        required: true,
        errorMessage: 'Invalid URL format',
      });
    });

    test('should override url error message and optional', (): void => {
      builder.urlField('homepage', false, 'Bad URL');
      const rule = builder.build().rules[0];

      expect(rule).toEqual({
        field: 'homepage',
        type: 'url',
        required: false,
        errorMessage: 'Bad URL',
      });
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean field', (): void => {
      builder.booleanField('enabled');
      const rule = builder.build().rules[0];

      expect(rule).toEqual({
        field: 'enabled',
        type: 'boolean',
        required: true,
      });
    });

    test('should add optional boolean field', (): void => {
      builder.booleanField('archived', false);
      const rule = builder.build().rules[0];

      expect(rule).toEqual({
        field: 'archived',
        type: 'boolean',
        required: false,
      });
    });
  });

  describe('arrayField', (): void => {
    test('should add array field', (): void => {
      builder.arrayField('tags');
      const rule = builder.build().rules[0];

      expect(rule).toEqual({
        field: 'tags',
        type: 'array',
        required: true,
      });
    });
  });

  describe('objectField', (): void => {
    test('should add object field', (): void => {
      builder.objectField('meta', false);
      const rule = builder.build().rules[0];

      expect(rule).toEqual({
        field: 'meta',
        type: 'object',
        required: false,
      });
    });
  });

  describe('allowUnknown', (): void => {
    test('should toggle unknown fields allowance', (): void => {
      builder.allowUnknown(true);
      let schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);

      builder.allowUnknown(false);
      schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      expect(builder.build().level).toBe(ValidationLevel.Strict);

      builder.setLevel(ValidationLevel.Lenient);
      expect(builder.build().level).toBe(ValidationLevel.Lenient);
    });

    test('should accept arbitrary value at runtime without throwing (edge case)', (): void => {
      builder.setLevel('invalid' as unknown as ValidationLevel);
      const schema = builder.build();
      expect(schema.level).toBe('invalid' as unknown as ValidationLevel);
    });
  });

  describe('build', (): void => {
    test('should return a new object copy each time', (): void => {
      const first = builder.build();
      const second = builder.build();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    test('should include all defined rules', (): void => {
      builder
        .stringField('username')
        .numberField('age', true, { min: 0, max: 150 })
        .booleanField('active')
        .arrayField('tags', false)
        .objectField('profile');

      const schema = builder.build();
      expect(schema.rules.map((r): string => r.field)).toEqual(['username', 'age', 'active', 'tags', 'profile']);
    });
  });
});
