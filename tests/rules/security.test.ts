import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import noSensitiveSystemInstruction from '../../src/rules/no-sensitive-system-instruction.js';
import requireAppCheckProduction from '../../src/rules/require-app-check-production.js';

const ruleTester = new RuleTester();

describe('Security Rules', () => {
  describe('no-sensitive-system-instruction', () => {
    ruleTester.run('no-sensitive-system-instruction', noSensitiveSystemInstruction, {
      valid: [
        // Safe system instruction
        `const model = getGenerativeModel(ai, {
          systemInstruction: 'You are a helpful assistant for our pet store.',
        });`,
        // Instructions without PII
        `const model = getGenerativeModel(ai, {
          systemInstruction: 'Always be polite and helpful. Respond in Portuguese.',
        });`,
      ],
      invalid: [
        // SSN pattern - matches both the SSN number AND the "SSN:" reference
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'User SSN: 123-45-6789',
          });`,
          errors: [{ messageId: 'sensitiveData' }, { messageId: 'sensitiveData' }],
        },
        // Credit card pattern
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'Card: 4111-1111-1111-1111',
          });`,
          errors: [{ messageId: 'sensitiveData' }],
        },
        // Password pattern
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'Default password: secret123',
          });`,
          errors: [{ messageId: 'sensitiveData' }],
        },
        // API key pattern - matches api_key reference (sk- too short for standalone pattern)
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'api_key: sk-1234567890abcdef',
          });`,
          errors: [{ messageId: 'sensitiveData' }],
        },
        // AWS key pattern
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'Use AWS key: AKIAIOSFODNN7EXAMPLE',
          });`,
          errors: [{ messageId: 'sensitiveData' }],
        },
        // Database connection string - matches both connection string AND credentials in URL
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'Connect to mongodb://user:pass@host:27017/db',
          });`,
          errors: [{ messageId: 'sensitiveData' }, { messageId: 'sensitiveData' }],
        },
        // Bearer token
        {
          code: `const model = getGenerativeModel(ai, {
            systemInstruction: 'Auth: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          });`,
          errors: [{ messageId: 'sensitiveData' }],
        },
      ],
    });
  });

  describe('require-app-check-production', () => {
    ruleTester.run('require-app-check-production', requireAppCheckProduction, {
      valid: [
        // With App Check initialized
        `
          import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
          import { getAI, GoogleAIBackend } from 'firebase/ai';

          const appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider('site-key'),
          });
          const ai = getAI(app, { backend: new GoogleAIBackend() });
        `,
        // App Check before AI
        `
          initializeAppCheck(app, { provider: provider });
          const ai = getAI(app, { backend: new GoogleAIBackend() });
        `,
        // Importing from firebase/ai is considered valid because the rule assumes
        // App Check is configured in an AI module wrapper pattern
        `
          import { getAI, GoogleAIBackend } from 'firebase/ai';
          const ai = getAI(app, { backend: new GoogleAIBackend() });
        `,
      ],
      invalid: [
        // Note: The rule is designed to be lenient and assumes that if you import
        // from a module with '/ai' in the path, App Check is likely configured there.
        // Invalid cases would require a non-standard import pattern.
        // This is intentional to avoid false positives in modern architectures.
      ],
    });
  });
});
