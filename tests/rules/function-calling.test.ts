import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import requireFunctionDescription from '../../src/rules/require-function-description.js';
import noUnsupportedFunctionParams from '../../src/rules/no-unsupported-function-params.js';
import requireFunctionResponseHandling from '../../src/rules/require-function-response-handling.js';
import validateCodeExecutionConfig from '../../src/rules/validate-code-execution-config.js';
import requireCodeExecutionHandling from '../../src/rules/require-code-execution-handling.js';
import requireGroundingCompliance from '../../src/rules/require-grounding-compliance.js';
import noFileUriWithCodeExecution from '../../src/rules/no-file-uri-with-code-execution.js';
import requireGoogleAIBackendForGrounding from '../../src/rules/require-google-ai-backend-for-grounding.js';

const ruleTester = new RuleTester();

describe('Function Calling Rules', () => {
  describe('require-function-description', () => {
    ruleTester.run('require-function-description', requireFunctionDescription, {
      valid: [
        // Good description
        `const tools = [{
          functionDeclarations: [{
            name: 'getWeather',
            description: 'Get current weather data for a specific city including temperature, humidity, and conditions',
            parameters: { type: 'object', properties: { city: { type: 'string' } } }
          }]
        }];`,
        // Long enough description
        `const func = {
          name: 'searchProducts',
          description: 'Search for products in the catalog by name, category, or price range',
        };`,
      ],
      invalid: [
        // Missing description
        {
          code: `const tools = [{
            functionDeclarations: [{
              name: 'getWeather',
              parameters: { type: 'object' }
            }]
          }];`,
          errors: [{ messageId: 'missingDescription' }],
        },
        // Empty description
        {
          code: `const tools = [{
            functionDeclarations: [{
              name: 'getWeather',
              description: '',
              parameters: { type: 'object' }
            }]
          }];`,
          errors: [{ messageId: 'missingDescription' }],
        },
        // Too short description
        {
          code: `const tools = [{
            functionDeclarations: [{
              name: 'getWeather',
              description: 'Gets weather',
              parameters: { type: 'object' }
            }]
          }];`,
          errors: [{ messageId: 'shortDescription' }],
        },
      ],
    });
  });

  describe('no-unsupported-function-params', () => {
    ruleTester.run('no-unsupported-function-params', noUnsupportedFunctionParams, {
      valid: [
        // Valid parameter schema
        `const func = {
          name: 'search',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number' }
            },
            required: ['query']
          }
        };`,
      ],
      invalid: [
        // Using default in parameters
        {
          code: `const func = {
            name: 'search',
            description: 'Search for items in the catalog and return results',
            parameters: {
              type: 'object',
              properties: {
                limit: { type: 'number', default: 10 }
              }
            }
          };`,
          errors: [{ messageId: 'unsupportedParam' }],
        },
        // Using examples
        {
          code: `const func = {
            name: 'search',
            description: 'Search for items in the catalog and return results',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', examples: ['test', 'demo'] }
              }
            }
          };`,
          errors: [{ messageId: 'unsupportedParam' }],
        },
      ],
    });
  });

  describe('require-function-response-handling', () => {
    ruleTester.run('require-function-response-handling', requireFunctionResponseHandling, {
      valid: [
        // Properly checking functionCalls
        `
          const result = await model.generateContent({ contents, tools });
          const functionCalls = result.response.functionCalls();
          if (functionCalls) {
            // handle
          }
        `,
        // Using optional chaining
        `
          const calls = result.response.functionCalls?.();
        `,
      ],
      invalid: [
        // Using tools but not checking functionCalls
        {
          code: `
            const model = getGenerativeModel(ai, { tools: myTools });
            const result = await model.generateContent('Do something');
            console.log(result.response.text());
          `,
          errors: [{ messageId: 'missingFunctionCallCheck' }],
        },
      ],
    });
  });

  describe('validate-code-execution-config', () => {
    ruleTester.run('validate-code-execution-config', validateCodeExecutionConfig, {
      valid: [
        `const tools = [{ codeExecution: {} }];`,
      ],
      invalid: [
        {
          code: `const tools = [{ codeExecution: { some: 'config' } }];`,
          errors: [{ messageId: 'invalidCodeExecConfig' }],
        },
      ],
    });
  });

  describe('require-code-execution-handling', () => {
    ruleTester.run('require-code-execution-handling', requireCodeExecutionHandling, {
      valid: [
        `
        const tools = [{ codeExecution: {} }];
        const result = await model.generateContent({ contents, tools });
        const code = result.response.executableCode;
        const res = result.response.codeExecutionResult;
        `,
      ],
      invalid: [
        {
          code: `
          const tools = [{ codeExecution: {} }];
          const result = await model.generateContent('Hello');
          console.log(result.response.text());
          `,
          errors: [{ messageId: 'missingCodeExecHandling' }],
        },
      ],
    });
  });

  describe('require-grounding-compliance', () => {
    ruleTester.run('require-grounding-compliance', requireGroundingCompliance, {
      valid: [
        `
        const tools = [{ googleSearch: {} }];
        const result = await model.generateContent('Hello');
        const widget = result.response.candidates[0].groundingMetadata.searchEntryPoint;
        `,
      ],
      invalid: [
        {
          code: `
          const tools = [{ googleSearch: {} }];
          const result = await model.generateContent('Hello');
          console.log(result.response.text());
          `,
          errors: [{ messageId: 'missingSearchEntryPoint' }],
        },
      ],
    });
  });

  describe('no-file-uri-with-code-execution', () => {
    ruleTester.run('no-file-uri-with-code-execution', noFileUriWithCodeExecution, {
      valid: [
        `const result = await model.generateContent([{ text: '...' }]);`,
        `const tools = [{ codeExecution: {} }]; const result = await model.generateContent([{ text: '...' }]);`,
      ],
      invalid: [
        {
          code: `
          const tools = [{ codeExecution: {} }];
          const result = await model.generateContent([{ fileData: { fileUri: 'gs://...', mimeType: 'text/csv' } }]);
          `,
          errors: [{ messageId: 'noFileUriWithCodeExec' }],
        },
      ],
    });
  });

  describe('require-google-ai-backend-for-grounding', () => {
    ruleTester.run('require-google-ai-backend-for-grounding', requireGoogleAIBackendForGrounding, {
      valid: [
        `
        const ai = getAI(app, { backend: new GoogleAIBackend() });
        const model = getGenerativeModel(ai, { tools: [{ googleSearch: {} }] });
        `,
      ],
      invalid: [
        {
          code: `
          const ai = getAI(app, { backend: new VertexAIBackend() });
          const model = getGenerativeModel(ai, { tools: [{ googleSearch: {} }] });
          `,
          errors: [{ messageId: 'googleAIBackendRequiredForGrounding' }],
        },
      ],
    });
  });
});
