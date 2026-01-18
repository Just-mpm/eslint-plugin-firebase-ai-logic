import type { Rule } from 'eslint';
import {
  getCalleeName,
  isObjectExpression,
  findProperty,
  isArrayExpression,
  isMemberExpression,
} from '../utils/ast-helpers.js';
import { RECOMMENDED_CHAT_HISTORY_LIMIT } from '../utils/constants.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn against unlimited chat history which leads to excessive token usage and costs',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-unlimited-chat-history',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxHistoryLength: {
            type: 'number',
            default: RECOMMENDED_CHAT_HISTORY_LIMIT,
            description: 'Maximum recommended history length',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unlimitedHistory:
        'Chat history appears unbounded. Limit history to {{ max }} messages to control token usage: history.slice(-{{ max }})',
      largeHistory:
        'Chat history has {{ count }} items. Consider limiting to {{ max }} to reduce token usage.',
      noSliceOnHistory:
        "Using variable '{{ name }}' directly as history. Consider using .slice(-{{ max }}) to limit history size.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const maxHistoryLength =
      options.maxHistoryLength ?? RECOMMENDED_CHAT_HISTORY_LIMIT;

    // Track variables that were created from .slice() calls
    const slicedVariables = new Set<string>();

    /**
     * Check if a CallExpression is a .slice() call and return the limit if found
     */
    function getSliceLimit(
      node: Rule.Node
    ): { isSlice: true; limit: number | null } | { isSlice: false } {
      if (
        node.type === 'CallExpression' &&
        isMemberExpression(node.callee) &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'slice'
      ) {
        const sliceArgs = node.arguments;

        // .slice(-N) pattern - negative index from end
        if (
          sliceArgs.length === 1 &&
          sliceArgs[0].type === 'UnaryExpression' &&
          sliceArgs[0].operator === '-' &&
          sliceArgs[0].argument.type === 'Literal' &&
          typeof sliceArgs[0].argument.value === 'number'
        ) {
          return { isSlice: true, limit: sliceArgs[0].argument.value };
        }

        // .slice(0, N) pattern - from start with limit
        if (
          sliceArgs.length === 2 &&
          sliceArgs[0].type === 'Literal' &&
          sliceArgs[0].value === 0 &&
          sliceArgs[1].type === 'Literal' &&
          typeof sliceArgs[1].value === 'number'
        ) {
          return { isSlice: true, limit: sliceArgs[1].value };
        }

        // .slice() with dynamic or complex arguments - still a slice, unknown limit
        return { isSlice: true, limit: null };
      }

      return { isSlice: false };
    }

    /**
     * Check if a CallExpression has .slice() somewhere in the chain
     * e.g., messages.filter(...).slice(-20) or messages.slice(-20).map(...)
     */
    function hasSliceInChain(node: Rule.Node): boolean {
      if (node.type !== 'CallExpression') return false;

      // Check if this call itself is a slice
      const sliceResult = getSliceLimit(node);
      if (sliceResult.isSlice) return true;

      // Check if the object being called has slice in its chain
      if (
        isMemberExpression(node.callee) &&
        node.callee.object.type === 'CallExpression'
      ) {
        return hasSliceInChain(node.callee.object as Rule.Node);
      }

      return false;
    }

    return {
      // Track variable declarations that use .slice()
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && node.init) {
          // Direct slice call: const recent = messages.slice(-20)
          const sliceResult = getSliceLimit(node.init as Rule.Node);
          if (sliceResult.isSlice) {
            slicedVariables.add(node.id.name);
            return;
          }

          // Chained slice: const recent = messages.filter(...).slice(-20)
          if (hasSliceInChain(node.init as Rule.Node)) {
            slicedVariables.add(node.id.name);
            return;
          }

          // Spread with slice: const recent = [...messages.slice(-20)]
          if (
            node.init.type === 'ArrayExpression' &&
            node.init.elements.length === 1 &&
            node.init.elements[0]?.type === 'SpreadElement'
          ) {
            const spreadArg = node.init.elements[0].argument;
            if (hasSliceInChain(spreadArg as Rule.Node)) {
              slicedVariables.add(node.id.name);
            }
          }
        }
      },

      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Check startChat calls
        if (calleeName === 'startChat') {
          const configArg = node.arguments[0];

          if (isObjectExpression(configArg)) {
            const historyProp = findProperty(configArg, 'history');

            if (historyProp) {
              const historyValue = historyProp.value;

              // Case 1: Direct array literal with many items
              if (isArrayExpression(historyValue)) {
                const itemCount = historyValue.elements.length;

                if (itemCount > maxHistoryLength) {
                  context.report({
                    node: historyProp,
                    messageId: 'largeHistory',
                    data: {
                      count: itemCount.toString(),
                      max: maxHistoryLength.toString(),
                    },
                  });
                }
                return; // Array literal is bounded by definition
              }

              // Case 2: Variable reference - check if it was created from slice
              if (historyValue.type === 'Identifier') {
                // If variable was created from .slice(), it's safe
                if (slicedVariables.has(historyValue.name)) {
                  return; // Safe - variable was created from slice
                }

                context.report({
                  node: historyProp,
                  messageId: 'noSliceOnHistory',
                  data: {
                    name: historyValue.name,
                    max: maxHistoryLength.toString(),
                  },
                });
                return;
              }

              // Case 3: Direct .slice() call - check limit
              const sliceResult = getSliceLimit(historyValue as Rule.Node);
              if (sliceResult.isSlice) {
                // If limit is known and exceeds max, warn
                if (
                  sliceResult.limit !== null &&
                  sliceResult.limit > maxHistoryLength
                ) {
                  context.report({
                    node: historyProp,
                    messageId: 'largeHistory',
                    data: {
                      count: sliceResult.limit.toString(),
                      max: maxHistoryLength.toString(),
                    },
                  });
                }
                return; // Has slice, either valid or warned
              }

              // Case 4: Check for slice in chain (e.g., messages.filter(...).slice(-20))
              if (hasSliceInChain(historyValue as Rule.Node)) {
                return; // Safe - has slice somewhere in chain
              }

              // Case 5: Map/filter/reduce without slice - warn
              if (
                historyValue.type === 'CallExpression' &&
                isMemberExpression(historyValue.callee) &&
                historyValue.callee.property.type === 'Identifier'
              ) {
                const methodName = historyValue.callee.property.name;

                if (['map', 'filter', 'reduce', 'flatMap'].includes(methodName)) {
                  // Get the source array name if it's an identifier
                  let sourceName = 'array';
                  if (historyValue.callee.object.type === 'Identifier') {
                    sourceName = historyValue.callee.object.name;
                  }

                  context.report({
                    node: historyProp,
                    messageId: 'noSliceOnHistory',
                    data: {
                      name: sourceName,
                      max: maxHistoryLength.toString(),
                    },
                  });
                }
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
