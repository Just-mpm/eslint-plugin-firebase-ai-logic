import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getStringValue,
} from '../utils/ast-helpers.js';

// Threshold: 5MB in base64 = ~6.67M characters (base64 is 4/3 of original)
// Default threshold used in docs is 5MB
const DEFAULT_THRESHOLD_MB = 5;

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using Cloud Storage (gs://) URLs instead of base64 for large files (>5MB). Base64 encoding adds ~33% overhead.',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#prefer-cloud-storage-large-files',
    },
    schema: [
      {
        type: 'object',
        properties: {
          thresholdMB: {
            type: 'number',
            default: 5,
            description: 'File size threshold in MB above which to suggest Cloud Storage',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useCloudStorage:
        'For files > {{ threshold }}MB, prefer Cloud Storage (gs://) URLs instead of base64 inlineData. Base64 adds ~33% overhead. Use fileData: { fileUri: "gs://bucket/path", mimeType: "..." } instead.',
      longBase64Detected:
        'Large base64 string detected ({{ length }} chars ≈ {{ sizeMB }}MB). Consider using Cloud Storage for better performance.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const thresholdMB = options.thresholdMB ?? DEFAULT_THRESHOLD_MB;
    const thresholdBytes = thresholdMB * 1024 * 1024;
    const thresholdChars = Math.ceil((thresholdBytes * 4) / 3);

    // Track nodes we've already reported on to avoid duplicates
    const reportedNodes = new WeakSet<Rule.Node>();

    /**
     * Report large base64 data
     */
    function reportLargeBase64(node: Rule.Node, dataLength: number) {
      if (reportedNodes.has(node)) return;
      reportedNodes.add(node);

      const estimatedBytes = (dataLength * 3) / 4;
      const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(2);

      context.report({
        node,
        messageId: 'longBase64Detected',
        data: {
          length: dataLength.toString(),
          sizeMB: estimatedMB,
        },
      });
    }

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

            if (dataValue && dataValue.length > thresholdChars) {
              reportLargeBase64(dataProp as Rule.Node, dataValue.length);
            }
          }

          // Check mimeType for video/audio - but only if data is also present and large
          // or if data is a variable (can't check size statically)
          const mimeTypeProp = findProperty(node.value, 'mimeType');
          if (mimeTypeProp && dataProp) {
            const mimeType = getStringValue(mimeTypeProp.value);
            const dataValue = getStringValue(dataProp.value);

            // Only warn for video/audio if:
            // 1. Data is a variable (can't check size) - give informational warning
            // 2. Data is large (already caught above, skip to avoid double report)
            if (
              mimeType &&
              (mimeType.startsWith('video/') || mimeType.startsWith('audio/'))
            ) {
              // If data is not a literal string, we can't check size - warn as suggestion
              if (!dataValue && !reportedNodes.has(node)) {
                reportedNodes.add(node);
                context.report({
                  node,
                  messageId: 'useCloudStorage',
                  data: {
                    threshold: thresholdMB.toString(),
                  },
                });
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
