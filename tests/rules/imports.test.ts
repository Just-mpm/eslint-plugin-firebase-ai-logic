import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import noGoogleGenaiImport from '../../src/rules/no-google-genai-import.js';
import noVertexAiDirectImport from '../../src/rules/no-vertex-ai-direct-import.js';
import noDeprecatedFirebaseVertexai from '../../src/rules/no-deprecated-firebase-vertexai.js';
import noVertexaiOnlyImport from '../../src/rules/no-vertexai-only-import.js';

const ruleTester = new RuleTester();

describe('Import Rules', () => {
  describe('no-google-genai-import', () => {
    ruleTester.run('no-google-genai-import', noGoogleGenaiImport, {
      valid: [
        // Correct import
        `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
        // Other imports are fine
        `import { initializeApp } from 'firebase/app';`,
        `import { getAuth } from 'firebase/auth';`,
      ],
      invalid: [
        {
          code: `import { GoogleGenerativeAI } from '@google/generative-ai';`,
          errors: [{ messageId: 'wrongImport' }],
          output: `import { getAI, GoogleAIBackend } from 'firebase/ai';`,
        },
        {
          code: `import { GenerativeModel } from '@google/generative-ai';`,
          errors: [{ messageId: 'wrongImport' }],
          output: `import { getGenerativeModel } from 'firebase/ai';`,
        },
      ],
    });
  });

  describe('no-vertex-ai-direct-import', () => {
    ruleTester.run('no-vertex-ai-direct-import', noVertexAiDirectImport, {
      valid: [
        `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
        `import { initializeApp } from 'firebase/app';`,
      ],
      invalid: [
        {
          code: `import { VertexAI } from '@google-cloud/vertexai';`,
          errors: [{ messageId: 'wrongImport' }],
          output: `import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';`,
        },
      ],
    });
  });

  describe('no-deprecated-firebase-vertexai', () => {
    ruleTester.run('no-deprecated-firebase-vertexai', noDeprecatedFirebaseVertexai, {
      valid: [
        `import { getAI, getGenerativeModel } from 'firebase/ai';`,
      ],
      invalid: [
        {
          code: `import { getVertexAI } from 'firebase/vertexai-preview';`,
          errors: [{ messageId: 'deprecatedImport' }],
          output: `import { getAI } from 'firebase/ai';`,
        },
        {
          code: `import { getGenerativeModel } from 'firebase/vertexai-preview';`,
          errors: [{ messageId: 'deprecatedImport' }],
          output: `import { getGenerativeModel } from 'firebase/ai';`,
        },
      ],
    });
  });

  describe('no-vertexai-only-import', () => {
    ruleTester.run('no-vertexai-only-import', noVertexaiOnlyImport, {
      valid: [
        `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
        `import { VertexAIBackend } from 'firebase/ai';`,
      ],
      invalid: [
        {
          code: `import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';`,
          errors: [{ messageId: 'outdatedImport' }],
          output: `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
        },
      ],
    });
  });
});
