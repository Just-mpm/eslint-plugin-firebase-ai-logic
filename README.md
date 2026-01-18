# ESLint Plugin: Firebase AI Logic

Plugin ESLint oficial para **Firebase AI Logic** com 39 regras que detectam anti-padrões, imports obsoletos, configs inválidas e best practices.

```bash
npm install --save-dev eslint-plugin-firebase-ai-logic
```

## 🚀 Início Rápido (5 min)

### 1️⃣ Instalar o Plugin

```bash
npm install --save-dev eslint-plugin-firebase-ai-logic
```

### 2️⃣ Configurar ESLint 9+ (Flat Config)

Edite `eslint.config.js`:

```javascript
import firebaseAiLogicPlugin from "eslint-plugin-firebase-ai-logic";

export default [
  firebaseAiLogicPlugin.configs.recommended,
  // suas outras configs...
];
```

### 3️⃣ Configurar ESLint 8.x (Legacy)

Edite `.eslintrc.js` ou `.eslintrc.json`:

```javascript
module.exports = {
  plugins: ["firebase-ai-logic"],
  extends: ["plugin:firebase-ai-logic/recommended"],
};
```

### 4️⃣ Rodar ESLint

```bash
npx eslint src --fix
```

Pronto! O plugin agora vai detectar problemas no seu código Firebase AI Logic.

---

## 📋 Exemplos de Regras

### ❌ Imports Deprecated

```typescript
// ❌ ERRADO - Usando import antigo
import { getVertexAI } from "firebase/vertexai-preview";

// ❌ ERRADO - Importando direto da Google Cloud
import { VertexAI } from "@google-cloud/vertexai";

// ✅ CERTO - Use firebase/ai
import { getAI, GoogleAIBackend } from "firebase/ai";
```

### ❌ Modelo Obsoleto

```typescript
// ❌ ERRADO - gemini-2.5-pro é deprecated
const model = getGenerativeModel(ai, {
  model: "gemini-2.5-pro",
});

// ✅ CERTO - Use gemini-3-flash-preview
const model = getGenerativeModel(ai, {
  model: "gemini-3-flash-preview",
});
```

### ❌ JSON Schema com Streaming

```typescript
// ❌ ERRADO - Não funciona junto
const result = await model.generateContentStream(prompt, {
  responseMimeType: "application/json",
  responseSchema: mySchema,
});

// ✅ CERTO - Use generateContent (sem stream)
const result = await model.generateContent(prompt, {
  responseMimeType: "application/json",
  responseSchema: mySchema,
});
```

### ❌ Falta Backend

```typescript
// ❌ ERRADO - Backend é obrigatório
const ai = getAI(app);

// ✅ CERTO - Sempre especifique o backend
const ai = getAI(app, {
  backend: new GoogleAIBackend(),
});
```

### ❌ Function Calling sem Response

```typescript
// ❌ ERRADO - Falta tratar resposta
const result = await model.generateContent(prompt);
const calls = result.response.functionCalls();
// ... executou a função mas não enviou de volta

// ✅ CERTO - Complete o loop
const result = await model.generateContent(prompt);
const calls = result.response.functionCalls();
for (const call of calls) {
  const response = await executeFunction(call.name, call.args);
  await chat.sendMessage({
    role: "user",
    parts: [{ functionResponse: response }],
  });
}
```

---

## 📚 Todas as 39 Regras

### Imports & Models (5 regras)

| Regra                             | Descrição                                               |
| --------------------------------- | ------------------------------------------------------- |
| `no-deprecated-firebase-vertexai` | Não use `firebase/vertexai-preview` → use `firebase/ai` |
| `no-vertexai-only-import`         | Não use `firebase/vertexai` → use `firebase/ai`         |
| `no-vertex-ai-direct-import`      | Não use `@google-cloud/vertexai` → use `firebase/ai`    |
| `no-google-genai-import`          | Não use `@google/generative-ai` → use `firebase/ai`     |
| `no-deprecated-models`            | Detecta modelos obsoletos (gemini-2.5-pro, etc)         |

### Schema & Validation (4 regras)

| Regra                            | Descrição                                                 |
| -------------------------------- | --------------------------------------------------------- |
| `no-streaming-with-schema`       | JSON schema NÃO funciona com streaming                    |
| `no-unsupported-schema-features` | union types, constraints não são suportados               |
| `no-schema-in-prompt`            | Remova instruções JSON do prompt se usar `responseSchema` |
| `require-json-validation`        | Valide JSON parseado com Zod após receber                 |
| `validate-schema-structure`      | Detecta erros estruturais no objeto de schema             |
| `validate-response-mime-type`    | Garante que `responseMimeType` é compatível com o schema  |

### Functions & Code Execution (7 regras)

