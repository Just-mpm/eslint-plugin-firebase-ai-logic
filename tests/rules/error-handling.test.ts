import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import requireErrorHandling from '../../src/rules/require-error-handling.js';
import requireJsonValidation from '../../src/rules/require-json-validation.js';

const ruleTester = new RuleTester();

describe('Error Handling Rules', () => {
  describe('require-error-handling', () => {
    ruleTester.run('require-error-handling', requireErrorHandling, {
      valid: [
        // With try-catch
        `
          try {
            const result = await model.generateContent('Hello');
          } catch (error) {
            console.error(error);
          }
        `,
        // With .catch()
        `
          model.generateContent('Hello')
            .then(result => console.log(result))
            .catch(error => console.error(error));
        `,
        // Inside try block
        `
          try {
            const result = await model.generateContentStream('Hello');
            for await (const chunk of result.stream) {
              console.log(chunk.text());
            }
          } catch (e) {
            handleError(e);
          }
        `,
      ],
      invalid: [
        // No error handling for generateContent (awaited)
        {
          code: `const result = await model.generateContent('Hello');`,
          errors: [{ messageId: 'awaitWithoutTryCatch' }],
        },
        // No error handling for generateContentStream (awaited)
        {
          code: `const result = await model.generateContentStream('Hello');`,
          errors: [{ messageId: 'awaitWithoutTryCatch' }],
        },
        // No error handling for sendMessage (awaited)
        {
          code: `const result = await chat.sendMessage('Hello');`,
          errors: [{ messageId: 'awaitWithoutTryCatch' }],
        },
        // No error handling for sendMessageStream (awaited)
        {
          code: `const result = await chat.sendMessageStream('Hello');`,
          errors: [{ messageId: 'awaitWithoutTryCatch' }],
        },
      ],
    });
  });

  describe('require-json-validation', () => {
    ruleTester.run('require-json-validation', requireJsonValidation, {
      valid: [
        // With try-catch around JSON.parse
        `
          try {
            const data = JSON.parse(response.text());
          } catch (e) {
            console.error('Invalid JSON');
          }
        `,
        // Using safe JSON parsing utility
        `
          const data = safeJsonParse(response.text());
        `,
        // With Zod validation
        `
          const data = MySchema.parse(JSON.parse(response.text()));
        `,
      ],
      invalid: [
        // JSON.parse without try-catch on AI response
        {
          code: `
            const result = await model.generateContent('Return JSON');
            const data = JSON.parse(result.response.text());
          `,
          errors: [{ messageId: 'unvalidatedJsonParse' }],
        },
      ],
    });
  });
});
