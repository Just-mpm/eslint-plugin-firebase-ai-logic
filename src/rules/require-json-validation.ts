import type { Rule } from 'eslint';
import { getCalleeName, isCallExpression, isMemberExpression } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require validation of JSON responses from Firebase AI Logic using Zod or similar validation',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-json-validation',
    },
    schema: [],
    messages: {
      unvalidatedJsonParse:
        "JSON.parse() on AI response should be validated. Use Zod or similar to ensure the response matches expected schema.",
      directDatabaseWrite:
        "AI-generated data is being written to database without validation. Validate with Zod before saving to prevent invalid data.",
      suggestZodValidation:
        "Add Zod validation: const validated = schema.parse(JSON.parse(response.text()))",
    },
  },

  create(context) {
    // Track variables that contain AI responses
    const aiResponseVariables = new Set<string>();
    // Track variables that contain parsed JSON from AI
    const parsedJsonVariables = new Set<string>();
    // Track if Zod is imported
    let hasZodImport = false;

    return {
      // Check for Zod import
      ImportDeclaration(node) {
        if (
          node.source.type === 'Literal' &&
          (node.source.value === 'zod' || node.source.value === 'zod/v4')
        ) {
          hasZodImport = true;
        }
      },

      // Track AI response variables
      VariableDeclarator(node) {
        if (
          node.init &&
          isCallExpression(node.init) &&
          node.id.type === 'Identifier'
        ) {
          const calleeName = getCalleeName(node.init);

          if (
            calleeName === 'generateContent' ||
            calleeName === 'sendMessage'
          ) {
            aiResponseVariables.add(node.id.name);
          }
        }
      },

      // Track JSON.parse calls on AI responses
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Check for JSON.parse
        if (calleeName === 'parse') {
          const callee = node.callee;

          if (
            isMemberExpression(callee) &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'JSON'
          ) {
            // Check if the argument involves .text() or .response
            const arg = node.arguments[0];

            if (arg) {
              let isAiResponse = false;

              // Check for result.response.text() pattern
              if (isCallExpression(arg) && getCalleeName(arg) === 'text') {
                isAiResponse = true;
              }

              // Check for variable.text() where variable is AI response
              if (
                isCallExpression(arg) &&
                arg.callee.type === 'MemberExpression' &&
                arg.callee.object.type === 'Identifier'
              ) {
                // Could be aiResponse.text() or aiResponse.response.text()
                isAiResponse = true;
              }

              if (isAiResponse) {
                // Check if this is assigned to a variable
                if (
                  node.parent?.type === 'VariableDeclarator' &&
                  node.parent.id.type === 'Identifier'
                ) {
                  parsedJsonVariables.add(node.parent.id.name);
                }

                // Check if there's validation nearby
                // This is a simplified check - we look for .parse() calls after this
                const isValidated = isInsideValidation(node as Rule.Node);

                if (!isValidated && !hasZodImport) {
                  context.report({
                    node,
                    messageId: 'unvalidatedJsonParse',
                  });
                }
              }
            }
          }
        }

        // Check for database writes with unvalidated data
        if (
          calleeName === 'setDoc' ||
          calleeName === 'addDoc' ||
          calleeName === 'updateDoc' ||
          calleeName === 'set' ||
          calleeName === 'update'
        ) {
          // Check if any argument is a parsed JSON variable
          for (const arg of node.arguments) {
            if (
              arg.type === 'Identifier' &&
              parsedJsonVariables.has(arg.name)
            ) {
              context.report({
                node: arg,
                messageId: 'directDatabaseWrite',
              });
            }

            // Check for spread of parsed JSON
            if (arg.type === 'ObjectExpression') {
              for (const prop of arg.properties) {
                if (
                  prop.type === 'SpreadElement' &&
                  prop.argument.type === 'Identifier' &&
                  parsedJsonVariables.has(prop.argument.name)
                ) {
                  context.report({
                    node: prop,
                    messageId: 'directDatabaseWrite',
                  });
                }
              }
            }
          }
        }
      },
    };

    function isInsideValidation(node: Rule.Node): boolean {
      let current = node.parent;

      while (current) {
        // Check for .parse() call (Zod validation)
        if (
          isCallExpression(current) &&
          getCalleeName(current) === 'parse'
        ) {
          return true;
        }

        // Check for .safeParse() call
        if (
          isCallExpression(current) &&
          getCalleeName(current) === 'safeParse'
        ) {
          return true;
        }

        // Check if inside try block (already being error handled)
        if (current.type === 'TryStatement') {
          return true;
        }

        current = (current.parent as Rule.Node | undefined) || null;
      }

      return false;
    }
  },
};

export default rule;
