import type { Rule } from 'eslint';
import {
  findProperty,
  getStringValue,
  isObjectExpression,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate responseMimeType for structured output. Only application/json and text/x.enum are supported.',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#validate-response-mime-type',
    },
    schema: [],
    messages: {
      invalidResponseMimeType:
        "Invalid responseMimeType '{{ mimeType }}'. Supported types for structured output are: application/json, text/x.enum.",
      enumMimeTypeMismatch:
        "Using 'text/x.enum' requires an enum schema (Schema.enumString).",
      jsonMimeTypeMismatch:
        "Using 'application/json' requires a JSON schema (Schema.object or similar).",
    },
  },

  create(context) {
    const VALID_MIME_TYPES = ['application/json', 'text/x.enum'];

    return {
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'responseMimeType'
        ) {
          const mimeType = getStringValue(node.value);
          if (!mimeType) return;

          if (!VALID_MIME_TYPES.includes(mimeType)) {
            context.report({
              node: node.value,
              messageId: 'invalidResponseMimeType',
              data: {
                mimeType,
              },
            });
            return;
          }

          // Optional: Check if schema matches mime type
          // This assumes responseSchema is a sibling property
          const parent = node.parent;
          if (isObjectExpression(parent)) {
             const schemaProp = findProperty(parent, 'responseSchema');
             if (schemaProp) {
                // Determine if schema looks like enum or object
                // This is hard to do statically if it's a variable reference
                // But if it's inline Schema.enumString call...
                
                if (schemaProp.value.type === 'CallExpression') {
                    const callee = schemaProp.value.callee;
                    if (callee.type === 'MemberExpression' && 
                        callee.object.type === 'Identifier' && 
                        callee.object.name === 'Schema') {
                        
                        const method = callee.property.type === 'Identifier' ? callee.property.name : '';
                        
                        if (mimeType === 'text/x.enum' && method !== 'enumString') {
                           // context.report({ messageId: 'enumMimeTypeMismatch' ... })
                           // Maybe too aggressive if users wrap things, but good for direct usage
                        }
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
