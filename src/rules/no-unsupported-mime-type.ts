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
        'Detect unsupported MIME types for multimodal content in Firebase AI Logic',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-unsupported-mime-type',
    },
    schema: [],
    messages: {
      unsupportedMimeType:
        "MIME type '{{ mimeType }}' is not supported by Gemini. Supported image types: image/png, image/jpeg, image/webp, image/gif, image/heic, image/heif",
      unsupportedVideoType:
        "MIME type '{{ mimeType }}' may not be supported. Supported video types: video/mp4, video/webm, video/mov, video/mpeg, video/mpg, video/avi, video/wmv, video/mpegps, video/flv",
      unsupportedAudioType:
        "MIME type '{{ mimeType }}' may not be supported. Supported audio types: audio/mp3, audio/wav, audio/aiff, audio/aac, audio/ogg, audio/flac",
      unsupportedDocumentType:
        "MIME type '{{ mimeType }}' may not be supported. Supported document types: application/pdf, text/plain, text/html, text/css, text/javascript, application/json",
    },
  },

  create(context) {
    const supportedImageTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ];

    const supportedVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/mov',
      'video/mpeg',
      'video/mpg',
      'video/avi',
      'video/wmv',
      'video/mpegps',
      'video/flv',
      'video/3gpp',
    ];

    const supportedAudioTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/aiff',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
    ];

    const supportedDocumentTypes = [
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/javascript',
      'text/x-python',
      'text/markdown',
      'text/csv',
      'text/xml',
      'application/xml',
    ];

    function checkMimeType(node: Rule.Node, mimeType: string) {
      const lowerMimeType = mimeType.toLowerCase();

      // Check image types
      if (lowerMimeType.startsWith('image/')) {
        if (!supportedImageTypes.includes(lowerMimeType)) {
          context.report({
            node,
            messageId: 'unsupportedMimeType',
            data: { mimeType },
          });
        }
        return;
      }

      // Check video types
      if (lowerMimeType.startsWith('video/')) {
        if (!supportedVideoTypes.includes(lowerMimeType)) {
          context.report({
            node,
            messageId: 'unsupportedVideoType',
            data: { mimeType },
          });
        }
        return;
      }

      // Check audio types
      if (lowerMimeType.startsWith('audio/')) {
        if (!supportedAudioTypes.includes(lowerMimeType)) {
          context.report({
            node,
            messageId: 'unsupportedAudioType',
            data: { mimeType },
          });
        }
        return;
      }

      // Check document types
      if (
        lowerMimeType.startsWith('application/') ||
        lowerMimeType.startsWith('text/')
      ) {
        if (!supportedDocumentTypes.includes(lowerMimeType)) {
          context.report({
            node,
            messageId: 'unsupportedDocumentType',
            data: { mimeType },
          });
        }
        return;
      }
    }

    return {
      Property(node) {
        // Check if parent is inlineData or fileData - if so, skip here as we'll handle it in parent
        const parentIsInlineOrFileData =
          node.parent?.type === 'ObjectExpression' &&
          node.parent.parent?.type === 'Property' &&
          (node.parent.parent.key.type === 'Identifier') &&
          (node.parent.parent.key.name === 'inlineData' ||
            node.parent.parent.key.name === 'fileData');

        // Look for mimeType property (but skip if it's inside inlineData/fileData, we'll handle it there)
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'mimeType' &&
          !parentIsInlineOrFileData
        ) {
          const mimeTypeValue = getStringValue(node.value);

          if (mimeTypeValue) {
            checkMimeType(node.value as Rule.Node, mimeTypeValue);
          }
          return;
        }

        // Also check inlineData objects
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'inlineData' &&
          isObjectExpression(node.value)
        ) {
          const mimeTypeProp = findProperty(node.value, 'mimeType');

          if (mimeTypeProp) {
            const mimeTypeValue = getStringValue(mimeTypeProp.value);

            if (mimeTypeValue) {
              checkMimeType(mimeTypeProp.value as Rule.Node, mimeTypeValue);
            }
          }
          return;
        }

        // Check fileData objects
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'fileData' &&
          isObjectExpression(node.value)
        ) {
          const mimeTypeProp = findProperty(node.value, 'mimeType');

          if (mimeTypeProp) {
            const mimeTypeValue = getStringValue(mimeTypeProp.value);

            if (mimeTypeValue) {
              checkMimeType(mimeTypeProp.value as Rule.Node, mimeTypeValue);
            }
          }
          return;
        }
      },
    };
  },
};

export default rule;
