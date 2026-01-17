import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Ensure proper handling of Code Execution results (executableCode and codeExecutionResult)',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-code-execution-handling',
    },
    schema: [],
    messages: {
      missingCodeExecutionHandling:
        "Code Execution is enabled, but '{{ missingProp }}' usage was not found in this file. You must handle both 'executableCode' and 'codeExecutionResult' in the response.",
    },
  },

  create(context) {
    let codeExecutionEnabled = false;
    let executableCodeAccessed = false;
    let codeExecutionResultAccessed = false;

    return {
      // Check if codeExecution is enabled
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'codeExecution'
        ) {
          codeExecutionEnabled = true;
        }
      },

      // Check for usage of properties
      Identifier(node) {
        if (node.name === 'executableCode') {
          executableCodeAccessed = true;
        }
        if (node.name === 'codeExecutionResult') {
          codeExecutionResultAccessed = true;
        }
      },

      Literal(node) {
         if (node.value === 'executableCode') executableCodeAccessed = true;
         if (node.value === 'codeExecutionResult') codeExecutionResultAccessed = true;
      },

      // Report at the end if enabled but not handled
      'Program:exit'(node) {
        if (codeExecutionEnabled) {
          if (!executableCodeAccessed) {
            context.report({
              node,
              messageId: 'missingCodeExecutionHandling',
              data: { missingProp: 'executableCode' },
            });
          }
          if (!codeExecutionResultAccessed) {
            context.report({
              node,
              messageId: 'missingCodeExecutionHandling',
              data: { missingProp: 'codeExecutionResult' },
            });
          }
        }
      },
    };
  },
};

export default rule;
