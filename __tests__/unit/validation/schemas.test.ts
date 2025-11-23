import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SchemaBuilder, ValidationLevel } from '../src/validation/schemas';

vi.mock('node:path', (): Record<string, unknown> => ({
  default: {},
}));





    test('should initialize with default values', (): void => {
      const schema = builder.build();
      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.level).toBe(ValidationLevel.Moderate);
      expect(schema.rules).toEqual([]);
      expect(schema.allowUnknownFields).toBe(false);
    });

    test('should accept and set provided level', (): void => {
      const customBuilder = new SchemaBuilder('Custom', ValidationLevel.Strict);
      const schema = customBuilder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should not throw during construction', (): void => {
      expect((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    });


    test('should not throw when adding rule', (): void => {
      expect((): void => {
        builder.addRule({
          field: 'safe',
          type: 'number',
          required: false,
        });
      }).not.toThrow();
    });


    test('should default to required true when not specified', (): void => {
      builder.stringField('title');
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(true);
    });

    test('should respect required = false', (): void => {
      builder.stringField('nickname', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });


    test('should set required to false when provided', (): void => {
      builder.numberField('rating', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });

  describe('emailField', (): void => {
    test('should add email rule with default error message and pattern', (): void => {
      builder.emailField('email');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid email format');
      expect(rule.pattern).toBeInstanceOf(RegExp);

      const pattern = rule.pattern as RegExp;
      expect(pattern.test('user@example.com')).toBe(true);
      expect(pattern.test('bad-email')).toBe(false);
    });

    test('should allow custom error message', (): void => {
      builder.emailField('email', true, 'Custom email error');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.errorMessage).toBe('Custom email error');
    });

    test('should set required to false when provided', (): void => {
      builder.emailField('email', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });

  describe('urlField', (): void => {
    test('should add url rule with default error message', (): void => {
      builder.urlField('website');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('website');
      expect(rule.type).toBe('url');
      expect(rule.required).toBe(true);
      expect(rule.errorMessage).toBe('Invalid URL format');
    });

    test('should allow custom error message for url', (): void => {
      builder.urlField('website', true, 'Provide a valid URL');
      const schema = builder.build();
      expect(schema.rules[0].errorMessage).toBe('Provide a valid URL');
    });

    test('should set required = false when provided', (): void => {
      builder.urlField('homepage', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });

  describe('booleanField', (): void => {
    test('should add boolean rule default required true', (): void => {
      builder.booleanField('active');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('active');
      expect(rule.type).toBe('boolean');
      expect(rule.required).toBe(true);
    });

    test('should set required = false when provided', (): void => {
      builder.booleanField('active', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });

  describe('arrayField', (): void => {
    test('should add array rule with required true by default', (): void => {
      builder.arrayField('tags');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('tags');
      expect(rule.type).toBe('array');
      expect(rule.required).toBe(true);
    });

    test('should set required = false when provided', (): void => {
      builder.arrayField('tags', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });
  });

  describe('objectField', (): void => {
    test('should add object rule with required true by default', (): void => {
      builder.objectField('profile');
      const schema = builder.build();
      const rule = schema.rules[0];
      expect(rule.field).toBe('profile');
      expect(rule.type).toBe('object');
      expect(rule.required).toBe(true);
    });

    test('should set required = false when provided', (): void => {
      builder.objectField('profile', false);
      const schema = builder.build();
      expect(schema.rules[0].required).toBe(false);
    });
  });

  describe('allowUnknown', (): void => {
    test('should set allowUnknownFields to true', (): void => {
      builder.allowUnknown(true);
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
    test('should change validation level', (): void => {
      builder.setLevel(ValidationLevel.Strict);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Strict);
    });

    test('should support switching levels multiple times', (): void => {
      builder.setLevel(ValidationLevel.Lenient).setLevel(ValidationLevel.Moderate);
      const schema = builder.build();
      expect(schema.level).toBe(ValidationLevel.Moderate);
    });

    test('should not throw when setting level', (): void => {
      expect((): void => {
        builder.setLevel(ValidationLevel.Lenient);
      }).not.toThrow();
    });
  });

  });

  describe('build', (): void => {
    test('should return a shallow copy of schema', (): void => {
      builder.stringField('fieldA');
      const schema1 = builder.build();
      const schema2 = builder.build();

      expect(schema1).not.toBe(schema2);
      expect(schema1).toEqual(schema2);
    });

    test('should isolate top-level mutations on built schema from builder', (): void => {
      const schema1 = builder.build();
      // Mutate top-level name of built schema
      schema1.name = 'MutatedName';

      const schema2 = builder.build();
      expect(schema2.name).toBe('TestSchema');
      expect(schema1.name).toBe('MutatedName');
    });

    test('should share rules array reference due to shallow copy', (): void => {
      builder.stringField('initial');
      const schema1 = builder.build();
      expect(schema1.rules).toHaveLength(1);

      // Mutate through builder
      builder.numberField('later');

      // Because of shallow copy, schema1.rules should reflect mutation
      expect(schema1.rules).toHaveLength(2);
      expect(schema1.rules.map((r): string => r.field)).toEqual(['initial', 'later']);
    });


      const rebuilt = localBuilder.build();
      expect(rebuilt.rules.map((r): string => r.field)).toEqual(['one', 'two']);
    });

    test('should not throw when building schema multiple times', (): void => {
      builder.stringField('x').numberField('y');
      expect((): void => {
        const s1 = builder.build();
        const s2 = builder.build();
        expect(s1.rules.length).toBe(2);
        expect(s2.rules.length).toBe(2);
      }).not.toThrow();
    });
  });
});
