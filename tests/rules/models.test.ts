import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import noDeprecatedModels from '../../src/rules/no-deprecated-models.js';
import checkTemperatureDefaults from '../../src/rules/check-temperature-defaults.js';
import noThinkingSimpleTasks from '../../src/rules/no-thinking-simple-tasks.js';

const ruleTester = new RuleTester();

describe('Model Rules', () => {
  describe('no-deprecated-models', () => {
    ruleTester.run('no-deprecated-models', noDeprecatedModels, {
      valid: [
        // Valid Gemini 3 models
        `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        `const model = getGenerativeModel(ai, { model: 'gemini-3-pro-preview' });`,
        `const model = getGenerativeModel(ai, { model: 'gemini-3-pro-image-preview' });`,
        // Dynamic model selection (can't lint)
        `const model = getGenerativeModel(ai, { model: modelName });`,
      ],
      invalid: [
        // Gemini 1.x deprecated
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-pro' });`,
          errors: [{ messageId: 'deprecatedModel' }],
          output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        },
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-1.0-pro' });`,
          errors: [{ messageId: 'deprecatedModel' }],
          output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        },
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-1.5-pro' });`,
          errors: [{ messageId: 'deprecatedModel' }],
          output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        },
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash' });`,
          errors: [{ messageId: 'deprecatedModel' }],
          output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        },
        // Gemini 2.0 deprecated (but 2.5 is NOT deprecated - it's a valid current model)
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });`,
          errors: [{ messageId: 'deprecatedModel' }],
          output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        },
        // Note: gemini-2.5-* are VALID models and should NOT be in invalid cases
      ],
    });
  });

  describe('check-temperature-defaults', () => {
    ruleTester.run('check-temperature-defaults', checkTemperatureDefaults, {
      valid: [
        `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview', generationConfig: { temperature: 1.0 } });`,
        `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
      ],
      invalid: [
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview', generationConfig: { temperature: 0.5 } });`,
          errors: [{ messageId: 'nonDefaultTemperature' }],
        },
      ],
    });
  });

  describe('no-thinking-simple-tasks', () => {
    ruleTester.run('no-thinking-simple-tasks', noThinkingSimpleTasks, {
      valid: [
        `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview', thinkingConfig: { thinkingLevel: 'low' } });`,
        `const result = await model.generateContent({ contents: 'What is the capital of France?', thinkingConfig: { thinkingLevel: 'low' } });`,
      ],
      invalid: [
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview', thinkingConfig: { thinkingLevel: 'high' }, systemInstruction: 'Say hello' });`,
          errors: [{ messageId: 'thinkingForSimpleTask' }],
        },
        {
          code: `const model = getGenerativeModel(ai, { model: 'gemini-3-pro-preview', thinkingConfig: { thinkingLevel: 'minimal' } });`,
          errors: [{ messageId: 'modelThinkingLevelMismatch' }],
        },
      ],
    });
  });
});