| Regra                                | Descrição                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `require-function-description`       | Função precisa de descrição detalhada                                        |
| `require-function-response-handling` | Function calling requer loop completo                                        |
| `no-unsupported-function-params`     | Alguns atributos não são suportados                                          |
| `validate-code-execution-config`     | Valida configuração de Code Execution                                        |
| `require-code-execution-handling`    | Code execution requer tratamento de `executableCode` / `codeExecutionResult` |
| `no-file-uri-with-code-execution`    | Bloqueia `fileUri` em ferramentas com Code Execution                         |
| `no-code-execution-creative-tasks`   | Sugere desativar Code Execution para tarefas puramente criativas             |

### Performance, Cost & Limits (6 regras)

| Regra                              | Descrição                                |
| ---------------------------------- | ---------------------------------------- |
| `prefer-batch-requests`            | Agrupe requisições em `Promise.all()`    |
| `prefer-count-tokens`              | Use `countTokens()` para prompts grandes |
| `prefer-streaming-long-responses`  | Streaming para respostas > 1000 chars    |
| `prefer-concise-property-names`    | Nomes curtos economizam tokens           |
| `prefer-cloud-storage-large-files` | Use Cloud Storage pra arquivos > 10MB    |
| `no-unlimited-chat-history`        | Limpe histórico do chat regularmente     |

### Security & Compliance (5 regras)

| Regra                                     | Descrição                                                    |
| ----------------------------------------- | ------------------------------------------------------------ |
| `no-sensitive-system-instruction`         | Não coloque dados sensíveis no system prompt                 |
| `require-app-check-production`            | Use App Check em produção                                    |
| `require-grounding-compliance`            | Garante que Grounding segue regras de exibição e links       |
| `require-google-ai-backend-for-grounding` | Google Search Grounding requer GoogleAIBackend               |
| `validate-multimodal-config`              | Valida segurança de arquivos multimídia (limites de tamanho) |

### Gemini 3 & Best Practices (8 regras)

| Regra                        | Descrição                                                 |
| ---------------------------- | --------------------------------------------------------- |
| `require-thought-signature`  | Gemini 3: preserve `thoughtSignature` para coerência      |
| `check-temperature-defaults` | Alertas sobre temperaturas extremas no Gemini 3           |
| `check-media-resolution`     | Garante resolução compatível com as capacidades do modelo |
| `no-thinking-simple-tasks`   | Thinking mode é overhead pra tarefas simples              |
| `no-verbose-prompts`         | Prompts verbosos = mais tokens e custo                    |
| `require-backend`            | Backend (GoogleAI ou VertexAI) é obrigatório              |
| `require-ai-before-model`    | Crie AI antes de usar `getGenerativeModel`                |
| `require-error-handling`     | Envolva chamadas em try/catch                             |

---

## 🎯 Configuração Avançada

### Ativar Apenas Algumas Regras

```javascript
// ESLint 9+ (flat config)
import firebaseAiLogicPlugin from "eslint-plugin-firebase-ai-logic";

export default [
  {
    plugins: { "firebase-ai-logic": firebaseAiLogicPlugin },
    rules: {
      "firebase-ai-logic/no-deprecated-models": "error",
      "firebase-ai-logic/require-backend": "error",
      "firebase-ai-logic/require-json-validation": "warn",
      // desabilitar regra
      "firebase-ai-logic/no-verbose-prompts": "off",
    },
  },
];
```

```javascript
// ESLint 8.x (legacy)
module.exports = {
  plugins: ["firebase-ai-logic"],
  rules: {
    "firebase-ai-logic/no-deprecated-models": "error",
    "firebase-ai-logic/require-backend": "error",
    "firebase-ai-logic/require-json-validation": "warn",
    "firebase-ai-logic/no-verbose-prompts": "off",
  },
};
```

### Regras por Severity

**Error** (deve corrigir):

- Imports deprecated
- Modelos obsoletos
- Backend obrigatório
- Function calling incompleto
- Schema com streaming

**Warning** (considere corrigir):

- Falta de validation JSON
- Sem error handling
- Historico de chat ilimitado
- Prompts verbose

**Suggestion** (dicas opcionais):

- Nomes de propriedades longos
- Sem countTokens
- Sem streaming em respostas longas

---

## 💡 Exemplos Práticos

### Setup Completo

```typescript
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { z } from "zod";

// ✅ App Check habilitado
const app = initializeApp(firebaseConfig);
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("YOUR_SITE_KEY"),
});

// ✅ AI com backend explícito
const ai = getAI(app, { backend: new GoogleAIBackend() });

// ✅ Model com config correto
const model = getGenerativeModel(ai, {
  model: "gemini-3-flash-preview", // ✅ Modelo atual
  systemInstruction: "Você é um assistente amigável",
});

// ✅ Validação com Zod
const ResponseValidator = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
});

// ✅ Try/catch para error handling
async function analyzeReview(review: string) {
  try {
    // ✅ countTokens para prompt grande
    const tokens = await model.countTokens(review);
    if (tokens.totalTokens > 5000) {
      console.warn("Prompt grande:", tokens.totalTokens);
    }

    // ✅ generateContent (NÃO stream) para JSON
    const result = await model.generateContent(review, {
      responseMimeType: "application/json",
      responseSchema: ReviewSchema,
    });

    // ✅ Validar antes de usar
    const data = JSON.parse(result.response.text());
    return ResponseValidator.parse(data);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      if ((error as any).status === 429) {
        // Rate limit - implementar exponential backoff
        console.error("Rate limited, aguarde antes de tentar novamente");
      }
    }
    throw error;
  }
}
```

