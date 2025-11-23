import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule, type ValidationSchema } from '../../src/validation/schemas';

vi.mock('node:events', (): Record<string, unknown> => ({
  EventEmitter: vi.fn(),
}));

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('User', ValidationLevel.Moderate);
  });



  afterEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('constructor', (): void => {
    test('should initialize with provided name and level', (): void => {
      const schema: ValidationSchema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('User');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.rules.length).toBe(0);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should default level to Moderate when not provided', (): void => {
      const localBuilder: SchemaBuilder = new SchemaBuilder('DefaultTest');
      const schema: ValidationSchema = localBuilder.build();
      expect(schema.level).toBe(ValidationLevel.Moderate);
    });
  });

  describe('addRule', (): void => {

      const returned: SchemaBuilder = builder.addRule(rule);
      expect(returned).toBe(builder);

      const schema: ValidationSchema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toMatchObject({
        field: 'age',
        type: 'number',
        required: true,
        min: 18,
        max: 99,
        errorMessage: 'Age must be between 18 and 99',
      });
      expect(typeof schema.rules[0]?.customValidator).toBe('function');
    });

      };
    });
  });
  describe('stringField', (): void => {
      expect(returned).toBe(builder);

      const schema: ValidationSchema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toMatchObject({
        field: 'name',
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern,
        errorMessage: 'Name must be alphabetic',
      });
    });

    test('should add an optional string rule when required is false', (): void => {
      builder.stringField('nickname', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'nickname');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(false);
    });
  });

  describe('numberField', (): void => {
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'score');
      expect(rule).toBeDefined();
      expect(rule).toMatchObject({
        field: 'score',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        errorMessage: 'Score must be 0-100',
      });
    });
  });

  describe('emailField', (): void => {
    test('should add an email rule with default error message and regex pattern', (): void => {
      builder.emailField('email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'email');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      const pattern: RegExp | undefined = rule?.pattern;
      expect(pattern?.test('user@example.com')).toBe(true);
      expect(pattern?.test('invalid-email')).toBe(false);
    });

    test('should allow overriding email error message', (): void => {
      builder.emailField('contactEmail', true, 'Custom email error');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'contactEmail');
      expect(rule).toBeDefined();
      expect(rule?.errorMessage).toBe('Custom email error');
    });
  });

  describe('urlField', (): void => {
    test('should add a url rule with default error message', (): void => {
      builder.urlField('website');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'website');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
    });

    test('should allow overriding url error message', (): void => {
      builder.urlField('homepage', true, 'Bad URL');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'homepage');
      expect(rule?.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add a boolean rule', (): void => {
      builder.booleanField('isActive');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'isActive');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });
  });

  describe('arrayField', (): void => {
    test('should add an array rule', (): void => {
      builder.arrayField('tags', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'tags');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add an object rule', (): void => {
      builder.objectField('metadata');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r) => r.field === 'metadata');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });
  });

  describe('allowUnknown', (): void => {
    test('should enable and disable unknown fields', (): void => {
      builder.allowUnknown(true);
      let schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);

      builder.allowUnknown(false);
      schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      let schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);

      builder.setLevel(ValidationLevel.Lenient);
      schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of schema (mutating top-level fields does not affect builder)', (): void => {
      builder.stringField('name');
      const built1: ValidationSchema = builder.build();
      expect(built1.name).toBe('User');

      built1.name = 'Changed';
      const built2: ValidationSchema = builder.build();
      expect(built2.name).toBe('User');
      expect(built2.rules.length).toBe(1);
    });

    test('should expose rules array by reference (mutating built rules affects builder)', (): void => {
      builder.numberField('age');
      const built: ValidationSchema = builder.build();
      expect(built.rules.length).toBe(1);

      const externalRule: ValidationRule = { field: 'external', type: 'string', required: true };
      built.rules.push(externalRule);

      const afterMutation: ValidationSchema = builder.build();
      expect(afterMutation.rules.length).toBe(2);
      const added = afterMutation.rules.find((r) => r.field === 'external');
      expect(added).toBeDefined();
      expect(added?.type).toBe('string');
    });

    test('should preserve rule order', (): void => {
      builder
        .stringField('a')
        .numberField('b')
        .booleanField('c')
        .arrayField('d')
        .objectField('e');

      const schema: ValidationSchema = builder.build();
      const order: string[] = schema.rules.map((r) => r.field);
      expect(order).toEqual(['a', 'b', 'c', 'd', 'e']);
    });
  });

  describe('fluent chaining', (): void => {
        .emailField('email', true)
        .numberField('age', false, { min: 0 })
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict);

      expect(returned).toBe(builder);

      const schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      const fields: string[] = schema.rules.map((r) => r.field);
      expect(fields).toEqual(['username', 'email', 'age']);
    });

    test('should not throw when chaining with edge values', (): void => {
      expect((): void => {
        builder
          .stringField('emptyOptions', true, {})
          .numberField('boundsOnly', true, { min: 0, max: 0 })
          .urlField('homepage', false, '')
          .allowUnknown()
          .setLevel(ValidationLevel.Moderate)
          .build();
      }).not.toThrow();
    });
  });
