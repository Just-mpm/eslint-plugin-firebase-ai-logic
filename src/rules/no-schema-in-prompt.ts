import type { Rule } from 'eslint';
import {
  getStringValue,
  isObjectExpression,
  findProperty,
  findNestedProperty,
  getCalleeName,
  isCallExpression,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow duplicating schema definition in both prompt and responseSchema config',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-schema-in-prompt',
    },
    schema: [],
    messages: {
      duplicateSchema:
        'Schema is duplicated in prompt when responseSchema is already configured. Remove JSON structure instructions from the prompt - the model will follow responseSchema automatically.',
      schemaInPromptHint:
        'When using responseSchema in generationConfig, do not include JSON format instructions in your prompt. This confuses the model and wastes tokens.',
    },
  },

  create(context) {
    // Track models with responseSchema configured
    const modelsWithSchema = new Set<string>();

    // Patterns that indicate schema in prompt
    const schemaPatterns = [
      /return\s*(as\s*)?json/i,
      /respond\s*(with|in)\s*json/i,
      /output\s*(as\s*)?json/i,
      /json\s*format/i,
      /json\s*schema/i,
      /json\s*object/i,
      /json:\s*\{/i,
      /\{\s*["']?\w+["']?\s*:/,  // JSON-like structure in prompt
      /format:\s*\{/i,
      /structure:\s*\{/i,
      /return\s*\{/i,
      /should\s*return.*\{/i,
    ];

    function hasSchemaPattern(text: string): boolean {
      return schemaPatterns.some((pattern) => pattern.test(text));
    }

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

            if (responseSchema) {
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

        // Check generateContent calls
        if (
          calleeName === 'generateContent' ||
          calleeName === 'generateContentStream'
        ) {
          // Check if the model has responseSchema
          const callee = node.callee;
          let modelName: string | null = null;

          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier'
          ) {
            modelName = callee.object.name;
          }

          // Check the prompt argument
          const promptArg = node.arguments[0];

          if (promptArg) {
            const promptValue = getStringValue(promptArg);

            if (promptValue && hasSchemaPattern(promptValue)) {
              // If model has responseSchema, report
              if (modelName && modelsWithSchema.has(modelName)) {
                context.report({
                  node: promptArg,
                  messageId: 'duplicateSchema',
                });
              }
            }

            // Also check array of content parts
            if (promptArg.type === 'ArrayExpression') {
              for (const element of promptArg.elements) {
                if (!element) continue;

                if (element.type === 'ObjectExpression') {
                  const textProp = findProperty(element, 'text');
                  if (textProp) {
                    const textValue = getStringValue(textProp.value);
                    if (
                      textValue &&
                      hasSchemaPattern(textValue) &&
                      modelName &&
                      modelsWithSchema.has(modelName)
                    ) {
                      context.report({
                        node: textProp,
                        messageId: 'duplicateSchema',
                      });
                    }
                  }
                }

                const stringValue = getStringValue(element);
                if (
                  stringValue &&
                  hasSchemaPattern(stringValue) &&
                  modelName &&
                  modelsWithSchema.has(modelName)
                ) {
                  context.report({
                    node: element,
                    messageId: 'duplicateSchema',
                  });
                }
              }
            }
          }
        }
      },

      // Also check template literals used as prompts
      TemplateLiteral(node) {
        // Get the full template string value
        const quasis = node.quasis;
        const fullText = quasis.map((q) => q.value.cooked ?? '').join('');

        if (hasSchemaPattern(fullText)) {
          // Check if this is used in a generateContent call with a model that has schema
          let parent: Rule.Node | null = node.parent;
          while (parent) {
            if (
              isCallExpression(parent) &&
              (getCalleeName(parent) === 'generateContent' ||
                getCalleeName(parent) === 'generateContentStream')
            ) {
              const callee = parent.callee;
              if (
                callee.type === 'MemberExpression' &&
                callee.object.type === 'Identifier' &&
                modelsWithSchema.has(callee.object.name)
              ) {
                context.report({
                  node,
                  messageId: 'duplicateSchema',
                });
              }
              break;
            }
            parent = (parent.parent as Rule.Node | undefined) || null;
          }
        }
      },
    };
  },
};

export default rule;
