import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule, type ValidationSchema } from '../src/validation/schemas.js';

vi.mock('node:fs', (): Record<string, unknown> => ({
});




// Mock an external dependency (no real deps in constructor, but ensure vi.mock usage)

  readFileSync: vi.fn(),
}));


  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default level Moderate and empty rules', (): void => {
      const schema: ValidationSchema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.rules.length).toBe(0);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided validation level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema: ValidationSchema = custom.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should not throw when building schema immediately after construction', (): void => {
      expect((): ValidationSchema => builder.build()).not.toThrow();
    });



      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0].customValidator).toBe(customValidator);
    });

  describe('stringField', (): void => {
    test('should add a required string rule with defaults', (): void => {
      builder.stringField('username');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toEqual({
        field: 'username',
        type: 'string',
        required: true,
      });

      builder.stringField('username', false, options);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'username',
        type: 'string',
        required: false,
        minLength: 2,
        maxLength: 10,
        pattern: options.pattern,
        errorMessage: 'Invalid username',
      });

    test('should not throw when options are undefined', (): void => {
      expect((): SchemaBuilder => builder.stringField('desc', true, undefined)).not.toThrow();
    });

      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0].minLength).toBe(5);
      expect(schema.rules[0].maxLength).toBe(1);
    });

  describe('numberField', (): void => {
    test('should add a required number rule with defaults', (): void => {
      builder.numberField('age');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'age',
        type: 'number',
        required: true,
      });

      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'age',
        type: 'number',
        required: false,
        min: 1,
        max: 120,
        errorMessage: 'Invalid age',
      });

      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0].min).toBe(10);
      expect(schema.rules[0].max).toBe(1);
    });

  describe('emailField', (): void => {
    test('should add required email rule with default pattern and message', (): void => {
      builder.emailField('email');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0].type).toBe('email');
      expect(schema.rules[0].required).toBe(true);
      expect(schema.rules[0].pattern).toBeInstanceOf(RegExp);
      expect(schema.rules[0].errorMessage).toBe('Invalid email format');

      const regex = schema.rules[0].pattern as RegExp;
      expect(regex.test('user@example.com')).toBe(true);
      expect(regex.test('not-an-email')).toBe(false);
    });

    test('should override error message and allow optional', (): void => {
      builder.emailField('email', false, 'Bad email');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toMatchObject({
        field: 'email',
        type: 'email',
        required: false,
        errorMessage: 'Bad email',
      });
      expect(schema.rules[0].pattern).toBeInstanceOf(RegExp);
    });

  describe('urlField', (): void => {
    test('should add required url rule with default message', (): void => {
      builder.urlField('website');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'website',
        type: 'url',
        required: true,
        errorMessage: 'Invalid URL format',
      });
    });

    test('should allow custom error message and optional', (): void => {
      builder.urlField('website', false, 'Bad URL');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'website',
        type: 'url',
        required: false,
        errorMessage: 'Bad URL',
      });
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean rule by default', (): void => {
      builder.booleanField('active');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'active',
        type: 'boolean',
        required: true,
      });
    });

    test('should add optional boolean rule when required=false', (): void => {
      builder.booleanField('active', false);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'active',
        type: 'boolean',
        required: false,
      });
    });
  });

  describe('arrayField', (): void => {
    test('should add required array rule by default', (): void => {
      builder.arrayField('items');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'items',
        type: 'array',
        required: true,
      });
    });

    test('should add optional array rule when required=false', (): void => {
      builder.arrayField('items', false);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'items',
        type: 'array',
        required: false,
      });
    });
  });

  describe('objectField', (): void => {
    test('should add required object rule by default', (): void => {
      builder.objectField('profile');
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'profile',
        type: 'object',
        required: true,
      });
    });

    test('should add optional object rule when required=false', (): void => {
      builder.objectField('profile', false);
      const schema: ValidationSchema = builder.build();
      expect(schema.rules[0]).toEqual({
        field: 'profile',
        type: 'object',
        required: false,
      });
    });
  });

  describe('allowUnknown', (): void => {
    test('should enable allowUnknownFields when called without argument', (): void => {
      builder.allowUnknown();
      const schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields to false when explicitly passed false', (): void => {
      builder.allowUnknown(false);
      const schema: ValidationSchema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });

    test('should accept unknown values at runtime (edge case, cast) without throwing', (): void => {
      const weird = 'unexpected' as unknown as ValidationLevel;
      expect((): SchemaBuilder => builder.setLevel(weird)).not.toThrow();
      const schema: ValidationSchema = builder.build();
      expect(schema.level).toBe(weird);
    });
  });

  describe('build', (): void => {
    test('should return a new object but share the rules array reference (shallow copy behavior)', (): void => {
      builder.stringField('before');
      const first: ValidationSchema = builder.build();
      expect(first.name).toBe('TestSchema');
      expect(first.rules).toHaveLength(1);

      // Add more rules after initial build
      builder.numberField('age');
      const second: ValidationSchema = builder.build();

      // Since build uses a shallow copy, first.rules reference is the same as builder's internal rules array
      expect(first.rules).toBe(second.rules);
      expect(first.rules).toHaveLength(2);
      expect(first.rules[1]).toEqual({
        field: 'age',
        type: 'number',
        required: true,
      });
    });

    test('should reflect chained calls correctly', (): void => {
      const schema: ValidationSchema = new SchemaBuilder('User', ValidationLevel.Strict)

      expect(schema.name).toBe('User');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules).toEqual([
        { field: 'name', type: 'string', required: true, minLength: 1 },
        { field: 'email', type: 'email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMessage: 'Invalid email format' },
        { field: 'age', type: 'number', required: false, min: 0, max: 150 },
        { field: 'active', type: 'boolean', required: true },
        { field: 'tags', type: 'array', required: false },
        { field: 'meta', type: 'object', required: false },
      ]);
    });

      builder.stringField('dup', false, { maxLength: 5 });
      const schema: ValidationSchema = builder.build();
      expect(schema.rules).toHaveLength(2);
      expect(schema.rules[0]).toMatchObject({ field: 'dup', type: 'string', required: true, minLength: 1 });
      expect(schema.rules[1]).toMatchObject({ field: 'dup', type: 'string', required: false, maxLength: 5 });
    });
  });
});
