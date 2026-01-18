import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

// Import rules
import requireBackend from '../../src/rules/require-backend.js';
import requireAiBeforeModel from '../../src/rules/require-ai-before-model.js';
import noGoogleGenaiImport from '../../src/rules/no-google-genai-import.js';
import noStreamingWithSchema from '../../src/rules/no-streaming-with-schema.js';
import noUnsupportedSchemaFeatures from '../../src/rules/no-unsupported-schema-features.js';
import noUnlimitedChatHistory from '../../src/rules/no-unlimited-chat-history.js';
import requireErrorHandling from '../../src/rules/require-error-handling.js';
import requireAppCheckProduction from '../../src/rules/require-app-check-production.js';
import noSensitiveSystemInstruction from '../../src/rules/no-sensitive-system-instruction.js';
import preferBatchRequests from '../../src/rules/prefer-batch-requests.js';
import noVerbosePrompts from '../../src/rules/no-verbose-prompts.js';
import noDeprecatedModels from '../../src/rules/no-deprecated-models.js';
import validateResponseMimeType from '../../src/rules/validate-response-mime-type.js';
import requireJsonValidation from '../../src/rules/require-json-validation.js';

const ruleTester = new RuleTester();

/**
 * Testes abrangentes baseados na skill Firebase AI Logic
 * Cobrem cenários realistas de configuração correta e incorreta
 */
