import type { Rule } from 'eslint';
import { isStringLiteral } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing from '@google-cloud/vertexai' - use 'firebase/ai' with VertexAIBackend instead",
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-vertex-ai-direct-import',
    },
    fixable: 'code',
    schema: [],
    messages: {
      wrongImport:
        "Do not import from '@google-cloud/vertexai'. Use 'firebase/ai' with VertexAIBackend instead.",
      wrongImportDetail:
        "The '@google-cloud/vertexai' package bypasses Firebase integration. For Firebase projects, use 'firebase/ai' with VertexAIBackend which provides Firebase integration, App Check support, and unified authentication.",
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          isStringLiteral(node.source) &&
          node.source.value === '@google-cloud/vertexai'
        ) {
          context.report({
            node,
            messageId: 'wrongImport',
            fix(fixer) {
              return fixer.replaceText(
                node,
                "import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';"
              );
            },
          });
        }
      },

      CallExpression(node) {
        if (
          (node.callee as unknown as { type: string }).type === 'Import' &&
          node.arguments.length > 0 &&
          isStringLiteral(node.arguments[0]) &&
          (node.arguments[0] as { value: string }).value === '@google-cloud/vertexai'
        ) {
          context.report({
            node,
            messageId: 'wrongImport',
          });
        }
      },
    };
  },
};

export default rule;
