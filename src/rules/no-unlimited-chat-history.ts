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

    return {
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
              }

              // Case 2: Variable reference without .slice()
              if (historyValue.type === 'Identifier') {
                context.report({
                  node: historyProp,
                  messageId: 'noSliceOnHistory',
                  data: {
                    name: historyValue.name,
                    max: maxHistoryLength.toString(),
                  },
                });
              }

              // Case 3: Check for .slice() call
              if (
                historyValue.type === 'CallExpression' &&
                isMemberExpression(historyValue.callee) &&
                historyValue.callee.property.type === 'Identifier' &&
                historyValue.callee.property.name === 'slice'
              ) {
                // Has slice - check if it's limiting properly
                const sliceArgs = historyValue.arguments;

                // .slice(-N) pattern
                if (
                  sliceArgs.length === 1 &&
                  sliceArgs[0].type === 'UnaryExpression' &&
                  sliceArgs[0].operator === '-' &&
                  sliceArgs[0].argument.type === 'Literal' &&
                  typeof sliceArgs[0].argument.value === 'number'
                ) {
                  const limit = sliceArgs[0].argument.value;

                  if (limit > maxHistoryLength) {
                    context.report({
                      node: historyProp,
                      messageId: 'largeHistory',
                      data: {
                        count: limit.toString(),
                        max: maxHistoryLength.toString(),
                      },
                    });
                  }
                }
              }

              // Case 4: Map or other transformation without limiting
              if (
                historyValue.type === 'CallExpression' &&
                isMemberExpression(historyValue.callee) &&
                historyValue.callee.property.type === 'Identifier'
              ) {
                const methodName = historyValue.callee.property.name;

                // If using map/filter/etc without slice, warn
                if (
                  ['map', 'filter', 'reduce'].includes(methodName) &&
                  historyValue.callee.object.type === 'Identifier'
                ) {
                  context.report({
                    node: historyProp,
                    messageId: 'noSliceOnHistory',
                    data: {
                      name: historyValue.callee.object.name,
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
