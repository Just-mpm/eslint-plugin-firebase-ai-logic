import type { Rule } from 'eslint';
import {
  getStringValue,
  isObjectExpression,
  findProperty,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow sensitive data (PII, credentials) in systemInstruction as it may leak through model responses',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-sensitive-system-instruction',
    },
    schema: [],
    messages: {
      sensitiveData:
        "Potential sensitive data detected in systemInstruction: {{ type }}. System instructions are not jailbreak-proof and may leak through responses.",
      piiWarning:
        'Do not include personal identifiable information (PII) in systemInstruction. Use user context in individual prompts instead.',
      credentialWarning:
        'Never include API keys, passwords, or other credentials in systemInstruction.',
    },
  },

  create(context) {
    // Patterns that indicate sensitive data
    const sensitivePatterns: Array<{ pattern: RegExp; type: string }> = [
      // SSN patterns
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'SSN' },
      { pattern: /\bssn\s*[:=]\s*/i, type: 'SSN reference' },

      // Credit card patterns (with or without separators)
      { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, type: 'Credit card number' },

      // Email patterns in suspicious context
      { pattern: /\b(user|customer|client)\s*email\s*[:=]\s*\S+@/i, type: 'User email' },

      // Phone patterns
      { pattern: /\b(phone|tel|mobile)\s*[:=]\s*[\d\s\-\+\(\)]{10,}/i, type: 'Phone number' },

      // Password patterns
      { pattern: /\bpassword\s*[:=]\s*\S+/i, type: 'Password' },
      { pattern: /\bpwd\s*[:=]\s*\S+/i, type: 'Password' },
      { pattern: /\bsecret\s*[:=]\s*\S+/i, type: 'Secret' },

      // API key patterns - various formats
      { pattern: /\b(api[_-]?key|apikey)\s*[:=]\s*\S+/i, type: 'API key' },
      { pattern: /\b(secret[_-]?key|secretkey)\s*[:=]\s*\S+/i, type: 'Secret key' },
      { pattern: /\b(access[_-]?token|accesstoken)\s*[:=]\s*\S+/i, type: 'Access token' },
      { pattern: /\bbearer\s+[a-zA-Z0-9\-_.]+/i, type: 'Bearer token' },

      // Common API key formats (without explicit label)
      // sk-... pattern (OpenAI, Stripe, etc.)
      { pattern: /\bsk-[a-zA-Z0-9]{20,}/i, type: 'API key (sk-* format)' },
      // pk-... pattern (Stripe public key, etc.)
      { pattern: /\bpk-[a-zA-Z0-9]{20,}/i, type: 'API key (pk-* format)' },
      // key-... pattern
      { pattern: /\bkey-[a-zA-Z0-9]{20,}/i, type: 'API key (key-* format)' },
      // Generic long alphanumeric after "key" word
      { pattern: /\b(?:api|secret|private)\s+key\s+[a-zA-Z0-9_-]{16,}/i, type: 'API key' },

      // Database connection strings
      { pattern: /\b(mongodb|postgres|mysql|redis|postgresql):\/\/[^\s]+/i, type: 'Database connection string' },
      { pattern: /\b(mongodb\+srv):\/\/[^\s]+/i, type: 'MongoDB connection string' },

      // AWS patterns
      { pattern: /\bAKIA[0-9A-Z]{16}\b/, type: 'AWS Access Key' },
      { pattern: /\bAIZA[0-9A-Za-z_-]{35}\b/, type: 'Google API Key' },

      // Firebase/Google patterns
      { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, type: 'Firebase/Google API Key' },

      // JWT tokens (common format)
      { pattern: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/i, type: 'JWT token' },

      // Private key patterns
      { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i, type: 'Private key' },
      { pattern: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/i, type: 'EC Private key' },
      { pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/i, type: 'SSH Private key' },

      // GitHub tokens
      { pattern: /\bgh[pousr]_[a-zA-Z0-9]{36,}/i, type: 'GitHub token' },

      // Slack tokens
      { pattern: /\bxox[baprs]-[a-zA-Z0-9-]+/i, type: 'Slack token' },

      // User ID with context
      { pattern: /\b(user[_-]?id|userid)\s*[:=]\s*[a-zA-Z0-9\-_]+/i, type: 'User ID' },

      // Address patterns (more specific to avoid false positives)
      { pattern: /\b(home|billing|shipping)\s*address\s*[:=]\s*\d+\s+\w+/i, type: 'Address' },

      // Date of birth
      { pattern: /\b(dob|birth[_-]?date|date[_-]?of[_-]?birth)\s*[:=]/i, type: 'Date of birth' },

      // Generic "token" followed by value
      { pattern: /\btoken\s*[:=]\s*[a-zA-Z0-9_-]{20,}/i, type: 'Token' },

      // Credentials in URL format
      { pattern: /\/\/[^:]+:[^@]+@[a-zA-Z0-9.-]+/i, type: 'Credentials in URL' },
    ];

    // Track all found issues to report them all
    function checkForSensitiveData(node: Rule.Node, text: string) {
      const foundTypes = new Set<string>();

      for (const { pattern, type } of sensitivePatterns) {
        if (pattern.test(text) && !foundTypes.has(type)) {
          foundTypes.add(type);
          context.report({
            node,
            messageId: 'sensitiveData',
            data: { type },
          });
        }
      }
    }

    return {
      Property(node) {
        // Check systemInstruction property
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'systemInstruction'
        ) {
          const value = node.value;

          // String value
          const stringValue = getStringValue(value);
          if (stringValue) {
            checkForSensitiveData(value as Rule.Node, stringValue);
            return;
          }

          // Template literal - check both static parts and warn about dynamic
          if (value.type === 'TemplateLiteral') {
            const fullText = value.quasis
              .map((q) => q.value.cooked ?? '')
              .join('');
            checkForSensitiveData(value as Rule.Node, fullText);
            return;
          }

          // Object with text property
          if (isObjectExpression(value)) {
            const textProp = findProperty(value, 'text');
            if (textProp) {
              const textValue = getStringValue(textProp.value);
              if (textValue) {
                checkForSensitiveData(textProp.value as Rule.Node, textValue);
              }
            }
          }

          // Array of parts
          if (value.type === 'ArrayExpression') {
            for (const element of value.elements) {
              if (!element) continue;

              const elementString = getStringValue(element);
              if (elementString) {
                checkForSensitiveData(element as Rule.Node, elementString);
              }

              if (isObjectExpression(element)) {
                const textProp = findProperty(element, 'text');
                if (textProp) {
                  const textValue = getStringValue(textProp.value);
                  if (textValue) {
                    checkForSensitiveData(textProp.value as Rule.Node, textValue);
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
