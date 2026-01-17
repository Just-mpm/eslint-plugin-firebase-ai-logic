import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findNestedProperty,
  getCalleeName,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using generateContentStream() with responseSchema - streaming does not support structured output',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-streaming-with-schema',
    },
    schema: [],
    messages: {
      streamingWithSchema:
        'generateContentStream() does not support responseSchema. Use generateContent() instead for structured JSON output.',
      streamingWithSchemaDetail:
        'Streaming and structured output (responseSchema) are mutually exclusive in Firebase AI Logic. Choose one approach: streaming for real-time text or generateContent() for structured JSON.',
    },
  },

  create(context) {
    // Track models configured with responseSchema
    const modelsWithSchema = new Set<string>();

    return {
      // Track getGenerativeModel calls with responseSchema
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (calleeName === 'getGenerativeModel') {
          const configArg = node.arguments[1];

          if (isObjectExpression(configArg)) {
            const responseSchema = findNestedProperty(
              configArg,
              'generationConfig.responseSchema'
            );

            const responseMimeType = findNestedProperty(
              configArg,
              'generationConfig.responseMimeType'
            );

            // Check if responseSchema is configured OR responseMimeType is application/json
            if (responseSchema || responseMimeType) {
              // Find the variable name this is assigned to
              if (
                node.parent?.type === 'VariableDeclarator' &&
                node.parent.id.type === 'Identifier'
              ) {
                modelsWithSchema.add(node.parent.id.name);
              }
            }
          }
        }

        // Check generateContentStream calls
        if (calleeName === 'generateContentStream') {
          const callee = node.callee;

          // Get the model name if it's a method call
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier'
          ) {
            const modelName = callee.object.name;

            if (modelsWithSchema.has(modelName)) {
              context.report({
                node,
                messageId: 'streamingWithSchema',
              });
            }
          }
        }

        // Also check sendMessageStream on chat instances
        if (calleeName === 'sendMessageStream') {
          // This is trickier to detect, but we can warn about it
          // For now, we check if the chat was started from a model with schema
          const callee = node.callee;

          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier'
          ) {
            // We'd need more sophisticated tracking to know if this chat
            // was started from a model with schema. For now, we'll just
            // add a general note about the limitation.
          }
        }
      },
    };
  },
};

export default rule;
