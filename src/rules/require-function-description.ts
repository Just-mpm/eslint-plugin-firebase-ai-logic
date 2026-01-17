import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getStringValue,
  isArrayExpression,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require detailed description for function declarations in Firebase AI Logic tools',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-function-description',
    },
    schema: [],
    messages: {
      missingDescription:
        "Function declaration '{{ name }}' is missing a 'description' property. The model uses this to decide when to call the function.",
      vagueDescription:
        "Function declaration '{{ name }}' has a vague description. Provide detailed information about what the function does, its parameters, and return value.",
      shortDescription:
        "Function declaration '{{ name }}' description is too short ({{ length }} chars). Aim for at least 50 characters explaining what the function does.",
    },
  },

  create(context) {
    // Words that indicate vague descriptions
    const vagueWords = [
      'gets data',
      'get data',
      'fetch data',
      'fetches data',
      'returns data',
      'return data',
      'does something',
      'do something',
      'function to',
      'a function',
      'helper',
      'utility',
      'misc',
      'various',
      'stuff',
      'thing',
      'things',
    ];

    function isVagueDescription(description: string): boolean {
      const lower = description.toLowerCase().trim();

      // Check for vague words
      if (vagueWords.some((word) => lower === word || lower.includes(word))) {
        return true;
      }

      // Check for very short descriptions (less than 20 chars)
      if (description.length < 20) {
        return true;
      }

      return false;
    }

    function checkFunctionDeclaration(_node: Rule.Node, obj: Parameters<typeof isObjectExpression>[0]) {
      if (!isObjectExpression(obj)) return;

      const nameProp = findProperty(obj, 'name');
      const descriptionProp = findProperty(obj, 'description');

      const functionName = nameProp ? getStringValue(nameProp.value) : 'unknown';

      // Check if description is missing
      if (!descriptionProp) {
        context.report({
          node: obj as Rule.Node,
          messageId: 'missingDescription',
          data: {
            name: functionName ?? 'unknown',
          },
        });
        return;
      }

      // Check if description is vague or too short
      const descriptionValue = getStringValue(descriptionProp.value);

      // Check for empty description
      if (descriptionValue === '') {
        context.report({
          node: descriptionProp,
          messageId: 'missingDescription',
          data: {
            name: functionName ?? 'unknown',
          },
        });
        return;
      }

      if (descriptionValue) {
        if (descriptionValue.length < 30) {
          context.report({
            node: descriptionProp,
            messageId: 'shortDescription',
            data: {
              name: functionName ?? 'unknown',
              length: descriptionValue.length.toString(),
            },
          });
        } else if (isVagueDescription(descriptionValue)) {
          context.report({
            node: descriptionProp,
            messageId: 'vagueDescription',
            data: {
              name: functionName ?? 'unknown',
            },
          });
        }
      }
    }

    return {
      // Check functionDeclarations arrays
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'functionDeclarations' &&
          isArrayExpression(node.value)
        ) {
          for (const element of node.value.elements) {
            if (element && isObjectExpression(element)) {
              checkFunctionDeclaration(element as Rule.Node, element);
            }
          }
        }
      },

      // Check FunctionDeclaration type annotations (TypeScript)
      CallExpression(node) {
        const callee = node.callee;

        // Check for Schema-style function declaration builders
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'functionDeclaration'
        ) {
          const arg = node.arguments[0];
          if (isObjectExpression(arg)) {
            checkFunctionDeclaration(arg as Rule.Node, arg);
          }
        }
      },
    };
  },
};

export default rule;
