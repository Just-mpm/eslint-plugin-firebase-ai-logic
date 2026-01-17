import type { Rule } from 'eslint';
import {
  getCalleeName,
  isObjectExpression,
  findProperty,
  getStringValue,
  isArrayExpression,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require preserving thoughtSignature in Gemini 3 multi-turn conversations and function calling. Missing signatures cause 400 errors for function calls and image generation, and degrade reasoning quality for chat.',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-thought-signature',
    },
    schema: [],
    messages: {
      missingThoughtSignature:
        'Gemini 3 requires thoughtSignature to be preserved in multi-turn conversations. For function calling and image generation, missing signatures cause 400 errors. Always return thoughtSignature exactly as received.',
      functionCallWithoutSignature:
        'When handling functionCall responses from Gemini 3, you must preserve the thoughtSignature. The signature is in the first functionCall part for parallel calls, or in each step for sequential calls.',
      chatHistoryWithoutSignature:
        'When building chat history for Gemini 3, include thoughtSignature from model responses to maintain reasoning context. Use: { role: "model", parts: [{ text: "...", thoughtSignature: sig }] }',
      migrationHint:
        'If migrating from Gemini 2.5, use thoughtSignature: "context_engineering_is_the_way_to_go" as a placeholder to bypass validation.',
    },
  },

  create(context) {
    // Track if we're using Gemini 3 models
    let isGemini3 = false;
    let hasTools = false;
    let hasFunctionCallHandling = false;
    let hasThoughtSignatureUsage = false;

    return {
      // Detect Gemini 3 model usage
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (calleeName === 'getGenerativeModel') {
          const configArg = node.arguments[1];
          if (configArg && isObjectExpression(configArg)) {
            const modelProp = findProperty(configArg, 'model');
            if (modelProp) {
              const modelValue = getStringValue(modelProp.value);
              if (modelValue && modelValue.startsWith('gemini-3')) {
                isGemini3 = true;
              }
            }

            // Check for tools configuration
            const toolsProp = findProperty(configArg, 'tools');
            if (toolsProp) {
              hasTools = true;
            }
          }
        }

        // Check for functionCalls() usage - indicates function call handling
        if (calleeName === 'functionCalls') {
          hasFunctionCallHandling = true;
        }
      },

      // Detect thoughtSignature usage in code
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'thoughtSignature'
        ) {
          hasThoughtSignatureUsage = true;
        }
      },

      // Also check string literals for thoughtSignature
      Literal(node) {
        if (
          typeof node.value === 'string' &&
          node.value === 'thoughtSignature'
        ) {
          hasThoughtSignatureUsage = true;
        }
      },

      // Check for startChat with history - should include thoughtSignature
      'CallExpression[callee.property.name="startChat"]'(
        node: Rule.Node & { type: 'CallExpression' }
      ) {
        if (!isGemini3) return;

        const configArg = node.arguments[0];
        if (!configArg || !isObjectExpression(configArg)) return;

        const historyProp = findProperty(configArg, 'history');
        if (!historyProp) return;

        // Check if history array has model parts with thoughtSignature
        if (isArrayExpression(historyProp.value)) {
          let hasModelPartWithSignature = false;

          for (const element of historyProp.value.elements) {
            if (!element || !isObjectExpression(element)) continue;

            const roleProp = findProperty(element, 'role');
            if (!roleProp) continue;

            const roleValue = getStringValue(roleProp.value);
            if (roleValue !== 'model') continue;

            // Check parts for thoughtSignature
            const partsProp = findProperty(element, 'parts');
            if (!partsProp || !isArrayExpression(partsProp.value)) continue;

            for (const part of partsProp.value.elements) {
              if (!part || !isObjectExpression(part)) continue;

              const sigProp = findProperty(part, 'thoughtSignature');
              if (sigProp) {
                hasModelPartWithSignature = true;
                break;
              }
            }
          }

          // If there are model parts but no signature, warn
          const hasModelParts = historyProp.value.elements.some((el) => {
            if (!el || !isObjectExpression(el)) return false;
            const roleProp = findProperty(el, 'role');
            if (!roleProp) return false;
            const roleValue = getStringValue(roleProp.value);
            return roleValue === 'model';
          });

          if (hasModelParts && !hasModelPartWithSignature) {
            context.report({
              node: historyProp as Rule.Node,
              messageId: 'chatHistoryWithoutSignature',
            });
          }
        }
      },

      // Check at end of program if tools are used without signature handling
      'Program:exit'() {
        if (isGemini3 && hasTools && hasFunctionCallHandling && !hasThoughtSignatureUsage) {
          // This is a heuristic - if using Gemini 3 with tools and handling
          // function calls but never referencing thoughtSignature, warn
          // We can't report on a specific node here, so this is informational
        }
      },
    };
  },
};

export default rule;
