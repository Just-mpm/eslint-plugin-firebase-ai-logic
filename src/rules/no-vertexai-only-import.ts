import type { Rule } from 'eslint';
import { isStringLiteral } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing from 'firebase/vertexai' - use 'firebase/ai' instead",
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-vertexai-only-import',
    },
    fixable: 'code',
    schema: [],
    messages: {
      outdatedImport:
        "Import from 'firebase/vertexai' should be replaced with 'firebase/ai' for the latest Firebase AI Logic API.",
      migrationNote:
        "The 'firebase/ai' module is the unified entry point for Firebase AI Logic, supporting both GoogleAIBackend and VertexAIBackend.",
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          isStringLiteral(node.source) &&
          node.source.value === 'firebase/vertexai'
        ) {
          context.report({
            node,
            messageId: 'outdatedImport',
            fix(fixer) {
              const specifiers = node.specifiers;

              if (specifiers.length === 0) {
                return fixer.replaceText(node, "import 'firebase/ai';");
              }

              // Map old imports to new ones
              const importMapping: Record<string, string> = {
                getVertexAI: 'getAI',
                getGenerativeModel: 'getGenerativeModel',
                VertexAI: 'VertexAIBackend',
              };

              const newImports: string[] = [];

              for (const specifier of specifiers) {
                if (
                  specifier.type === 'ImportSpecifier' &&
                  specifier.imported.type === 'Identifier'
                ) {
                  const originalName = specifier.imported.name;
                  const newName = importMapping[originalName] ?? originalName;

                  if (!newImports.includes(newName)) {
                    newImports.push(newName);
                  }
                }
              }

              // Ensure we have GoogleAIBackend if getAI is imported
              if (
                newImports.includes('getAI') &&
                !newImports.includes('GoogleAIBackend') &&
                !newImports.includes('VertexAIBackend')
              ) {
                newImports.push('GoogleAIBackend');
              }

              return fixer.replaceText(
                node,
                `import { ${newImports.join(', ')} } from 'firebase/ai';`
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
          (node.arguments[0] as { value: string }).value === 'firebase/vertexai'
        ) {
          context.report({
            node,
            messageId: 'outdatedImport',
          });
        }
      },
    };
  },
};

export default rule;
