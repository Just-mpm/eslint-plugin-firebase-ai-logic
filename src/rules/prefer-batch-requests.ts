import type { Rule } from 'eslint';
import { getCalleeName, isCallExpression } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest batching multiple AI requests into a single request to reduce API calls and costs',
      recommended: false,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#prefer-batch-requests',
    },
    schema: [],
    messages: {
      multipleRequestsInLoop:
        'Multiple AI requests in a loop. Consider batching into a single request to reduce API calls and costs.',
      batchingSuggestion:
        'Instead of N separate requests, combine items into one prompt: "Process these N items: [list]" and parse the array response.',
    },
  },

  create(context) {
    const aiMethods = [
      'generateContent',
      'generateContentStream',
      'sendMessage',
      'sendMessageStream',
    ];

    return {
      // Check for AI calls inside loops
      ForStatement(node) {
        checkLoopBody(node.body as Rule.Node);
      },

      ForInStatement(node) {
        checkLoopBody(node.body as Rule.Node);
      },

      ForOfStatement(node) {
        checkLoopBody(node.body as Rule.Node);
      },

      WhileStatement(node) {
        checkLoopBody(node.body as Rule.Node);
      },

      DoWhileStatement(node) {
        checkLoopBody(node.body as Rule.Node);
      },

      // Check for .map() or .forEach() with AI calls
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Check if this is a Promise.all(...) call - handle it separately to avoid duplicate reports
        const isPromiseAll =
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Promise' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'all';

        // Check if this map/forEach is inside a Promise.all call
        const isMapInsidePromiseAll =
          node.parent?.type === 'CallExpression' &&
          node.parent.callee.type === 'MemberExpression' &&
          node.parent.callee.object.type === 'Identifier' &&
          node.parent.callee.object.name === 'Promise' &&
          node.parent.callee.property.type === 'Identifier' &&
          node.parent.callee.property.name === 'all';

        // For map/forEach, check if it's not inside Promise.all to avoid duplication
        if (
          (calleeName === 'map' || calleeName === 'forEach') &&
          !isMapInsidePromiseAll
        ) {
          const callback = node.arguments[0];

          if (
            callback &&
            (callback.type === 'FunctionExpression' ||
              callback.type === 'ArrowFunctionExpression')
          ) {
            const hasAiCall = containsAiCall((callback.body as unknown as Rule.Node) || null);

            if (hasAiCall) {
              context.report({
                node,
                messageId: 'multipleRequestsInLoop',
              });
            }
          }
        }

        // Check for Promise.all with array of AI calls
        if (isPromiseAll) {
          const arg = node.arguments[0];

          if (arg?.type === 'ArrayExpression') {
            const aiCallCount = arg.elements.filter(
              (el) => el && isCallExpression(el) && isAiCall(el)
            ).length;

            if (aiCallCount > 2) {
              context.report({
                node,
                messageId: 'multipleRequestsInLoop',
              });
              return; // Don't check map inside if we already reported
            }
          }

          // Check for .map() inside Promise.all - but only report on the Promise.all, not on the inner map
          // (avoid duplicate reports by checking map separately)
          if (
            arg &&
            isCallExpression(arg) &&
            getCalleeName(arg) === 'map'
          ) {
            const mapCallback = arg.arguments[0];

            if (
              mapCallback &&
              (mapCallback.type === 'FunctionExpression' ||
                mapCallback.type === 'ArrowFunctionExpression')
            ) {
              const hasAiCall = containsAiCall((mapCallback.body as unknown as Rule.Node) || null);

              if (hasAiCall) {
                // Report on the Promise.all itself, not the map or the generateContent
                context.report({
                  node,
                  messageId: 'multipleRequestsInLoop',
                });
                return; // Don't process further to avoid duplicate reports
              }
            }
          }
        }
      },
    };

    function checkLoopBody(body: Rule.Node) {
      if (containsAiCall(body)) {
        context.report({
          node: body,
          messageId: 'multipleRequestsInLoop',
        });
      }
    }

    function isAiCall(node: Parameters<typeof isCallExpression>[0]): boolean {
      if (!isCallExpression(node)) return false;
      const name = getCalleeName(node);
      return name !== null && aiMethods.includes(name);
    }

    function containsAiCall(node: Rule.Node | null): boolean {
      if (!node) return false;

      if (isCallExpression(node) && isAiCall(node)) {
        return true;
      }

      // Check AwaitExpression
      if (node.type === 'AwaitExpression' && isAiCall(node.argument)) {
        return true;
      }

      // Recursively check child nodes
      const childKeys = [
        'body',
        'consequent',
        'alternate',
        'expression',
        'argument',
        'callee',
        'arguments',
        'elements',
        'properties',
        'declarations',
        'init',
      ];

      for (const key of childKeys) {
        const child = (node as unknown as Record<string, unknown>)[key];

        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && containsAiCall(item as Rule.Node)) {
              return true;
            }
          }
        } else if (child && typeof child === 'object') {
          if (containsAiCall(child as Rule.Node)) {
            return true;
          }
        }
      }

      return false;
    }
  },
};

export default rule;
