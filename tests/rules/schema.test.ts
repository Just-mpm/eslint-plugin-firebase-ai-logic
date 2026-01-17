import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import noSchemaInPrompt from '../../src/rules/no-schema-in-prompt.js';
import noStreamingWithSchema from '../../src/rules/no-streaming-with-schema.js';
import noUnsupportedSchemaFeatures from '../../src/rules/no-unsupported-schema-features.js';
import preferOptionalProperties from '../../src/rules/prefer-optional-properties.js';
import validateResponseMimeType from '../../src/rules/validate-response-mime-type.js';
import validateSchemaStructure from '../../src/rules/validate-schema-structure.js';

const ruleTester = new RuleTester();

describe('Schema Rules', () => {
  describe('no-schema-in-prompt', () => {
    ruleTester.run('no-schema-in-prompt', noSchemaInPrompt, {
      valid: [
        // No schema in prompt when responseSchema is used
        `const result = await model.generateContent('Analyze this text');`,
        // Schema mention without responseSchema config is ok
        `const result = await model.generateContent('Return JSON: { name: string }');`,
      ],
      invalid: [
        {
          code: `
            const model = getGenerativeModel(ai, {
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              },
            });
            const result = await model.generateContent('Return JSON: { name: string, age: number }');
          `,
          errors: [{ messageId: 'duplicateSchema' }],
        },
      ],
    });
  });

  describe('no-streaming-with-schema', () => {
    ruleTester.run('no-streaming-with-schema', noStreamingWithSchema, {
      valid: [
        // Streaming without schema
        `const result = await model.generateContentStream('Hello');`,
        // Non-streaming with schema
        `const result = await model.generateContent('Hello');`,
      ],
      invalid: [
        {
          code: `
            const model = getGenerativeModel(ai, {
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              },
            });
            const result = await model.generateContentStream('Hello');
          `,
          errors: [{ messageId: 'streamingWithSchema' }],
        },
        {
          code: `
            const model = getGenerativeModel(ai, {
              generationConfig: {
                responseSchema: mySchema,
              },
            });
            const result = await model.generateContentStream('Hello');
          `,
          errors: [{ messageId: 'streamingWithSchema' }],
        },
      ],
    });
  });

  describe('no-unsupported-schema-features', () => {
    ruleTester.run('no-unsupported-schema-features', noUnsupportedSchemaFeatures, {
      valid: [
        // Valid schema
        `const schema = Schema.object({ properties: { name: Schema.string() } });`,
        // optionalProperties is valid
        `const schema = Schema.object({ properties: { name: Schema.string() }, optionalProperties: ['name'] });`,
      ],
      invalid: [
        // minLength
        {
          code: `const schema = Schema.object({ properties: { name: { type: 'string', minLength: 5 } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // maxLength
        {
          code: `const schema = Schema.object({ properties: { name: { type: 'string', maxLength: 100 } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // pattern
        {
          code: `const schema = Schema.object({ properties: { name: { type: 'string', pattern: '^[a-z]+$' } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // oneOf
        {
          code: `const schema = Schema.object({ properties: { field: { oneOf: [{ type: 'string' }, { type: 'number' }] } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // anyOf
        {
          code: `const schema = Schema.object({ properties: { field: { anyOf: [{ type: 'string' }, { type: 'number' }] } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // allOf
        {
          code: `const schema = Schema.object({ properties: { field: { allOf: [{ type: 'object' }, { required: ['name'] }] } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // $ref
        {
          code: `const schema = Schema.object({ properties: { field: { $ref: '#/definitions/User' } } });`,
          errors: [{ messageId: 'unsupportedFeature' }],
        },
        // if/then/else
        {
          code: `const schema = Schema.object({ properties: { field: { if: { type: 'string' }, then: { minLength: 1 } } } });`,
          errors: [
            { messageId: 'unsupportedFeature' },
            { messageId: 'unsupportedFeature' },
            { messageId: 'unsupportedFeature' },
          ],
        },
      ],
    });
  });

  describe('prefer-optional-properties', () => {
    ruleTester.run('prefer-optional-properties', preferOptionalProperties, {
      valid: [
        // Using optionalProperties
        `const schema = Schema.object({ properties: { name: Schema.string() }, optionalProperties: ['age'] });`,
        // All properties required (no optional)
        `const schema = Schema.object({ properties: { name: Schema.string(), age: Schema.number() } });`,
      ],
      invalid: [
        // Using nullable: true instead of optionalProperties
        {
          code: `const schema = Schema.object({ properties: { name: { type: 'string' }, age: { type: 'number', nullable: true } } });`,
          errors: [{ messageId: 'nullableNotOptional' }],
        },
      ],
    });
  });

  describe('validate-response-mime-type', () => {
    ruleTester.run('validate-response-mime-type', validateResponseMimeType, {
      valid: [
        `const model = getGenerativeModel(ai, { generationConfig: { responseMimeType: 'application/json' } });`,
        `const model = getGenerativeModel(ai, { generationConfig: { responseMimeType: 'text/x.enum' } });`,
      ],
      invalid: [
        {
          code: `const model = getGenerativeModel(ai, { generationConfig: { responseMimeType: 'application/xml' } });`,
          errors: [{ messageId: 'unsupportedMimeType' }],
        },
        {
          code: `const model = getGenerativeModel(ai, { generationConfig: { responseMimeType: 'text/plain' } });`,
          errors: [{ messageId: 'unsupportedMimeType' }],
        },
      ],
    });
  });

  describe('validate-schema-structure', () => {
    ruleTester.run('validate-schema-structure', validateSchemaStructure, {
      valid: [
        `const schema = Schema.object({ properties: { name: Schema.string() } });`,
        `const schema = Schema.object({ properties: { name: Schema.string() }, optionalProperties: ['name'] });`,
      ],
      invalid: [
        {
          code: `const schema = Schema.object({ properties: { name: Schema.string() }, required: ['name'] });`,
          errors: [{ messageId: 'redundantRequired' }],
        },
      ],
    });
  });
});
