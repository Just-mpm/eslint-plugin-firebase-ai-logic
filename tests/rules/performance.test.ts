import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import noUnlimitedChatHistory from '../../src/rules/no-unlimited-chat-history.js';
import preferBatchRequests from '../../src/rules/prefer-batch-requests.js';
import noVerbosePrompts from '../../src/rules/no-verbose-prompts.js';

const ruleTester = new RuleTester();

describe('Performance Rules', () => {
  // Note: prefer-count-tokens rule does not exist in the plugin.
  // Token counting is recommended in documentation but not enforced by a rule.

  describe('no-unlimited-chat-history', () => {
    ruleTester.run('no-unlimited-chat-history', noUnlimitedChatHistory, {
      valid: [
        // With slice limit
        `const chat = model.startChat({ history: chatHistory.slice(-20) });`,
        // Small literal array
        `const chat = model.startChat({ history: [{ role: 'user', parts: [{ text: 'Hi' }] }] });`,
        // No history
        `const chat = model.startChat();`,
      ],
      invalid: [
        // Variable without slice
        {
          code: `const chat = model.startChat({ history: chatHistory });`,
          errors: [{ messageId: 'noSliceOnHistory' }],
        },
        // Large literal array
        {
          code: `const chat = model.startChat({ history: [
            ${Array(25).fill("{ role: 'user', parts: [{ text: 'msg' }] }").join(',')}
          ] });`,
          errors: [{ messageId: 'largeHistory' }],
        },
        // Map without slice
        {
          code: `const chat = model.startChat({ history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })) });`,
          errors: [{ messageId: 'noSliceOnHistory' }],
        },
      ],
    });
  });

  describe('prefer-batch-requests', () => {
    ruleTester.run('prefer-batch-requests', preferBatchRequests, {
      valid: [
        // Single request
        `const result = await model.generateContent('Analyze this');`,
        // Batched request
        `const result = await model.generateContent(\`Analyze these items: \${items.join(', ')}\`);`,
      ],
      invalid: [
        // AI call in for loop
        {
          code: `
            for (const item of items) {
              const result = await model.generateContent(\`Analyze: \${item}\`);
            }
          `,
          errors: [{ messageId: 'multipleRequestsInLoop' }],
        },
        // AI call in forEach
        {
          code: `
            items.forEach(async (item) => {
              await model.generateContent(\`Process: \${item}\`);
            });
          `,
          errors: [{ messageId: 'multipleRequestsInLoop' }],
        },
        // AI call in map
        {
          code: `
            const results = items.map(async (item) => {
              return await model.generateContent(\`Analyze: \${item}\`);
            });
          `,
          errors: [{ messageId: 'multipleRequestsInLoop' }],
        },
        // Promise.all with map of AI calls
        {
          code: `
            const results = await Promise.all(
              items.map(item => model.generateContent(\`Analyze: \${item}\`))
            );
          `,
          errors: [{ messageId: 'multipleRequestsInLoop' }],
        },
      ],
    });
  });

  describe('no-verbose-prompts', () => {
    ruleTester.run('no-verbose-prompts', noVerbosePrompts, {
      valid: [
        // Concise prompt
        `const result = await model.generateContent('Analyze this text');`,
        // Direct instruction
        `const result = await model.generateContent('Summarize: ' + text);`,
      ],
      invalid: [
        // Verbose phrases
        {
          code: `const result = await model.generateContent('I would like you to analyze this text');`,
          errors: [{ messageId: 'redundantPhrases' }],
        },
        {
          code: `const result = await model.generateContent('Could you please help me with this');`,
          errors: [{ messageId: 'redundantPhrases' }],
        },
        {
          code: `const result = await model.generateContent('Please provide me with a detailed analysis');`,
          errors: [{ messageId: 'redundantPhrases' }],
        },
        {
          code: `const result = await model.generateContent('Be as comprehensive as possible when analyzing');`,
          errors: [{ messageId: 'redundantPhrases' }],
        },
      ],
    });
  });
});
