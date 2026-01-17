import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getStringValue,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using Cloud Storage (gs://) URLs instead of base64 for large files (>5MB). Base64 encoding adds ~33% overhead.',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#prefer-cloud-storage-large-files',
    },
    schema: [],
    messages: {
      useCloudStorage:
        'For files > 5MB, prefer Cloud Storage (gs://) URLs instead of base64 inlineData. Base64 adds ~33% overhead. Use fileData: { fileUri: "gs://bucket/path", mimeType: "..." } instead.',
      longBase64Detected:
        'Very long base64 string detected ({{ length }} chars ≈ {{ sizeMB }}MB). Consider using Cloud Storage for better performance.',
    },
  },

  create(context) {
    // Base64 adds ~33% overhead, so 5MB file becomes ~6.7MB base64
    // We check for base64 strings that appear large
    const BASE64_THRESHOLD = 100000; // ~75KB original file (conservative threshold)

    return {
      Property(node) {
        // Check for inlineData property
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'inlineData' &&
          isObjectExpression(node.value)
        ) {
          const dataProp = findProperty(node.value, 'data');

          if (dataProp) {
            const dataValue = getStringValue(dataProp.value);

            if (dataValue && dataValue.length > BASE64_THRESHOLD) {
              // Estimate original size (base64 is ~4/3 of original)
              const estimatedBytes = (dataValue.length * 3) / 4;
              const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(2);

              context.report({
                node: dataProp,
                messageId: 'longBase64Detected',
                data: {
                  length: dataValue.length.toString(),
                  sizeMB: estimatedMB,
                },
              });
            }
          }

          // Also check mimeType to give context-aware suggestions
          const mimeTypeProp = findProperty(node.value, 'mimeType');
          if (mimeTypeProp) {
            const mimeType = getStringValue(mimeTypeProp.value);

            // Video and audio files are typically large
            if (
              mimeType &&
              (mimeType.startsWith('video/') || mimeType.startsWith('audio/'))
            ) {
              context.report({
                node,
                messageId: 'useCloudStorage',
              });
            }
          }
        }

        // Suggest fileData pattern when appropriate
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'data' &&
          node.parent?.type === 'ObjectExpression'
        ) {
          // Check if this is inside an inlineData context
          const parent = node.parent;
          const grandparent = parent.parent;

          if (
            grandparent?.type === 'Property' &&
            grandparent.key.type === 'Identifier' &&
            grandparent.key.name === 'inlineData'
          ) {
            const dataValue = getStringValue(node.value);

            // Check for very long base64 strings
            if (dataValue && dataValue.length > 1000000) {
              // ~750KB+
              const estimatedMB = ((dataValue.length * 3) / 4 / (1024 * 1024)).toFixed(2);

              context.report({
                node,
                messageId: 'longBase64Detected',
                data: {
                  length: dataValue.length.toString(),
                  sizeMB: estimatedMB,
                },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
