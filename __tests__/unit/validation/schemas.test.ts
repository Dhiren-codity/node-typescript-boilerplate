import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule, type ValidationSchema } from '../../src/validation/schemas';


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
      const schema: ValidationSchema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided level', (): void => {
      const customBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema: ValidationSchema = customBuilder.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.rules).toEqual([]);
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule', (): void => {
      const rule: ValidationRule = {
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 120,
        errorMessage: 'Invalid age',
      };
      builder.addRule(rule);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toEqual(rule);
    });

    test('should preserve rule insertion order', (): void => {
      const rule1: ValidationRule = { field: 'first', type: 'string', required: true };
      const rule2: ValidationRule = { field: 'second', type: 'boolean', required: false };
      builder.addRule(rule1).addRule(rule2);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual(rule1);
      expect(schema.rules[1]).toEqual(rule2);
    });

    test('should not throw when adding rule with pattern', (): void => {
      expect((): void => {
        const rule: ValidationRule = {
          field: 'code',
          type: 'string',
          required: true,
          pattern: /^[A-Z]{3}-\d{3}$/u,
          errorMessage: 'Invalid code',
        };
        builder.addRule(rule);
      }).not.toThrow();
    });
  });

  describe('stringField', (): void => {
    test('should add a required string field by default', (): void => {
      builder.stringField('name');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'name') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional string field with options', (): void => {
      const pattern = /^[a-z]+$/u;
      builder.stringField('username', false, {
        minLength: 3,
        maxLength: 16,
        pattern,
        errorMessage: 'Invalid username',
      });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'username') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(false);
      expect(rule?.minLength).toBe(3);
      expect(rule?.maxLength).toBe(16);
      expect(rule?.pattern).toBe(pattern);
      expect(rule?.errorMessage).toBe('Invalid username');
    });

    test('should not throw when options are undefined', (): void => {
      expect((): void => {
        builder.stringField('title', true, undefined);
      }).not.toThrow();
    });
  });

  describe('numberField', (): void => {
    test('should add a required number field by default', (): void => {
      builder.numberField('count');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'count') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(true);
      expect(rule?.min).toBeUndefined();
      expect(rule?.max).toBeUndefined();
    });

    test('should add an optional number field with min and max', (): void => {
      builder.numberField('age', false, { min: 1, max: 100, errorMessage: 'Age out of range' });
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'age') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(false);
      expect(rule?.min).toBe(1);
      expect(rule?.max).toBe(100);
      expect(rule?.errorMessage).toBe('Age out of range');
    });

    test('should not throw when options are undefined', (): void => {
      expect((): void => {
        builder.numberField('score', true, undefined);
      }).not.toThrow();
    });
  });

  describe('emailField', (): void => {
    test('should add a required email field with default message and regex', (): void => {
      builder.emailField('email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'email') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');

      const pattern = rule?.pattern as RegExp;
      expect(pattern).toBeInstanceOf(RegExp);
      expect(pattern.test('user@example.com')).toBe(true);
      expect(pattern.test('invalid-email')).toBe(false);
      expect(pattern.test('user@')).toBe(false);
    });

    test('should allow custom error message', (): void => {
      builder.emailField('contact', true, 'Bad email');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'contact') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.errorMessage).toBe('Bad email');
    });

    test('should respect required=false', (): void => {
      builder.emailField('optionalEmail', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'optionalEmail') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('urlField', (): void => {
    test('should add a required url field with default error message', (): void => {
      builder.urlField('website');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'website') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
      expect(rule?.pattern).toBeUndefined();
    });

    test('should allow custom error message and required=false', (): void => {
      builder.urlField('homepage', false, 'Bad URL');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'homepage') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add a required boolean field by default', (): void => {
      builder.booleanField('isActive');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'isActive') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });

    test('should support required=false', (): void => {
      builder.booleanField('isVerified', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'isVerified') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add array field with required=true by default', (): void => {
      builder.arrayField('items');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'items') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(true);
    });

    test('should support required=false', (): void => {
      builder.arrayField('tags', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'tags') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add object field with required=true by default', (): void => {
      builder.objectField('profile');
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'profile') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });

    test('should support required=false', (): void => {
      builder.objectField('metadata', false);
      const schema: ValidationSchema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'metadata') as ValidationRule | undefined;
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should enable allowUnknownFields', (): void => {
      builder.allowUnknown(true);
      const schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should disable allowUnknownFields', (): void => {
      builder.allowUnknown(true).allowUnknown(false);
      const schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      let schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);

      builder.setLevel(ValidationLevel.Lenient);
      schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });

    test('should not throw when toggling levels multiple times', (): void => {
      expect((): void => {
        builder.setLevel(ValidationLevel.Strict);
        builder.setLevel(ValidationLevel.Moderate);
        builder.setLevel(ValidationLevel.Lenient);
      }).not.toThrow();
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of internal schema', (): void => {
      builder.stringField('field1').numberField('field2', false);
      const schema1: ValidationSchema = builder.build();
      const schema2: ValidationSchema = builder.build();

      expect(schema1).not.toBe(schema2);
      expect(schema1.rules).toBe(schema2.rules);
    });

    test('should reflect mutations to returned rules array in subsequent builds (shallow copy behavior)', (): void => {
      builder.stringField('initial');
      const schema1: ValidationSchema = builder.build();
      const newRule: ValidationRule = { field: 'extra', type: 'boolean', required: true };
      schema1.rules.push(newRule);
      const schema2: ValidationSchema = builder.build();
      const pushed = schema2.rules.find((r): boolean => r.field === 'extra') as ValidationRule | undefined;
      expect(pushed).toEqual(newRule);
    });

    test('should not reflect primitive property changes to returned schema object', (): void => {
      builder.allowUnknown(false);
      const schema1: ValidationSchema = builder.build();
      schema1.allowUnknownFields = true; // mutate returned copy
      const schema2: ValidationSchema = builder.build();
      expect(schema2.allowUnknownFields).toBe(false);
    });

    test('should support method chaining and build correctly', (): void => {
      const chainedSchema: ValidationSchema = new SchemaBuilder('Chained', ValidationLevel.Strict)

      const fields = chainedSchema.rules.map((r): string => r.field);
      expect(chainedSchema.name).toBe('Chained');
      expect(chainedSchema.level).toBe(ValidationLevel.Moderate);
      expect(chainedSchema.allowUnknownFields).toBe(true);
      expect(fields).toEqual([
        'title',
        'views',
        'published',
        'authorEmail',
        'canonical',
      ]);
    });

    test('should not throw when called multiple times', (): void => {
      expect((): void => {
        builder.build();
        builder.build();
        builder.build();
      }).not.toThrow();
    });
  });
});
