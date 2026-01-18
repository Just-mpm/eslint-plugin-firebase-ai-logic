import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import requireBackend from '../../src/rules/require-backend.js';
import requireAiBeforeModel from '../../src/rules/require-ai-before-model.js';

const ruleTester = new RuleTester();

describe('Initialization Rules', () => {
  describe('require-backend', () => {
    ruleTester.run('require-backend', requireBackend, {
      valid: [
        // With GoogleAIBackend
        `const ai = getAI(app, { backend: new GoogleAIBackend() });`,
        // With VertexAIBackend
        `const ai = getAI(app, { backend: new VertexAIBackend() });`,
        // With VertexAIBackend and location
        `const ai = getAI(app, { backend: new VertexAIBackend({ location: 'us-central1' }) });`,
        // Variable backend
        `const ai = getAI(app, { backend: myBackend });`,
      ],
      invalid: [
        // Config with properties but no backend - this is the only invalid case
        // Note: getAI(app) and getAI(app, {}) are VALID (default backend used)
        {
          code: `const ai = getAI(app, { otherOption: true });`,
          errors: [
            {
              messageId: 'missingBackendInConfig',
              suggestions: [
                { messageId: 'addGoogleAIBackend', output: `const ai = getAI(app, { backend: new GoogleAIBackend(), otherOption: true });` },
                { messageId: 'addVertexAIBackend', output: `const ai = getAI(app, { backend: new VertexAIBackend(), otherOption: true });` },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('require-ai-before-model', () => {
    ruleTester.run('require-ai-before-model', requireAiBeforeModel, {
      valid: [
        // Correct: AI instance passed
        `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        // Variable name
        `const model = getGenerativeModel(myAi, { model: 'gemini-3-flash-preview' });`,

        // ✅ Wrapper function pattern - function declaration with direct return
        `
          function getAIInstance() {
            return getAI(app);
          }
          const model = getGenerativeModel(getAIInstance(), { model: 'gemini-3-flash-preview' });
        `,

        // ✅ Wrapper function pattern - lazy initialization (common pattern)
        `
          let aiInstance = null;
          function getAIInstance() {
            if (!aiInstance) {
              aiInstance = getAI(app);
            }
            return aiInstance;
          }
          const model = getGenerativeModel(getAIInstance(), { model: 'gemini-3-flash-preview' });
        `,

        // ✅ Arrow function wrapper
        `
          const getAIInstance = () => getAI(app);
          const model = getGenerativeModel(getAIInstance(), { model: 'gemini-3-flash-preview' });
        `,

        // ✅ Arrow function wrapper with block body
        `
          const getAIInstance = () => {
            return getAI(app);
          };
          const model = getGenerativeModel(getAIInstance(), { model: 'gemini-3-flash-preview' });
        `,

        // ✅ Function expression wrapper
        `
          const getAIInstance = function() {
            return getAI(app);
          };
          const model = getGenerativeModel(getAIInstance(), { model: 'gemini-3-flash-preview' });
        `,

        // ✅ Direct getAI call inline
        `const model = getGenerativeModel(getAI(app), { model: 'gemini-3-flash-preview' });`,
      ],
      invalid: [
        // No arguments
        {
          code: `const model = getGenerativeModel();`,
          errors: [{ messageId: 'missingGetAI' }],
        },
        // Only config, no AI (object as first arg)
        {
          code: `const model = getGenerativeModel({ model: 'gemini-3-flash-preview' });`,
          errors: [{ messageId: 'wrongFirstArg' }],
        },
        // ❌ Unknown function call (not a wrapper)
        {
          code: `
            function getSomethingElse() {
              return { not: 'ai' };
            }
            const ai = getAI(app);
            const model = getGenerativeModel(getSomethingElse(), { model: 'gemini-3-flash-preview' });
          `,
          errors: [{ messageId: 'wrongFirstArg' }],
        },
      ],
    });
  });
});
