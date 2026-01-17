import type { Rule } from 'eslint';
import {
  getCalleeName,
  isObjectExpression,
  findProperty,
  getStringValue,
  getNumberValue,
} from '../utils/ast-helpers.js';

/**
 * check-temperature-defaults
 *
 * This rule suggests using the default temperature (1.0) for Gemini 3 models,
 * but with important exceptions:
 *
 * ONLY APPLIES TO:
 * - gemini-3-flash-preview
 * - gemini-3-pro-preview
 * (Other models like gemini-2.5-* don't have this recommendation)
 *
 * EXCEPTIONS (low temperature is valid and recommended):
 * 1. Structured output (responseMimeType: 'application/json')
 *    - Low temperature (0.1-0.3) prevents hallucinations in extraction tasks
 * 2. Classification tasks (maxOutputTokens <= 20)
 *    - Deterministic outputs benefit from low temperature
 * 3. Data extraction with responseSchema
 *    - Precise extraction needs low temperature
 *
 * The rule only warns when:
 * - Model is Gemini 3 (flash or pro preview)
 * - Temperature is NOT 1.0
 * - AND it's NOT a structured output or classification task
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest default temperature (1.0) for Gemini 3 models, except for structured output and classification tasks',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#check-temperature-defaults',
    },
    schema: [],
    messages: {
      nonDefaultTemperature:
        'Consider using the default temperature (1.0) for Gemini 3 models. Lower values may cause looping or degraded reasoning. Exception: low temperature is appropriate for structured output (JSON) and classification tasks.',
    },
  },

  create(context) {
    // Gemini 3 models that have the temperature=1.0 recommendation
    const GEMINI_3_MODELS = [
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-3-flash',
      'gemini-3-pro',
    ];

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        // Check both getGenerativeModel and generateContent
        if (
          calleeName !== 'getGenerativeModel' &&
          calleeName !== 'generateContent'
        ) {
          return;
        }

        // Config is usually the 2nd argument (index 1)
        const configArg = node.arguments[1];
        if (!configArg || !isObjectExpression(configArg)) return;

        // Check model name - only apply to Gemini 3 models
        const modelProp = findProperty(configArg, 'model');
        if (modelProp) {
          const modelName = getStringValue(modelProp.value);
          if (modelName && !GEMINI_3_MODELS.some(m => modelName.includes(m))) {
            // Not a Gemini 3 model - don't apply this rule
            return;
          }
        }

        // Check for generationConfig
        const generationConfig = findProperty(configArg, 'generationConfig');
        const configToCheck = generationConfig
          ? generationConfig.value
          : configArg;

        if (!isObjectExpression(configToCheck)) return;

        // Check for responseMimeType - if it's 'application/json', low temperature is valid
        const responseMimeTypeProp = findProperty(configToCheck, 'responseMimeType');
        if (responseMimeTypeProp) {
          const mimeType = getStringValue(responseMimeTypeProp.value);
          if (mimeType === 'application/json') {
            // Structured output - low temperature is appropriate, don't warn
            return;
          }
        }

        // Check for responseSchema - if present, it's structured output
        const responseSchemaProp = findProperty(configToCheck, 'responseSchema');
        if (responseSchemaProp) {
          // Has response schema - structured output, don't warn
          return;
        }

        // Check for maxOutputTokens - if very low (<= 20), it's likely classification
        const maxOutputTokensProp = findProperty(configToCheck, 'maxOutputTokens');
        if (maxOutputTokensProp) {
          const maxTokens = getNumberValue(maxOutputTokensProp.value);
          if (maxTokens !== null && maxTokens <= 20) {
            // Classification task (very short output) - low temperature is appropriate
            return;
          }
        }

        // Check for temperature property
        const temperatureProp = findProperty(configToCheck, 'temperature');

        if (temperatureProp) {
          // If value is literal and not 1.0, suggest (not require) using default
          if (
            temperatureProp.value.type === 'Literal' &&
            typeof temperatureProp.value.value === 'number'
          ) {
            const temp = temperatureProp.value.value;
            // Only warn for non-default temperature when NOT doing structured output
            if (temp !== 1.0) {
              context.report({
                node: temperatureProp,
                messageId: 'nonDefaultTemperature',
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
