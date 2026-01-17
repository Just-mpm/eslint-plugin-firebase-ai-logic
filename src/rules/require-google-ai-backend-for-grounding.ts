import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getCalleeName,
  isNewExpression,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require GoogleAIBackend when using Grounding (googleSearch) in Firebase AI Logic',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-google-ai-backend-for-grounding',
    },
    schema: [],
    messages: {
      googleAIBackendRequiredForGrounding:
        'Grounding (googleSearch) requires GoogleAIBackend. VertexAIBackend is not supported for this tool in the Web SDK.',
    },
  },

  create(context) {
    let googleSearchEnabled = false;
    let backendUsed: 'GoogleAI' | 'VertexAI' | 'unknown' = 'unknown';

    return {
      // Track getAI calls to see which backend is initialized
      CallExpression(node) {
        const calleeName = getCalleeName(node);
        if (calleeName === 'getAI') {
          const config = node.arguments[1];
          if (isObjectExpression(config)) {
            const backendProp = findProperty(config, 'backend');
            if (backendProp && isNewExpression(backendProp.value)) {
              const constructorName = getCalleeName(backendProp.value);
              if (constructorName === 'GoogleAIBackend') {
                backendUsed = 'GoogleAI';
              } else if (constructorName === 'VertexAIBackend') {
                backendUsed = 'VertexAI';
              }
            }
          }
        }
      },

      // Check for googleSearch tool
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'googleSearch'
        ) {
          googleSearchEnabled = true;

          // If we already know a VertexAIBackend was used, report immediately
          if (backendUsed === 'VertexAI') {
             context.report({
                node: node,
                messageId: 'googleAIBackendRequiredForGrounding',
             });
          }
        }
      },

      'Program:exit'() {
         if (googleSearchEnabled && backendUsed === 'VertexAI') {
            // Already reported or report now
         }
      }
    };
  },
};

export default rule;
