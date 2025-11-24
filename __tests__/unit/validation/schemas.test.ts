import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule, type ValidationSchema } from '../src/validation/schemas.js';


describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default level and empty rules', (): void => {
      const schema: ValidationSchema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with custom level', (): void => {
      const customBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema: ValidationSchema = customBuilder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {

      const returned: SchemaBuilder = builder.addRule(rule);
      expect(returned).toBe(builder);

      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toMatchObject({
        field: 'age',
        type: 'number',
        required: true,
        min: 18,
        max: 99,
      });
      expect(typeof schema.rules[0]?.customValidator).toBe('function');
    });

      builder.addRule({ field: 'b', type: 'number', required: false });

      const schema: ValidationSchema = builder.build();
      expect(schema.rules.map((r: ValidationRule): string => r.field)).toEqual(['a', 'b']);
    });
  });

  describe('stringField', (): void => {
    test('should add required string rule by default', (): void => {
      const returned: SchemaBuilder = builder.stringField('username');
      expect(returned).toBe(builder);

      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'username');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
      expect(rule?.minLength).toBeUndefined();
      expect(rule?.maxLength).toBeUndefined();
      expect(rule?.pattern).toBeUndefined();
      expect(rule?.errorMessage).toBeUndefined();
    });


      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'bio');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(false);
      expect(rule?.minLength).toBe(10);
      expect(rule?.maxLength).toBe(200);
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      expect(rule?.errorMessage).toBe('Invalid bio');
    });
  });

  describe('numberField', (): void => {
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'age');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(true);
      expect(rule?.min).toBe(0);
      expect(rule?.max).toBe(120);
    });

    test('should add optional number rule', (): void => {
      builder.numberField('score', false);
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'score');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(false);
      expect(rule?.min).toBeUndefined();
      expect(rule?.max).toBeUndefined();
    });
  });

  describe('emailField', (): void => {
    test('should add email rule with default pattern and error message', (): void => {
      builder.emailField('email');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'email');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      const valid = (rule?.pattern as RegExp).test('user@example.com');
      const invalid = (rule?.pattern as RegExp).test('bad-email');
      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    test('should allow custom error message and optional', (): void => {
      builder.emailField('contact', false, 'Bad email');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'contact');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad email');
    });
  });

  describe('urlField', (): void => {
    test('should add url rule with default error message and required true', (): void => {
      builder.urlField('website');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'website');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
      expect(rule?.pattern).toBeUndefined();
    });

    test('should add optional url rule with custom error message', (): void => {
      builder.urlField('portfolio', false, 'Bad URL');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'portfolio');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean rule by default', (): void => {
      builder.booleanField('isActive');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'isActive');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });

    test('should add optional boolean rule', (): void => {
      builder.booleanField('isDeleted', false);
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'isDeleted');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add required array rule by default', (): void => {
      builder.arrayField('tags');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'tags');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(true);
    });

    test('should add optional array rule', (): void => {
      builder.arrayField('labels', false);
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'labels');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add required object rule by default', (): void => {
      builder.objectField('profile');
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'profile');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });

    test('should add optional object rule', (): void => {
      builder.objectField('settings', false);
      const schema: ValidationSchema = builder.build();
      const rule: ValidationRule | undefined = schema.rules.find((r: ValidationRule): boolean => r.field === 'settings');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should allow unknown fields when set to true', (): void => {
      builder.allowUnknown(true);
      expect(builder.build().allowUnknownFields).toBe(true);
    });

    test('should disable unknown fields when set to false', (): void => {
      builder.allowUnknown(true);
      builder.allowUnknown(false);
      expect(builder.build().allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      expect(builder.build().level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy (top-level mutated copy does not affect builder)', (): void => {
      builder.stringField('name');
      const original: ValidationSchema = builder.build();
      const copied: ValidationSchema = builder.build();
      expect(copied).not.toBe(original);
      expect(copied.rules).toBe(original.rules);

      const prevName: string = original.name;
      copied.name = 'ChangedName';
      copied.allowUnknownFields = true;

      const after: ValidationSchema = builder.build();
      expect(after.name).toBe(prevName);
      expect(after.allowUnknownFields).toBe(false);
    });


      const after: ValidationSchema = builder.build();
      const fields: string[] = after.rules.map((r: ValidationRule): string => r.field);
      expect(fields).toContain('hacked');
    });
  });

  describe('chaining', (): void => {
    test('should support fluent chaining and build complete schema', (): void => {
      const result: ValidationSchema = new SchemaBuilder('Chain', ValidationLevel.Strict)

      expect(result.name).toBe('Chain');
      expect(result.level).toBe(ValidationLevel.Moderate);
      expect(result.allowUnknownFields).toBe(true);

      const fields: string[] = result.rules.map((r: ValidationRule): string => r.field);
      expect(fields).toEqual([
        'username',
        'age',
        'email',
        'website',
        'isActive',
        'tags',
        'profile',
      ]);
    });
  });

  describe('error handling', (): void => {
    test('should not throw when adding fields with edge option values', (): void => {
      expect((): void => {
        builder
          .stringField('edgeString', true, { minLength: 0, maxLength: 0, pattern: /^$/u, errorMessage: '' })
      }).not.toThrow();
    });
  });
});
