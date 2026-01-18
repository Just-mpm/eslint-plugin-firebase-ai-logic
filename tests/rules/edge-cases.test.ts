import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

// Import rules
import noThinkingSimpleTasks from '../../src/rules/no-thinking-simple-tasks.js';
import checkTemperatureDefaults from '../../src/rules/check-temperature-defaults.js';
import preferStreamingLongResponses from '../../src/rules/prefer-streaming-long-responses.js';
import noUnsupportedMimeType from '../../src/rules/no-unsupported-mime-type.js';
import preferCloudStorageLargeFiles from '../../src/rules/prefer-cloud-storage-large-files.js';
import requireFunctionDescription from '../../src/rules/require-function-description.js';
import noUnsupportedFunctionParams from '../../src/rules/no-unsupported-function-params.js';
import validateCodeExecutionConfig from '../../src/rules/validate-code-execution-config.js';
import requireGroundingCompliance from '../../src/rules/require-grounding-compliance.js';
import noSchemaInPrompt from '../../src/rules/no-schema-in-prompt.js';
import preferConcisePropertyNames from '../../src/rules/prefer-concise-property-names.js';
import preferOptionalProperties from '../../src/rules/prefer-optional-properties.js';
import validateSchemaStructure from '../../src/rules/validate-schema-structure.js';
import requireThoughtSignature from '../../src/rules/require-thought-signature.js';
import noDeprecatedFirebaseVertexai from '../../src/rules/no-deprecated-firebase-vertexai.js';
import noVertexAiDirectImport from '../../src/rules/no-vertex-ai-direct-import.js';
import noCodeExecutionCreativeTasks from '../../src/rules/no-code-execution-creative-tasks.js';

const ruleTester = new RuleTester();

/**
 * Testes de Edge Cases - Cenários menos comuns mas importantes
 * Foca em casos que podem passar despercebidos
 */
