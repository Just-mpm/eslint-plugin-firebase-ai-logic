import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getPropertyName,
  isProperty,
} from '../utils/ast-helpers.js';
import { UNSUPPORTED_FUNCTION_PARAMS } from '../utils/constants.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow unsupported parameter attributes in function declarations',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-unsupported-function-params',
    },
    schema: [],
    messages: {
      unsupportedParam:
        "Parameter attribute '{{ attribute }}' is not supported in Firebase AI Logic function declarations. {{ suggestion }}",
      useOptionalProperties:
        "Use 'optionalProperties' array in the parameters schema to mark fields as optional.",
    },
  },

  create(context) {
    const attributeSuggestions: Record<string, string> = {
      default: 'Apply default values in your function implementation instead.',
      examples: 'Remove examples from the schema. The model does not use them for function calling.',
      optional: "Use 'optionalProperties' array to mark parameters as optional.",
      maximum: 'Validate the value in your function implementation.',
      minimum: 'Validate the value in your function implementation.',
      oneOf: 'Handle multiple types in your function implementation.',
      anyOf: 'Handle multiple types in your function implementation.',
      allOf: 'Flatten the schema structure.',
    };

    function checkObjectForUnsupportedParams(
      _node: Rule.Node,
      obj: Parameters<typeof isObjectExpression>[0]
    ) {
      if (!isObjectExpression(obj)) return;

      for (const prop of obj.properties) {
        if (!isProperty(prop)) continue;

        const propName = getPropertyName(prop);
        if (!propName) continue;

        // Check if this property is an unsupported attribute
        if (UNSUPPORTED_FUNCTION_PARAMS.includes(propName as typeof UNSUPPORTED_FUNCTION_PARAMS[number])) {
          context.report({
            node: prop,
            messageId: 'unsupportedParam',
            data: {
              attribute: propName,
              suggestion:
                attributeSuggestions[propName] ??
                'Remove this attribute from the parameter schema.',
            },
          });
        }

        // Recursively check nested objects
        if (isObjectExpression(prop.value)) {
          checkObjectForUnsupportedParams(prop.value as Rule.Node, prop.value);
        }

        // Check arrays of objects
        if (prop.value.type === 'ArrayExpression') {
          for (const element of prop.value.elements) {
            if (element && isObjectExpression(element)) {
              checkObjectForUnsupportedParams(element as Rule.Node, element);
            }
          }
        }
      }
    }

    return {
      // Check parameters in function declarations
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'parameters' &&
          isObjectExpression(node.value)
        ) {
          // Check if this is inside a function declaration context
          // by looking for sibling 'name' and 'description' properties
          const parent = node.parent;
          if (parent?.type === 'ObjectExpression') {
            const hasName = findProperty(parent, 'name');
            const hasDescription = findProperty(parent, 'description');

            // This looks like a function declaration
            if (hasName || hasDescription) {
              checkObjectForUnsupportedParams(node.value as Rule.Node, node.value);
            }
          }
        }
      },

      // Check Schema.object() calls used in function parameters
      CallExpression(node) {
        const callee = node.callee;

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Schema'
        ) {
          // Check if this is being used as a function parameter
          // by checking the parent context
          let parent: Rule.Node | null = node.parent;
          while (parent) {
            if (
              parent.type === 'Property' &&
              parent.key.type === 'Identifier' &&
              parent.key.name === 'parameters'
            ) {
              // This Schema call is being used as function parameters
              for (const arg of node.arguments) {
                if (isObjectExpression(arg)) {
                  checkObjectForUnsupportedParams(arg as Rule.Node, arg);
                }
              }
              break;
            }
            parent = (parent.parent as Rule.Node | undefined) || null;
          }
        }
      },
    };
  },
};

export default rule;
