import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findNestedProperty,
  getCalleeName,
  getStringValue,
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
    // Track models configured with responseSchema (by variable name)
    const modelsWithSchema = new Set<string>();

    // Track class properties that are models with schema (e.g., this.model)
    const classModelProperties = new Set<string>();

    // Track chats started from models with schema
    const chatsFromSchemaModels = new Set<string>();

    /**
     * Check if a model configuration has responseSchema or JSON responseMimeType
     */
    function hasSchemaConfig(configArg: Rule.Node): boolean {
      if (!isObjectExpression(configArg)) return false;

      const responseSchema = findNestedProperty(
        configArg,
        'generationConfig.responseSchema'
      );

      const responseMimeType = findNestedProperty(
        configArg,
        'generationConfig.responseMimeType'
      );

      // Only consider it a schema config if responseMimeType is application/json
      if (responseMimeType && !responseSchema) {
        const mimeValue = getStringValue(responseMimeType.value);
        if (mimeValue !== 'application/json') {
          return false;
        }
      }

      return !!(responseSchema || responseMimeType);
    }

    /**
     * Get the model name from various assignment patterns
     */
    function getAssignedModelName(node: Rule.Node): string | null {
      const parent = node.parent;

      // const model = getGenerativeModel(...)
      if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        return parent.id.name;
      }

      // this.model = getGenerativeModel(...)
      if (
        parent?.type === 'AssignmentExpression' &&
        parent.left.type === 'MemberExpression' &&
        parent.left.object.type === 'ThisExpression' &&
        parent.left.property.type === 'Identifier'
      ) {
        return `this.${parent.left.property.name}`;
      }

      // class property: model = getGenerativeModel(...)
      if (
        parent?.type === 'PropertyDefinition' &&
        parent.key.type === 'Identifier'
      ) {
        return `this.${parent.key.name}`;
      }

      return null;
    }

    /**
     * Get the object name from a MemberExpression callee
     */
    function getCallerName(callee: Rule.Node): string | null {
      if (callee.type !== 'MemberExpression') return null;

      // Simple identifier: model.generateContentStream()
      if (callee.object.type === 'Identifier') {
        return callee.object.name;
      }

      // this.model.generateContentStream()
      if (
        callee.object.type === 'MemberExpression' &&
        callee.object.object.type === 'ThisExpression' &&
        callee.object.property.type === 'Identifier'
      ) {
        return `this.${callee.object.property.name}`;
      }

      return null;
    }

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Track getGenerativeModel calls with responseSchema
        if (calleeName === 'getGenerativeModel') {
          const configArg = node.arguments[1];

          if (configArg && hasSchemaConfig(configArg as Rule.Node)) {
            const modelName = getAssignedModelName(node as Rule.Node);
            if (modelName) {
              if (modelName.startsWith('this.')) {
                classModelProperties.add(modelName);
              } else {
                modelsWithSchema.add(modelName);
              }
            }
          }
        }

        // Track startChat calls from models with schema
        if (calleeName === 'startChat') {
          const callee = node.callee;
          const callerName = getCallerName(callee as Rule.Node);

          if (callerName) {
            const isSchemaModel =
              modelsWithSchema.has(callerName) ||
              classModelProperties.has(callerName);

            if (isSchemaModel) {
              // Find what variable this chat is assigned to
              const parent = node.parent;
              if (
                parent?.type === 'VariableDeclarator' &&
                parent.id.type === 'Identifier'
              ) {
                chatsFromSchemaModels.add(parent.id.name);
              }
              if (
                parent?.type === 'AssignmentExpression' &&
                parent.left.type === 'MemberExpression' &&
                parent.left.object.type === 'ThisExpression' &&
                parent.left.property.type === 'Identifier'
              ) {
                chatsFromSchemaModels.add(`this.${parent.left.property.name}`);
              }
            }
          }
        }

        // Check generateContentStream calls
        if (calleeName === 'generateContentStream') {
          const callee = node.callee;
          const callerName = getCallerName(callee as Rule.Node);

          if (callerName) {
            const isSchemaModel =
              modelsWithSchema.has(callerName) ||
              classModelProperties.has(callerName);

            if (isSchemaModel) {
              context.report({
                node,
                messageId: 'streamingWithSchema',
              });
            }
          }
        }

        // Check sendMessageStream on chat instances
        if (calleeName === 'sendMessageStream') {
          const callee = node.callee;
          const callerName = getCallerName(callee as Rule.Node);

          if (callerName && chatsFromSchemaModels.has(callerName)) {
            context.report({
              node,
              messageId: 'streamingWithSchema',
            });
          }
        }
      },
    };
  },
};

export default rule;