### Function Calling Correto

```typescript
// ✅ Setup com tools
const model = getGenerativeModel(ai, {
  model: "gemini-3-flash-preview",
  tools: [
    {
      name: "search_web",
      description: "Busca na web por informações recentes", // ✅ Descrição clara
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
      },
    },
  ],
});

async function chatWithFunctionCalling(userMessage: string) {
  const chat = model.startChat();

  try {
    let response = await chat.sendMessage(userMessage);

    // ✅ Loop completo de function calling
    while (response.response.functionCalls().length > 0) {
      const calls = response.response.functionCalls();

      for (const call of calls) {
        console.log(`Executando: ${call.name}(${JSON.stringify(call.args)})`);

        // Executar a função
        const result = await executeFunction(call.name, call.args);

        // ✅ IMPORTANTE: Enviar resposta de volta
        response = await chat.sendMessage({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: result,
              },
            },
          ],
        });
      }
    }

    return response.response.text();
  } catch (error) {
    console.error("Erro em function calling:", error);
    throw error;
  }
}
```

### Chat com Histórico Limitado

```typescript
// ✅ Limitar histórico para economizar tokens
const MAX_HISTORY = 10;

async function maintainChatHistory(
  messages: Array<{ role: string; text: string }>,
) {
  // ✅ Manter apenas últimas N mensagens
  const recentMessages = messages.slice(-MAX_HISTORY);

  const chat = model.startChat({
    history: recentMessages.map((msg) => ({
      role: msg.role as "user" | "model",
      parts: [{ text: msg.text }],
    })),
  });

  return chat;
}
```

---

## 🔧 Troubleshooting

### "Plugin não está sendo carregado"

**Erro:**

```
Cannot find module 'eslint-plugin-firebase-ai-logic'
```

**Solução:**

```bash
# Verifique se está instalado
npm list eslint-plugin-firebase-ai-logic

# Se não, instale
npm install --save-dev eslint-plugin-firebase-ai-logic

# ESLint 9 precisa de nome qualificado
import firebaseAiLogicPlugin from 'eslint-plugin-firebase-ai-logic';
```

### "Regra não reconhecida"

**Erro:**

```
"firebase-ai-logic/no-deprecated-models" was not found
```

**Solução:**

- Verifique o nome exato da regra
- Use com prefixo: `firebase-ai-logic/`
- Certifique-se que a regra está ativa na config

### "Config recommended não existe"

**Solução para ESLint 9:**

```javascript
// ✅ CERTO
import firebaseAiLogicPlugin from "eslint-plugin-firebase-ai-logic";
export default [firebaseAiLogicPlugin.configs.recommended];
```

**Solução para ESLint 8:**

```javascript
// ✅ CERTO
module.exports = {
  extends: ["plugin:firebase-ai-logic/recommended"],
};
```

---

## 📖 Documentação Completa

Cada regra tem documentação detalhada no GitHub:

https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic

Veja o diretório `docs/rules/` para:

- Exemplos de código bom e ruim
- Razão por trás da regra
- Como corrigir automaticamente
- Exceções e edge cases

---

## 🐛 Encontrou um Bug?

Abra uma issue no GitHub:
https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic/issues

Inclua:

- Versão do plugin
- Versão do ESLint
- Configuração ESLint
- Código que causa o problema
- Output esperado vs atual

---

## 📝 License

MIT © [Matheus Pimenta](https://kodaai.app)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! O projeto está em:
https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic

### Setup para Desenvolvimento

```bash
# Clone o repo
git clone https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic.git
cd eslint-plugin-firebase-ai-logic

# Instale dependências
npm install

# Rode os testes
npm test

# Build TypeScript
npm run build

# Watch mode para desenvolvimento
npm run test:watch
```

---

## 📚 Recursos Adicionais

- **Firebase AI Logic Docs**: https://firebase.google.com/docs/ai-logic
- **Gemini API Reference**: https://ai.google.dev/gemini-api/docs
- **ESLint Plugin Dev Guide**: https://eslint.org/docs/latest/extend/plugins
- **Skill firebase-ai-logic**: Guia prático no Claude Code

---

Feito com ❤️ para developers Firebase AI Logic

**Versão:** 1.9.0
**NPM:** https://www.npmjs.com/package/eslint-plugin-firebase-ai-logic