describe('Edge Cases - Advanced Scenarios', () => {
  /**
   * ========================================
   * SEÇÃO 1: THINKING BUDGET
   * Skill: "thinkingBudget: 5000 // tokens para pensamento"
   * ========================================
   */
  describe('Thinking Level Edge Cases', () => {
    describe('no-thinking-simple-tasks - thinkingLevel Validation', () => {
      ruleTester.run('no-thinking-simple-tasks', noThinkingSimpleTasks, {
        valid: [
          // ✅ Thinking level baixo para tarefa simples
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              thinkingConfig: { thinkingLevel: 'low' },
            });
          `,
          // ✅ Sem thinkingConfig (padrão)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
            });
          `,
          // ✅ High thinking para tarefa complexa (math)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              systemInstruction: 'Solve complex mathematical proofs.',
              thinkingConfig: { thinkingLevel: 'high' },
            });
          `,
        ],
        invalid: [
          // ❌ High thinking para tradução (tarefa simples)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                systemInstruction: 'Translate text from English to Portuguese.',
                thinkingConfig: { thinkingLevel: 'high' },
              });
            `,
            errors: [{ messageId: 'thinkingForSimpleTask' }],
          },
          // ❌ High thinking para classificação (tarefa simples)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                systemInstruction: 'Classify the sentiment as positive, negative, or neutral.',
                thinkingConfig: { thinkingLevel: 'high' },
              });
            `,
            errors: [{ messageId: 'thinkingForSimpleTask' }],
          },
          // ❌ Minimal em modelo Pro (incompatível)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-pro-preview',
                thinkingConfig: { thinkingLevel: 'minimal' },
              });
            `,
            errors: [{ messageId: 'modelThinkingLevelMismatch' }],
          },
        ],
      });
    });

    describe('check-temperature-defaults', () => {
      ruleTester.run('check-temperature-defaults', checkTemperatureDefaults, {
        valid: [
          // ✅ Temperatura padrão (1.0)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              generationConfig: { temperature: 1.0 },
            });
          `,
          // ✅ Sem temperatura (usa padrão)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
            });
          `,
        ],
        invalid: [
          // ❌ Temperatura não-padrão (0.5)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                generationConfig: { temperature: 0.5 },
              });
            `,
            errors: [{ messageId: 'nonDefaultTemperature' }],
          },
          // ❌ Temperatura muito baixa (0.1)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                generationConfig: { temperature: 0.1 },
              });
            `,
            errors: [{ messageId: 'nonDefaultTemperature' }],
          },
          // ❌ Temperatura alta (2.0) - qualquer valor != 1.0 gera warning
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                generationConfig: { temperature: 2.0 },
              });
            `,
            errors: [{ messageId: 'nonDefaultTemperature' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 2: STREAMING PARA RESPOSTAS LONGAS
   * Skill: "Streaming habilitado para respostas longas"
   * ========================================
   */
  describe('Streaming Best Practices', () => {
    describe('prefer-streaming-long-responses - UX Optimization', () => {
      ruleTester.run('prefer-streaming-long-responses', preferStreamingLongResponses, {
        valid: [
          // ✅ Resposta curta sem streaming
          `const result = await model.generateContent('What is 2+2?');`,
          // ✅ Já usando streaming para resposta longa
          `const result = await model.generateContentStream('Write a comprehensive guide about React hooks');`,
          // ✅ Chat com streaming
          `const result = await chat.sendMessageStream('Explain the history of JavaScript in detail');`,
          // ✅ Pergunta factual curta
          `const result = await model.generateContent('What is the capital of France?');`,
        ],
        invalid: [
          // ❌ Pedido de explicação detalhada sem streaming
          {
            code: `const result = await model.generateContent('Explain quantum computing in detail');`,
            errors: [{ messageId: 'useStreaming' }],
          },
          // ❌ Guia abrangente sem streaming
          {
            code: `const result = await model.generateContent('Write a comprehensive guide about TypeScript');`,
            errors: [{ messageId: 'useStreaming' }],
          },
          // ❌ Tutorial passo a passo sem streaming
          {
            code: `const result = await model.generateContent('Create a step by step tutorial for Docker');`,
            errors: [{ messageId: 'useStreaming' }],
          },
          // ❌ Chat sem streaming para resposta longa
          {
            code: `const result = await chat.sendMessage('Provide a detailed analysis of the code');`,
            errors: [{ messageId: 'streamingForChat' }],
          },
          // ❌ Análise extensa sem streaming
          {
            code: `const result = await model.generateContent('Write a thorough review of this project');`,
            errors: [{ messageId: 'useStreaming' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 3: MULTIMODAL - MIME TYPES E STORAGE
   * Skill: Suporta image/png, jpeg, webp, gif, heic
   * ========================================
   */
  describe('Multimodal Edge Cases', () => {
    describe('no-unsupported-mime-type - Media Type Validation', () => {
      ruleTester.run('no-unsupported-mime-type', noUnsupportedMimeType, {
        valid: [
          // ✅ Todos os tipos de imagem suportados
          `const part = { inlineData: { data: base64, mimeType: 'image/png' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'image/jpeg' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'image/webp' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'image/gif' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'image/heic' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'image/heif' } };`,
          // ✅ Tipos de vídeo suportados
          `const part = { fileData: { fileUri: uri, mimeType: 'video/mp4' } };`,
          `const part = { fileData: { fileUri: uri, mimeType: 'video/webm' } };`,
          `const part = { fileData: { fileUri: uri, mimeType: 'video/mov' } };`,
          `const part = { fileData: { fileUri: uri, mimeType: 'video/avi' } };`,
          // ✅ Tipos de áudio suportados
          `const part = { inlineData: { data: base64, mimeType: 'audio/mp3' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'audio/wav' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'audio/mpeg' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'audio/aac' } };`,
          // ✅ Documentos suportados
          `const part = { inlineData: { data: base64, mimeType: 'application/pdf' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'text/plain' } };`,
          `const part = { inlineData: { data: base64, mimeType: 'text/csv' } };`,
        ],
        invalid: [
          // ❌ BMP não suportado
          {
            code: `const part = { inlineData: { data: base64, mimeType: 'image/bmp' } };`,
            errors: [{ messageId: 'unsupportedMimeType' }],
          },
          // ❌ TIFF não suportado
          {
            code: `const part = { inlineData: { data: base64, mimeType: 'image/tiff' } };`,
            errors: [{ messageId: 'unsupportedMimeType' }],
          },
          // ❌ SVG não suportado (vetor)
          {
            code: `const part = { inlineData: { data: base64, mimeType: 'image/svg+xml' } };`,
            errors: [{ messageId: 'unsupportedMimeType' }],
          },
          // ❌ MKV não suportado
          {
            code: `const part = { fileData: { fileUri: uri, mimeType: 'video/mkv' } };`,
            errors: [{ messageId: 'unsupportedVideoType' }],
          },
          // ❌ Video/quicktime não suportado (use video/mov)
          {
            code: `const part = { fileData: { fileUri: uri, mimeType: 'video/quicktime' } };`,
            errors: [{ messageId: 'unsupportedVideoType' }],
          },
          // ❌ M4A não suportado diretamente
          {
            code: `const part = { inlineData: { data: base64, mimeType: 'audio/m4a' } };`,
            errors: [{ messageId: 'unsupportedAudioType' }],
          },
          // ❌ Word doc não suportado
          {
            code: `const part = { inlineData: { data: base64, mimeType: 'application/msword' } };`,
            errors: [{ messageId: 'unsupportedDocumentType' }],
          },
          // ❌ Excel não suportado
          {
            code: `const part = { inlineData: { data: base64, mimeType: 'application/vnd.ms-excel' } };`,
            errors: [{ messageId: 'unsupportedDocumentType' }],
          },
        ],
      });
    });

    describe('prefer-cloud-storage-large-files - Upload Optimization', () => {
      ruleTester.run('prefer-cloud-storage-large-files', preferCloudStorageLargeFiles, {
        valid: [
          // ✅ Imagem pequena com inlineData
          `const part = { inlineData: { data: smallBase64, mimeType: 'image/png' } };`,
          // ✅ Vídeo via Cloud Storage (correto)
          `const part = { fileData: { fileUri: 'gs://bucket/video.mp4', mimeType: 'video/mp4' } };`,
          // ✅ Áudio via Cloud Storage
          `const part = { fileData: { fileUri: 'gs://bucket/audio.mp3', mimeType: 'audio/mp3' } };`,
          // ✅ PDF via Cloud Storage
          `const part = { fileData: { fileUri: 'gs://bucket/doc.pdf', mimeType: 'application/pdf' } };`,
        ],
        invalid: [
          // ❌ Vídeo com inlineData (deve usar Cloud Storage)
          {
            code: `const part = { inlineData: { data: largeVideoBase64, mimeType: 'video/mp4' } };`,
            errors: [{ messageId: 'useCloudStorage' }],
          },
          // ❌ Áudio com inlineData (arquivos grandes)
          {
            code: `const part = { inlineData: { data: audioData, mimeType: 'audio/wav' } };`,
            errors: [{ messageId: 'useCloudStorage' }],
          },
          // Note: PDF doesn't trigger this rule - it only checks for video/* and audio/* MIME types.
          // For PDFs, use longBase64Detected which triggers on very long base64 strings (>100k chars).
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 4: FUNCTION CALLING EDGE CASES
   * Skill: functionDeclarations, description obrigatória
   * ========================================
   */
  describe('Function Calling Edge Cases', () => {
    describe('require-function-description - Quality Descriptions', () => {
      ruleTester.run('require-function-description', requireFunctionDescription, {
        valid: [
          // ✅ Descrição completa e informativa
          `
            const tools = [{
              functionDeclarations: [{
                name: 'getWeather',
                description: 'Retrieves current weather data including temperature, humidity, wind speed, and conditions for a specified city or coordinates.',
                parameters: {
                  type: 'object',
                  properties: {
                    city: { type: 'string', description: 'City name' },
                    units: { type: 'string', description: 'Temperature units: celsius or fahrenheit' },
                  },
                  required: ['city'],
                },
              }],
            }];
          `,
          // ✅ Múltiplas funções bem documentadas
          `
            const tools = [{
              functionDeclarations: [
                {
                  name: 'searchProducts',
                  description: 'Search the product catalog by name, category, price range, or availability status.',
                },
                {
                  name: 'getProductDetails',
                  description: 'Retrieve detailed information about a specific product including specifications, reviews, and pricing.',
                },
              ],
            }];
          `,
        ],
        invalid: [
          // ❌ Sem descrição
          {
            code: `
              const tools = [{
                functionDeclarations: [{
                  name: 'getWeather',
                  parameters: { type: 'object' },
                }],
              }];
            `,
            errors: [{ messageId: 'missingDescription' }],
          },
          // ❌ Descrição vazia
          {
            code: `
              const tools = [{
                functionDeclarations: [{
                  name: 'getWeather',
                  description: '',
                  parameters: { type: 'object' },
                }],
              }];
            `,
            errors: [{ messageId: 'missingDescription' }],
          },
          // ❌ Descrição muito curta (não informativa)
          {
            code: `
              const tools = [{
                functionDeclarations: [{
                  name: 'getWeather',
                  description: 'Get weather',
                  parameters: { type: 'object' },
                }],
              }];
            `,
            errors: [{ messageId: 'shortDescription' }],
          },
          // ❌ Descrição genérica
          {
            code: `
              const tools = [{
                functionDeclarations: [{
                  name: 'doSomething',
                  description: 'Does something',
                  parameters: { type: 'object' },
                }],
              }];
            `,
            errors: [{ messageId: 'shortDescription' }],
          },
        ],
      });
    });

    describe('no-unsupported-function-params - Valid Schema Only', () => {
      ruleTester.run('no-unsupported-function-params', noUnsupportedFunctionParams, {
        valid: [
          // ✅ Parâmetros válidos
          `
            const func = {
              name: 'search',
              description: 'Search items in the database with filters and pagination support.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query string' },
                  limit: { type: 'number', description: 'Maximum results to return' },
                  offset: { type: 'number', description: 'Number of results to skip' },
                },
                required: ['query'],
              },
            };
          `,
          // ✅ Enum válido
          `
            const func = {
              name: 'setStatus',
              description: 'Update the status of an item to active, inactive, or archived.',
              parameters: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['active', 'inactive', 'archived'] },
                },
              },
            };
          `,
        ],
        invalid: [
          // ❌ Usando default (não suportado)
          {
            code: `
              const func = {
                name: 'search',
                description: 'Search with default limit of 10 items per page.',
                parameters: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number', default: 10 },
                  },
                },
              };
            `,
            errors: [{ messageId: 'unsupportedParam' }],
          },
          // ❌ Usando examples (não suportado)
          {
            code: `
              const func = {
                name: 'search',
                description: 'Search for items using query keywords.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', examples: ['shoes', 'shirts', 'hats'] },
                  },
                },
              };
            `,
            errors: [{ messageId: 'unsupportedParam' }],
          },
          // ❌ Usando anyOf (não suportado)
          {
            code: `
              const func = {
                name: 'getVersion',
                description: 'Returns the API version.',
                parameters: {
                  type: 'object',
                  properties: {
                    value: { anyOf: [{ type: 'string' }, { type: 'number' }] },
                  },
                },
              };
            `,
            errors: [{ messageId: 'unsupportedParam' }],
          },
        ],
      });
    });

    describe('validate-code-execution-config', () => {
      ruleTester.run('validate-code-execution-config', validateCodeExecutionConfig, {
        valid: [
          // ✅ Code execution vazio (correto)
          `const tools = [{ codeExecution: {} }];`,
          // ✅ Com outras tools
          `
            const tools = [
              { codeExecution: {} },
              { functionDeclarations: [{ name: 'test', description: 'Test function' }] },
            ];
          `,
        ],
        invalid: [
          // ❌ Code execution com config (não suportado)
          {
            code: `const tools = [{ codeExecution: { timeout: 5000 } }];`,
            errors: [{ messageId: 'invalidCodeExecutionConfig' }],
          },
          // ❌ Code execution com language config
          {
            code: `const tools = [{ codeExecution: { language: 'python' } }];`,
            errors: [{ messageId: 'invalidCodeExecutionConfig' }],
          },
        ],
      });
    });

    describe('no-code-execution-creative-tasks', () => {
      ruleTester.run('no-code-execution-creative-tasks', noCodeExecutionCreativeTasks, {
        valid: [
          // ✅ Code execution para cálculos
          `
            const tools = [{ codeExecution: {} }];
            const result = await model.generateContent('Calculate the sum of these numbers');
          `,
          // ✅ Code execution para análise de dados
          `
            const tools = [{ codeExecution: {} }];
            const result = await model.generateContent('Analyze this data');
          `,
          // ✅ Sem code execution, pode ter creative tasks
          `
            const result = await model.generateContent('Write a poem about nature');
          `,
        ],
        invalid: [
          // ❌ Code execution para escrita criativa (poem)
          {
            code: `
              const tools = [{ codeExecution: {} }];
              const result = await model.generateContent('Write a poem about nature');
            `,
            errors: [{ messageId: 'noCodeExecForCreative' }],
          },
          // ❌ Code execution para storytelling (story)
          {
            code: `
              const tools = [{ codeExecution: {} }];
              const result = await model.generateContent('Tell me a story about a dragon');
            `,
            errors: [{ messageId: 'noCodeExecForCreative' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 5: GROUNDING (GOOGLE SEARCH)
   * Skill: "Google Search para dados em tempo real"
   * ========================================
   */
  describe('Grounding Compliance', () => {
    describe('require-grounding-compliance - Legal Requirements', () => {
      ruleTester.run('require-grounding-compliance', requireGroundingCompliance, {
        valid: [
          // ✅ Grounding com searchEntryPoint (obrigatório legalmente)
          `
            const tools = [{ googleSearch: {} }];
            const result = await model.generateContent({ contents, tools });
            const metadata = result.response.candidates[0].groundingMetadata;
            const widget = metadata.searchEntryPoint;
            renderSearchWidget(widget);
          `,
          // ✅ Verificação completa
          `
            const tools = [{ googleSearch: {} }];
            const result = await model.generateContent('Latest news about AI');
            if (result.response.candidates[0].groundingMetadata?.searchEntryPoint) {
              displaySearchSuggestions(result.response.candidates[0].groundingMetadata.searchEntryPoint);
            }
          `,
        ],
        invalid: [
          // ❌ Grounding sem renderizar searchEntryPoint
          {
            code: `
              const tools = [{ googleSearch: {} }];
              const result = await model.generateContent('Latest tech news');
              console.log(result.response.text());
            `,
            errors: [{ messageId: 'missingSearchEntryPoint' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 6: SCHEMA DESIGN BEST PRACTICES
   * ========================================
   */
  describe('Schema Design Edge Cases', () => {
    describe('no-schema-in-prompt - Avoid Duplication', () => {
      ruleTester.run('no-schema-in-prompt', noSchemaInPrompt, {
        valid: [
          // ✅ Schema separado do prompt
          `
            const model = getGenerativeModel(ai, {
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              },
            });
            const result = await model.generateContent('Analyze this review');
          `,
          // ✅ Sem schema, pode ter JSON no prompt
          `
            const result = await model.generateContent('Return JSON: { name: string, age: number }');
          `,
        ],
        invalid: [
          // ❌ Schema duplicado no prompt
          {
            code: `
              const model = getGenerativeModel(ai, {
                generationConfig: {
                  responseMimeType: 'application/json',
                  responseSchema: schema,
                },
              });
              const result = await model.generateContent('Return JSON with format: { name: string, score: number }');
            `,
            errors: [{ messageId: 'duplicateSchema' }],
          },
        ],
      });
    });

    describe('prefer-concise-property-names - Token Optimization', () => {
      ruleTester.run('prefer-concise-property-names', preferConcisePropertyNames, {
        valid: [
          // ✅ Nomes concisos
          `
            const schema = Schema.object({
              properties: {
                name: Schema.string(),
                email: Schema.string(),
                age: Schema.number(),
                active: Schema.boolean(),
              },
            });
          `,
          // ✅ CamelCase razoável
          `
            const schema = Schema.object({
              properties: {
                createdAt: Schema.string(),
                updatedBy: Schema.string(),
                isVerified: Schema.boolean(),
              },
            });
          `,
          // ✅ Nomes curtos (under 20 chars) não são reportados
          `
            const schema = Schema.object({
              properties: {
                email_address: Schema.string(),
              },
            });
          `,
        ],
        invalid: [
          // ❌ Nome muito longo (> 20 chars)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  user_email_address_for_notifications: Schema.string(),
                },
              });
            `,
            errors: [{ messageId: 'longPropertyName' }],
          },
          // ❌ Verbose pattern: user_email_address (matches verbose pattern)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  user_email_address: Schema.string(),
                },
              });
            `,
            errors: [{ messageId: 'verbosePropertyName' }],
          },
          // ❌ Verbose pattern: product_description_text
          {
            code: `
              const schema = Schema.object({
                properties: {
                  product_description_text: Schema.string(),
                },
              });
            `,
            errors: [{ messageId: 'verbosePropertyName' }],
          },
        ],
      });
    });

    describe('prefer-optional-properties - Correct API Usage', () => {
      ruleTester.run('prefer-optional-properties', preferOptionalProperties, {
        valid: [
          // ✅ Usando optionalProperties (correto)
          `
            const schema = Schema.object({
              properties: {
                name: Schema.string(),
                email: Schema.string(),
              },
              optionalProperties: ['email'],
            });
          `,
          // ✅ Todos obrigatórios
          `
            const schema = Schema.object({
              properties: {
                id: Schema.string(),
                name: Schema.string(),
              },
            });
          `,
        ],
        invalid: [
          // ❌ Usando nullable ao invés de optionalProperties
          {
            code: `
              const schema = Schema.object({
                properties: {
                  name: { type: 'string' },
                  nickname: { type: 'string', nullable: true },
                },
              });
            `,
            errors: [{ messageId: 'nullableNotOptional' }],
          },
        ],
      });
    });

    describe('validate-schema-structure', () => {
      ruleTester.run('validate-schema-structure', validateSchemaStructure, {
        valid: [
          // ✅ Estrutura correta
          `
            const schema = Schema.object({
              properties: {
                name: Schema.string(),
              },
            });
          `,
          // ✅ Com optionalProperties
          `
            const schema = Schema.object({
              properties: {
                name: Schema.string(),
                bio: Schema.string(),
              },
              optionalProperties: ['bio'],
            });
          `,
          // ✅ "required" is VALID in Firebase AI Logic schemas!
          `
            const schema = Schema.object({
              properties: {
                name: Schema.string(),
              },
              required: ['name'],
            });
          `,
          // ✅ Both "required" and "optionalProperties" is valid (default behavior)
          `
            const schema = Schema.object({
              properties: {
                name: Schema.string(),
                bio: Schema.string(),
              },
              required: ['name'],
              optionalProperties: ['bio'],
            });
          `,
        ],
        invalid: [
          // Note: The rule is lenient by default.
          // "required" is a valid property in Firebase AI Logic schemas.
          // To enable warnings, set { allowBothRequiredAndOptional: false }.
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 7: IMPORTS DEPRECADOS
   * ========================================
   */
  describe('Deprecated Import Edge Cases', () => {
    describe('no-deprecated-firebase-vertexai', () => {
      ruleTester.run('no-deprecated-firebase-vertexai', noDeprecatedFirebaseVertexai, {
        valid: [
          // ✅ Import correto de firebase/ai
          `import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';`,
        ],
        invalid: [
          // ❌ Import antigo de vertexai-preview
          {
            code: `import { getVertexAI } from 'firebase/vertexai-preview';`,
            errors: [{ messageId: 'deprecatedImport' }],
            output: `import { getAI } from 'firebase/ai';`,
          },
          // ❌ getGenerativeModel do preview
          {
            code: `import { getGenerativeModel } from 'firebase/vertexai-preview';`,
            errors: [{ messageId: 'deprecatedImport' }],
            output: `import { getGenerativeModel } from 'firebase/ai';`,
          },
          // ❌ Múltiplos imports do preview (getVertexAI → getAI, outros mantidos)
          {
            code: `import { getVertexAI, getGenerativeModel, Schema } from 'firebase/vertexai-preview';`,
            errors: [{ messageId: 'deprecatedImport' }],
            output: `import { getAI, getGenerativeModel, Schema } from 'firebase/ai';`,
          },
        ],
      });
    });

    describe('no-vertex-ai-direct-import', () => {
      ruleTester.run('no-vertex-ai-direct-import', noVertexAiDirectImport, {
        valid: [
          // ✅ Usar firebase/ai
          `import { getAI, VertexAIBackend } from 'firebase/ai';`,
        ],
        invalid: [
          // ❌ Import direto do Google Cloud
          {
            code: `import { VertexAI } from '@google-cloud/vertexai';`,
            errors: [{ messageId: 'wrongImport' }],
            output: `import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';`,
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 8: THOUGHT SIGNATURE
   * ========================================
   */
  describe('Thought Signature', () => {
    describe('require-thought-signature', () => {
      ruleTester.run('require-thought-signature', requireThoughtSignature, {
        valid: [
          // ✅ Configuração padrão sem assinatura
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
            });
          `,
        ],
        invalid: [
          // ❌ Assinatura de pensamento desabilitada quando deveria estar habilitada
          // (Este teste depende da implementação específica da regra)
        ],
      });
    });
  });
});
