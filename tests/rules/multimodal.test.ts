import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

import noUnsupportedMimeType from '../../src/rules/no-unsupported-mime-type.js';
import preferCloudStorageLargeFiles from '../../src/rules/prefer-cloud-storage-large-files.js';
import checkMediaResolution from '../../src/rules/check-media-resolution.js';
import validateMultimodalConfig from '../../src/rules/validate-multimodal-config.js';

const ruleTester = new RuleTester();

describe('Multimodal Rules', () => {
  describe('no-unsupported-mime-type', () => {
    ruleTester.run('no-unsupported-mime-type', noUnsupportedMimeType, {
      valid: [
        // Supported image types
        `const part = { inlineData: { data: base64, mimeType: 'image/png' } };`,
        `const part = { inlineData: { data: base64, mimeType: 'image/jpeg' } };`,
        `const part = { inlineData: { data: base64, mimeType: 'image/webp' } };`,
        `const part = { inlineData: { data: base64, mimeType: 'image/gif' } };`,
        `const part = { inlineData: { data: base64, mimeType: 'image/heic' } };`,
        // Supported video types
        `const part = { fileData: { fileUri: uri, mimeType: 'video/mp4' } };`,
        `const part = { fileData: { fileUri: uri, mimeType: 'video/webm' } };`,
        // Supported audio types
        `const part = { inlineData: { data: base64, mimeType: 'audio/mp3' } };`,
        `const part = { inlineData: { data: base64, mimeType: 'audio/wav' } };`,
        // Supported document types
        `const part = { inlineData: { data: base64, mimeType: 'application/pdf' } };`,
        `const part = { inlineData: { data: base64, mimeType: 'text/plain' } };`,
      ],
      invalid: [
        // Unsupported image type
        {
          code: `const part = { inlineData: { data: base64, mimeType: 'image/bmp' } };`,
          errors: [{ messageId: 'unsupportedMimeType' }],
        },
        {
          code: `const part = { inlineData: { data: base64, mimeType: 'image/tiff' } };`,
          errors: [{ messageId: 'unsupportedMimeType' }],
        },
        // Unsupported video type
        {
          code: `const part = { fileData: { fileUri: uri, mimeType: 'video/mkv' } };`,
          errors: [{ messageId: 'unsupportedVideoType' }],
        },
        // Unsupported audio type
        {
          code: `const part = { inlineData: { data: base64, mimeType: 'audio/m4a' } };`,
          errors: [{ messageId: 'unsupportedAudioType' }],
        },
        // Unsupported document type
        {
          code: `const part = { inlineData: { data: base64, mimeType: 'application/msword' } };`,
          errors: [{ messageId: 'unsupportedDocumentType' }],
        },
      ],
    });
  });

  describe('prefer-cloud-storage-large-files', () => {
    ruleTester.run('prefer-cloud-storage-large-files', preferCloudStorageLargeFiles, {
      valid: [
        // Small base64 data
        `const part = { inlineData: { data: 'small', mimeType: 'image/png' } };`,
        // Using fileData (Cloud Storage)
        `const part = { fileData: { fileUri: 'gs://bucket/image.png', mimeType: 'image/png' } };`,
      ],
      invalid: [
        // Video with inlineData (should use Cloud Storage)
        {
          code: `const part = { inlineData: { data: base64Video, mimeType: 'video/mp4' } };`,
          errors: [{ messageId: 'useCloudStorage' }],
        },
        // Audio with inlineData
        {
          code: `const part = { inlineData: { data: base64Audio, mimeType: 'audio/mp3' } };`,
          errors: [{ messageId: 'useCloudStorage' }],
        },
      ],
    });
  });

  describe('check-media-resolution', () => {
    ruleTester.run('check-media-resolution', checkMediaResolution, {
      valid: [
        `const part = { inlineData: { data: '...', mimeType: 'image/jpeg' }, mediaResolution: { level: 'media_resolution_high' } };`,
        `const part = { inlineData: { data: '...', mimeType: 'image/jpeg' }, mediaResolution: { level: 'media_resolution_low' } };`,
      ],
      invalid: [
        {
          code: `const part = { inlineData: { data: '...', mimeType: 'image/jpeg' }, mediaResolution: { level: 'ultra_high' } };`,
          errors: [{ messageId: 'invalidMediaResolution' }],
        },
      ],
    });
  });

  describe('validate-multimodal-config', () => {
    ruleTester.run('validate-multimodal-config', validateMultimodalConfig, {
      valid: [
        `
        const ai = getAI(app, { backend: new VertexAIBackend() });
        const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });
        const result = await model.generateContent([{ fileData: { fileUri: 'gs://...', mimeType: 'image/jpeg' } }]);
        `,
        `
        const ai = getAI(app, { backend: new GoogleAIBackend() });
        const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });
        const result = await model.generateContent([{ inlineData: { data: '...', mimeType: 'image/jpeg' } }]);
        `,
      ],
      invalid: [
        {
          code: `
          const ai = getAI(app, { backend: new GoogleAIBackend() });
          const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });
          const result = await model.generateContent([{ fileData: { fileUri: 'gs://...', mimeType: 'image/jpeg' } }]);
          `,
          errors: [{ messageId: 'fileUriRequiresVertex' }],
        },
      ],
    });
  });
});
