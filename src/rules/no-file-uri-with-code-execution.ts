import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using File URIs (fileData) with Code Execution, as it only supports inline content',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-file-uri-with-code-execution',
    },
    schema: [],
    messages: {
      noFileUriWithCodeExecution:
        'Code Execution does not support File URIs (fileData). Use inline content (text) for CSV, TXT, or JSON instead.',
    },
  },

  create(context) {
    let codeExecutionEnabled = false;
    const fileDataNodes: any[] = [];

    return {
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'codeExecution'
        ) {
          codeExecutionEnabled = true;
        }

        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'fileData'
        ) {
          fileDataNodes.push(node);
        }
      },

      'Program:exit'() {
        if (codeExecutionEnabled && fileDataNodes.length > 0) {
          for (const node of fileDataNodes) {
            context.report({
              node,
              messageId: 'noFileUriWithCodeExecution',
            });
          }
        }
      },
    };
  },
};

export default rule;
