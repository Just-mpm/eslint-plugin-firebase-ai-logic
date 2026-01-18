import type { ESLint, Linter } from 'eslint';

// Import rules
import noGoogleGenaiImport from './rules/no-google-genai-import.js';
import noVertexAiDirectImport from './rules/no-vertex-ai-direct-import.js';
import noDeprecatedFirebaseVertexai from './rules/no-deprecated-firebase-vertexai.js';
import noVertexaiOnlyImport from './rules/no-vertexai-only-import.js';

import noDeprecatedModels from './rules/no-deprecated-models.js';

import requireBackend from './rules/require-backend.js';
import requireAiBeforeModel from './rules/require-ai-before-model.js';

import noSchemaInPrompt from './rules/no-schema-in-prompt.js';
import noStreamingWithSchema from './rules/no-streaming-with-schema.js';
import noUnsupportedSchemaFeatures from './rules/no-unsupported-schema-features.js';
import preferOptionalProperties from './rules/prefer-optional-properties.js';

import requireFunctionDescription from './rules/require-function-description.js';
import noUnsupportedFunctionParams from './rules/no-unsupported-function-params.js';
import requireFunctionResponseHandling from './rules/require-function-response-handling.js';

import requireErrorHandling from './rules/require-error-handling.js';
import requireJsonValidation from './rules/require-json-validation.js';

import noUnlimitedChatHistory from './rules/no-unlimited-chat-history.js';
import preferBatchRequests from './rules/prefer-batch-requests.js';
import noVerbosePrompts from './rules/no-verbose-prompts.js';

import noSensitiveSystemInstruction from './rules/no-sensitive-system-instruction.js';
import requireAppCheckProduction from './rules/require-app-check-production.js';

import noUnsupportedMimeType from './rules/no-unsupported-mime-type.js';
import preferCloudStorageLargeFiles from './rules/prefer-cloud-storage-large-files.js';

import preferStreamingLongResponses from './rules/prefer-streaming-long-responses.js';
import noThinkingSimpleTasks from './rules/no-thinking-simple-tasks.js';
import preferConcisePropertyNames from './rules/prefer-concise-property-names.js';

import requireThoughtSignature from './rules/require-thought-signature.js';
import checkTemperatureDefaults from './rules/check-temperature-defaults.js';
import checkMediaResolution from './rules/check-media-resolution.js';

import validateResponseMimeType from './rules/validate-response-mime-type.js';
import validateCodeExecutionConfig from './rules/validate-code-execution-config.js';
import validateSchemaStructure from './rules/validate-schema-structure.js';

import requireCodeExecutionHandling from './rules/require-code-execution-handling.js';
import requireGroundingCompliance from './rules/require-grounding-compliance.js';
import noFileUriWithCodeExecution from './rules/no-file-uri-with-code-execution.js';
import noCodeExecutionCreativeTasks from './rules/no-code-execution-creative-tasks.js';
import requireGoogleAIBackendForGrounding from './rules/require-google-ai-backend-for-grounding.js';
import validateMultimodalConfig from './rules/validate-multimodal-config.js';

