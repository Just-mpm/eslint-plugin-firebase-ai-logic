import type { Rule } from 'eslint';
import { findProperty, isArrayExpression } from '../utils/ast-helpers.js';

/**
 * validate-schema-structure
 *
 * IMPORTANT: The "required" property IS VALID in Firebase AI Logic!
 *
 * Firebase AI Logic Schema.object() accepts:
 * - properties: Define the object properties
 * - required: Array of required property names (VALID!)
 * - optionalProperties: Array of optional property names (alternative approach)
 *
 * This rule should NOT report errors for using "required" in Schema.object()
 * because it's a valid and common pattern for function calling parameters.
 *
 * The rule only suggests (not warns) when using BOTH "required" AND
 * "optionalProperties" in the same schema - which while redundant, is
 * technically valid and can improve code clarity/documentation.
 *
 * DEFAULT BEHAVIOR: Allows both "required" and "optionalProperties" because:
 * 1. It's a valid pattern in Firebase AI SDK
 * 2. It improves readability by being explicit
 * 3. Many codebases use this pattern deliberately
 *
 * CONFIGURABLE: Set 'allowBothRequiredAndOptional' to false to enable warnings.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest best practices for Firebase AI Logic schema structure',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#validate-schema-structure',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowBothRequiredAndOptional: {
            type: 'boolean',
            default: true,
            description: 'Allow using both "required" and "optionalProperties" in the same schema. Set to false to warn about redundancy.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      redundantBothRequiredAndOptional:
        'Schema has both "required" and "optionalProperties". This is valid but redundant - consider using only one approach for clarity.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    // Default is true - allow both patterns since it's valid and improves readability
    const allowBothRequiredAndOptional = options.allowBothRequiredAndOptional !== false;

    return {
      // Check for objects that have BOTH required AND optionalProperties
      ObjectExpression(node) {
        // Skip if configured to allow both
        if (allowBothRequiredAndOptional) return;

        const hasRequired = findProperty(node, 'required');
        const hasOptionalProperties = findProperty(node, 'optionalProperties');
        const hasProperties = findProperty(node, 'properties');

        // Only check if this looks like a schema definition
        if (!hasProperties) return;

        // Only suggest if BOTH are present (redundant but valid)
        // Make sure they're both arrays (not just properties with those names)
        if (
          hasRequired &&
          hasOptionalProperties &&
          isArrayExpression(hasRequired.value) &&
          isArrayExpression(hasOptionalProperties.value)
        ) {
          context.report({
            node: hasOptionalProperties.key,
            messageId: 'redundantBothRequiredAndOptional',
          });
        }
      },
    };
  },
};

export default rule;
