import { describe, test, it, expect, vi, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationSchema, type ValidationRule } from '../src/validation/schemas';

// Mock an external dependency (none are used by SchemaBuilder, but demonstrate vi.mock usage)
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('SchemaBuilder', () => {
  let builder: SchemaBuilder;

  beforeEach(() => {
    builder = new SchemaBuilder('TestSchema', ValidationLevel.Moderate);
  });

  describe('constructor', () => {
    test('should initialize with default moderate level and no rules', () => {
      const schema: ValidationSchema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided validation level', () => {
      const customBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = customBuilder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', () => {
    test('should add a generic rule with custom validator', () => {
      const customValidator = vi.fn((value: unknown) => typeof value === 'string');
      const rule: ValidationRule = {
        field: 'custom',
        type: 'string',
        required: true,
        customValidator,
        errorMessage: 'Custom message',
      };

      builder.addRule(rule);
      const schema = builder.build();

      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toMatchObject({
        field: 'custom',
        type: 'string',
        required: true,
        errorMessage: 'Custom message',
      });
      expect(typeof schema.rules[0]?.customValidator).toBe('function');
    });

    test('should preserve rule ordering', () => {
      builder.stringField('a');
      builder.numberField('b');
      builder.booleanField('c');

      const schema = builder.build();
      expect(schema.rules.map(r => r.field)).toEqual(['a', 'b', 'c']);
    });

    test('should not throw when adding rule with minimal properties', () => {
      const minimalRule: ValidationRule = { field: 'x', type: 'string', required: false };
      expect(() => builder.addRule(minimalRule)).not.toThrow();
    });
  });

  describe('stringField', () => {
    test('should add a required string field with options', () => {
      builder.stringField('username', true, { minLength: 3, maxLength: 20, pattern: /^[a-z]+$/i, errorMessage: 'Invalid username' });
      const schema = builder.build();
      const rule = schema.rules.find(r => r.field === 'username');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
      expect(rule?.minLength).toBe(3);
      expect(rule?.maxLength).toBe(20);
      expect(rule?.pattern?.test('John')).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid username');
    });

    test('should add an optional string field without options', () => {
      builder.stringField('nickname', false);
      const rule = builder.build().rules.find(r => r.field === 'nickname');
      expect(rule).toMatchObject({
        field: 'nickname',
        type: 'string',
        required: false,
      });
      expect(rule?.minLength).toBeUndefined();
      expect(rule?.maxLength).toBeUndefined();
      expect(rule?.pattern).toBeUndefined();
    });

    test('should not throw when options are omitted', () => {
      expect(() => builder.stringField('bio')).not.toThrow();
    });
  });

  describe('numberField', () => {
    test('should add a required number field with min and max', () => {
      builder.numberField('age', true, { min: 0, max: 130, errorMessage: 'Invalid age' });
      const rule = builder.build().rules.find(r => r.field === 'age');
      expect(rule).toMatchObject({
        field: 'age',
        type: 'number',
        required: true,
        min: 0,
        max: 130,
        errorMessage: 'Invalid age',
      });
    });

    test('should add an optional number field without options', () => {
      builder.numberField('rating', false);
      const rule = builder.build().rules.find(r => r.field === 'rating');
      expect(rule).toMatchObject({
        field: 'rating',
        type: 'number',
        required: false,
      });
      expect(rule?.min).toBeUndefined();
      expect(rule?.max).toBeUndefined();
    });
  });

  describe('emailField', () => {
    test('should add a required email field with default error message and regex pattern', () => {
      builder.emailField('email');
      const rule = builder.build().rules.find(r => r.field === 'email');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern?.test('user@example.com')).toBe(true);
      expect(rule?.pattern?.test('bad-email')).toBe(false);
    });

    test('should support optional email field with custom error message', () => {
      builder.emailField('contactEmail', false, 'Please provide a valid email');
      const rule = builder.build().rules.find(r => r.field === 'contactEmail');
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Please provide a valid email');
    });
  });

  describe('urlField', () => {
    test('should add a required url field with default error message', () => {
      builder.urlField('website');
      const rule = builder.build().rules.find(r => r.field === 'website');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
      // No pattern is set by urlField in this implementation
      expect(rule?.pattern).toBeUndefined();
    });

    test('should support optional url field with custom error message', () => {
      builder.urlField('homepage', false, 'Bad URL');
      const rule = builder.build().rules.find(r => r.field === 'homepage');
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', () => {
    test('should add a required boolean field', () => {
      builder.booleanField('isActive');
      const rule = builder.build().rules.find(r => r.field === 'isActive');
      expect(rule).toMatchObject({
        field: 'isActive',
        type: 'boolean',
        required: true,
      });
    });

    test('should add an optional boolean field', () => {
      builder.booleanField('isVerified', false);
      const rule = builder.build().rules.find(r => r.field === 'isVerified');
      expect(rule?.required).toBe(false);
    });
  });

  describe('arrayField', () => {
    test('should add a required array field', () => {
      builder.arrayField('tags');
      const rule = builder.build().rules.find(r => r.field === 'tags');
      expect(rule).toMatchObject({
        field: 'tags',
        type: 'array',
        required: true,
      });
    });

    test('should add an optional array field', () => {
      builder.arrayField('labels', false);
      const rule = builder.build().rules.find(r => r.field === 'labels');
      expect(rule?.required).toBe(false);
    });
  });

  describe('objectField', () => {
    test('should add a required object field', () => {
      builder.objectField('profile');
      const rule = builder.build().rules.find(r => r.field === 'profile');
      expect(rule).toMatchObject({
        field: 'profile',
        type: 'object',
        required: true,
      });
    });

    test('should add an optional object field', () => {
      builder.objectField('metadata', false);
      const rule = builder.build().rules.find(r => r.field === 'metadata');
      expect(rule?.required).toBe(false);
    });
  });

  describe('allowUnknown', () => {
    test('should set allowUnknownFields to true', () => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields to false explicitly', () => {
      builder.allowUnknown(true);
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', () => {
    test('should update the validation level', () => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', () => {
    test('should return a shallow copy of the schema (top-level object is cloned)', () => {
      const before = builder.build();
      const after = builder.build();
      expect(before).not.toBe(after);
      // Arrays inside are not cloned (shallow copy)
      expect(before.rules).toBe(after.rules);
    });

    test('should include all added rules and metadata', () => {
      builder
        .setLevel(ValidationLevel.Strict)
        .allowUnknown(true)
        .stringField('name')
        .numberField('age', false, { min: 0 });

      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules).toHaveLength(2);
      expect(schema.rules.map(r => r.field)).toEqual(['name', 'age']);
    });

    test('modifying returned rules array mutates builder internal state (shallow copy semantics)', () => {
      builder.stringField('one');
      const built1 = builder.build();
      expect(built1.rules).toHaveLength(1);

      // Mutate returned rules array
      built1.rules.push({ field: 'two', type: 'string', required: true });

      // Build again and expect the mutation to be visible
      const built2 = builder.build();
      expect(built2.rules).toHaveLength(2);
      expect(built2.rules[1]).toMatchObject({ field: 'two', type: 'string', required: true });
    });

    test('should not throw when building after various chained calls', () => {
      expect(() =>
        builder
          .stringField('a', true, { minLength: 1 })
          .numberField('b', false, { max: 10 })
          .emailField('c')
          .urlField('d', false)
          .booleanField('e')
          .arrayField('f', false)
          .objectField('g')
          .allowUnknown()
          .setLevel(ValidationLevel.Moderate)
          .build(),
      ).not.toThrow();
    });
  });
});
