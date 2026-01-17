import type { Rule } from 'eslint';
import {
  getCalleeName,
  getStringValue,
  isObjectExpression,
  findProperty,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using streaming (generateContentStream) for prompts that likely produce long responses',
      recommended: false,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#prefer-streaming-long-responses',
    },
    schema: [],
    messages: {
      useStreaming:
        'This prompt may generate a long response. Consider using generateContentStream() for better UX - users see text appearing in real-time instead of waiting.',
      streamingForChat:
        'For chat applications, sendMessageStream() provides a better experience than sendMessage().',
    },
  },

  create(context) {
    // Keywords that typically indicate long responses
    const longResponseIndicators = [
      'explain',
      'describe',
      'list all',
      'write a',
      'generate a',
      'create a',
      'summarize',
      'analyze',
      'compare',
      'detailed',
      'comprehensive',
      'step by step',
      'tutorial',
      'guide',
      'essay',
      'article',
      'story',
      'code for',
      'implement',
      'full',
      'complete',
      'in depth',
      'thorough',
    ];

    function hasLongResponseIndicator(text: string): boolean {
      const lowerText = text.toLowerCase();
      return longResponseIndicators.some((indicator) =>
        lowerText.includes(indicator)
      );
    }

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Check generateContent (non-streaming)
        if (calleeName === 'generateContent') {
          const promptArg = node.arguments[0];
          if (!promptArg) return;

          // Check string literal prompts
          const stringValue = getStringValue(promptArg);
          if (stringValue && hasLongResponseIndicator(stringValue)) {
            context.report({
              node,
              messageId: 'useStreaming',
            });
            return;
          }

          // Check template literals
          if (promptArg.type === 'TemplateLiteral') {
            const fullText = promptArg.quasis
              .map((q) => q.value.cooked ?? '')
              .join('');

            if (hasLongResponseIndicator(fullText)) {
              context.report({
                node,
                messageId: 'useStreaming',
              });
              return;
            }
          }

          // Check object with contents
          if (isObjectExpression(promptArg)) {
            const contentsProp = findProperty(promptArg, 'contents');
            if (contentsProp && contentsProp.value.type === 'ArrayExpression') {
              for (const element of contentsProp.value.elements) {
                if (!element || !isObjectExpression(element)) continue;

                const partsProp = findProperty(element, 'parts');
                if (partsProp && partsProp.value.type === 'ArrayExpression') {
                  for (const part of partsProp.value.elements) {
                    if (!part || !isObjectExpression(part)) continue;

                    const textProp = findProperty(part, 'text');
                    if (textProp) {
                      const textValue = getStringValue(textProp.value);
                      if (textValue && hasLongResponseIndicator(textValue)) {
                        context.report({
                          node,
                          messageId: 'useStreaming',
                        });
                        return;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Suggest streaming for chat
        if (calleeName === 'sendMessage') {
          const promptArg = node.arguments[0];
          if (!promptArg) return;

          const stringValue = getStringValue(promptArg);
          if (stringValue && hasLongResponseIndicator(stringValue)) {
            context.report({
              node,
              messageId: 'streamingForChat',
            });
          }

          // Template literals
          if (promptArg.type === 'TemplateLiteral') {
            const fullText = promptArg.quasis
              .map((q) => q.value.cooked ?? '')
              .join('');

            if (hasLongResponseIndicator(fullText)) {
              context.report({
                node,
                messageId: 'streamingForChat',
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
