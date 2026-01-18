import type { Rule } from 'eslint';
import { getCalleeName, isCallExpression } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require getAI() to be called before getGenerativeModel() in the same scope',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-ai-before-model',
    },
    schema: [],
    messages: {
      missingGetAI:
        "getGenerativeModel() requires an AI instance from getAI(). Make sure to call 'const ai = getAI(app, { backend: new GoogleAIBackend() })' before using getGenerativeModel(ai, config).",
      wrongFirstArg:
        "First argument to getGenerativeModel() should be the AI instance returned by getAI(), not '{{ argType }}'.",
    },
  },

  create(context) {
    // Track getAI calls and their returned variables (by name or pattern)
    const aiVariables = new Set<string>();

    // Track class properties assigned from getAI (e.g., this.ai)
    const classAiProperties = new Set<string>();

    /**
     * Get the full name of a variable assignment target
     * Handles: identifier, this.property, and member expressions
     */
    function getAssignmentTargetName(node: Rule.Node): string | null {
      if (node.type === 'Identifier') {
        return node.name;
      }

      // this.ai = getAI(...)
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'ThisExpression' &&
        node.property.type === 'Identifier'
      ) {
        return `this.${node.property.name}`;
      }

      return null;
    }

    /**
     * Get the name pattern used in getGenerativeModel's first argument
     */
    function getFirstArgPattern(node: Rule.Node): string | null {
      // Simple identifier: ai
      if (node.type === 'Identifier') {
        return node.name;
      }

      // this.ai
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'ThisExpression' &&
        node.property.type === 'Identifier'
      ) {
        return `this.${node.property.name}`;
      }

      // ctx.ai or service.ai - we can't track these reliably
      // so we'll be conservative and not report
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.property.type === 'Identifier'
      ) {
        return `${node.object.name}.${node.property.name}`;
      }

      return null;
    }

    /**
     * Check if the first argument is a known AI instance
     */
    function isKnownAiInstance(pattern: string): boolean {
      // Direct match
      if (aiVariables.has(pattern)) return true;
      if (classAiProperties.has(pattern)) return true;

      // If it's a property access like ctx.ai, we can't track it
      // Be conservative and assume it's valid
      if (pattern.includes('.') && !pattern.startsWith('this.')) {
        return true; // Assume external properties are valid
      }

      return false;
    }

    return {
      // Track variable declarations that call getAI
      VariableDeclarator(node) {
        if (
          node.init &&
          isCallExpression(node.init) &&
          getCalleeName(node.init) === 'getAI' &&
          node.id.type === 'Identifier'
        ) {
          aiVariables.add(node.id.name);
        }
      },

      // Track assignments that call getAI
      AssignmentExpression(node) {
        if (isCallExpression(node.right) && getCalleeName(node.right) === 'getAI') {
          const targetName = getAssignmentTargetName(node.left as Rule.Node);
          if (targetName) {
            if (targetName.startsWith('this.')) {
              classAiProperties.add(targetName);
            } else {
              aiVariables.add(targetName);
            }
          }
        }
      },

      // Track class property definitions with getAI
      PropertyDefinition(node) {
        if (
          node.value &&
          isCallExpression(node.value) &&
          getCalleeName(node.value) === 'getAI' &&
          node.key.type === 'Identifier'
        ) {
          classAiProperties.add(`this.${node.key.name}`);
        }
      },

      // Check getGenerativeModel calls
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (calleeName !== 'getGenerativeModel') return;

        const args = node.arguments;

        if (args.length === 0) {
          context.report({
            node,
            messageId: 'missingGetAI',
          });
          return;
        }

        const firstArg = args[0];

        // Handle identifiers and member expressions
        if (
          firstArg.type === 'Identifier' ||
          firstArg.type === 'MemberExpression'
        ) {
          const pattern = getFirstArgPattern(firstArg as Rule.Node);

          if (pattern) {
            // Only report if we're sure it's not an AI instance
            // If it's a property access we can't track (like ctx.ai), don't report
            if (!isKnownAiInstance(pattern)) {
              // For simple identifiers not tracked, only report if we have
              // tracked at least one getAI call (meaning the file uses getAI)
              // This avoids false positives when AI is imported from another module
              if (
                aiVariables.size === 0 &&
                classAiProperties.size === 0 &&
                !pattern.startsWith('this.')
              ) {
                // No getAI tracked in this file - AI might be imported
                // Be conservative and don't report
                return;
              }

              context.report({
                node: firstArg,
                messageId: 'wrongFirstArg',
                data: {
                  argType: pattern,
                },
              });
            }
          }
          return;
        }

        // First argument is a literal (string, number, etc.) - definitely wrong
        if (firstArg.type === 'Literal') {
          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: typeof firstArg.value,
            },
          });
          return;
        }

        // First argument is an object - should be AI instance, not config
        if (firstArg.type === 'ObjectExpression') {
          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: 'object',
            },
          });
          return;
        }

        // For CallExpression as first arg (e.g., getGenerativeModel(getAI(...), ...))
        // This is valid if it's a direct getAI call
        if (firstArg.type === 'CallExpression') {
          const innerCallee = getCalleeName(firstArg);
          if (innerCallee !== 'getAI') {
            context.report({
              node: firstArg,
              messageId: 'wrongFirstArg',
              data: {
                argType: innerCallee || 'function call',
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
