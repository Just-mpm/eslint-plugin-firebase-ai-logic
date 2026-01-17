import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getPropertyName,
  isProperty,
} from '../utils/ast-helpers.js';

/**
 * prefer-optional-properties
 *
 * This rule suggests using 'optionalProperties' array for optional fields,
 * but with important exceptions:
 *
 * EXCEPTIONS (no warning):
 * 1. If the schema has a 'required' array defined
 *    - This is the standard way to define required fields in function calling
 *    - Fields not in 'required' are implicitly optional
 * 2. If the schema is for function calling parameters
 *    - Function calling uses 'required' array pattern
 *
 * The rule only warns when:
 * - Schema has many properties (>5)
 * - AND no 'optionalProperties' array
 * - AND no 'required' array (which would indicate intent)
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Suggest using 'optionalProperties' array for optional fields instead of marking fields as nullable",
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#prefer-optional-properties',
    },
    schema: [],
    messages: {
      useOptionalProperties:
        "In Firebase AI Logic, all schema fields are required by default. Use 'optionalProperties: [\"fieldName\"]' array to mark fields as optional.",
      nullableNotOptional:
        "Using 'nullable: true' makes the field accept null but still requires it. Use 'optionalProperties' array to make it truly optional.",
      missingOptionalProperties:
        "Schema has many properties but no 'optionalProperties' or 'required' array. Consider which fields should be optional.",
    },
  },

  create(context) {
    function checkSchemaObject(_node: Rule.Node, obj: Parameters<typeof isObjectExpression>[0]) {
      if (!isObjectExpression(obj)) return;

      const propertiesProp = findProperty(obj, 'properties');
      const optionalPropertiesProp = findProperty(obj, 'optionalProperties');
      const requiredProp = findProperty(obj, 'required');

      // If 'required' array is defined, the developer has explicitly chosen
      // which fields are required - no need to warn about optionalProperties
      if (requiredProp) {
        return;
      }

      // Check for nullable fields without optionalProperties
      if (propertiesProp && isObjectExpression(propertiesProp.value)) {
        const propsObj = propertiesProp.value;
        let hasNullableFields = false;
        const nullableFieldNames: string[] = [];

        for (const prop of propsObj.properties) {
          if (!isProperty(prop)) continue;

          const propName = getPropertyName(prop);
          if (!propName) continue;

          // Check if this property definition has nullable: true
          if (isObjectExpression(prop.value)) {
            const nullableProp = findProperty(prop.value, 'nullable');
            if (
              nullableProp &&
              nullableProp.value.type === 'Literal' &&
              nullableProp.value.value === true
            ) {
              hasNullableFields = true;
              nullableFieldNames.push(propName);
            }
          }
        }

        // If there are nullable fields but no optionalProperties, suggest using optionalProperties
        if (hasNullableFields && !optionalPropertiesProp) {
          context.report({
            node: propertiesProp,
            messageId: 'nullableNotOptional',
          });
        }
      }

      // Check if schema has many properties but no optionalProperties
      if (propertiesProp && isObjectExpression(propertiesProp.value)) {
        const propertyCount = propertiesProp.value.properties.filter(isProperty).length;

        // Only warn if:
        // - Many properties (>5)
        // - No optionalProperties
        // - No required array (which indicates intentional field selection)
        if (propertyCount > 5 && !optionalPropertiesProp && !requiredProp) {
          context.report({
            node: obj as Rule.Node,
            messageId: 'missingOptionalProperties',
          });
        }
      }
    }

    return {
      // Check Schema.object() calls
      CallExpression(node) {
        const callee = node.callee;

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Schema' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'object'
        ) {
          const arg = node.arguments[0];
          if (isObjectExpression(arg)) {
            checkSchemaObject(arg as Rule.Node, arg);
          }
        }
      },

      // Check responseSchema objects directly
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'responseSchema' &&
          isObjectExpression(node.value)
        ) {
          checkSchemaObject(node.value as Rule.Node, node.value);
        }
      },
    };
  },
};

export default rule;
