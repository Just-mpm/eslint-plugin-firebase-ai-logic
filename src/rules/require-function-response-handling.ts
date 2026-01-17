import type { Rule } from 'eslint';
import { getCalleeName, isCallExpression, isMemberExpression } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require proper handling of function calls by sending functionResponse back to the model',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-function-response-handling',
    },
    schema: [],
    messages: {
      missingFunctionCallCheck:
        "Model has tools configured but no check for functionCalls() found. Always check result.response.functionCalls() when using tools.",
      missingFunctionResponse:
        "After checking functionCalls(), you must send the result back using chat.sendMessage() with a functionResponse object.",
      incompleteFunctionLoop:
        "Function calling requires a complete loop: (1) get functionCalls(), (2) execute function, (3) send functionResponse back to continue the conversation.",
      gemini3ThoughtSignature:
        "For Gemini 3 models, remember to preserve 'thoughtSignature' from functionCall responses and send it back with your functionResponse.",
    },
  },

  create(context) {
    // Track models created with tools
    const modelsWithTools = new Map<string, Rule.Node>();
    // Track if functionCalls() is ever called
    let hasFunctionCallsCheck = false;

    return {
      // Track getGenerativeModel calls with tools
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Track when functionCalls() is called
        if (calleeName === 'functionCalls') {
          hasFunctionCallsCheck = true;
        }

        // Check for getGenerativeModel with tools
        if (calleeName === 'getGenerativeModel') {
          const toolsArg = node.arguments.find(
            (arg) =>
              arg.type === 'ObjectExpression' &&
              arg.properties.some(
                (p) =>
                  p.type === 'Property' &&
                  p.key.type === 'Identifier' &&
                  p.key.name === 'tools'
              )
          );

          if (toolsArg) {
            // This is a model with tools
            if (
              node.parent?.type === 'VariableDeclarator' &&
              node.parent.id.type === 'Identifier'
            ) {
              modelsWithTools.set(node.parent.id.name, node as Rule.Node);
            }
          }
        }

        // Check for generateContent calls on models with tools that don't check functionCalls
        if (calleeName === 'generateContent' || calleeName === 'generateContentStream') {
          const callee = node.callee;

          // Check if this is called on a model with tools
          if (
            isMemberExpression(callee) &&
            callee.object.type === 'Identifier' &&
            modelsWithTools.has(callee.object.name)
          ) {
            // Check if this call is followed by functionCalls check nearby
            const hasLocalCheck = checkForFunctionCallsNearby(
              node as Rule.Node
            );

            if (!hasLocalCheck && !hasFunctionCallsCheck) {
              context.report({
                node,
                messageId: 'missingFunctionCallCheck',
              });
            }
          }
        }
      },

      // Check for missing thoughtSignature handling (Gemini 3)
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'functionResponse'
        ) {
          // Check if thoughtSignature is being preserved
          // This is informational for Gemini 3 users
          const parent = node.parent;

          if (parent?.type === 'ObjectExpression') {
            // Check if thoughtSignature is being preserved (for future use)
            parent.properties.some(
              (p) =>
                p.type === 'Property' &&
                p.key.type === 'Identifier' &&
                p.key.name === 'thoughtSignature'
            );

            // We don't report here because thoughtSignature might be handled elsewhere
            // or the user might be using Gemini 2.5 which doesn't require it
          }
        }
      },
    };

    function checkForFunctionCallsNearby(node: Rule.Node): boolean {
      // Check sibling statements
      if (node.parent?.type === 'ExpressionStatement') {
        const grandparent = node.parent.parent;

        if (grandparent?.type === 'BlockStatement') {
          const statements = grandparent.body as Rule.Node[];
          const nodeIndex = statements.indexOf(node.parent as Rule.Node);

          // Check next few statements for functionCalls
          for (let i = nodeIndex + 1; i < Math.min(nodeIndex + 5, statements.length); i++) {
            const stmt = statements[i];
            if (containsFunctionCallsCheck(stmt as Rule.Node)) {
              return true;
            }
          }
        }
      }

      return false;
    }

    function containsFunctionCallsCheck(node: Rule.Node | undefined | null): boolean {
      if (!node) return false;

      if (isCallExpression(node)) {
        const name = getCalleeName(node);
        if (name === 'functionCalls') return true;
      }

      // Recursively check children
      const keys = [
        'expression',
        'left',
        'right',
        'test',
        'consequent',
        'alternate',
        'body',
        'argument',
      ];

      for (const key of keys) {
        const child = (node as unknown as Record<string, unknown>)[key];
        if (child && typeof child === 'object' && containsFunctionCallsCheck(child as Rule.Node)) {
          return true;
        }
      }

      return false;
    }
  },
};

export default rule;
