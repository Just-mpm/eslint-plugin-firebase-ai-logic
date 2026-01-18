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
      ],
    });
  });
});
