import type { Rule } from 'eslint';
import { isStringLiteral } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing from 'firebase/vertexai-preview' - use 'firebase/ai' instead",
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-deprecated-firebase-vertexai',
    },
    fixable: 'code',
    schema: [],
    messages: {
      deprecatedImport:
        "Import from 'firebase/vertexai-preview' is deprecated. Use 'firebase/ai' instead.",
      migrationNote:
        "The 'firebase/vertexai-preview' package has been replaced by 'firebase/ai' which supports both GoogleAIBackend and VertexAIBackend.",
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          isStringLiteral(node.source) &&
          node.source.value === 'firebase/vertexai-preview'
        ) {
          context.report({
            node,
            messageId: 'deprecatedImport',
            fix(fixer) {
              const specifiers = node.specifiers;

              if (specifiers.length === 0) {
                return fixer.replaceText(node, "import 'firebase/ai';");
              }

              // Map old imports to new ones
              const importMapping: Record<string, string> = {
                getVertexAI: 'getAI',
                getGenerativeModel: 'getGenerativeModel',
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
          (node.arguments[0] as { value: string }).value === 'firebase/vertexai-preview'
        ) {
          context.report({
            node,
            messageId: 'deprecatedImport',
          });
        }
      },
    };
  },
};

export default rule;
