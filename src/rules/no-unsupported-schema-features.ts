import type { Rule } from 'eslint';
import {
  isObjectExpression,
  getPropertyName,
  isProperty,
} from '../utils/ast-helpers.js';
import { UNSUPPORTED_SCHEMA_FEATURES } from '../utils/constants.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow unsupported schema features in Firebase AI Logic responseSchema',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-unsupported-schema-features',
    },
    schema: [],
    messages: {
      unsupportedFeature:
        "Schema feature '{{ feature }}' is not supported by Firebase AI Logic. {{ suggestion }}",
      useZodInstead:
        'For complex validation ({{ feature }}), use Zod to validate the response after parsing instead of in the schema.',
    },
  },

  create(context) {
    const featureSuggestions: Record<string, string> = {
      minLength: 'Use Zod validation after parsing: z.string().min(n)',
      maxLength: 'Use Zod validation after parsing: z.string().max(n)',
      pattern: 'Use Zod validation after parsing: z.string().regex(/pattern/)',
      minimum: 'Use Zod validation after parsing: z.number().min(n)',
      maximum: 'Use Zod validation after parsing: z.number().max(n)',
      exclusiveMinimum: 'Use Zod validation after parsing: z.number().gt(n)',
      exclusiveMaximum: 'Use Zod validation after parsing: z.number().lt(n)',
      oneOf: 'Use separate schema requests or Zod union types after parsing',
      anyOf: 'Use separate schema requests or Zod union types after parsing',
      allOf: 'Flatten the schema or use Zod intersection after parsing',
      not: 'Use Zod refine() for negative validation after parsing',
      $ref: 'Inline the referenced schema instead of using $ref',
      if: 'Handle conditional logic in your application code',
      then: 'Handle conditional logic in your application code',
      else: 'Handle conditional logic in your application code',
      default: 'Apply default values in your application code after parsing',
      const: 'Use Schema.enumString() with a single value instead',
      minItems: 'Use Zod validation after parsing: z.array().min(n)',
      uniqueItems: 'Use Zod refine() to check uniqueness after parsing',
      minProperties: 'Validate object size in your application code',
      maxProperties: 'Validate object size in your application code',
      additionalProperties: 'Firebase AI Logic schemas are strict by default',
      patternProperties: 'Use explicit property names instead',
    };

    function checkObjectForUnsupportedFeatures(
      _node: Rule.Node,
      obj: Parameters<typeof isObjectExpression>[0]
    ) {
      if (!isObjectExpression(obj)) return;

      for (const prop of obj.properties) {
        if (!isProperty(prop)) continue;

        const propName = getPropertyName(prop);
        if (!propName) continue;

        // Check if this property is an unsupported feature
        if (UNSUPPORTED_SCHEMA_FEATURES.includes(propName as typeof UNSUPPORTED_SCHEMA_FEATURES[number])) {
          context.report({
            node: prop,
            messageId: 'unsupportedFeature',
            data: {
              feature: propName,
              suggestion: featureSuggestions[propName] ?? 'Remove this property from the schema.',
            },
          });
        }

        // Recursively check nested objects
        if (isObjectExpression(prop.value)) {
          checkObjectForUnsupportedFeatures(prop.value as Rule.Node, prop.value);
        }

        // Check arrays of objects
        if (prop.value.type === 'ArrayExpression') {
          for (const element of prop.value.elements) {
            if (element && isObjectExpression(element)) {
              checkObjectForUnsupportedFeatures(element as Rule.Node, element);
            }
          }
        }
      }
    }

    return {
      // Check Schema.object() calls
      CallExpression(node) {
        const callee = node.callee;

        // Check for Schema.* calls
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Schema'
        ) {
          // Check all arguments
          for (const arg of node.arguments) {
            if (isObjectExpression(arg)) {
              checkObjectForUnsupportedFeatures(arg as Rule.Node, arg);
            }
          }
        }
      },

      // Check responseSchema in generationConfig
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'responseSchema' &&
          isObjectExpression(node.value)
        ) {
          checkObjectForUnsupportedFeatures(node.value as Rule.Node, node.value);
        }
      },
    };
  },
};

export default rule;
