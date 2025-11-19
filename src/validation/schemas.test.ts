import { describe, test, expect, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../../src/validation/schemas';

describe('SchemaBuilder', (): void => {
  let builder: SchemaBuilder;

  beforeEach((): void => {
    builder = new SchemaBuilder('TestSchema');
  });

  describe('constructor', (): void => {
    test('should initialize with default level and empty rules', (): void => {
      const schema = builder.build();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = custom.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });
  });

  describe('addRule', (): void => {
    test('should add a custom rule and be chainable', (): void => {
      const ret = builder.addRule({
        field: 'custom',
        type: 'number',
        required: false,
        min: 1,
        max: 10,
        customValidator: (value: unknown): boolean => typeof value === 'number' && value > 0,
        errorMessage: 'Must be positive number',
      });
      expect(ret).toBe(builder);
      const schema = builder.build();
      expect(schema.rules).toHaveLength(1);
      const rule = schema.rules[0];
      expect(rule.field).toBe('custom');
      expect(rule.type).toBe('number');
      expect(rule.required).toBe(false);
      expect(rule.min).toBe(1);
      expect(rule.max).toBe(10);
      expect(typeof rule.customValidator).toBe('function');
      expect(rule.errorMessage).toBe('Must be positive number');
      // Indirectly validate customValidator behavior
      const validator = rule.customValidator as (v: unknown) => boolean;
      expect(validator(5)).toBe(true);
      expect(validator(-1)).toBe(false);
      expect(validator('5')).toBe(false);
    });

    test('should not throw when adding a rule with minimal properties', (): void => {
      expect((): void => {
        builder.addRule({
          field: 'minimal',
          type: 'string',
          required: true,
        });
      }).not.toThrow();
    });
  });

  describe('stringField', (): void => {
    test('should add a required string rule by default', (): void => {
      const ret = builder.stringField('name');
      expect(ret).toBe(builder);
      const { rules } = builder.build();
      const rule = rules.find((r) => r.field === 'name');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
    });

    test('should respect options and required false', (): void => {
      builder.stringField('description', false, {
        minLength: 2,
        maxLength: 100,
        pattern: /^[A-Z].*/,
        errorMessage: 'Must start with uppercase',
      });
      const rule = builder.build().rules.find((r) => r.field === 'description');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.minLength).toBe(2);
      expect(rule?.maxLength).toBe(100);
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      expect(rule?.errorMessage).toBe('Must start with uppercase');
      const pattern = rule?.pattern as RegExp;
      expect(pattern.test('Abc')).toBe(true);
      expect(pattern.test('abc')).toBe(false);
    });

    test('should not throw when field name is empty', (): void => {
      expect((): void => {
        builder.stringField('', true);
      }).not.toThrow();
    });
  });

  describe('numberField', (): void => {
    test('should add a required number rule by default', (): void => {
      builder.numberField('age');
      const rule = builder.build().rules.find((r) => r.field === 'age');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(true);
      expect(rule?.min).toBeUndefined();
      expect(rule?.max).toBeUndefined();
    });

    test('should respect min, max and error message', (): void => {
      builder.numberField('score', false, { min: 0, max: 100, errorMessage: 'Out of range' });
      const rule = builder.build().rules.find((r) => r.field === 'score');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.min).toBe(0);
      expect(rule?.max).toBe(100);
      expect(rule?.errorMessage).toBe('Out of range');
    });
  });

  describe('emailField', (): void => {
    test('should add an email rule with default errorMessage and pattern', (): void => {
      builder.emailField('email');
      const rule = builder.build().rules.find((r) => r.field === 'email');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern).toBeInstanceOf(RegExp);

      const pattern = rule?.pattern as RegExp;
      expect(pattern.test('user@example.com')).toBe(true);
      expect(pattern.test('user@domain')).toBe(false);
      expect(pattern.test('bad email')).toBe(false);
    });

    test('should allow overriding errorMessage and required flag', (): void => {
      builder.emailField('backupEmail', false, 'Email not valid');
      const rule = builder.build().rules.find((r) => r.field === 'backupEmail');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Email not valid');
      expect(rule?.pattern).toBeInstanceOf(RegExp);
    });
  });

  describe('urlField', (): void => {
    test('should add a url rule with default errorMessage', (): void => {
      builder.urlField('site');
      const rule = builder.build().rules.find((r) => r.field === 'site');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
    });

    test('should allow overriding errorMessage and required flag', (): void => {
      builder.urlField('homepage', false, 'Bad URL');
      const rule = builder.build().rules.find((r) => r.field === 'homepage');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Bad URL');
    });
  });

  describe('booleanField', (): void => {
    test('should add a boolean rule with default required true', (): void => {
      builder.booleanField('isActive');
      const rule = builder.build().rules.find((r) => r.field === 'isActive');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });

    test('should support required false', (): void => {
      builder.booleanField('isArchived', false);
      const rule = builder.build().rules.find((r) => r.field === 'isArchived');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add an array rule', (): void => {
      builder.arrayField('tags');
      const rule = builder.build().rules.find((r) => r.field === 'tags');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(true);
    });
  });

  describe('objectField', (): void => {
    test('should add an object rule', (): void => {
      builder.objectField('profile');
      const rule = builder.build().rules.find((r) => r.field === 'profile');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });
  });

  describe('allowUnknown', (): void => {
    test('should default to false and allow enabling', (): void => {
      expect(builder.build().allowUnknownFields).toBe(false);
      const ret = builder.allowUnknown(true);
      expect(ret).toBe(builder);
      expect(builder.build().allowUnknownFields).toBe(true);
    });

    test('should allow disabling after enabling', (): void => {
      builder.allowUnknown(true);
      expect(builder.build().allowUnknownFields).toBe(true);
      builder.allowUnknown(false);
      expect(builder.build().allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should set validation level and be chainable', (): void => {
      const ret = builder.setLevel(ValidationLevel.Strict);
      expect(ret).toBe(builder);
      expect(builder.build().level).toBe(ValidationLevel.Strict);
    });

    test('should change level multiple times', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      expect(builder.build().level).toBe(ValidationLevel.Lenient);
      builder.setLevel(ValidationLevel.Moderate);
      expect(builder.build().level).toBe(ValidationLevel.Moderate);
    });
  });

  describe('build', (): void => {
    test('should return a new object on each build', (): void => {
      const s1 = builder.build();
      const s2 = builder.build();
      expect(s1).not.toBe(s2);
      expect(s1.name).toBe(s2.name);
      expect(s1.level).toBe(s2.level);
    });

    test('should expose same rules array reference across builds (shallow copy)', (): void => {
      builder.stringField('field1');
      const s1 = builder.build();
      const s2 = builder.build();
      expect(s1.rules).toBe(s2.rules);

      // Mutate rules through built schema and observe effect on subsequent builds
      s1.rules.push({
        field: 'injected',
        type: 'string',
        required: true,
      });
      const s3 = builder.build();
      const injected = s3.rules.find((r) => r.field === 'injected');
      expect(injected).toBeDefined();
    });

    test('should not let top-level primitive changes affect builder internals', (): void => {
      const s1 = builder.build();
      s1.allowUnknownFields = true;
      // Builder should still reflect original false unless explicitly changed
      const s2 = builder.build();
      expect(s2.allowUnknownFields).toBe(false);
    });
  });

  describe('method chaining and accumulation', (): void => {
    test('should accumulate multiple rules across chained calls', (): void => {
      builder
        .stringField('title')
        .numberField('count')
        .booleanField('flag')
        .emailField('contact')
        .urlField('website')
        .arrayField('items')
        .objectField('meta');

      const { rules } = builder.build();
      expect(rules.map((r) => r.field)).toEqual([
        'title',
        'count',
        'flag',
        'contact',
        'website',
        'items',
        'meta',
      ]);

      expect(rules.find((r) => r.field === 'title')?.type).toBe('string');
      expect(rules.find((r) => r.field === 'count')?.type).toBe('number');
      expect(rules.find((r) => r.field === 'flag')?.type).toBe('boolean');
      expect(rules.find((r) => r.field === 'contact')?.type).toBe('email');
      expect(rules.find((r) => r.field === 'website')?.type).toBe('url');
      expect(rules.find((r) => r.field === 'items')?.type).toBe('array');
      expect(rules.find((r) => r.field === 'meta')?.type).toBe('object');
    });
  });
});
