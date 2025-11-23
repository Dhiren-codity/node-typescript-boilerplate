import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../../src/validation/schemas.js';

vi.mock('node:fs', (): Record<string, unknown> => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));



// Mock a built-in module (no direct deps to mock in SchemaBuilder)

  afterEach((): void => {
    vi.clearAllMocks();
  });

  describe('constructor', (): void => {
    test('should initialize with default values correctly', (): void => {
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.allowUnknownFields).toBe(false);
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.rules).toHaveLength(0);
    });

    test('should allow custom level in constructor', (): void => {
      const customBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = customBuilder.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(false);
      expect(schema.rules).toHaveLength(0);
    });

    test('does not throw when building without rules', (): void => {
      expect((): void => {
        builder.build();
      }).not.toThrow();
    });


      builder.addRule({ field: 'name', type: 'string', required: false });

      const schema = builder.build();
      expect(schema.rules).toHaveLength(2);
      expect(schema.rules[0].required).toBe(true);
      expect(schema.rules[1].required).toBe(false);
    });

    test('does not throw when rule has minimal properties', (): void => {
      expect((): void => {
        builder.addRule({ field: 'active', type: 'boolean', required: true });
      }).not.toThrow();
    });

  describe('stringField', (): void => {
    test('should add a required string rule by default', (): void => {
      const returnValue = builder.stringField('username');
      expect(returnValue).toBe(builder);

      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      expect(schema.rules[0]).toEqual(
        expect.objectContaining({
          field: 'username',
          type: 'string',
          required: true,
        }),
      );
    });

      builder.stringField('handle', false, {
        minLength: 3,
        maxLength: 10,
        pattern,
        errorMessage: 'Handle invalid',
      });

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('handle');
      expect(rule.type).toBe('string');
      expect(rule.required).toBe(false);
      expect(rule.minLength).toBe(3);
      expect(rule.maxLength).toBe(10);
      expect(rule.pattern).toBe(pattern);
      expect(rule.errorMessage).toBe('Handle invalid');
    });

    test('does not throw when options are omitted', (): void => {
      expect((): void => {
        builder.stringField('title', true);
      }).not.toThrow();
    });

  describe('numberField', (): void => {
    test('should add a required number rule by default', (): void => {
      builder.numberField('age');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('age');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(true);
      expect(rule.min).toBeUndefined();
      expect(rule.max).toBeUndefined();
      expect(rule.errorMessage).toBeUndefined();
    });


      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.min).toBe(0);
      expect(rule.max).toBe(100);
      expect(rule.errorMessage).toBe('Score out of range');
    });

  describe('emailField', (): void => {
    test('should add a required email rule with default error message and pattern', (): void => {
      builder.emailField('email');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.errorMessage).toBe('Invalid email format');
    });

    test('should add optional email with custom error message', (): void => {
      builder.emailField('contactEmail', false, 'Please provide a valid email');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Please provide a valid email');
    });

  describe('urlField', (): void => {
    test('should add a required url rule with default error message', (): void => {
      builder.urlField('website');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('website');
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
    });

    test('should add optional url rule with custom error message', (): void => {
      builder.urlField('homepage', false, 'Bad URL');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
      expect(rule.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add required boolean rule by default', (): void => {
      builder.booleanField('active');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('active');
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

    test('should add optional boolean rule when required is false', (): void => {
      builder.booleanField('deleted', false);

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add required array rule by default', (): void => {
      builder.arrayField('tags');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('tags');
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

    test('should add optional array rule', (): void => {
      builder.arrayField('options', false);

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add required object rule by default', (): void => {
      builder.objectField('profile');

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('profile');
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

    test('should add optional object rule', (): void => {
      builder.objectField('settings', false);

      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should toggle allowUnknownFields to true', (): void => {
      const ret = builder.allowUnknown(true);
      expect(ret).toBe(builder);

      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should set allowUnknownFields to false', (): void => {
      builder.allowUnknown(true);
      builder.allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level to Strict', (): void => {
      const ret = builder.setLevel(ValidationLevel.Strict);
      expect(ret).toBe(builder);

      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should set validation level to Lenient', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });

    test('does not throw when setting an arbitrary enum value', (): void => {
      expect((): void => {
        builder.setLevel(ValidationLevel.Moderate);
      }).not.toThrow();
    });
  });

  describe('build', (): void => {
    test('should return a shallow copy of the schema object', (): void => {
      builder.stringField('a');
      const built1 = builder.build();
      const built2 = builder.build();

      expect(built1).not.toBe(built2);
      expect(built1.rules).toBe(built2.rules); // same array reference due to shallow copy
    });

    test('mutating built.rules reflects on subsequent builds (shallow copy behavior)', (): void => {
      const built = builder.build();
      expect(built.rules).toHaveLength(0);

      built.rules.push({ field: 'x', type: 'string', required: true });
      expect(builder.build().rules).toHaveLength(1);
    });

    test('should preserve rule order when chaining', (): void => {
      const result = builder
        .stringField('name')

      expect(result.level).toBe(ValidationLevel.Strict);
      expect(result.allowUnknownFields).toBe(true);
      expect(result.rules.map((r) => r.field)).toEqual(['name', 'age', 'email']);
      expect(result.rules[1]).toEqual(
        expect.objectContaining({
          field: 'age',
          type: 'number',
          min: 0,
          max: 130,
          required: true,
        }),
      );
    });

    test('does not throw when called multiple times', (): void => {
      expect((): void => {
        builder.build();
        builder.build();
        builder.build();
      }).not.toThrow();
    });
  });
});
