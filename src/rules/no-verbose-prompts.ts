import type { Rule } from 'eslint';
import { getCalleeName, getStringValue } from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn against verbose prompts that waste tokens. Gemini 3 works best with concise, direct instructions.',
      recommended: false,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-verbose-prompts',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxPromptLength: {
            type: 'number',
            default: 1000,
            description: 'Maximum prompt length before warning',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      verbosePrompt:
        'Prompt is very long ({{ length }} chars). Gemini 3 responds better to concise, direct instructions.',
      redundantPhrases:
        "Prompt contains redundant phrases like '{{ phrase }}'. Gemini 3 prefers precise instructions over verbose ones.",
      gemini3Tip:
        "Gemini 3 tip: Be concise. Instead of 'I would like you to carefully analyze...', use 'Analyze...'",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const maxPromptLength = options.maxPromptLength ?? 1000;

    // Redundant/verbose phrases to flag
    const verbosePhrases = [
      'i would like you to',
      'could you please',
      'can you please',
      'please provide me with',
      'i want you to',
      'i need you to',
      'be as comprehensive as possible',
      'as detailed as possible',
      'carefully and thoroughly',
      'in great detail',
      'step by step explanation',
      'make sure to include',
      'do not forget to',
      'remember to',
      'be sure to',
      'it is important that',
      'please ensure that',
      'the following is',
      'as follows:',
      'in the following',
      'provided below',
      'mentioned above',
    ];

    const aiMethods = [
      'generateContent',
      'generateContentStream',
      'sendMessage',
      'sendMessageStream',
    ];

    function checkPrompt(node: Rule.Node, promptText: string) {
      // Check for excessive length
      if (promptText.length > maxPromptLength) {
        context.report({
          node,
          messageId: 'verbosePrompt',
          data: {
            length: promptText.length.toString(),
          },
        });
        return; // Don't pile on with more warnings
      }

      // Check for verbose phrases
      const lowerPrompt = promptText.toLowerCase();

      for (const phrase of verbosePhrases) {
        if (lowerPrompt.includes(phrase)) {
          context.report({
            node,
            messageId: 'redundantPhrases',
            data: {
              phrase,
            },
          });
          return; // Report only the first found phrase
        }
      }
    }

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (!calleeName || !aiMethods.includes(calleeName)) {
          return;
        }

        const promptArg = node.arguments[0];
        if (!promptArg) return;

        // String literal
        const stringValue = getStringValue(promptArg);
        if (stringValue) {
          checkPrompt(promptArg as Rule.Node, stringValue);
          return;
        }

        // Template literal
        if (promptArg.type === 'TemplateLiteral') {
          const fullText = promptArg.quasis
            .map((q) => q.value.cooked ?? '')
            .join('');

          checkPrompt(promptArg as Rule.Node, fullText);
        }
      },
    };
  },
};

export default rule;
