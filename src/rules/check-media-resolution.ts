import type { Rule } from 'eslint';
import {
  isObjectExpression,
  findProperty,
  getStringValue,
} from '../utils/ast-helpers.js';
import { MEDIA_RESOLUTION_LEVELS } from '../utils/constants.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validate media_resolution usage and suggest valid levels',
      recommended: false,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#check-media-resolution',
    },
    schema: [],
    messages: {
      invalidMediaResolution:
        "Invalid media resolution '{{ resolution }}'. Valid levels are: {{ validLevels }}.",
    },
  },

  create(context) {
    return {
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'mediaResolution'
        ) {
           // Can be { mediaResolution: "..." } or { mediaResolution: { level: "..." } }
           // The docs show JS: mediaResolution: { level: "..." }
           
           if (isObjectExpression(node.value)) {
              const levelProp = findProperty(node.value, 'level');
              if (levelProp) {
                 const levelValue = getStringValue(levelProp.value);
                 if (levelValue && !MEDIA_RESOLUTION_LEVELS.includes(levelValue as any)) {
                    context.report({
                       node: levelProp.value,
                       messageId: 'invalidMediaResolution',
                       data: {
                          resolution: levelValue,
                          validLevels: MEDIA_RESOLUTION_LEVELS.join(', '),
                       }
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
