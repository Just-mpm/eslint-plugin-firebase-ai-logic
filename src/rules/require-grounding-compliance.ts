import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce Google Search Entry Point rendering when using Grounding (compliance requirement)',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-grounding-compliance',
    },
    schema: [],
    messages: {
      missingSearchEntryPoint:
        "Grounding is enabled (googleSearch), but 'searchEntryPoint' usage was not found. You MUST render the search entry point when using Grounding for compliance.",
    },
  },

  create(context) {
    let groundingEnabled = false;
    let searchEntryPointAccessed = false;

    return {
      // Check if googleSearch is enabled
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'googleSearch'
        ) {
          groundingEnabled = true;
        }
      },

      // Check for usage of properties
      Identifier(node) {
        if (node.name === 'searchEntryPoint') {
          searchEntryPointAccessed = true;
        }
      },
      
      Literal(node) {
         if (node.value === 'searchEntryPoint') {
            searchEntryPointAccessed = true;
         }
      },

      // Report at the end
      'Program:exit'(node) {
        if (groundingEnabled && !searchEntryPointAccessed) {
          context.report({
            node,
            messageId: 'missingSearchEntryPoint',
          });
        }
      },
    };
  },
};

export default rule;
