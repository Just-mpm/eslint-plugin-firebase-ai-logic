import type { Rule } from 'eslint';
import { isStringLiteral } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing from '@google/generative-ai' - use 'firebase/ai' instead",
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-google-genai-import',
    },
    fixable: 'code',
    schema: [],
    messages: {
      wrongImport:
        "Do not import from '@google/generative-ai'. Use 'firebase/ai' instead for Firebase AI Logic integration.",
      wrongImportDetail:
        "The '@google/generative-ai' package is for direct Gemini API usage without Firebase. For Firebase projects, use 'firebase/ai' which provides Firebase integration, App Check support, and proper authentication.",
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          isStringLiteral(node.source) &&
          node.source.value === '@google/generative-ai'
        ) {
          context.report({
            node,
            messageId: 'wrongImport',
            fix(fixer) {
              // Get the imported specifiers
              const specifiers = node.specifiers;

              if (specifiers.length === 0) {
                return fixer.replaceText(
                  node,
                  "import 'firebase/ai';"
                );
              }

              // Map common imports from @google/generative-ai to firebase/ai equivalents
              const importMapping: Record<string, string> = {
                GoogleGenerativeAI: 'getAI',
                GenerativeModel: 'getGenerativeModel',
                HarmCategory: 'HarmCategory',
                HarmBlockThreshold: 'HarmBlockThreshold',
                // Most other imports have different names in firebase/ai
              };

              const newImports: string[] = [];
              const needsGoogleAIBackend = specifiers.some(
                (s) =>
                  s.type === 'ImportSpecifier' &&
                  s.imported.type === 'Identifier' &&
                  s.imported.name === 'GoogleGenerativeAI'
              );

              for (const specifier of specifiers) {
                if (
                  specifier.type === 'ImportSpecifier' &&
                  specifier.imported.type === 'Identifier'
                ) {
                  const originalName = specifier.imported.name;
                  const newName = importMapping[originalName];

                  if (newName && !newImports.includes(newName)) {
                    newImports.push(newName);
                  }
                }
              }

              if (needsGoogleAIBackend && !newImports.includes('GoogleAIBackend')) {
                newImports.push('GoogleAIBackend');
              }

              if (newImports.length > 0) {
                return fixer.replaceText(
                  node,
                  `import { ${newImports.join(', ')} } from 'firebase/ai';`
                );
              }

              return null;
            },
          });
        }
      },

      CallExpression(node) {
        // Also catch dynamic imports - note: Import is not a valid callee type
        // This code is kept for future extensibility but won't match current ESLint versions
        if (
          (node.callee as unknown as { type: string }).type === 'Import' &&
          node.arguments.length > 0 &&
          isStringLiteral(node.arguments[0]) &&
          (node.arguments[0] as { value: string }).value === '@google/generative-ai'
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
