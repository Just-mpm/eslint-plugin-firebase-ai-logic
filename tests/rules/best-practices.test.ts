import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import preferStreamingLongResponses from '../../src/rules/prefer-streaming-long-responses.js';
import noThinkingSimpleTasks from '../../src/rules/no-thinking-simple-tasks.js';
import preferConcisePropertyNames from '../../src/rules/prefer-concise-property-names.js';

const ruleTester = new RuleTester();

describe('Best Practices Rules', () => {
  describe('prefer-streaming-long-responses', () => {
    ruleTester.run('prefer-streaming-long-responses', preferStreamingLongResponses, {
      valid: [
        // Short/simple prompt
        `const result = await model.generateContent('What is 2+2?');`,
        // Already using streaming
        `const result = await model.generateContentStream('Explain quantum physics');`,
        // sendMessageStream
        `const result = await chat.sendMessageStream('Write a detailed tutorial');`,
      ],
      invalid: [
        // Long response expected prompts
        {
          code: `const result = await model.generateContent('Explain quantum computing in detail');`,
          errors: [{ messageId: 'useStreaming' }],
        },
        {
          code: `const result = await model.generateContent('Write a comprehensive guide about React');`,
          errors: [{ messageId: 'useStreaming' }],
        },
        {
          code: `const result = await model.generateContent('Create a step by step tutorial for Node.js');`,
          errors: [{ messageId: 'useStreaming' }],
        },
        // Chat without streaming
        {
          code: `const result = await chat.sendMessage('Describe the history of JavaScript in detail');`,
          errors: [{ messageId: 'streamingForChat' }],
        },
      ],
    });
  });

  describe('no-thinking-simple-tasks', () => {
    ruleTester.run('no-thinking-simple-tasks', noThinkingSimpleTasks, {
      valid: [
        // No thinking budget
        `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        // Thinking disabled
        `const model = getGenerativeModel(ai, {
          model: 'gemini-3-flash-preview',
          generationConfig: { thinkingBudget: 0 }
        });`,
        // Thinking for complex task
        `const model = getGenerativeModel(ai, {
          model: 'gemini-3-flash-preview',
          systemInstruction: 'You are a math expert. Solve complex equations.',
          generationConfig: { thinkingBudget: 5000 }
        });`,
      ],
      invalid: [
        // Thinking for simple translation task
        {
          code: `const model = getGenerativeModel(ai, {
            model: 'gemini-3-flash-preview',
            systemInstruction: 'Translate text to Portuguese',
            generationConfig: { thinkingBudget: 5000 }
          });`,
          errors: [{ messageId: 'thinkingForSimpleTask' }],
        },
        // Very high thinking budget
        {
          code: `const model = getGenerativeModel(ai, {
            model: 'gemini-3-flash-preview',
            generationConfig: { thinkingBudget: 20000 }
          });`,
          errors: [{ messageId: 'highThinkingBudget' }],
        },
        // Thinking for classification task
        {
          code: `const model = getGenerativeModel(ai, {
            model: 'gemini-3-flash-preview',
            systemInstruction: 'Classify text as positive, negative, or neutral',
            generationConfig: { thinkingBudget: 3000 }
          });`,
          errors: [{ messageId: 'thinkingForSimpleTask' }],
        },
      ],
    });
  });

  describe('prefer-concise-property-names', () => {
    ruleTester.run('prefer-concise-property-names', preferConcisePropertyNames, {
      valid: [
        // Short property names
        `const schema = Schema.object({
          properties: {
            name: Schema.string(),
            email: Schema.string(),
            age: Schema.number(),
          }
        });`,
        // Reasonable length
        `const schema = Schema.object({
          properties: {
            createdAt: Schema.string(),
            updatedAt: Schema.string(),
          }
        });`,
      ],
      invalid: [
        // Very long property name
        {
          code: `const schema = Schema.object({
            properties: {
              user_email_address_for_contact: Schema.string(),
            }
          });`,
          errors: [{ messageId: 'longPropertyName' }],
        },
        // Verbose pattern
        {
          code: `const schema = Schema.object({
            properties: {
              user_email_address: Schema.string(),
            }
          });`,
          errors: [{ messageId: 'verbosePropertyName' }],
        },
        // Another verbose pattern
        {
          code: `const schema = Schema.object({
            properties: {
              product_description_text: Schema.string(),
            }
          });`,
          errors: [{ messageId: 'verbosePropertyName' }],
        },
      ],
    });
  });
});
