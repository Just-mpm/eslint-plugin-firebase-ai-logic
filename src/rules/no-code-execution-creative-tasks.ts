import type { Rule } from 'eslint';
import {
  findProperty,
  isObjectExpression,
  getStringValue,
  getCalleeName,
} from '../utils/ast-helpers.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest disabling Code Execution for creative tasks (poems, stories, etc.) to reduce latency and improve quality',
      recommended: false,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#no-code-execution-creative-tasks',
    },
    schema: [],
    messages: {
      noCodeExecForCreative:
        'Code Execution is enabled, but the prompt appears to be a creative task ("{{ task }}"). Disabling it can reduce latency and improve quality for non-computational tasks.',
    },
  },

  create(context) {
    const creativeIndicators = [
      'poem',
      'story',
      'joke',
      'creative writing',
      'fable',
      'novel',
      'haiku',
      'lyrics',
    ];

    let codeExecutionEnabled = false;
    let codeExecNode: any = null;

    return {
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'codeExecution'
        ) {
          codeExecutionEnabled = true;
          codeExecNode = node;
        }
      },

      CallExpression(node) {
         if (!codeExecutionEnabled) return;
         
         const calleeName = getCalleeName(node);
         if (calleeName !== 'generateContent' && calleeName !== 'getGenerativeModel') return;
         
         let promptText = '';
         if (calleeName === 'generateContent') {
            const arg = node.arguments[0];
            if (arg) promptText = getStringValue(arg) || '';
         } else {
            // getGenerativeModel config
            const config = node.arguments[1];
            if (isObjectExpression(config)) {
               const sysInst = findProperty(config, 'systemInstruction');
               if (sysInst) promptText = getStringValue(sysInst.value) || '';
            }
         }
         
         if (promptText) {
            const lower = promptText.toLowerCase();
            const found = creativeIndicators.find(ind => lower.includes(ind));
            if (found) {
               context.report({
                  node: codeExecNode || node,
                  messageId: 'noCodeExecForCreative',
                  data: { task: found }
               });
            }
         }
      }
    };
  },
};

export default rule;
