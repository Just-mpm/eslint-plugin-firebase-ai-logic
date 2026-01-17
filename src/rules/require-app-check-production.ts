import type { Rule } from 'eslint';
import { getCalleeName } from '../utils/ast-helpers.js';

/**
 * require-app-check-production
 *
 * This rule suggests using App Check to protect AI endpoints from abuse.
 *
 * IMPORTANT LIMITATIONS:
 * - This rule only checks within the SAME FILE
 * - Many projects use lazy loading where App Check is initialized in a separate file
 * - Projects using hooks like useAppCheck() or ensureAppCheckReady() are valid
 *
 * The rule checks for:
 * 1. Direct import of 'firebase/app-check'
 * 2. Calls to initializeAppCheck()
 * 3. Common patterns: useAppCheck, ensureAppCheckReady, AppCheckProvider
 * 4. Module-level detection: If the file imports from a module that handles AI
 *    (like './ai' or '../firebase/ai'), it's likely App Check is handled there
 *
 * If none are found in the same file as getAI(), it suggests (not requires) App Check.
 *
 * CONFIGURABLE: Set 'ignoreFiles' to skip specific files/patterns.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest enabling App Check for production environments to protect against abuse',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-app-check-production',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'File patterns to ignore (e.g., "*.test.ts", "test/**/*")',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingAppCheck:
        'Consider using App Check to protect your AI endpoints from abuse. If you use lazy loading (useAppCheck, ensureAppCheckReady) in a separate file, you can safely ignore this warning.',
      appCheckSuggestion:
        "import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'; initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider('SITE_KEY') });",
    },
  },

  create(context) {
    let hasAppCheckImport = false;
    let hasAppCheckInit = false;
    let hasAppCheckHelper = false;
    let hasAIInit = false;
    let aiInitNode: Rule.Node | null = null;
    let importsFromAIModule = false;

    // Common App Check helper patterns used in lazy loading
    const appCheckHelperPatterns = [
      'useAppCheck',
      'ensureAppCheckReady',
      'AppCheckProvider',
      'getAppCheckInstance',
      'isAppCheckReady',
      'initializeAppCheckLazy',
      'withAppCheck',
      'appCheckReady',
    ];

    // Common AI module patterns where App Check might be configured
    const aiModulePatterns = [
      '/ai',
      '/firebase/ai',
      '/lib/ai',
      '/services/ai',
      'getAIInstance',
      'aiService',
    ];

    return {
      // Track App Check imports
      ImportDeclaration(node) {
        const source = node.source.value;

        if (typeof source !== 'string') return;

        // Direct firebase/app-check import
        if (source === 'firebase/app-check') {
          hasAppCheckImport = true;
        }

        // Check for imports from common App Check helper files/hooks
        if (
          source.includes('useAppCheck') ||
          source.includes('AppCheck') ||
          source.includes('appCheck')
        ) {
          hasAppCheckHelper = true;
        }

        // Check if importing from a common AI module pattern
        // These modules typically handle App Check internally
        if (aiModulePatterns.some((pattern) => source.includes(pattern))) {
          importsFromAIModule = true;
        }

        // Check imported specifiers for App Check helpers
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
            const importedName = spec.imported.name;

            if (appCheckHelperPatterns.includes(importedName)) {
              hasAppCheckHelper = true;
            }

            // Check if importing getAIInstance or similar from another module
            if (
              importedName === 'getAIInstance' ||
              importedName === 'getAI' ||
              importedName === 'aiInstance'
            ) {
              importsFromAIModule = true;
            }
          }
        }
      },

      // Track function calls
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (!calleeName) return;

        // Direct initializeAppCheck call
        if (calleeName === 'initializeAppCheck') {
          hasAppCheckInit = true;
        }

        // App Check helper calls
        if (appCheckHelperPatterns.includes(calleeName)) {
          hasAppCheckHelper = true;
        }

        // Track getAI calls - but only if it's a DIRECT call, not imported wrapper
        if (calleeName === 'getAI') {
          // Check if this is the actual firebase/ai getAI or a wrapper
          // If we already import from an AI module, the App Check is likely handled there
          if (!importsFromAIModule) {
            hasAIInit = true;
            aiInitNode = node as Rule.Node;
          }
        }
      },

      // Check at the end of the program
      'Program:exit'() {
        // Only suggest if:
        // 1. AI is being used directly (not via imported wrapper)
        // 2. No App Check patterns found
        // 3. Not importing from a module that likely handles App Check
        const hasAnyAppCheckPattern =
          hasAppCheckImport || hasAppCheckInit || hasAppCheckHelper || importsFromAIModule;

        if (hasAIInit && !hasAnyAppCheckPattern && aiInitNode) {
          context.report({
            node: aiInitNode,
            messageId: 'missingAppCheck',
          });
        }
      },
    };
  },
};

export default rule;
