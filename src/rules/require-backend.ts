import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getCalleeName,
} from '../utils/ast-helpers.js';

/**
 * require-backend
 *
 * IMPORTANT: getAI(app) without a second argument is VALID.
 * Firebase AI Logic uses GoogleAIBackend by default when no backend is specified.
 *
 * This rule only reports when:
 * - A second argument (config object) exists BUT doesn't have 'backend' property
 *
 * Valid usage:
 * - getAI(app) - Uses GoogleAIBackend by default ✅
 * - getAI(app, { backend: new GoogleAIBackend() }) ✅
 * - getAI(app, { backend: new VertexAIBackend() }) ✅
 *
 * Invalid usage:
 * - getAI(app, { someOtherConfig: true }) - Has config but no backend ❌
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Suggest specifying 'backend' option when calling getAI() with a config object",
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-backend',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      missingBackendInConfig:
        "Config object provided to getAI() is missing 'backend' property. Consider adding { backend: new GoogleAIBackend() } or { backend: new VertexAIBackend() } for explicit backend selection.",
      addGoogleAIBackend: "Add 'backend: new GoogleAIBackend()' to config",
      addVertexAIBackend: "Add 'backend: new VertexAIBackend()' to config",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (calleeName !== 'getAI') return;

        const args = node.arguments;

        // getAI(app) without second argument is VALID - uses GoogleAIBackend by default
        // Only check if there IS a second argument
        if (args.length < 2) {
          return; // This is fine - default backend will be used
        }

        // Case: Second argument exists but might not have backend
        const configArg = args[1];

        if (isObjectExpression(configArg)) {
          const backendProp = findProperty(configArg, 'backend');

          // Only report if config object exists but doesn't have backend
          if (!backendProp && configArg.properties.length > 0) {
            context.report({
              node: configArg,
              messageId: 'missingBackendInConfig',
              suggest: [
                {
                  messageId: 'addGoogleAIBackend',
                  fix(fixer) {
                    const firstProp = configArg.properties[0];
                    return fixer.insertTextBefore(
                      firstProp,
                      'backend: new GoogleAIBackend(), '
                    );
                  },
                },
                {
                  messageId: 'addVertexAIBackend',
                  fix(fixer) {
                    const firstProp = configArg.properties[0];
                    return fixer.insertTextBefore(
                      firstProp,
                      'backend: new VertexAIBackend(), '
                    );
                  },
                },
              ],
            });
          }
        }
      },
    };
  },
};

export default rule;
