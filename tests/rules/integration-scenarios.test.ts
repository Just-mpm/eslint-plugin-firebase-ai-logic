import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

// Import rules para cenários de integração
import requireBackend from '../../src/rules/require-backend.js';
import requireAiBeforeModel from '../../src/rules/require-ai-before-model.js';
import noStreamingWithSchema from '../../src/rules/no-streaming-with-schema.js';
import noUnlimitedChatHistory from '../../src/rules/no-unlimited-chat-history.js';
import requireErrorHandling from '../../src/rules/require-error-handling.js';
import noDeprecatedModels from '../../src/rules/no-deprecated-models.js';
import preferBatchRequests from '../../src/rules/prefer-batch-requests.js';
import noSensitiveSystemInstruction from '../../src/rules/no-sensitive-system-instruction.js';
import noThinkingSimpleTasks from '../../src/rules/no-thinking-simple-tasks.js';
import validateMultimodalConfig from '../../src/rules/validate-multimodal-config.js';
import requireFunctionResponseHandling from '../../src/rules/require-function-response-handling.js';
import requireGoogleAIBackendForGrounding from '../../src/rules/require-google-ai-backend-for-grounding.js';
import noVertexaiOnlyImport from '../../src/rules/no-vertexai-only-import.js';

const ruleTester = new RuleTester();

/**
 * Testes de Integração - Cenários complexos com múltiplas configurações
 * Simula uso real do Firebase AI Logic em produção
 */
