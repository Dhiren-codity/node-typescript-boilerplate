import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../src/validation/schemas';

vi.mock('node:fs', (): Record<string, unknown> => ({}));




  afterEach((): void => {
    vi.clearAllMocks();
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

    test('should set provided validation level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = custom.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });


    test('should not throw when given a malformed rule object (runtime misuse)', (): void => {
      expect((): void => {
        // Casting to unknown then ValidationRule to simulate bad runtime input
        builder.addRule(undefined as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as unknown as never as never);
      }).not.toThrow();
    });

  describe('stringField', (): void => {
    test('should add a required string rule by default', (): void => {
      builder.stringField('name');
      const rules = builder.build().rules;
      expect(rules.length).toBe(1);
      expect(rules[0]?.field).toBe('name');
      expect(rules[0]?.type).toBe('string');
      expect(rules[0]?.required).toBe(true);
    });

      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
      expect(rule?.minLength).toBe(5);
      expect(rule?.maxLength).toBe(100);
      expect(rule?.errorMessage).toBe('Too short');
    });

      const [rule] = builder.build().rules;
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      expect(rule?.pattern?.test('ABC')).toBe(true);
      expect(rule?.pattern?.test('Abc')).toBe(false);
    });

  describe('numberField', (): void => {
    test('should add a required number rule by default', (): void => {
      builder.numberField('age');
      const [rule] = builder.build().rules;
      expect(rule?.field).toBe('age');
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(true);
      expect(rule?.min).toBeUndefined();
      expect(rule?.max).toBeUndefined();
    });

      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
      expect(rule?.min).toBe(0);
      expect(rule?.max).toBe(100);
      expect(rule?.errorMessage).toBe('Out of range');
    });

  describe('emailField', (): void => {
    test('should add an email rule with default error message and pattern', (): void => {
      builder.emailField('email');
      const [rule] = builder.build().rules;
      expect(rule?.field).toBe('email');
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      expect(rule?.pattern?.test('user@example.com')).toBe(true);
      expect(rule?.pattern?.test('not-an-email')).toBe(false);
    });

    test('should allow optional email with custom error message', (): void => {
      builder.emailField('contact', false, 'Custom email error');
      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Custom email error');
    });

  describe('urlField', (): void => {
    test('should add a URL rule with default error message', (): void => {
      builder.urlField('website');
      const [rule] = builder.build().rules;
      expect(rule?.field).toBe('website');
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
    });

    test('should allow optional URL with custom error message', (): void => {
      builder.urlField('homepage', false, 'Bad URL');
      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad URL');
    });

  describe('booleanField', (): void => {
    test('should add a required boolean rule by default', (): void => {
      builder.booleanField('isActive');
      const [rule] = builder.build().rules;
      expect(rule?.field).toBe('isActive');
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional boolean rule', (): void => {
      builder.booleanField('isArchived', false);
      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
    });

  describe('arrayField', (): void => {
    test('should add an array rule', (): void => {
      builder.arrayField('tags');
      const [rule] = builder.build().rules;
      expect(rule?.field).toBe('tags');
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional array rule', (): void => {
      builder.arrayField('labels', false);
      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
    });

  describe('objectField', (): void => {
    test('should add an object rule', (): void => {
      builder.objectField('profile');
      const [rule] = builder.build().rules;
      expect(rule?.field).toBe('profile');
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });

    test('should add an optional object rule', (): void => {
      builder.objectField('metadata', false);
      const [rule] = builder.build().rules;
      expect(rule?.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should set allowUnknownFields to true by default when called without arguments', (): void => {
      builder.allowUnknown();
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields to false when explicitly set', (): void => {
      builder.allowUnknown(true);
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update the validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      expect(builder.build().level).toBe(ValidationLevel.Strict);
      builder.setLevel(ValidationLevel.Lenient);
      expect(builder.build().level).toBe(ValidationLevel.Lenient);
    });
  });

        .emailField('email', true);

      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules.length).toBe(3);
      expect(schema.rules.map((r): string | undefined => r?.field)).toEqual(['username', 'age', 'email']);
    });

    test('should return a shallow copy (rules array is shared)', (): void => {
      builder.stringField('field1');
      const builtOnce = builder.build();
      expect(builtOnce.rules.length).toBe(1);

      // Mutate builder after build
      builder.numberField('field2');
      // Because build shallow-copies, rules array reference is shared
      expect(builtOnce.rules.length).toBe(2);
      expect(builtOnce.rules[1]?.field).toBe('field2');

      // Also mutating built schema should affect future builds
      builtOnce.rules.push({
        field: 'injected',
        type: 'string',
        required: false,
      });
      const builtTwice = builder.build();
      expect(builtTwice.rules.some((r): boolean => r.field === 'injected')).toBe(true);
    });

        .booleanField('published', false)
        .arrayField('categories', false)
        .objectField('author', true)
        .urlField('source', false, 'Bad URL')
        .addRule({ field: 'rating', type: 'number', required: false, min: 1, max: 5 });

      expect(result).toBe(builder);
      const fields = builder.build().rules.map((r): string => r.field);
      expect(fields).toEqual(['title', 'published', 'categories', 'author', 'source', 'rating']);
    });
  });
});
