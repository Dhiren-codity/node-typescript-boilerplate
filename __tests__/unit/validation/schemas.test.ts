import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaBuilder, ValidationLevel, type ValidationRule } from '../../src/validation/schemas';


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
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(Array.isArray(schema.rules)).toBe(true);
      expect(schema.rules.length).toBe(0);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should initialize with provided validation level', (): void => {
      const custom = new SchemaBuilder('Custom', ValidationLevel.Lenient);
      const schema = custom.build();
      expect(schema.name).toBe('Custom');
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });

    test('should handle empty schema name without throwing', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _unused = new SchemaBuilder('', ValidationLevel.Strict);
      }).not.toThrow();
    });
  });

  describe('addRule', (): void => {

      const returned = builder.addRule(rule);
      expect(returned).toBe(builder);

      const schema = builder.build();
      expect(schema.rules.length).toBe(1);
      expect(schema.rules[0]).toBe(rule);
      expect(schema.rules[0].customValidator).toBe(customValidator);
    });

      const r2: ValidationRule = { field: 'b', type: 'number', required: false };
      builder.addRule(r1).addRule(r2);
      const schema = builder.build();
      expect(schema.rules.map((r): string => r.field)).toEqual(['a', 'b']);
    });
  });

  describe('stringField', (): void => {
    test('should add a required string field by default', (): void => {
      builder.stringField('username');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'username');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(true);
      expect(rule?.minLength).toBeUndefined();
      expect(rule?.maxLength).toBeUndefined();
      expect(rule?.pattern).toBeUndefined();
      expect(rule?.errorMessage).toBeUndefined();
    });

      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'nickname');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('string');
      expect(rule?.required).toBe(false);
      expect(rule?.minLength).toBe(3);
      expect(rule?.maxLength).toBe(20);
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      expect(rule?.errorMessage).toBe('Invalid nickname');
      const matches = (rule?.pattern as RegExp).test('John');
      expect(matches).toBe(true);
    });

    test('should not throw for large minLength/maxLength values', (): void => {
      expect((): void => {
        builder.stringField('large', true, { minLength: 0, maxLength: 1000000 });
      }).not.toThrow();
    });
  });

  describe('numberField', (): void => {
    test('should add number field with defaults', (): void => {
      builder.numberField('age');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'age');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(true);
      expect(rule?.min).toBeUndefined();
      expect(rule?.max).toBeUndefined();
      expect(rule?.errorMessage).toBeUndefined();
    });

      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'score');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('number');
      expect(rule?.required).toBe(false);
      expect(rule?.min).toBe(0);
      expect(rule?.max).toBe(100);
      expect(rule?.errorMessage).toBe('Invalid score');
    });
  });

  describe('emailField', (): void => {
    test('should add required email field with default error message and regex pattern', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'email');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('email');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid email format');
      expect(rule?.pattern).toBeInstanceOf(RegExp);
      const valid = (rule?.pattern as RegExp).test('user@example.com');
      const invalid = (rule?.pattern as RegExp).test('invalid-email');
      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    test('should accept custom error message and required false', (): void => {
      builder.emailField('backupEmail', false, 'Custom email error');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'backupEmail');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Custom email error');
    });
  });

  describe('urlField', (): void => {
    test('should add required url field with default error message', (): void => {
      builder.urlField('website');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'website');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('url');
      expect(rule?.required).toBe(true);
      expect(rule?.errorMessage).toBe('Invalid URL format');
    });

    test('should accept custom error message and required false', (): void => {
      builder.urlField('homepage', false, 'Custom URL error');
      const schema = builder.build();
      const rule = schema.rules.find((r): boolean => r.field === 'homepage');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
      expect(rule?.errorMessage).toBe('Custom URL error');
    });
  });

  describe('booleanField', (): void => {
    test('should add a boolean field with required true by default', (): void => {
      builder.booleanField('isActive');
      const rule = builder.build().rules.find((r): boolean => r.field === 'isActive');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('boolean');
      expect(rule?.required).toBe(true);
    });

    test('should add a boolean field with required false', (): void => {
      builder.booleanField('isEnabled', false);
      const rule = builder.build().rules.find((r): boolean => r.field === 'isEnabled');
      expect(rule).toBeDefined();
      expect(rule?.required).toBe(false);
    });
  });

  describe('arrayField', (): void => {
    test('should add an array field', (): void => {
      builder.arrayField('items', false);
      const rule = builder.build().rules.find((r): boolean => r.field === 'items');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('array');
      expect(rule?.required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add an object field', (): void => {
      builder.objectField('meta');
      const rule = builder.build().rules.find((r): boolean => r.field === 'meta');
      expect(rule).toBeDefined();
      expect(rule?.type).toBe('object');
      expect(rule?.required).toBe(true);
    });
  });

  describe('allowUnknown', (): void => {
    test('should toggle allowUnknownFields to true', (): void => {
      builder.allowUnknown(true);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(true);
    });

    test('should toggle allowUnknownFields to false', (): void => {
      builder.allowUnknown(true).allowUnknown(false);
      const schema = builder.build();
      expect(schema.allowUnknownFields).toBe(false);
    });
  });

  describe('setLevel', (): void => {
    test('should update validation level to Strict', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should update validation level to Lenient', (): void => {
      builder.setLevel(ValidationLevel.Lenient);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Lenient);
    });
  });

  describe('build', (): void => {
    test('should return a new schema object on each build (shallow copy)', (): void => {
      builder.stringField('field1').numberField('field2');
      const schema1 = builder.build();
      const schema2 = builder.build();
      expect(schema1).not.toBe(schema2);
      expect(schema1.rules).toBe(schema2.rules);
    });

      schema1.rules.push(externalRule);
      const schema2 = builder.build();
      const added = schema2.rules.find((r): boolean => r.field === 'external');
      expect(added).toBe(externalRule);
    });

    test('should not throw when building multiple times without changes', (): void => {
      builder.booleanField('flag');
      expect((): void => {
        builder.build();
        builder.build();
        builder.build();
      }).not.toThrow();
    });
  });

  describe('fluent API', (): void => {
        .numberField('count', false, { min: 0 })
        .emailField('contact', true)
        .urlField('link', false, 'Bad URL')
        .booleanField('published', true)
        .arrayField('tags', false)
        .objectField('metadata', false);

      expect(chained).toBe(builder);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
      expect(schema.allowUnknownFields).toBe(true);
      expect(schema.rules.map((r): string => r.field)).toEqual([
        'title',
        'count',
        'contact',
        'link',
        'published',
        'tags',
        'metadata',
      ]);
    });
  });
});
