import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule, type ValidationSchema, } from '../../src/validation/schemas.ts';

vi.mock('../../src/validation/schemas.ts', async (): Promise<Record<string, unknown>> => {
  const actual = await vi.importActual<Record<string, unknown>>('../../src/validation/schemas.ts');
  return { ...actual };
});



  SchemaBuilder,
  ValidationLevel,
  type ValidationRule,
  type ValidationSchema,

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default values', (): void => {
      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should accept custom validation level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = custom.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a generic rule with customValidator', (): void => {
      const customValidator = (value: unknown): boolean => typeof value === 'string';
      const rule: ValidationRule = {
        field: 'custom',
        type: 'string',
        required: true,
        customValidator,
        errorMessage: 'Custom error',
      };
      const returned = builder.addRule(rule);
      expect(returned).toBe(builder);

      const { rules } = builder.build();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        field: 'custom',
        type: 'string',
        required: true,
        errorMessage: 'Custom error',
      });
      expect(typeof (rules[0] as ValidationRule).customValidator).toBe('function');
      expect((rules[0] as ValidationRule).customValidator?.('abc')).toBe(true);
      expect((rules[0] as ValidationRule).customValidator?.(123)).toBe(false);
    });

    test('should propagate errors if internal push fails', (): void => {
      const internal = builder as unknown as { schema: { rules: unknown[] } };
      const pushSpy = vi.spyOn(internal.schema.rules, 'push').mockImplementation((): number => {
        throw new Error('push failed');
      });

      const rule: ValidationRule = {
        field: 'fail',
        type: 'number',
        required: false,
      };

      expect((): void => {
        builder.addRule(rule);
      }).toThrowError('push failed');

      pushSpy.mockRestore();
    });
  });

  describe('stringField', (): void => {
    test('should add a required string rule by default', (): void => {
      const returned = builder.stringField('name');
      expect(returned).toBe(builder);

      const { rules } = builder.build();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual(
        expect.objectContaining({
          field: 'name',
          type: 'string',
          required: true,
        }),
      );
    });

    test('should support optional and constraints', (): void => {
      builder.stringField('bio', false, {
        minLength: 5,
        maxLength: 100,
        pattern: /^about/i,
        errorMessage: 'Bio invalid',
      });

      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'bio',
        type: 'string',
        required: false,
        minLength: 5,
        maxLength: 100,
        errorMessage: 'Bio invalid',
      });
      expect((rules[0] as ValidationRule).pattern).toBeInstanceOf(RegExp);
      expect((rules[0] as ValidationRule).pattern?.test('About me')).toBe(true);
    });
  });

  describe('numberField', (): void => {
    test('should add a required number rule by default', (): void => {
      builder.numberField('age');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'age',
        type: 'number',
        required: true,
      });
    });

    test('should support optional and range', (): void => {
      builder.numberField('score', false, { min: 0, max: 10, errorMessage: 'Score invalid' });
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'score',
        type: 'number',
        required: false,
        min: 0,
        max: 10,
        errorMessage: 'Score invalid',
      });
    });
  });

  describe('emailField', (): void => {
    test('should add an email rule with default error message', (): void => {
      builder.emailField('email');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'email',
        type: 'email',
        required: true,
        errorMessage: 'Invalid email format',
      });
      const pattern = (rules[0] as ValidationRule).pattern;
      expect(pattern).toBeInstanceOf(RegExp);
      expect(pattern?.test('user@example.com')).toBe(true);
      expect(pattern?.test('invalid-email')).toBe(false);
    });

    test('should allow custom error message and optional', (): void => {
      builder.emailField('email', false, 'Bad email');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'email',
        type: 'email',
        required: false,
        errorMessage: 'Bad email',
      });
    });
  });

  describe('urlField', (): void => {
    test('should add a url rule with default error message', (): void => {
      builder.urlField('website');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'website',
        type: 'url',
        required: true,
        errorMessage: 'Invalid URL format',
      });
    });

    test('should allow custom error message and optional', (): void => {
      builder.urlField('site', false, 'Bad url');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'site',
        type: 'url',
        required: false,
        errorMessage: 'Bad url',
      });
    });
  });

  describe('booleanField', (): void => {
    test('should add a required boolean rule by default', (): void => {
      builder.booleanField('isActive');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'isActive',
        type: 'boolean',
        required: true,
      });
    });

    test('should allow optional boolean', (): void => {
      builder.booleanField('isAdmin', false);
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'isAdmin',
        type: 'boolean',
        required: false,
      });
    });
  });

  describe('arrayField', (): void => {
    test('should add a required array rule by default', (): void => {
      builder.arrayField('tags');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'tags',
        type: 'array',
        required: true,
      });
    });

    test('should allow optional array', (): void => {
      builder.arrayField('items', false);
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'items',
        type: 'array',
        required: false,
      });
    });
  });

  describe('objectField', (): void => {
    test('should add a required object rule by default', (): void => {
      builder.objectField('profile');
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'profile',
        type: 'object',
        required: true,
      });
    });

    test('should allow optional object', (): void => {
      builder.objectField('settings', false);
      const { rules } = builder.build();
      expect(rules[0]).toMatchObject({
        field: 'settings',
        type: 'object',
        required: false,
      });
    });
  });

  describe('allowUnknown', (): void => {
    test('should set allowUnknownFields to true', (): void => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields to false', (): void => {
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should change validation level', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a snapshot object of current state (top-level cloned)', (): void => {
      builder
        .stringField('a')

      const built1 = builder.build();
      expect(built1.name).toBe('TestSchema');
      expect(built1.level).toBe(ValidationLevel.Strict);
      expect(built1.allowUnknownFields).toBe(true);
      expect(built1.rules).toHaveLength(2);

      // mutate returned top-level object should not affect builder
      (built1 as ValidationSchema).name = 'ChangedName';
      const built2 = builder.build();
      expect(built2.name).toBe('TestSchema');
    });

    test('should share rules array reference (shallow clone behavior)', (): void => {
      builder.stringField('field1');
      const built1 = builder.build();
      expect(built1.rules).toHaveLength(1);

      // Pushing into built rules should reflect in subsequent builds due to shallow clone
      built1.rules.push({
        field: 'injected',
        type: 'boolean',
        required: true,
      });
      const built2 = builder.build();
      expect(built2.rules).toHaveLength(2);
      expect(built2.rules[1]).toMatchObject({
        field: 'injected',
        type: 'boolean',
        required: true,
      });
    });
  });

  describe('chaining', (): void => {
    test('should support method chaining and return the same instance', (): void => {
      const returned = builder
        .stringField('title')

      expect(returned).toBe(builder);

      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules).toHaveLength(7);

      const fields = schema.rules.map((r: ValidationRule): string => r.field);
      expect(fields).toEqual([
        'title',
        'views',
        'ownerEmail',
        'link',
        'published',
        'labels',
        'meta',
      ]);
    });
  });
});
