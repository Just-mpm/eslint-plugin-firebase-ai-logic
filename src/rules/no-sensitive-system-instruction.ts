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

      // Credit card patterns
      { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, type: 'Credit card number' },

      // Email patterns in suspicious context
      { pattern: /\b(user|customer|client)\s*email\s*[:=]\s*\S+@/i, type: 'User email' },

      // Phone patterns
      { pattern: /\b(phone|tel|mobile)\s*[:=]\s*[\d\s\-\+\(\)]{10,}/i, type: 'Phone number' },

      // Password patterns
      { pattern: /\bpassword\s*[:=]\s*\S+/i, type: 'Password' },
      { pattern: /\bpwd\s*[:=]\s*\S+/i, type: 'Password' },

      // API key patterns
      { pattern: /\b(api[_-]?key|apikey)\s*[:=]\s*\S+/i, type: 'API key' },
      { pattern: /\b(secret[_-]?key|secretkey)\s*[:=]\s*\S+/i, type: 'Secret key' },
      { pattern: /\b(access[_-]?token|accesstoken)\s*[:=]\s*\S+/i, type: 'Access token' },
      { pattern: /\bbearer\s+[a-zA-Z0-9\-_.]+/i, type: 'Bearer token' },

      // Database connection strings
      { pattern: /\b(mongodb|postgres|mysql|redis):\/\/[^\s]+/i, type: 'Database connection string' },

      // AWS patterns
      { pattern: /\bAKIA[0-9A-Z]{16}\b/, type: 'AWS Access Key' },

      // Private key patterns
      { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i, type: 'Private key' },

      // User ID with context
      { pattern: /\b(user[_-]?id|userid)\s*[:=]\s*[a-zA-Z0-9\-_]+/i, type: 'User ID' },

      // Address patterns
      { pattern: /\b(address|street)\s*[:=]\s*\d+\s+\w+/i, type: 'Address' },

      // Date of birth
      { pattern: /\b(dob|birth[_-]?date|date[_-]?of[_-]?birth)\s*[:=]/i, type: 'Date of birth' },
    ];

    function checkForSensitiveData(node: Rule.Node, text: string) {
      for (const { pattern, type } of sensitivePatterns) {
        if (pattern.test(text)) {
          context.report({
            node,
            messageId: 'sensitiveData',
            data: { type },
          });
          return; // Report only the first match
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

          // Template literal
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
