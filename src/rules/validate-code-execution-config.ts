import type { Rule } from 'eslint';
import {
  isObjectExpression,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate code execution tool configuration',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#validate-code-execution-config',
    },
    schema: [],
    messages: {
      invalidCodeExecutionConfig:
        "Code Execution tool must be configured with an empty object: { codeExecution: {} }.",
    },
  },

  create(context) {
    return {
      Property(node) {
        // Look for codeExecution property in tools array
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'codeExecution'
        ) {
          // Check if parent is inside a tools array
          // tools: [{ codeExecution: {} }]
          
          // Verify value is an empty object
          if (!isObjectExpression(node.value) || node.value.properties.length > 0) {
             context.report({
                node: node.value,
                messageId: 'invalidCodeExecutionConfig',
             });
          }
        }
      },
    };
  },
};

export default rule;
