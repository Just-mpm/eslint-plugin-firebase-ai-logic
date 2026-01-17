import type { Rule } from "eslint";
import {
  getCalleeName,
  isObjectExpression,
  findProperty,
  getStringValue,
} from "../utils/ast-helpers.js";
import { GEMINI_3_THINKING_LEVELS } from "../utils/constants.js";

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Validate thinking_level configuration and warn against using high thinking levels for simple tasks where it adds latency without benefit",
      recommended: false,
      url: "https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-thinking-simple-tasks",
    },
    schema: [],
    messages: {
      thinkingForSimpleTask:
        'High thinking level configured for what appears to be a simple task. Use "low" or "minimal" (Flash only) to reduce latency.',
      invalidThinkingLevel:
        "Invalid thinking level '{{ level }}'. Valid levels are: {{ validLevels }}.",
      modelThinkingLevelMismatch:
        "Thinking level '{{ level }}' is not supported by model '{{ model }}'. Supported levels: {{ validLevels }}.",
      preferLowLevel:
        'For simple tasks, prefer thinking_level="low" or "minimal" to improve speed.',
    },
  },

  create(context) {
    // Simple task indicators - these typically don't need extended thinking
    const simpleTaskIndicators = [
      "translate",
      "format",
      "convert",
      "extract",
      "summarize briefly",
      "what is",
      "who is",
      "when was",
      "yes or no",
      "true or false",
      "classify",
      "categorize",
      "list",
      "hello",
      "hi",
      "greet",
    ];

    function isSimpleTask(text: string): boolean {
      const lowerText = text.toLowerCase();
      // Check for simple task indicators
      return simpleTaskIndicators.some((ind) => lowerText.includes(ind));
    }

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (
          calleeName !== "getGenerativeModel" &&
          calleeName !== "generateContent"
        )
          return;

        let configArg = node.arguments[1];
        let modelName: string | null = null;

        // Handle getGenerativeModel(fakeParams, config)
        if (calleeName === "getGenerativeModel") {
          // model is usually in the config object
          if (configArg && isObjectExpression(configArg)) {
            const modelProp = findProperty(configArg, "model");
            if (modelProp) {
              modelName = getStringValue(modelProp.value);
            }
          }
        }

        // Ensure we have a config object to look at
        if (!configArg || !isObjectExpression(configArg)) return;

        // Look for thinkingConfig (Gemini 3)
        // Structure: config = { thinkingConfig: { thinkingLevel: "..." } }
        // OR config = { generationConfig: { thinkingConfig: { thinkingLevel: "..." } } }

        let thinkingConfigProp = findProperty(configArg, "thinkingConfig");

        // Try inside generationConfig if not found directly
        if (!thinkingConfigProp) {
          const genConfigProp = findProperty(configArg, "generationConfig");
          if (genConfigProp && isObjectExpression(genConfigProp.value)) {
            thinkingConfigProp = findProperty(
              genConfigProp.value,
              "thinkingConfig",
            );
          }
        }

        if (
          !thinkingConfigProp ||
          !isObjectExpression(thinkingConfigProp.value)
        )
          return;

        const thinkingLevelProp = findProperty(
          thinkingConfigProp.value,
          "thinkingLevel",
        );
        if (!thinkingLevelProp) return;

        const thinkingLevel = getStringValue(thinkingLevelProp.value);
        if (!thinkingLevel) return;

        // Validate level existence
        const allLevels = [
          ...new Set([
            ...GEMINI_3_THINKING_LEVELS.pro,
            ...GEMINI_3_THINKING_LEVELS.flash,
          ]),
        ];
        if (!allLevels.includes(thinkingLevel as any)) {
          context.report({
            node: thinkingLevelProp.value,
            messageId: "invalidThinkingLevel",
            data: {
              level: thinkingLevel,
              validLevels: allLevels.join(", "),
            },
          });
          return;
        }

        // Validate model compatibility if model name is known
        if (modelName) {
          const isFlash = modelName.includes("flash");
          const isPro = modelName.includes("pro");

          if (isFlash) {
            if (
              !GEMINI_3_THINKING_LEVELS.flash.includes(thinkingLevel as any)
            ) {
              context.report({
                node: thinkingLevelProp.value,
                messageId: "modelThinkingLevelMismatch",
                data: {
                  level: thinkingLevel,
                  model: modelName,
                  validLevels: GEMINI_3_THINKING_LEVELS.flash.join(", "),
                },
              });
            }
          } else if (isPro) {
            if (!GEMINI_3_THINKING_LEVELS.pro.includes(thinkingLevel as any)) {
              context.report({
                node: thinkingLevelProp.value,
                messageId: "modelThinkingLevelMismatch",
                data: {
                  level: thinkingLevel,
                  model: modelName,
                  validLevels: GEMINI_3_THINKING_LEVELS.pro.join(", "),
                },
              });
            }
          }
        }

        // HEURISTIC: Check for simple tasks
        // We need the prompt text. In generateContent, it's the first arg.
        // In getGenerativeModel, we might check systemInstruction

        let promptText = "";
        if (calleeName === "generateContent") {
          const promptArg = node.arguments[0];
          if (promptArg) {
            const str = getStringValue(promptArg);
            if (str) promptText = str;
          }
        } else if (calleeName === "getGenerativeModel") {
          const sysInst = findProperty(configArg, "systemInstruction");
          if (sysInst) {
            const str = getStringValue(sysInst.value);
            if (str) promptText = str;
          }
        }

        if (
          promptText &&
          isSimpleTask(promptText) &&
          thinkingLevel === "high"
        ) {
          context.report({
            node: thinkingLevelProp.value,
            messageId: "thinkingForSimpleTask",
          });
        }
      },
    };
  },
};

export default rule;