describe('Integration Scenarios - Production-Like Code', () => {
  /**
   * ========================================
   * SEÇÃO 1: SETUP COMPLETO DE PRODUÇÃO
   * Como uma aplicação real seria configurada
   * ========================================
   */
  describe('Production Setup Scenarios', () => {
    describe('Backend Configuration Patterns', () => {
      ruleTester.run('require-backend', requireBackend, {
        valid: [
          // ✅ Setup completo com App Check e AI
          `
            // firebase.ts - Configuração de produção
            import { initializeApp } from 'firebase/app';
            import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
            import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

            const firebaseConfig = {
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            };

            export const app = initializeApp(firebaseConfig);

            // App Check para proteção
            if (typeof window !== 'undefined') {
              initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_KEY),
                isTokenAutoRefreshEnabled: true,
              });
            }

            // AI com backend explícito
            export const ai = getAI(app, { backend: new GoogleAIBackend() });
          `,
          // ✅ Factory pattern para diferentes backends
          `
            function createAI(useVertex = false) {
              const backend = useVertex
                ? new VertexAIBackend({ location: 'us-central1' })
                : new GoogleAIBackend();

              return getAI(app, { backend });
            }

            const ai = createAI(process.env.USE_VERTEX === 'true');
          `,
          // ✅ Configuração condicional por ambiente
          `
            const backendConfig = process.env.NODE_ENV === 'production'
              ? { backend: new VertexAIBackend({ location: 'us-central1' }) }
              : { backend: new GoogleAIBackend() };

            const ai = getAI(app, backendConfig);
          `,
        ],
        invalid: [
          // Note: getAI(app) without second argument is VALID - uses GoogleAIBackend by default.
          // The rule only reports when config object exists but doesn't have 'backend' property.

          // ❌ Config com propriedades mas sem backend
          {
            code: `
              export const ai = getAI(firebaseApp, { debug: true });
            `,
            errors: [
              {
                messageId: 'missingBackendInConfig',
                suggestions: [
                  { messageId: 'addGoogleAIBackend', output: `\n              export const ai = getAI(firebaseApp, { backend: new GoogleAIBackend(), debug: true });\n            ` },
                  { messageId: 'addVertexAIBackend', output: `\n              export const ai = getAI(firebaseApp, { backend: new VertexAIBackend(), debug: true });\n            ` },
                ],
              },
            ],
          },
        ],
      });
    });

    describe('Model Initialization Patterns', () => {
      ruleTester.run('require-ai-before-model', requireAiBeforeModel, {
        valid: [
          // ✅ Service class com AI injetado
          `
            class AIService {
              private model;

              constructor(ai) {
                this.model = getGenerativeModel(ai, {
                  model: 'gemini-3-flash-preview',
                  systemInstruction: 'You are a helpful assistant.',
                });
              }

              async generateResponse(prompt) {
                return this.model.generateContent(prompt);
              }
            }
          `,
          // ✅ Hook React com AI
          `
            function useAIModel(ai, modelConfig) {
              const model = useMemo(() => {
                return getGenerativeModel(ai, {
                  model: 'gemini-3-flash-preview',
                  ...modelConfig,
                });
              }, [ai, modelConfig]);

              return model;
            }
          `,
          // ✅ Factory function
          `
            const createModel = (ai, options = {}) => {
              return getGenerativeModel(ai, {
                model: options.model || 'gemini-3-flash-preview',
                systemInstruction: options.systemInstruction,
                generationConfig: options.generationConfig,
              });
            };

            const chatModel = createModel(aiInstance, { systemInstruction: 'Be helpful' });
          `,
        ],
        invalid: [
          // ❌ Esqueceu de passar ai
          {
            code: `
              class ChatService {
                constructor() {
                  this.model = getGenerativeModel({ model: 'gemini-3-flash-preview' });
                }
              }
            `,
            errors: [{ messageId: 'wrongFirstArg' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 2: PADRÕES DE CHAT EM PRODUÇÃO
   * Implementações reais de chat
   * ========================================
   */
  describe('Chat Implementation Patterns', () => {
    describe('no-unlimited-chat-history - Memory Management', () => {
      ruleTester.run('no-unlimited-chat-history', noUnlimitedChatHistory, {
        valid: [
          // ✅ Slice diretamente
          `const chat = model.startChat({ history: messages.slice(-20) });`,
          // ✅ Array literal pequeno
          `const chat = model.startChat({ history: [{ role: 'user', parts: [{ text: 'Hi' }] }] });`,
          // ✅ Sem histórico
          `const chat = model.startChat();`,
          // Note: The rule does NOT track variable assignments back to their origin.
          // Even if `recentMessages = messages.slice(-15)`, using `recentMessages` directly
          // in `history: recentMessages` will trigger the warning because the rule sees an Identifier.
        ],
        invalid: [
          // ❌ Variável sem slice
          {
            code: `const chat = model.startChat({ history: fullHistory });`,
            errors: [{ messageId: 'noSliceOnHistory' }],
          },
          // ❌ Map sem slice
          {
            code: `const chat = model.startChat({ history: messages.map(m => ({ role: m.role })) });`,
            errors: [{ messageId: 'noSliceOnHistory' }],
          },
        ],
      });
    });

    describe('require-error-handling - Robust Chat', () => {
      ruleTester.run('require-error-handling', requireErrorHandling, {
        valid: [
          // ✅ Chat com error handling completo
          `
            async function sendChatMessage(chat, message) {
              try {
                const result = await chat.sendMessageStream(message);
                let fullResponse = '';

                for await (const chunk of result.stream) {
                  fullResponse += chunk.text();
                  updateUI(fullResponse);
                }

                return fullResponse;
              } catch (error) {
                if (error.status === 429) {
                  await delay(2000);
                  return sendChatMessage(chat, message);
                }
                throw error;
              }
            }
          `,
          // ✅ Hook com error boundary
          `
            async function useChat() {
              const sendMessage = async (text) => {
                try {
                  const response = await chat.sendMessage(text);
                  return response.response.text();
                } catch (error) {
                  handleChatError(error);
                  return null;
                }
              };

              return { sendMessage };
            }
          `,
        ],
        invalid: [
          // ❌ Streaming sem error handling
          {
            code: `
              async function streamResponse(chat, message) {
                const result = await chat.sendMessageStream(message);
                for await (const chunk of result.stream) {
                  console.log(chunk.text());
                }
              }
            `,
            errors: [{ messageId: 'awaitWithoutTryCatch' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 3: STRUCTURED OUTPUT EM PRODUÇÃO
   * JSON Schema com validação
   * ========================================
   */
  describe('Structured Output Patterns', () => {
    describe('no-streaming-with-schema - Critical Limitation', () => {
      ruleTester.run('no-streaming-with-schema', noStreamingWithSchema, {
        valid: [
          // ✅ Service de análise com schema (sem streaming)
          `
            class AnalysisService {
              private model;

              constructor(ai) {
                this.model = getGenerativeModel(ai, {
                  model: 'gemini-3-flash-preview',
                  generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: Schema.object({
                      properties: {
                        sentiment: Schema.string(),
                        score: Schema.number(),
                        topics: Schema.array({ items: Schema.string() }),
                      },
                    }),
                  },
                });
              }

              async analyze(text) {
                // Sem streaming porque tem schema
                const result = await this.model.generateContent(text);
                return JSON.parse(result.response.text());
              }
            }
          `,
          // ✅ Dois models: um para streaming, outro para schema
          `
            const streamingModel = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
            });

            const structuredModel = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: mySchema,
              },
            });

            // Streaming para chat
            const chatResult = await streamingModel.generateContentStream('Hello');

            // Schema para análise
            const analysisResult = await structuredModel.generateContent('Analyze');
          `,
        ],
        invalid: [
          // ❌ Model com schema tentando streaming
          // Note: Rule only detects when model is accessed as a direct identifier (model.generateContentStream),
          // not when accessed via this.model (class instance). This is a limitation of static analysis.
          {
            code: `
              const schemaModel = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                generationConfig: {
                  responseMimeType: 'application/json',
                  responseSchema: reviewSchema,
                },
              });
              const result = await schemaModel.generateContentStream('Hello');
            `,
            errors: [{ messageId: 'streamingWithSchema' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 4: BATCH PROCESSING EM PRODUÇÃO
   * Processamento eficiente de múltiplos itens
   * ========================================
   */
  describe('Batch Processing Patterns', () => {
    describe('prefer-batch-requests - Cost Efficiency', () => {
      ruleTester.run('prefer-batch-requests', preferBatchRequests, {
        valid: [
          // ✅ Single request (no loop)
          `const result = await model.generateContent('Analyze this text');`,
          // ✅ Batched prompt
          `const result = await model.generateContent(\`Analyze: \${items.join(', ')}\`);`,
        ],
        invalid: [
          // ❌ AI call in for...of loop
          {
            code: `
              for (const item of items) {
                const result = await model.generateContent(\`Analyze: \${item}\`);
              }
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
          // ❌ AI call in forEach
          {
            code: `
              items.forEach(async (item) => {
                await model.generateContent(\`Process: \${item}\`);
              });
            `,
            errors: [{ messageId: 'multipleRequestsInLoop' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 5: MULTIMODAL EM PRODUÇÃO
   * Processamento de imagens e arquivos
   * ========================================
   */
  describe('Multimodal Integration Patterns', () => {
    describe('validate-multimodal-config - Backend Compatibility', () => {
      ruleTester.run('validate-multimodal-config', validateMultimodalConfig, {
        valid: [
          // ✅ VertexAI com fileUri (Cloud Storage)
          `
            // Para arquivos grandes, usar Vertex + Cloud Storage
            const ai = getAI(app, { backend: new VertexAIBackend() });
            const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

            async function analyzeVideo(videoUri) {
              const result = await model.generateContent([
                { fileData: { fileUri: videoUri, mimeType: 'video/mp4' } },
                { text: 'Describe what happens in this video' },
              ]);
              return result.response.text();
            }
          `,
          // ✅ GoogleAI com inlineData (imagens pequenas)
          `
            const ai = getAI(app, { backend: new GoogleAIBackend() });
            const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

            async function analyzeImage(base64Image) {
              const result = await model.generateContent([
                { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                { text: 'What is in this image?' },
              ]);
              return result.response.text();
            }
          `,
        ],
        invalid: [
          // ❌ GoogleAI com fileUri (não suportado)
          {
            code: `
              const ai = getAI(app, { backend: new GoogleAIBackend() });
              const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

              async function wrongUsage(videoUri) {
                const result = await model.generateContent([
                  { fileData: { fileUri: 'gs://bucket/video.mp4', mimeType: 'video/mp4' } },
                ]);
              }
            `,
            errors: [{ messageId: 'fileUriRequiresVertex' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 6: FUNCTION CALLING EM PRODUÇÃO
   * Integração com APIs externas
   * ========================================
   */
  describe('Function Calling Patterns', () => {
    describe('require-function-response-handling - Complete Flow', () => {
      ruleTester.run('require-function-response-handling', requireFunctionResponseHandling, {
        valid: [
          // ✅ Handling completo de function calls
          `
            async function handleAIWithTools(prompt) {
              const result = await model.generateContent({ contents: [{ text: prompt }], tools });

              const functionCalls = result.response.functionCalls();
              if (functionCalls) {
                const responses = await Promise.all(
                  functionCalls.map(async (call) => {
                    const fnResult = await executeFunction(call.name, call.args);
                    return { name: call.name, response: fnResult };
                  })
                );
                return { type: 'function', responses };
              }

              return { type: 'text', text: result.response.text() };
            }
          `,
          // ✅ Loop de function calling
          `
            async function agentLoop(initialPrompt) {
              let prompt = initialPrompt;

              while (true) {
                const result = await model.generateContent({ contents: [{ text: prompt }], tools });
                const calls = result.response.functionCalls?.();

                if (!calls || calls.length === 0) {
                  return result.response.text();
                }

                const results = await executeCalls(calls);
                prompt = formatFunctionResults(results);
              }
            }
          `,
        ],
        invalid: [
          // ❌ Ignorando function calls
          {
            code: `
              const model = getGenerativeModel(ai, { tools: weatherTools });

              async function chat(message) {
                const result = await model.generateContent(message);
                // Ignora function calls, só pega texto
                return result.response.text();
              }
            `,
            errors: [{ messageId: 'missingFunctionCallCheck' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 7: GROUNDING (GOOGLE SEARCH)
   * Dados em tempo real
   * ========================================
   */
  describe('Grounding Integration Patterns', () => {
    describe('require-google-ai-backend-for-grounding', () => {
      ruleTester.run('require-google-ai-backend-for-grounding', requireGoogleAIBackendForGrounding, {
        valid: [
          // ✅ GoogleAI + Google Search
          `
            const ai = getAI(app, { backend: new GoogleAIBackend() });
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              tools: [{ googleSearch: {} }],
            });

            async function searchAndAnswer(query) {
              const result = await model.generateContent(query);
              const metadata = result.response.candidates[0].groundingMetadata;

              return {
                answer: result.response.text(),
                sources: metadata?.webSearchQueries,
                searchWidget: metadata?.searchEntryPoint,
              };
            }
          `,
        ],
        invalid: [
          // ❌ VertexAI com Google Search (precisa de GoogleAI)
          {
            code: `
              const ai = getAI(app, { backend: new VertexAIBackend() });
              const model = getGenerativeModel(ai, {
                tools: [{ googleSearch: {} }],
              });
            `,
            errors: [{ messageId: 'googleAIBackendRequiredForGrounding' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 8: SEGURANÇA EM PRODUÇÃO
   * Proteção de dados e configuração
   * ========================================
   */
  describe('Security Patterns', () => {
    describe('no-sensitive-system-instruction', () => {
      ruleTester.run('no-sensitive-system-instruction', noSensitiveSystemInstruction, {
        valid: [
          // ✅ System instruction seguro com variáveis de ambiente
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              systemInstruction: \`You are a customer service assistant for \${process.env.COMPANY_NAME}.
                - Be helpful and professional
                - Refer complex issues to human agents
                - Never share internal policies\`,
            });
          `,
          // ✅ Configuração dinâmica segura
          `
            const createAssistant = (config) => {
              return getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                systemInstruction: config.systemPrompt, // Vem de fonte segura
              });
            };
          `,
        ],
        invalid: [
          // ❌ API key hardcoded (must match pattern: api_key: value or api-key= value)
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'External service api_key: sk-live-abc123xyz',
              });
            `,
            errors: [{ messageId: 'sensitiveData' }],
          },
          // ❌ Credenciais de DB
          {
            code: `
              const model = getGenerativeModel(ai, {
                systemInstruction: 'Database: postgres://admin:secretPass@db.example.com/prod',
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
   * SEÇÃO 9: MODELOS E CONFIGURAÇÃO
   * Versões e otimização
   * ========================================
   */
  describe('Model Configuration Patterns', () => {
    describe('no-deprecated-models - Always Use Latest', () => {
      ruleTester.run('no-deprecated-models', noDeprecatedModels, {
        valid: [
          // ✅ Modelo atual
          `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
          // ✅ Configuração por ambiente (não pode validar dinamicamente)
          `const model = getGenerativeModel(ai, { model: process.env.GEMINI_MODEL });`,
        ],
        invalid: [
          // ❌ Modelo antigo hardcoded
          {
            code: `const model = getGenerativeModel(ai, { model: 'gemini-pro' });`,
            output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
            errors: [{ messageId: 'deprecatedModel' }],
          },
          // ❌ Gemini 1.5
          {
            code: `const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash' });`,
            output: `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
            errors: [{ messageId: 'deprecatedModel' }],
          },
        ],
      });
    });

    describe('no-thinking-simple-tasks', () => {
      ruleTester.run('no-thinking-simple-tasks', noThinkingSimpleTasks, {
        valid: [
          // ✅ High thinking para tarefa complexa
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              systemInstruction: 'Solve complex math problems.',
              thinkingConfig: { thinkingLevel: 'high' },
            });
          `,
          // ✅ Low thinking (sempre ok)
          `
            const model = getGenerativeModel(ai, {
              model: 'gemini-3-flash-preview',
              thinkingConfig: { thinkingLevel: 'low' },
            });
          `,
          // ✅ Sem thinkingConfig
          `const model = getGenerativeModel(ai, { model: 'gemini-3-flash-preview' });`,
        ],
        invalid: [
          // ❌ High thinking para tarefa simples (translate)
          {
            code: `
              const model = getGenerativeModel(ai, {
                model: 'gemini-3-flash-preview',
                systemInstruction: 'Translate text to Spanish.',
                thinkingConfig: { thinkingLevel: 'high' },
              });
            `,
            errors: [{ messageId: 'thinkingForSimpleTask' }],
          },
        ],
      });
    });
  });

  /**
   * ========================================
   * SEÇÃO 10: IMPORTS CORRETOS
   * Usando firebase/ai corretamente
   * ========================================
   */
  describe('Import Patterns', () => {
    describe('no-vertexai-only-import', () => {
      ruleTester.run('no-vertexai-only-import', noVertexaiOnlyImport, {
        valid: [
          // ✅ Import correto de firebase/ai
          `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
        ],
        invalid: [
          // ❌ Import antigo do firebase/vertexai
          {
            code: `import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';`,
            output: `import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';`,
            errors: [{ messageId: 'outdatedImport' }],
          },
        ],
      });
    });
  });

  // Note: prefer-count-tokens rule does not exist in the plugin.
  // Token counting is recommended in documentation but not enforced by a rule.
  // Best practice: Use model.countTokens() before large requests to estimate costs.
});
