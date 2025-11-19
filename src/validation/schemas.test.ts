import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule, type ValidationSchema } from './src/validation/schemas';

vi.mock('./src/validation/dependency', (): Record<string, unknown> => ({
  default: vi.fn(),
}));

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  describe('constructor', (): void => {
    test('should initialize with default values', (): void => {
      const result: ValidationSchema = builder.build();
      expect(result).toBeDefined();
      expect(result.name).toBe('TestSchema');
      expect(result.level).toBe(ValidationLevel.Moderate);
      expect(Array.isArray(result.rules)).toBe(true);
      expect(result.rules.length).toBe(0);
      expect(result.allowUnknownFields).toBe(false);
    });

    test('should allow setting initial validation level', (): void => {
      const customBuilder: SchemaBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const result: ValidationSchema = customBuilder.build();
      expect(result.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a generic rule to the schema', (): void => {
      const customValidator = (_value: unknown): boolean => true;
      const rule: ValidationRule = {
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 120,
        customValidator,
        errorMessage: 'Invalid age',
      };

      const returned: SchemaBuilder = builder.addRule(rule);
      expect(returned).toBe(builder);

      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);
      expect(built.rules[0]).toMatchObject({
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 120,
        errorMessage: 'Invalid age',
      });
      expect(built.rules[0]?.customValidator).toBe(customValidator);
    });
  });

  describe('stringField', (): void => {
    test('should add required string field by default', (): void => {
      builder.stringField('username');
      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);
      expect(built.rules[0]).toMatchObject({
        field: 'username',
        type: 'string',
        required: true,
      });
    });

    test('should add optional string field with constraints', (): void => {
      const pattern: RegExp = /^[a-z]+$/i;
      builder.stringField('nickname', false, { minLength: 3, maxLength: 20, pattern, errorMessage: 'Bad nickname' });
      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);
      expect(built.rules[0]).toMatchObject({
        field: 'nickname',
        type: 'string',
        required: false,
        minLength: 3,
        maxLength: 20,
        errorMessage: 'Bad nickname',
      });
      expect(built.rules[0]?.pattern).toEqual(pattern);
    });

    test('should be chainable', (): void => {
      const ret: SchemaBuilder = builder.stringField('a');
      expect(ret).toBe(builder);
    });
  });

  describe('numberField', (): void => {
    test('should add required number field by default', (): void => {
      builder.numberField('count');
      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);
      expect(built.rules[0]).toMatchObject({
        field: 'count',
        type: 'number',
        required: true,
      });
    });

    test('should add optional number field with min and max', (): void => {
      builder.numberField('score', false, { min: 1, max: 10, errorMessage: 'Score out of range' });
      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);
      expect(built.rules[0]).toMatchObject({
        field: 'score',
        type: 'number',
        required: false,
        min: 1,
        max: 10,
        errorMessage: 'Score out of range',
      });
    });

    test('should be chainable', (): void => {
      const ret: SchemaBuilder = builder.numberField('n');
      expect(ret).toBe(builder);
    });
  });

  describe('emailField', (): void => {
    test('should add required email field with default regex and message', (): void => {
      builder.emailField('email');
      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);
      const rule = built.rules[0] as ValidationRule;
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');

      // Validate regex presence and behavior
      expect(rule.pattern).toBeInstanceOf(RegExp);
      const good: boolean = Boolean(rule.pattern?.test('user@example.com'));
      const bad: boolean = Boolean(rule.pattern?.test('invalid-email'));
      expect(good).toBe(true);
      expect(bad).toBe(false);
    });

    test('should allow overriding error message and required flag', (): void => {
      builder.emailField('contact', false, 'Custom email error');
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'contact',
        type: 'email',
        required: false,
        errorMessage: 'Custom email error',
      });
    });
  });

  describe('urlField', (): void => {
    test('should add required url field with default message', (): void => {
      builder.urlField('website');
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'website',
        type: 'url',
        required: true,
        errorMessage: 'Invalid URL format',
      });
    });

    test('should allow overriding error message and required flag', (): void => {
      builder.urlField('homepage', false, 'Bad URL');
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'homepage',
        type: 'url',
        required: false,
        errorMessage: 'Bad URL',
      });
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean field by default', (): void => {
      builder.booleanField('isActive');
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'isActive',
        type: 'boolean',
        required: true,
      });
    });

    test('should support optional boolean field', (): void => {
      builder.booleanField('isBeta', false);
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'isBeta',
        type: 'boolean',
        required: false,
      });
    });
  });

  describe('arrayField', (): void => {
    test('should add required array field by default', (): void => {
      builder.arrayField('tags');
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'tags',
        type: 'array',
        required: true,
      });
    });

    test('should support optional array field', (): void => {
      builder.arrayField('labels', false);
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'labels',
        type: 'array',
        required: false,
      });
    });
  });

  describe('objectField', (): void => {
    test('should add required object field by default', (): void => {
      builder.objectField('profile');
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'profile',
        type: 'object',
        required: true,
      });
    });

    test('should support optional object field', (): void => {
      builder.objectField('metadata', false);
      const built: ValidationSchema = builder.build();
      expect(built.rules[0]).toMatchObject({
        field: 'metadata',
        type: 'object',
        required: false,
      });
    });
  });

  describe('allowUnknown', (): void => {
    test('should allow unknown fields by default when called without args', (): void => {
      builder.allowUnknown();
      const built: ValidationSchema = builder.build();
      expect(built.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields to given boolean', (): void => {
      builder.allowUnknown(true);
      expect(builder.build().allowUnknownFields).toBe(true);
      builder.allowUnknown(false);
      expect(builder.build().allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level to Strict', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      expect(builder.build().level).toBe(ValidationLevel.Strict);
    });

    test('should set validation level to Lenient', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      expect(builder.build().level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of the schema object', (): void => {
      builder.stringField('field1');
      const first: ValidationSchema = builder.build();

      // Modify returned copy's shallow properties
      first.name = 'ChangedName';

      // Add rule directly into the returned rules array (shared reference)
      first.rules.push({
        field: 'injected',
        type: 'string',
        required: true,
      });

      const second: ValidationSchema = builder.build();

      // Name should not affect builder (copied)
      expect(second.name).toBe('TestSchema');

      // Rules array is shared (shallow copy), so it reflects the pushed rule
      expect(second.rules.some((r: ValidationRule): boolean => r.field === 'injected')).toBe(true);
    });

    test('should support complex chain building', (): void => {
      const schema: ValidationSchema = builder
        .stringField('username', true, { minLength: 3 })
        .emailField('email')
        .numberField('age', false, { min: 0, max: 150 })
        .booleanField('isActive', false)
        .arrayField('roles')
        .objectField('profile', false)
        .urlField('website', false)
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict)
        .build();

      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules.map((r: ValidationRule): string => r.field)).toEqual([
        'username',
        'email',
        'age',
        'isActive',
        'roles',
        'profile',
        'website',
      ]);

      const usernameRule = schema.rules.find((r: ValidationRule): boolean => r.field === 'username') as ValidationRule;
      expect(usernameRule.minLength).toBe(3);
    });

    test('should not throw when building empty schema', (): void => {
      const emptyBuilder: SchemaBuilder = new SchemaBuilder('Empty');
      expect((): void => {
        const _s: ValidationSchema = emptyBuilder.build();
      }).not.toThrow();
    });
  });

  describe('edge cases', (): void => {
    test('should handle unusual inputs without throwing', (): void => {
      // Casting to unknown then to required type to simulate runtime unusual values
      const weirdLevel: ValidationLevel = 'unexpected' as unknown as ValidationLevel;
      const weirdNameBuilder: SchemaBuilder = new SchemaBuilder(undefined as unknown as string, weirdLevel);
      expect((): void => {
        const _s: ValidationSchema = weirdNameBuilder.build();
      }).not.toThrow();
    });
  });
});