const rules = {
  // Import rules (4)
  'no-google-genai-import': noGoogleGenaiImport,
  'no-vertex-ai-direct-import': noVertexAiDirectImport,
  'no-deprecated-firebase-vertexai': noDeprecatedFirebaseVertexai,
  'no-vertexai-only-import': noVertexaiOnlyImport,

  // Model rules (1)
  'no-deprecated-models': noDeprecatedModels,

  // Initialization rules (2)
  'require-backend': requireBackend,
  'require-ai-before-model': requireAiBeforeModel,

  // Schema rules (4)
  'no-schema-in-prompt': noSchemaInPrompt,
  'no-streaming-with-schema': noStreamingWithSchema,
  'no-unsupported-schema-features': noUnsupportedSchemaFeatures,
  'prefer-optional-properties': preferOptionalProperties,

  // Function calling rules (3)
  'require-function-description': requireFunctionDescription,
  'no-unsupported-function-params': noUnsupportedFunctionParams,
  'require-function-response-handling': requireFunctionResponseHandling,

  // Error handling rules (2)
  'require-error-handling': requireErrorHandling,
  'require-json-validation': requireJsonValidation,

  // Performance & cost rules (3)
  'no-unlimited-chat-history': noUnlimitedChatHistory,
  'prefer-batch-requests': preferBatchRequests,
  'no-verbose-prompts': noVerbosePrompts,

  // Security rules (2)
  'no-sensitive-system-instruction': noSensitiveSystemInstruction,
  'require-app-check-production': requireAppCheckProduction,

  // Multimodal/Vision rules (2)
  'no-unsupported-mime-type': noUnsupportedMimeType,
  'prefer-cloud-storage-large-files': preferCloudStorageLargeFiles,

  // Best practices rules (3)
  'prefer-streaming-long-responses': preferStreamingLongResponses,
  'no-thinking-simple-tasks': noThinkingSimpleTasks,
  'prefer-concise-property-names': preferConcisePropertyNames,

  // Gemini 3 specific rules (3)
  'require-thought-signature': requireThoughtSignature,
  'check-temperature-defaults': checkTemperatureDefaults,
  'check-media-resolution': checkMediaResolution,
  
  // Validation rules (3)
  'validate-response-mime-type': validateResponseMimeType,
  'validate-code-execution-config': validateCodeExecutionConfig,
  'validate-schema-structure': validateSchemaStructure,

  // Compliance (2)
  'require-code-execution-handling': requireCodeExecutionHandling,
  'require-grounding-compliance': requireGroundingCompliance,

  // Additional rules (2)
  'no-file-uri-with-code-execution': noFileUriWithCodeExecution,
  'no-code-execution-creative-tasks': noCodeExecutionCreativeTasks,
  'require-google-ai-backend-for-grounding': requireGoogleAIBackendForGrounding,
  'validate-multimodal-config': validateMultimodalConfig,
};

// Rule configurations
const recommendedRules: Linter.RulesRecord = {
  // Imports - all errors (breaking issues)
  'firebase-ai-logic/no-google-genai-import': 'error',
  'firebase-ai-logic/no-vertex-ai-direct-import': 'error',
  'firebase-ai-logic/no-deprecated-firebase-vertexai': 'error',
  'firebase-ai-logic/no-vertexai-only-import': 'error',

  // Models - error (deprecated models)
  'firebase-ai-logic/no-deprecated-models': 'error',

  // Initialization - errors (required for functionality)
  'firebase-ai-logic/require-backend': 'error',
  'firebase-ai-logic/require-ai-before-model': 'error',

  // Schema - mix of errors and warnings
  'firebase-ai-logic/no-streaming-with-schema': 'error',
  'firebase-ai-logic/no-unsupported-schema-features': 'error',
  'firebase-ai-logic/no-schema-in-prompt': 'warn',
  'firebase-ai-logic/prefer-optional-properties': 'warn',
  'firebase-ai-logic/validate-response-mime-type': 'error',
  'firebase-ai-logic/validate-schema-structure': 'warn',

  // Function calling - warnings
  'firebase-ai-logic/require-function-description': 'warn',
  'firebase-ai-logic/no-unsupported-function-params': 'error',
  'firebase-ai-logic/require-function-response-handling': 'warn',
  'firebase-ai-logic/validate-code-execution-config': 'error',
  'firebase-ai-logic/require-code-execution-handling': 'warn',
  'firebase-ai-logic/no-file-uri-with-code-execution': 'error',
  'firebase-ai-logic/no-code-execution-creative-tasks': 'warn',
  'firebase-ai-logic/require-grounding-compliance': 'error',

  // Error handling - warnings
  'firebase-ai-logic/require-error-handling': 'warn',
  'firebase-ai-logic/require-json-validation': 'warn',

  // Performance - warnings
  'firebase-ai-logic/no-unlimited-chat-history': 'warn',

  // Security - errors
  'firebase-ai-logic/no-sensitive-system-instruction': 'error',
  'firebase-ai-logic/require-app-check-production': 'warn',

  // Multimodal - errors
  'firebase-ai-logic/no-unsupported-mime-type': 'error',
  'firebase-ai-logic/validate-multimodal-config': 'error',
  'firebase-ai-logic/prefer-cloud-storage-large-files': 'warn',

  // Gemini 3 specific - error (causes 400 errors if missing)
  'firebase-ai-logic/require-thought-signature': 'error',
  'firebase-ai-logic/check-temperature-defaults': 'warn',
  'firebase-ai-logic/check-media-resolution': 'error',
};

