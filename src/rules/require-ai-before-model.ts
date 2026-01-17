import type { Rule } from 'eslint';
import { getCalleeName, isCallExpression } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require getAI() to be called before getGenerativeModel() in the same scope',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-ai-before-model',
    },
    schema: [],
    messages: {
      missingGetAI:
        "getGenerativeModel() requires an AI instance from getAI(). Make sure to call 'const ai = getAI(app, { backend: new GoogleAIBackend() })' before using getGenerativeModel(ai, config).",
      wrongFirstArg:
        "First argument to getGenerativeModel() should be the AI instance returned by getAI(), not '{{ argType }}'.",
    },
  },

  create(context) {
    // Track getAI calls and their returned variables
    const aiVariables = new Set<string>();

    return {
      // Track variable declarations that call getAI
      VariableDeclarator(node) {
        if (
          node.init &&
          isCallExpression(node.init) &&
          getCalleeName(node.init) === 'getAI' &&
          node.id.type === 'Identifier'
        ) {
          aiVariables.add(node.id.name);
        }
      },

      // Track assignments that call getAI
      AssignmentExpression(node) {
        if (
          isCallExpression(node.right) &&
          getCalleeName(node.right) === 'getAI' &&
          node.left.type === 'Identifier'
        ) {
          aiVariables.add(node.left.name);
        }
      },

      // Check getGenerativeModel calls
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (calleeName !== 'getGenerativeModel') return;

        const args = node.arguments;

        if (args.length === 0) {
          context.report({
            node,
            messageId: 'missingGetAI',
          });
          return;
        }

        const firstArg = args[0];

        // Check if first argument is an identifier
        if (firstArg.type === 'Identifier') {
          // Check if it's a known AI variable
          if (!aiVariables.has(firstArg.name)) {
            // It might be imported or defined elsewhere, so just warn
            // We can't be 100% sure it's wrong
            // Only report if the name doesn't look like an AI instance
            const lowerName = firstArg.name.toLowerCase();
            if (
              !lowerName.includes('ai') &&
              !lowerName.includes('vertex') &&
              !lowerName.includes('firebase')
            ) {
              context.report({
                node: firstArg,
                messageId: 'wrongFirstArg',
                data: {
                  argType: firstArg.name,
                },
              });
            }
          }
        } else if (firstArg.type === 'Literal') {
          // First argument is a literal (string, number, etc.) - definitely wrong
          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: typeof firstArg.value,
            },
          });
        } else if (firstArg.type === 'ObjectExpression') {
          // First argument is an object - should be AI instance, not config
          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: 'object',
            },
          });
        }
      },
    };
  },
};

export default rule;