describe('Comprehensive Scenarios - Firebase AI Logic', () => {
  /**
   * ========================================
   * SEÇÃO 1: INICIALIZAÇÃO COMPLETA
   * Testa configurações como mostrado na documentação
   * ========================================
   */
  describe('Complete Initialization Scenarios', () => {
    describe('require-backend - Real World Cases', () => {
      ruleTester.run('require-backend', requireBackend, {
        valid: [
          // ✅ Configuração correta como na skill
          `
            import { initializeApp } from 'firebase/app';
            import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

            const firebaseConfig = {
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            };

            const app = initializeApp(firebaseConfig);
            const ai = getAI(app, { backend: new GoogleAIBackend() });
          `,
          // ✅ Com VertexAI Backend e location
          `
            const ai = getAI(app, {
              backend: new VertexAIBackend({ location: 'us-central1' })
            });
          `,
          // ✅ Backend dinâmico baseado em ambiente
          `
            const backend = process.env.USE_VERTEX
              ? new VertexAIBackend()
              : new GoogleAIBackend();
            const ai = getAI(app, { backend });
          `,
          // ✅ Backend em variável separada
          `
            const myBackend = new GoogleAIBackend();
            const ai = getAI(app, { backend: myBackend });
          `,
        ],
        invalid: [
          // ❌ Erro comum: propriedade errada (tem config mas não tem backend)
          {
            code: `const ai = getAI(app, { provider: new GoogleAIBackend() });`,
            errors: [
              {
                messageId: 'missingBackendInConfig',
                suggestions: [
                  { messageId: 'addGoogleAIBackend', output: `const ai = getAI(app, { backend: new GoogleAIBackend(), provider: new GoogleAIBackend() });` },
                  { messageId: 'addVertexAIBackend', output: `const ai = getAI(app, { backend: new VertexAIBackend(), provider: new GoogleAIBackend() });` },
                ],
              },
            ],
          },
          // ❌ Erro comum: outras opções sem backend
          {
            code: `const ai = getAI(app, { debug: true, timeout: 5000 });`,
            errors: [
              {
                messageId: 'missingBackendInConfig',
                suggestions: [
                  { messageId: 'addGoogleAIBackend', output: `const ai = getAI(app, { backend: new GoogleAIBackend(), debug: true, timeout: 5000 });` },
                  { messageId: 'addVertexAIBackend', output: `const ai = getAI(app, { backend: new VertexAIBackend(), debug: true, timeout: 5000 });` },
                ],
              },
            ],
          },
        ],
      });
    });

    describe('require-ai-before-model - Real World Cases', () => {
      ruleTester.run('require-ai-before-model', requireAiBeforeModel, {
        valid: [
          // ✅ Fluxo completo correto
          `
            const ai = getAI(app, { backend: new GoogleAIBackend() });
            const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });
          `,
          // ✅ Com configurações extras
          `
            const model = getGenerativeModel(aiInstance, {
              model: 'gemini-3-flash-preview',
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              },
            });
          `,
          // ✅ Com system instruction
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              systemInstruction: 'Você é um assistente amigável.',
            });
          `,
        ],
        invalid: [
          // ❌ Erro comum: só passar config sem ai
          {
            code: `const model = getGenerativeModel({ model: 'gemini-3-flash-preview' });`,
            errors: [{ messageId: 'wrongFirstArg' }],
          },
          // ❌ Erro comum: sem argumentos
          {
            code: `const model = getGenerativeModel();`,
            errors: [{ messageId: 'missingGetAI' }],
          },
          // ❌ Erro comum: passar app ao invés de ai
          {
            code: `const model = getGenerativeModel({ apiKey: 'key' }, { model: 'gemini-3-flash-preview' });`,
            errors: [{ messageId: 'wrongFirstArg' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 2: STREAMING COM SCHEMA (LIMITAÇÃO CONHECIDA)
   * A skill documenta: "STREAMING COM JSON não funciona junto"
   * ========================================
   */
  describe('Streaming + Schema Limitation', () => {
    describe('no-streaming-with-schema - Critical Limitation', () => {
      ruleTester.run('no-streaming-with-schema', noStreamingWithSchema, {
        valid: [
          // ✅ Streaming SEM schema (correto)
          `
            const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });
            const result = await model.generateContentStream('Explique quantum computing');
            for await (const chunk of result.stream) {
              console.log(chunk.text());
            }
          `,
          // ✅ Schema SEM streaming (correto)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: reviewSchema,
              },
            });
            const result = await model.generateContent('Analise este texto');
          `,
          // ✅ Chat streaming sem schema
          `
            const chat = model.startChat();
            const result = await chat.sendMessageStream(userMessage);
          `,
        ],
        invalid: [
          // ❌ Erro crítico: streaming + responseSchema (como documentado na skill)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                generationConfig: {
                  responseMimeType: 'application/json',
                  responseSchema: Schema.object({
                    properties: {
                      sentiment: Schema.string(),
                      rating: Schema.number(),
                    },
                  }),
                },
              });
              const result = await model.generateContentStream('Analise');
            `,
            errors: [{ messageId: 'streamingWithSchema' }],
          },
          // ❌ Variante: schema em variável
          {
            code: `
              const model = getGenerativeModel(ai, {
                generationConfig: { responseSchema: mySchema },
              });
              const result = await model.generateContentStream('Test');
            `,
            errors: [{ messageId: 'streamingWithSchema' }],
          },
          // Note: Chat streaming detection (sendMessageStream) requires tracking
          // chat instances back to their model. The rule currently doesn't report
          // this case as it needs more sophisticated flow analysis.
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 3: SCHEMA JSON - LIMITAÇÕES DA SKILL
   * Documenta features que NÃO funcionam
   * ========================================
   */
  describe('Schema JSON Limitations', () => {
    describe('no-unsupported-schema-features - Per Skill Documentation', () => {
      ruleTester.run('no-unsupported-schema-features', noUnsupportedSchemaFeatures, {
        valid: [
          // ✅ Schema válido como na skill
          `
            const reviewSchema = Schema.object({
              properties: {
                sentiment: Schema.string(),
                rating: Schema.number(),
                categories: Schema.array({
                  items: Schema.string(),
                }),
                summary: Schema.string(),
              },
              optionalProperties: ['summary'],
            });
          `,
          // ✅ Nested objects (funciona)
          `
            const schema = Schema.object({
              properties: {
                user: Schema.object({
                  properties: {
                    name: Schema.string(),
                    email: Schema.string(),
                  },
                }),
              },
            });
          `,
          // ✅ Enum implícito (funciona)
          `
            const schema = Schema.object({
              properties: {
                status: Schema.string(),
              },
            });
          `,
        ],
        invalid: [
          // ❌ minLength (não suportado - documentado na skill)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  name: { type: 'string', minLength: 5 },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ maxLength (não suportado)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  description: { type: 'string', maxLength: 100 },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ pattern (não suportado)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  email: { type: 'string', pattern: '^[a-z]+@[a-z]+\\.[a-z]+$' },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ oneOf / Union types (não suportado)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ anyOf (não suportado)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  data: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ allOf (não suportado)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  user: { allOf: [{ type: 'object' }, { required: ['id'] }] },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ $ref references (não suportado)
          {
            code: `
              const schema = Schema.object({
                properties: {
                  address: { $ref: '#/definitions/Address' },
                },
              });
            `,
            errors: [{ messageId: 'unsupportedFeature' }],
          },
          // ❌ if/then (não suportado) - detecta if, const, then = 3 erros
          {
            code: `
              const schema = Schema.object({
                properties: {
                  type: { type: 'string' },
                  data: {
                    if: { properties: { type: { const: 'premium' } } },
                    then: { required: ['features'] },
                  },
                },
              });
            `,
            errors: [
              { messageId: 'unsupportedFeature' }, // if
              { messageId: 'unsupportedFeature' }, // const
              { messageId: 'unsupportedFeature' }, // then
            ],
          },
        ],
      });
    });

    describe('validate-response-mime-type', () => {
      ruleTester.run('validate-response-mime-type', validateResponseMimeType, {
        valid: [
          // ✅ application/json (suportado)
          `
            const model = getGenerativeModel(ai, {
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              },
            });
          `,
          // ✅ text/x.enum (suportado)
          `
            const model = getGenerativeModel(ai, {
              generationConfig: { responseMimeType: 'text/x.enum' },
            });
          `,
        ],
        invalid: [
          // ❌ text/plain (não faz sentido com schema)
          {
            code: `
              const model = getGenerativeModel(ai, {
                generationConfig: { responseMimeType: 'text/plain' },
              });
            `,
            errors: [{ messageId: 'invalidResponseMimeType' }],
          },
          // ❌ XML não suportado
          {
            code: `
              const model = getGenerativeModel(ai, {
                generationConfig: { responseMimeType: 'application/xml' },
              });
            `,
            errors: [{ messageId: 'invalidResponseMimeType' }],
          },
          // ❌ HTML não suportado
          {
            code: `
              const model = getGenerativeModel(ai, {
                generationConfig: { responseMimeType: 'text/html' },
              });
            `,
            errors: [{ messageId: 'invalidResponseMimeType' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 4: CHAT MULTI-TURNO
   * Skill: "Limitar histórico de chat (max ~20 mensagens)"
   * ========================================
   */
  describe('Chat Multi-turn Scenarios', () => {
    describe('no-unlimited-chat-history - Cost Optimization', () => {
      ruleTester.run('no-unlimited-chat-history', noUnlimitedChatHistory, {
        valid: [
          // ✅ Slice diretamente no history (recomendado)
          `
            const chat = model.startChat({
              history: messages.slice(-20),
            });
          `,
          // ✅ Array literal pequeno
          `
            const chat = model.startChat({
              history: [
                { role: 'user', parts: [{ text: 'Oi!' }] },
                { role: 'model', parts: [{ text: 'Oi! Como posso ajudar?' }] },
              ],
            });
          `,
          // ✅ Sem histórico
          `const chat = model.startChat();`,
          // ✅ Histórico vazio
          `const chat = model.startChat({ history: [] });`,
          // ✅ Slice com limite menor
          `
            const chat = model.startChat({
              history: chatHistory.slice(-10),
            });
          `,
        ],
        invalid: [
          // ❌ Variável sem slice (pode crescer indefinidamente)
          {
            code: `
              const chat = model.startChat({
                history: conversationHistory,
              });
            `,
            errors: [{ messageId: 'noSliceOnHistory' }],
          },
          // ❌ Map sem slice
          {
            code: `
              const chat = model.startChat({
                history: messages.map(m => ({
                  role: m.role,
                  parts: [{ text: m.text }],
                })),
              });
            `,
            errors: [{ messageId: 'noSliceOnHistory' }],
          },
          // ❌ Filter sem slice
          {
            code: `
              const chat = model.startChat({
                history: allMessages.filter(m => m.role !== 'system'),
              });
            `,
            errors: [{ messageId: 'noSliceOnHistory' }],
          },
          // ❌ Array literal muito grande
          {
            code: `
              const chat = model.startChat({
                history: [
                  ${Array(30)
                    .fill("{ role: 'user', parts: [{ text: 'msg' }] }")
                    .join(',\n')}
                ],
              });
            `,
            errors: [{ messageId: 'largeHistory' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 5: ERROR HANDLING
   * Skill: "Exponential Backoff para Rate Limits"
   * ========================================
   */
  describe('Error Handling Scenarios', () => {
    describe('require-error-handling - Production Ready', () => {
      ruleTester.run('require-error-handling', requireErrorHandling, {
        valid: [
          // ✅ Try-catch completo (como na skill)
          `
            async function safeGenerateContent(prompt) {
              try {
                return await model.generateContent(prompt);
              } catch (error) {
                if (error.status === 400) {
                  console.error('Schema inválido:', error.message);
                } else if (error.status === 429) {
                  console.error('Rate limit excedido');
                } else if (error.status === 500) {
                  console.error('Erro no servidor');
                }
                throw error;
              }
            }
          `,
          // ✅ Retry com backoff
          `
            try {
              const result = await retryWithBackoff(() =>
                model.generateContent('prompt')
              );
            } catch (error) {
              handleError(error);
            }
          `,
          // ✅ Streaming com try-catch
          `
            try {
              const result = await model.generateContentStream('Hello');
              for await (const chunk of result.stream) {
                console.log(chunk.text());
              }
            } catch (error) {
              console.error('Stream error:', error);
            }
          `,
          // ✅ Chat com error handling
          `
            try {
              const chat = model.startChat();
              const response = await chat.sendMessage('Hi');
            } catch (e) {
              logError(e);
            }
          `,
          // ✅ Promise .catch()
          `
            model.generateContent('Hello')
              .then(result => processResult(result))
              .catch(error => handleError(error));
          `,
        ],
        invalid: [
          // ❌ generateContent sem try-catch
          {
            code: `
              async function analyze(text) {
                const result = await model.generateContent(text);
                return result.response.text();
              }
            `,
            errors: [{ messageId: 'awaitWithoutTryCatch' }],
          },
          // ❌ Streaming sem error handling
          {
            code: `
              const result = await model.generateContentStream('Explain');
            `,
            errors: [{ messageId: 'awaitWithoutTryCatch' }],
          },
          // ❌ Chat sem error handling
          {
            code: `
              const chat = model.startChat();
              const response = await chat.sendMessage(userInput);
            `,
            errors: [{ messageId: 'awaitWithoutTryCatch' }],
          },
          // ❌ sendMessageStream sem error handling
          {
            code: `
              const result = await chat.sendMessageStream('Message');
            `,
            errors: [{ messageId: 'awaitWithoutTryCatch' }],
          },
        ],
      });
    });

    describe('require-json-validation - Safe Parsing', () => {
      ruleTester.run('require-json-validation', requireJsonValidation, {
        valid: [
          // ✅ JSON.parse com try-catch
          `
            try {
              const data = JSON.parse(response.text());
              return data;
            } catch (e) {
              console.error('Invalid JSON');
              return null;
            }
          `,
          // ✅ Usando Zod para validação (como na skill)
          `
            const ReviewValidator = z.object({
              sentiment: z.enum(['positivo', 'negativo', 'neutro']),
              rating: z.number().min(1).max(5),
            });
            const data = ReviewValidator.parse(JSON.parse(response.text()));
          `,
          // ✅ Safe JSON utility
          `
            const data = safeJsonParse(result.response.text());
          `,
        ],
        invalid: [
          // ❌ JSON.parse direto em resposta AI sem validação
          {
            code: `
              const result = await model.generateContent('Return JSON');
              const data = JSON.parse(result.response.text());
              console.log(data.name);
            `,
            errors: [{ messageId: 'unvalidatedJsonParse' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 6: SEGURANÇA
   * Skill: "App Check habilitado", "Sem dados sensíveis"
   * ========================================
   */
  describe('Security Scenarios', () => {
    describe('require-app-check-production - API Protection', () => {
      ruleTester.run('require-app-check-production', requireAppCheckProduction, {
        valid: [
          // ✅ App Check com reCAPTCHA (como na skill)
          `
            import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
            import { getAI, GoogleAIBackend } from 'firebase/ai';

            const appCheck = initializeAppCheck(app, {
              provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
              isTokenAutoRefreshEnabled: true,
            });
            const ai = getAI(app, { backend: new GoogleAIBackend() });
          `,
          // ✅ App Check antes de AI
          `
            initializeAppCheck(app, { provider: recaptchaProvider });
            const ai = getAI(app, { backend: new GoogleAIBackend() });
            const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });
          `,
          // Note: The rule is designed to be lenient - importing from firebase/ai
          // is considered valid because App Check is likely configured in a module wrapper.
          // This avoids false positives in modern architectures.
        ],
        invalid: [
          // Note: Invalid cases would require non-standard import patterns.
          // The rule assumes that if you import from a module with '/ai' in the path,
          // App Check is likely configured there. This is intentional.
        ],
      });
    });

    describe('no-sensitive-system-instruction - Data Protection', () => {
      ruleTester.run('no-sensitive-system-instruction', noSensitiveSystemInstruction, {
        valid: [
          // ✅ System instruction seguro (como na skill)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              systemInstruction: \`Você é um assistente amigável especializado em pets.
                - Responda em português
                - Seja educado e paciente
                - Sempre sugira consulta com veterinário para problemas sérios
                - Não dê medicamentos sem prescrição\`,
            });
          `,
          // ✅ Instruções de comportamento
          `
            const model = getGenerativeModel(ai, {
              systemInstruction: 'Always respond in Portuguese. Be helpful and concise.',
            });
          `,
          // ✅ Instruções de formato
          `
            const model = getGenerativeModel(ai, {
              systemInstruction: 'Return responses in JSON format with keys: answer, confidence.',
            });
          `,
        ],
        invalid: [
          // ❌ Senha em system instruction
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Admin password: superSecret123!',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
          // ❌ API key em system instruction
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Use api_key: sk-proj-1234567890abcdef',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
          // ❌ AWS credentials
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'AWS credentials: AKIAIOSFODNN7EXAMPLE / secret123',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
          // ❌ Database connection string - matches both connection string AND credentials in URL
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Database: mongodb://admin:pass123@cluster.mongodb.net/prod',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }, { messageId: 'sensitiveData' }],
          },
          // ❌ Bearer token / JWT
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Auth header: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
          // ❌ Credit card
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Test card: 4532015112830366',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
          // ❌ SSN
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Example SSN for testing: 123-45-6789',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 7: OTIMIZAÇÃO DE CUSTOS
   * Skill: "Batch Processing", "Prompts otimizados"
   * ========================================
   */
  describe('Cost Optimization Scenarios', () => {
    describe('prefer-batch-requests - Reduce API Calls', () => {
      ruleTester.run('prefer-batch-requests', preferBatchRequests, {
        valid: [
          // ✅ Batch em uma requisição (como na skill)
          `
            const prompt = \`Analise estes reviews:
              \${reviews.map((r, i) => \`\${i + 1}. "\${r}"\`).join('\\n')}
              Retorne JSON com análises.\`;
            const result = await model.generateContent(prompt);
          `,
          // ✅ Single request
          `
            const result = await model.generateContent('Analyze this text');
          `,
          // ✅ Items concatenados
          `
            const prompt = \`Process these items: \${items.join(', ')}\`;
            const result = await model.generateContent(prompt);
          `,
        ],
        invalid: [
          // ❌ for...of loop com AI calls (como documentado na skill)
          {
            code: `
              for (const review of reviews) {
                const result = await model.generateContent(\`Analise: "\${review}"\`);
                results.push(result);
              }
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
          // ❌ forEach async
          {
            code: `
              reviews.forEach(async (review) => {
                await model.generateContent(\`Process: \${review}\`);
              });
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
          // ❌ map com AI calls
          {
            code: `
              const results = items.map(async (item) => {
                return await model.generateContent(\`Analyze: \${item}\`);
              });
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
          // ❌ Promise.all com map de AI calls
          {
            code: `
              const results = await Promise.all(
                reviews.map(review => model.generateContent(\`Rate: \${review}\`))
              );
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
          // ❌ for loop clássico
          {
            code: `
              for (let i = 0; i < items.length; i++) {
                const result = await model.generateContent(items[i]);
              }
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
        ],
      });
    });

    describe('no-verbose-prompts - Token Optimization', () => {
      ruleTester.run('no-verbose-prompts', noVerbosePrompts, {
        valid: [
          // ✅ Prompt conciso (como na skill)
          `const result = await model.generateContent(\`Analise o sentimento: "\${text}"\`);`,
          // ✅ Direto ao ponto
          `const result = await model.generateContent('Summarize: ' + text);`,
          // ✅ Instrução clara
          `const result = await model.generateContent('Extract key points from this article');`,
        ],
        invalid: [
          // ❌ Verbose (como na skill: "BAD - 150+ tokens")
          {
            code: `
              const result = await model.generateContent(
                'I would like you to please carefully analyze the following text'
              );
            `,
            errors: [{ messageId: 'redundantPhrases' }],
          },
          // ❌ Muito educado (desperdiça tokens)
          {
            code: `
              const result = await model.generateContent(
                'Could you please help me with analyzing this data?'
              );
            `,
            errors: [{ messageId: 'redundantPhrases' }],
          },
          // ❌ Redundante
          {
            code: `
              const result = await model.generateContent(
                'Please provide me with a detailed and comprehensive analysis'
              );
            `,
            errors: [{ messageId: 'redundantPhrases' }],
          },
          // ❌ "be as comprehensive as possible" (frase exata do array)
          {
            code: `
              const result = await model.generateContent(
                'Please be as comprehensive as possible in your response'
              );
            `,
            errors: [{ messageId: 'redundantPhrases' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 8: IMPORTS CORRETOS
   * Skill: "Não instale @google/generative-ai"
   * ========================================
   */
  describe('Import Validation', () => {
    describe('no-google-genai-import - Use Firebase Instead', () => {
      ruleTester.run('no-google-genai-import', noGoogleGenaiImport, {
        valid: [
          // ✅ Import correto do firebase/ai
          `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
          // ✅ Import com Schema
          `import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';`,
          // ✅ Outros imports Firebase são ok
          `import { initializeApp } from 'firebase/app';`,
          `import { getAuth, signInWithPopup } from 'firebase/auth';`,
          `import { getFirestore, collection, doc } from 'firebase/firestore';`,
        ],
        invalid: [
          // ❌ Import errado (como documentado na skill)
          {
            code: `import { GoogleGenerativeAI } from '@google/generative-ai';`,
            errors: [{ messageId: 'wrongImport' }],
            output: `import { getAI, GoogleAIBackend } from 'firebase/ai';`,
          },
          // ❌ Múltiplos imports do pacote errado
          {
            code: `import { GenerativeModel, ChatSession } from '@google/generative-ai';`,
            errors: [{ messageId: 'wrongImport' }],
            output: `import { getGenerativeModel } from 'firebase/ai';`,
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 9: MODELOS ATUALIZADOS
   * Skill recomenda: gemini-3-flash-preview
   * ========================================
   */
  describe('Model Version Validation', () => {
    describe('no-deprecated-models - Use Latest', () => {
      ruleTester.run('no-deprecated-models', noDeprecatedModels, {
        valid: [
          // ✅ Modelo recomendado pela skill
          `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
          // ✅ Gemini 3 Pro
          `const model = getGenerativeModel(ai, { model: 'gemini-3-pro-preview' });`,
          // ✅ Modelo dinâmico (não pode validar)
          `const model = getGenerativeModel(ai, { model: getModelFromConfig() });`,
          // ✅ Variável de ambiente
          `const model = getGenerativeModel(ai, { model: process.env.GEMINI_MODEL });`,
        ],
        invalid: [
          // ❌ Gemini 1.x (deprecated)
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
            code: `const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash' });`,
            errors: [{ messageId: 'deprecatedModel' }],
            output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
          },
          {
            code: `const model = getGenerativeModel(ai, { model: 'gemini-1.5-pro' });`,
            errors: [{ messageId: 'deprecatedModel' }],
            output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
          },
          // ❌ Gemini 2.0-flash (deprecated)
          {
            code: `const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });`,
            errors: [{ messageId: 'deprecatedModel' }],
            output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
          },
          // Note: gemini-2.5-* are NOT deprecated - they are current valid models!
        ],
      });
    });
  });
});