const strictRules: Linter.RulesRecord = {
  ...recommendedRules,

  // Upgrade warnings to errors
  'firebase-ai-logic/no-schema-in-prompt': 'error',
  'firebase-ai-logic/prefer-optional-properties': 'error',
  'firebase-ai-logic/require-function-description': 'error',
  'firebase-ai-logic/require-function-response-handling': 'error',
  'firebase-ai-logic/require-error-handling': 'error',
  'firebase-ai-logic/require-json-validation': 'error',
  'firebase-ai-logic/no-unlimited-chat-history': 'error',
  'firebase-ai-logic/require-app-check-production': 'error',
  'firebase-ai-logic/prefer-cloud-storage-large-files': 'error',
  'firebase-ai-logic/check-temperature-defaults': 'error',
  'firebase-ai-logic/validate-schema-structure': 'error',
  'firebase-ai-logic/require-code-execution-handling': 'error',
  'firebase-ai-logic/no-file-uri-with-code-execution': 'error',
  'firebase-ai-logic/no-code-execution-creative-tasks': 'error',
  'firebase-ai-logic/require-grounding-compliance': 'error',

  // Add optional rules
  'firebase-ai-logic/prefer-batch-requests': 'warn',
  'firebase-ai-logic/no-verbose-prompts': 'warn',
  'firebase-ai-logic/prefer-streaming-long-responses': 'warn',
  'firebase-ai-logic/no-thinking-simple-tasks': 'warn',
  'firebase-ai-logic/prefer-concise-property-names': 'warn',
};

const allRules: Linter.RulesRecord = {
  'firebase-ai-logic/no-google-genai-import': 'error',
  'firebase-ai-logic/no-vertex-ai-direct-import': 'error',
  'firebase-ai-logic/no-deprecated-firebase-vertexai': 'error',
  'firebase-ai-logic/no-vertexai-only-import': 'error',
  'firebase-ai-logic/no-deprecated-models': 'error',
  'firebase-ai-logic/require-backend': 'error',
  'firebase-ai-logic/require-ai-before-model': 'error',
  'firebase-ai-logic/no-schema-in-prompt': 'error',
  'firebase-ai-logic/no-streaming-with-schema': 'error',
  'firebase-ai-logic/no-unsupported-schema-features': 'error',
  'firebase-ai-logic/prefer-optional-properties': 'error',
  'firebase-ai-logic/require-function-description': 'error',
  'firebase-ai-logic/no-unsupported-function-params': 'error',
  'firebase-ai-logic/require-function-response-handling': 'error',
  'firebase-ai-logic/require-error-handling': 'error',
  'firebase-ai-logic/require-json-validation': 'error',
  'firebase-ai-logic/no-unlimited-chat-history': 'error',
  'firebase-ai-logic/prefer-batch-requests': 'error',
  'firebase-ai-logic/no-verbose-prompts': 'error',
  'firebase-ai-logic/no-sensitive-system-instruction': 'error',
  'firebase-ai-logic/require-app-check-production': 'error',
  'firebase-ai-logic/no-unsupported-mime-type': 'error',
  'firebase-ai-logic/prefer-cloud-storage-large-files': 'error',
  'firebase-ai-logic/prefer-streaming-long-responses': 'error',
  'firebase-ai-logic/no-thinking-simple-tasks': 'error',
  'firebase-ai-logic/prefer-concise-property-names': 'error',
  'firebase-ai-logic/require-thought-signature': 'error',
  'firebase-ai-logic/check-temperature-defaults': 'error',
  'firebase-ai-logic/check-media-resolution': 'error',
  'firebase-ai-logic/validate-response-mime-type': 'error',
  'firebase-ai-logic/validate-code-execution-config': 'error',
  'firebase-ai-logic/validate-schema-structure': 'error',
  'firebase-ai-logic/require-code-execution-handling': 'error',
  'firebase-ai-logic/no-file-uri-with-code-execution': 'error',
  'firebase-ai-logic/no-code-execution-creative-tasks': 'error',
  'firebase-ai-logic/require-grounding-compliance': 'error',
  'firebase-ai-logic/require-google-ai-backend-for-grounding': 'error',
  'firebase-ai-logic/validate-multimodal-config': 'error',
};

// Flat config format (ESLint 9+)
const configs = {
  recommended: {
    plugins: {
      'firebase-ai-logic': {
        rules,
      },
    },
    rules: recommendedRules,
  } as Linter.Config,

  strict: {
    plugins: {
      'firebase-ai-logic': {
        rules,
      },
    },
    rules: strictRules,
  } as Linter.Config,

  all: {
    plugins: {
      'firebase-ai-logic': {
        rules,
      },
    },
    rules: allRules,
  } as Linter.Config,
};

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-firebase-ai-logic',
    version: '1.8.0',
  },
  rules,
  configs,
};

export = plugin;
