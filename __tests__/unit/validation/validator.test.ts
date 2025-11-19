import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../src/validation/schemas.js', (): Record<string, unknown> => ({
  ValidationLevel: {
    Strict: 'Strict',
    Lenient: 'Lenient',
  },
}));

import { Validator, validateData } from '../../src/validation/validator.js';
import { ValidationLevel } from '../../src/validation/schemas.js';

type RuleShape = Record<string, unknown>;
type DataShape = Record<string, unknown>;
type SchemaShape = {
  rules: RuleShape[];
  level: unknown;
  allowUnknownFields?: boolean;
};

  ): Validator => {
    const schema: SchemaShape = {
      rules,
      level: opts?.level ?? ValidationLevel.Strict,
      allowUnknownFields: opts?.allowUnknownFields ?? false,
    };
    return new Validator(schema as unknown as never);
  };

  beforeEach((): void => {
    baseSchema = {
      rules: [
        {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 2,
        },
      ],
      level: ValidationLevel.Strict,
      allowUnknownFields: false,
    };
    validator = new Validator(baseSchema as unknown as never);
  });

  afterEach((): void => {
    // no-op for now
  });

  describe('constructor', (): void => {
    test('should initialize with provided schema and level', (): void => {
      expect(validator).toBeDefined();
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('getSchema should return a shallow copy not linked to internal schema', (): void => {
      const originalLevel = validator.getLevel();
      const schemaCopy = validator.getSchema() as unknown as SchemaShape;
      expect(schemaCopy.level).toBe(originalLevel);

      // Mutate the copy level and ensure validator level remains unchanged
      schemaCopy.level = ValidationLevel.Lenient;
      expect(validator.getLevel()).toBe(originalLevel);

      // Ensure copy still has rules
      expect(Array.isArray((schemaCopy as { rules: unknown[] }).rules)).toBe(true);
    });

  describe('getLevel and setLevel', (): void => {
    test('getLevel should return current level', (): void => {
      expect(validator.getLevel()).toBe(ValidationLevel.Strict);
    });

    test('setLevel should update the level', (): void => {
      validator.setLevel(ValidationLevel.Lenient as unknown as never);
      expect(validator.getLevel()).toBe(ValidationLevel.Lenient);
    });


      const localValidator = buildValidator([nameRule, ageRule]);
      const result = localValidator.validate({ name: '  Alice  ', age: 25 } as DataShape);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sanitized).toBeDefined();
      const sanitized = result.sanitized as Record<string, unknown>;
      expect(sanitized.name).toBe('Alice');
      expect(sanitized.age).toBe(25);
    });

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('name');
      expect(result.errors[0]?.rule).toBe('required');
    });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('required');
    });

      ]);
      const result = localValidator.validate({ age: '30' } as DataShape);
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
      expect(result.errors[0]?.field).toBe('age');
      expect(result.errors[0]?.rule).toBe('type');
    });

      ]);
      const tooShort = localValidator.validate({ username: 'ab' } as DataShape);
      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors.some((e) => e.rule === 'minLength')).toBe(true);

      const tooLong = localValidator.validate({ username: 'abcdef' } as DataShape);
      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors.some((e) => e.rule === 'maxLength')).toBe(true);

      const ok = localValidator.validate({ username: 'abcd' } as DataShape);
      expect(ok.valid).toBe(true);
    });

      ]);
      const below = localValidator.validate({ score: 5 } as DataShape);
      expect(below.valid).toBe(false);
      expect(below.errors.some((e) => e.rule === 'min')).toBe(true);

      const above = localValidator.validate({ score: 25 } as DataShape);
      expect(above.valid).toBe(false);
      expect(above.errors.some((e) => e.rule === 'max')).toBe(true);

      const within = localValidator.validate({ score: 15 } as DataShape);
      expect(within.valid).toBe(true);
    });

      ]);
      const bad = localValidator.validate({ tag: 'ABC' } as DataShape);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('pattern');

      const good = localValidator.validate({ tag: 'abc' } as DataShape);
      expect(good.valid).toBe(true);
    });

      ]);
      const result = localValidator.validate({ pin: '0000' } as DataShape);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom');
    });

      ]);
      const result = localValidator.validate({ token: 'abc' } as DataShape);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.rule).toBe('custom_error');
      expect(result.errors[0]?.message).toContain('Custom validator threw error: boom');
    });

      ]);
      const bad = localValidator.validate({ email: 'not-an-email' } as DataShape);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');

      const good = localValidator.validate({ email: 'user@example.com' } as DataShape);
      expect(good.valid).toBe(true);
    });

      ]);
      const bad = localValidator.validate({ site: 'ht!tp://bad' } as DataShape);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]?.rule).toBe('type');

      const good = localValidator.validate({ site: 'https://example.com' } as DataShape);
      expect(good.valid).toBe(true);
    });

        { field: 'metadata', type: 'object', required: true },
      ]);

      const good = localValidator.validate({
        items: [1, 2, 3],
        metadata: { id: 1 },
      } as DataShape);
      expect(good.valid).toBe(true);

      const badArray = localValidator.validate({
        items: { not: 'array' },
        metadata: { id: 1 },
      } as DataShape);
      expect(badArray.valid).toBe(false);
      expect(badArray.errors.some((e) => e.field === 'items' && e.rule === 'type')).toBe(true);

      const badObject = localValidator.validate({
        items: [],
        metadata: ['not', 'object'],
      } as DataShape);
      expect(badObject.valid).toBe(false);
      expect(badObject.errors.some((e) => e.field === 'metadata' && e.rule === 'type')).toBe(true);
    });

        { level: ValidationLevel.Strict, allowUnknownFields: false },
      );

      const result = localValidator.validate({ known: 'x', unknown: 123 } as DataShape);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'unknown_field' && e.field === 'unknown')).toBe(
        true,
      );
      expect(result.warnings).toHaveLength(0);
    });

        { level: ValidationLevel.Lenient, allowUnknownFields: false },
      );

      const result = localValidator.validate({ known: 'x', extra: true } as DataShape);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Unknown field 'extra' found in data");
    });

        schema as unknown as never,
      );
      expect(good.valid).toBe(true);
      expect((good.sanitized as Record<string, unknown>).username).toBe('John');

      const bad = validateData({ username: 'Jo', age: 17 } as DataShape, schema as unknown as never);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.rule === 'minLength')).toBe(true);
      expect(bad.errors.some((e) => e.rule === 'min')).toBe(true);
      expect(bad.sanitized).toBeUndefined();
    });
