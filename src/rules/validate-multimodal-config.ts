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
        'Validate multimodal configuration (inlineData vs fileData) based on the initialized backend',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#validate-multimodal-config',
    },
    schema: [],
    messages: {
      fileUriRequiresVertex:
        'Cloud Storage URLs (fileUri with gs://) require VertexAIBackend. GoogleAIBackend only supports inlineData (base64).',
    },
  },

  create(context) {
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

      // Check for fileData usage
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'fileData' &&
          backendUsed === 'GoogleAI'
        ) {
          context.report({
            node,
            messageId: 'fileUriRequiresVertex',
          });
        }
      },
    };
  },
};

export default rule;
