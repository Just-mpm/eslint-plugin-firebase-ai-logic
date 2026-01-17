/**
 * Constants for Firebase AI Logic ESLint Plugin
 */

// ============================================================================
// DEPRECATED IMPORTS
// ============================================================================

/** Wrong imports that should be replaced with 'firebase/ai' */
export const WRONG_IMPORTS = {
  '@google/generative-ai': {
    message:
      "Import from '@google/generative-ai' is incorrect. Use 'firebase/ai' instead for Firebase AI Logic.",
    replacement: 'firebase/ai',
  },
  '@google-cloud/vertexai': {
    message:
      "Import from '@google-cloud/vertexai' is incorrect. Use 'firebase/ai' with GoogleAIBackend or VertexAIBackend instead.",
    replacement: 'firebase/ai',
  },
  'firebase/vertexai-preview': {
    message:
      "Import from 'firebase/vertexai-preview' is deprecated. Use 'firebase/ai' instead.",
    replacement: 'firebase/ai',
  },
  'firebase/vertexai': {
    message:
      "Import from 'firebase/vertexai' should be replaced with 'firebase/ai' for the latest Firebase AI Logic API.",
    replacement: 'firebase/ai',
  },
} as const;

// ============================================================================
// DEPRECATED MODELS
// ============================================================================

/** Models that have been retired and return 404 errors */
export const DEPRECATED_MODELS = [
  // Gemini 1.0 - Fully deprecated
  'gemini-pro',
  'gemini-1.0-pro',
  'gemini-1.0-pro-vision',
  // Gemini 1.5 - Fully deprecated
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  // Gemini 2.0 - Fully deprecated
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite',
  // Note: Gemini 2.5 models are NOT deprecated - they are current stable models
  // gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite are valid
] as const;

/** Current recommended model for Firebase AI Logic */
export const RECOMMENDED_MODEL = 'gemini-3-flash-preview';

/** All current valid models */
export const VALID_MODELS = [
  // Gemini 2.5 - Current stable models
  'gemini-2.5-pro',
  'gemini-2.5-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite-preview',
  // Gemini 3 - Preview models
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3-pro-image-preview',
] as const;

// ============================================================================
// SCHEMA LIMITATIONS
// ============================================================================

/** Schema features not supported by Firebase AI Logic */
export const UNSUPPORTED_SCHEMA_FEATURES = [
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  '$ref',
  'if',
  'then',
  'else',
  'default',
  'const',
  'minItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
  'additionalProperties',
  'patternProperties',
] as const;

// ============================================================================
// FUNCTION CALLING
// ============================================================================

/** Required fields for function declarations */
export const REQUIRED_FUNCTION_FIELDS = ['name', 'description'] as const;

/** Unsupported parameter attributes in function declarations */
export const UNSUPPORTED_FUNCTION_PARAMS = [
  'default',
  'examples',
  'optional',
  'maximum',
  'minimum',
  'oneOf',
  'anyOf',
  'allOf',
] as const;

// ============================================================================
// MULTIMODAL
// ============================================================================

/** Supported MIME types for images */
export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

/** Supported MIME types for video */
export const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp',
] as const;

/** Supported MIME types for audio */
export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
] as const;

/** All supported media MIME types */
export const ALL_SUPPORTED_MIME_TYPES = [
  ...SUPPORTED_IMAGE_MIME_TYPES,
  ...SUPPORTED_VIDEO_MIME_TYPES,
  ...SUPPORTED_AUDIO_MIME_TYPES,
  'application/pdf',
] as const;

// ============================================================================
// GEMINI 3 SPECIFIC
// ============================================================================

/** Valid thinking levels for Gemini 3 */
export const GEMINI_3_THINKING_LEVELS = {
  pro: ['low', 'high'] as const,
  flash: ['minimal', 'low', 'medium', 'high'] as const,
} as const;

/** Valid media resolution levels for Gemini 3 */
export const MEDIA_RESOLUTION_LEVELS = [
  'media_resolution_low',
  'media_resolution_medium',
  'media_resolution_high',
  'media_resolution_ultra_high',
] as const;

// ============================================================================
// LIMITS
// ============================================================================

/** Free tier limits */
export const FREE_TIER_LIMITS = {
  requestsPerMinute: 15,
  requestsPerDay: 1000,
  tokensPerMinute: 250000,
} as const;

/** Recommended chat history limit */
export const RECOMMENDED_CHAT_HISTORY_LIMIT = 20;

/** Maximum recommended schema properties */
export const MAX_SCHEMA_PROPERTIES = 15;

/** Maximum recommended property name length */
export const MAX_PROPERTY_NAME_LENGTH = 30;

/** Maximum recommended enum values */
export const MAX_ENUM_VALUES = 10;
