import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using concise property names in Schema definitions to reduce token usage',
      recommended: false,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#prefer-concise-property-names',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxPropertyLength: {
            type: 'number',
            default: 20,
            description: 'Maximum recommended property name length',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      longPropertyName:
        "Property name '{{ name }}' is {{ length }} characters. Consider a shorter name to reduce tokens. Each character in property names counts toward token usage.",
      verbosePropertyName:
        "Property name '{{ name }}' could be more concise. Examples: 'user_email_address' → 'email', 'product_description_text' → 'description'",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const maxPropertyLength = options.maxPropertyLength ?? 20;

    // Common verbose patterns and their suggested replacements
    const verbosePatterns: Array<{ pattern: RegExp; suggestion: string }> = [
      { pattern: /^user_?email_?address$/i, suggestion: 'email' },
      { pattern: /^product_?description_?text$/i, suggestion: 'description' },
      { pattern: /^customer_?phone_?number$/i, suggestion: 'phone' },
      { pattern: /^item_?price_?value$/i, suggestion: 'price' },
      { pattern: /^response_?message_?text$/i, suggestion: 'message' },
      { pattern: /^is_?active_?status$/i, suggestion: 'active' },
      { pattern: /^has_?been_?deleted$/i, suggestion: 'deleted' },
      { pattern: /^created_?at_?timestamp$/i, suggestion: 'createdAt' },
      { pattern: /^updated_?at_?timestamp$/i, suggestion: 'updatedAt' },
      { pattern: /^total_?count_?number$/i, suggestion: 'count' },
      { pattern: /^full_?name_?string$/i, suggestion: 'name' },
      { pattern: /^_?data_?value$/i, suggestion: '' }, // Remove redundant suffix
      { pattern: /^_?info_?object$/i, suggestion: '' },
      { pattern: /^_?list_?array$/i, suggestion: '' },
    ];

    function isVerbose(name: string): boolean {
      return verbosePatterns.some(({ pattern }) => pattern.test(name));
    }

    return {
      // Check Schema.object() calls
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'Schema' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'object'
        ) {
          return;
        }

        const configArg = node.arguments[0];
        if (!isObjectExpression(configArg)) return;

        const propertiesProp = findProperty(configArg, 'properties');
        if (!propertiesProp || !isObjectExpression(propertiesProp.value)) return;

        // Check each property in the schema
        for (const prop of propertiesProp.value.properties) {
          if (prop.type !== 'Property') continue;

          let propertyName: string | null = null;

          if (prop.key.type === 'Identifier') {
            propertyName = prop.key.name;
          } else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
            propertyName = prop.key.value;
          }

          if (!propertyName) continue;

          // Check for verbose names
          if (isVerbose(propertyName)) {
            context.report({
              node: prop.key as Rule.Node,
              messageId: 'verbosePropertyName',
              data: {
                name: propertyName,
              },
            });
            continue;
          }

          // Check for long names
          if (propertyName.length > maxPropertyLength) {
            context.report({
              node: prop.key as Rule.Node,
              messageId: 'longPropertyName',
              data: {
                name: propertyName,
                length: propertyName.length.toString(),
              },
            });
          }
        }
      },

      // Also check object literals used as responseSchema
      Property(node) {
        if (
          node.key.type !== 'Identifier' ||
          node.key.name !== 'responseSchema'
        ) {
          return;
        }

        if (!isObjectExpression(node.value)) return;

        const propertiesProp = findProperty(node.value, 'properties');
        if (!propertiesProp || !isObjectExpression(propertiesProp.value)) return;

        for (const prop of propertiesProp.value.properties) {
          if (prop.type !== 'Property') continue;

          let propertyName: string | null = null;

          if (prop.key.type === 'Identifier') {
            propertyName = prop.key.name;
          } else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
            propertyName = prop.key.value;
          }

          if (!propertyName) continue;

          if (propertyName.length > maxPropertyLength) {
            context.report({
              node: prop.key as Rule.Node,
              messageId: 'longPropertyName',
              data: {
                name: propertyName,
                length: propertyName.length.toString(),
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
