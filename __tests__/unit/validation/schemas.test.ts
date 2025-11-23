import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../../src/validation/schemas';

vi.mock('node:os', (): Record<string, unknown> => ({
  platform: vi.fn((): string => 'linux'),
}));

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  describe('constructor', (): void => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

    test('should initialize with default values', (): void => {
      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.rules.length).toBe(0);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should respect provided validation level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = custom.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should not throw on basic construction', (): void => {
      expect((): SchemaBuilder => new SchemaBuilder('NoThrow')).toBeDefined();
    });
  });

  describe('addRule', (): void => {
      builder.addRule(rule);
      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toMatchObject(rule);
    });

      expect((): void => {
        builder.addRule(complexRule as unknown as Parameters<SchemaBuilder['addRule']>[0]);
      }).not.toThrow();
    });
  });

  describe('stringField', (): void => {
      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toMatchObject({
        field: 'username',
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 20,
      });
      expect(schema.rules[0].pattern).toBeInstanceOf(RegExp);
      expect((schema.rules[0].pattern as RegExp).test('abc')).toBe(true);
      expect((schema.rules[0].pattern as RegExp).test('ABC')).toBe(false);
    });

    test('should add an optional string field', (): void => {
      builder.stringField('nickname', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'nickname',
        type: 'string',
        required: false,
      });
    });

    test('should not throw with empty options', (): void => {
      expect((): void => {
        builder.stringField('emptyOptions', true, undefined);
      }).not.toThrow();
    });
  });

  describe('numberField', (): void => {
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'score',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
      });
    });

    test('should add an optional number field', (): void => {
      builder.numberField('rating', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'rating',
        type: 'number',
        required: false,
      });
    });
  });

  describe('emailField', (): void => {
    test('should add a required email field with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'email',
        type: 'email',
        required: true,
        errorMessage: 'Invalid email format',
      });
      const pattern = schema.rules[0].pattern as RegExp;
      expect(pattern).toBeInstanceOf(RegExp);
      expect(pattern.test('a@b.com')).toBe(true);
      expect(pattern.test('invalid-email')).toBe(false);
    });

    test('should accept a custom error message', (): void => {
      builder.emailField('contact', true, 'Custom email message');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        errorMessage: 'Custom email message',
      });
    });

    test('should allow optional email field', (): void => {
      builder.emailField('optionalEmail', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'optionalEmail',
        type: 'email',
        required: false,
      });
    });
  });

  describe('urlField', (): void => {
    test('should add a required url field with default error message', (): void => {
      builder.urlField('website');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'website',
        type: 'url',
        required: true,
        errorMessage: 'Invalid URL format',
      });
    });

    test('should support custom error message', (): void => {
      builder.urlField('homepage', true, 'Bad URL');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        errorMessage: 'Bad URL',
      });
    });

    test('should allow optional url field', (): void => {
      builder.urlField('docs', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'docs',
        type: 'url',
        required: false,
      });
    });
  });

  describe('booleanField', (): void => {
    test('should add a boolean field that is required by default', (): void => {
      builder.booleanField('isActive');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'isActive',
        type: 'boolean',
        required: true,
      });
    });

    test('should allow optional boolean field', (): void => {
      builder.booleanField('isDeleted', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'isDeleted',
        type: 'boolean',
        required: false,
      });
    });
  });

  describe('arrayField', (): void => {
    test('should add a required array field', (): void => {
      builder.arrayField('tags');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'tags',
        type: 'array',
        required: true,
      });
    });

    test('should allow optional array field', (): void => {
      builder.arrayField('items', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'items',
        type: 'array',
        required: false,
      });
    });
  });

  describe('objectField', (): void => {
    test('should add a required object field', (): void => {
      builder.objectField('profile');
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'profile',
        type: 'object',
        required: true,
      });
    });

    test('should allow optional object field', (): void => {
      builder.objectField('settings', false);
      const schema = builder.build();
      expect(schema.rules[0]).toMatchObject({
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

    test('should disable allowUnknownFields when false', (): void => {
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should not throw when passed an invalid level at runtime', (): void => {
      expect((): void => {
        builder.setLevel('invalid' as unknown as ValidationLevel);
      }).not.toThrow();
      const schema = builder.build();
      expect(schema.level).toBe('invalid');
    });
  });

  describe('build', (): void => {
        .numberField('age', false, { min: 0 })
        .allowUnknown(true)
        .setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Lenient);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules).toHaveLength(2);
      expect(schema.rules[0]).toMatchObject({ field: 'name', type: 'string' });
      expect(schema.rules[1]).toMatchObject({ field: 'age', type: 'number', required: false });
    });

    test('should return a shallow copy (mutating rules array will affect builder internal state)', (): void => {
      builder.stringField('field1');
      const first = builder.build();
      expect(first.rules).toHaveLength(1);

      // Mutate the returned schema's rules array
      first.rules.push({
        field: 'injected',
        type: 'string',
        required: true,
      });

      // Build again and observe that the new rule is present due to shallow copy
      const second = builder.build();
      expect(second.rules.find((r): boolean => r.field === 'injected')).toBeTruthy();
    });

    test('should produce distinct schema object references on multiple builds', (): void => {
      const a = builder.build();
      const b = builder.build();
      expect(a).not.toBe(b);
    });
  });

  describe('chaining', (): void => {
    test('should support fluent API chaining', (): void => {
      const schema = builder
        .stringField('a')
        .numberField('b')
        .booleanField('c', false)
        .arrayField('d')
        .objectField('e', false)
        .emailField('f')
        .urlField('g', false)
        .allowUnknown(true)
        .setLevel(ValidationLevel.Strict)
        .build();

      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules.map((r): string => r.field)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(schema.rules).toHaveLength(7);
    });

    test('should not throw on chaining with edge-case field names', (): void => {
      expect((): void => {
        builder
          .stringField('', true)
          .numberField('0', true, { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER })
          .emailField('email-address')
          .urlField('url-path', false)
          .booleanField('flag?', true)
          .arrayField('list[]', false)
          .objectField('obj.name', true);
      }).not.toThrow();
    });
  });
});
