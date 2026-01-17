import type { Rule } from 'eslint';
import {
  isStringLiteral,
  getStringValue,
} from '../utils/ast-helpers.js';
import { DEPRECATED_MODELS, RECOMMENDED_MODEL } from '../utils/constants.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using deprecated Gemini models that have been retired and return 404 errors',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-deprecated-models',
    },
    fixable: 'code',
    schema: [],
    messages: {
      deprecatedModel:
        "Model '{{ model }}' is deprecated and will return 404 errors. Use '{{ recommended }}' instead.",
      deprecatedModelList:
        'Deprecated models include: gemini-1.0-*, gemini-1.5-*, gemini-2.0-*, gemini-2.5-*. Current valid models are: {{ validModels }}.',
      gemini3Migration:
        "Gemini 3 is the current generation. Use 'gemini-3-flash-preview' for most tasks or 'gemini-3-pro-preview' for complex reasoning.",
    },
  },

  create(context) {
    function checkModelValue(node: Rule.Node, modelValue: string) {
      const lowerModel = modelValue.toLowerCase();

      // Check if it's a deprecated model
      const isDeprecated = DEPRECATED_MODELS.some(
        (deprecated) =>
          lowerModel === deprecated.toLowerCase() ||
          lowerModel.startsWith(deprecated.toLowerCase())
      );

      if (isDeprecated) {
        context.report({
          node,
          messageId: 'deprecatedModel',
          data: {
            model: modelValue,
            recommended: RECOMMENDED_MODEL,
          },
          fix(fixer) {
            if (isStringLiteral(node)) {
              return fixer.replaceText(node, `'${RECOMMENDED_MODEL}'`);
            }
            return null;
          },
        });
      }
    }

    return {
      // Check object literals with model property
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'model' &&
          node.value
        ) {
          const modelValue = getStringValue(node.value);

          if (modelValue) {
            // Additional check: make sure this is likely a Gemini model config
            const isGeminiModel =
              modelValue.toLowerCase().includes('gemini') ||
              modelValue.toLowerCase().includes('models/');

            if (isGeminiModel) {
              checkModelValue(node.value as Rule.Node, modelValue);
            }
          }
        }
      },

      // Check string literals that look like model names
      Literal(node) {
        if (typeof node.value !== 'string') return;

        const value = node.value;

        // Only check strings that look like Gemini model names
        if (!value.toLowerCase().includes('gemini')) return;

        // Skip if this is an import source
        if (
          node.parent?.type === 'ImportDeclaration' ||
          node.parent?.type === 'ExportNamedDeclaration' ||
          node.parent?.type === 'ExportAllDeclaration'
        ) {
          return;
        }

        // Skip if it's already a model property (handled above in Property handler)
        // This includes both direct model properties and those in getGenerativeModel calls
        if (node.parent?.type === 'Property') {
          const property = node.parent;
          if (
            property.key.type === 'Identifier' &&
            property.key.name === 'model'
          ) {
            return;
          }
        }

        // Check if this looks like a model name being used as a variable value
        const isDeprecated = DEPRECATED_MODELS.some(
          (deprecated) =>
            value.toLowerCase() === deprecated.toLowerCase() ||
            value.toLowerCase() === `models/${deprecated.toLowerCase()}`
        );

        if (isDeprecated) {
          context.report({
            node,
            messageId: 'deprecatedModel',
            data: {
              model: value,
              recommended: RECOMMENDED_MODEL,
            },
            fix(fixer) {
              // Handle models/ prefix
              if (value.toLowerCase().startsWith('models/')) {
                return fixer.replaceText(node, `'models/${RECOMMENDED_MODEL}'`);
              }
              return fixer.replaceText(node, `'${RECOMMENDED_MODEL}'`);
            },
          });
        }
      },
    };
  },
};

export default rule;
