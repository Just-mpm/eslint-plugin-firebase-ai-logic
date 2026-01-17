import type { Rule } from 'eslint';
import { getCalleeName } from '../utils/ast-helpers.js';

/**
 * require-error-handling
 *
 * This rule suggests adding error handling for Firebase AI Logic API calls.
 *
 * RECOGNIZED ERROR HANDLING PATTERNS:
 * 1. Direct try/catch blocks
 * 2. .catch() chains
 * 3. .then(onFulfilled, onRejected) with error handler
 * 4. Wrapper functions with built-in error handling:
 *    - retryWithBackoff
 *    - withRetry
 *    - safeCall
 *    - handleApiCall
 *    - executeWithRetry
 * 5. Async generators (errors propagate to consumer's try/catch)
 * 6. Class methods that are async generators
 * 7. Calls prefixed with "void" operator (fire-and-forget pattern)
 *
 * The rule checks if the API call is:
 * - Inside a try/catch block
 * - Chained with .catch()
 * - Wrapped in a known error-handling function
 * - Inside an async generator (errors propagate to consumer)
 * - Called with "void" operator (assumes internal error handling)
 *
 * OPTIONS:
 * - ignoreVoidCalls (boolean, default: true): Ignore calls with "void" operator
 * - ignoreCallers (string[], default: []): Function names to ignore
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest error handling for Firebase AI Logic API calls, especially for rate limit (429) errors',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-error-handling',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreVoidCalls: {
            type: 'boolean',
            default: true,
            description:
              'Ignore calls prefixed with "void" operator. These typically call functions that handle errors internally.',
          },
          ignoreCallers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Function names to ignore when they call API methods (e.g., ["sendMessage", "handleSubmit"]). Useful for wrapper functions with internal error handling.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingErrorHandling:
        "Firebase AI Logic API call '{{ method }}' should be wrapped in try/catch to handle errors, especially 429 rate limit errors.",
      suggest429Handling:
        'Implement exponential backoff with jitter for 429 errors: delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000',
      awaitWithoutTryCatch:
        "Awaited Firebase AI Logic call '{{ method }}' should have error handling. Consider using try/catch or .catch().",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const ignoreVoidCalls = options.ignoreVoidCalls !== false; // Default true
    const ignoreCallers: string[] = options.ignoreCallers ?? [];

    // Methods that make API calls and should have error handling
    const apiMethods = [
      'generateContent',
      'generateContentStream',
      'sendMessage',
      'sendMessageStream',
      'countTokens',
      'embedContent',
    ];

    // Common wrapper functions that provide error handling
    const errorHandlingWrappers = [
      'retryWithBackoff',
      'withRetry',
      'safeCall',
      'handleApiCall',
      'executeWithRetry',
      'withErrorHandling',
      'tryCatch',
      'safeFetch',
      'retryOperation',
    ];

    function isInsideTryCatch(node: Rule.Node): boolean {
      let current = node.parent;

      while (current) {
        if (current.type === 'TryStatement') {
          return true;
        }
        // Also check for .catch() chain
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'MemberExpression' &&
          current.callee.property.type === 'Identifier' &&
          current.callee.property.name === 'catch'
        ) {
          return true;
        }
        current = (current.parent as Rule.Node | undefined) || null;
      }

      return false;
    }

    function isInsideAsyncErrorBoundary(node: Rule.Node): boolean {
      let current = node.parent;

      while (current) {
        // Check for Promise.catch
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'MemberExpression' &&
          current.callee.property.type === 'Identifier' &&
          (current.callee.property.name === 'catch' ||
            current.callee.property.name === 'finally')
        ) {
          return true;
        }

        // Check for error handler in Promise.then
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'MemberExpression' &&
          current.callee.property.type === 'Identifier' &&
          current.callee.property.name === 'then' &&
          current.arguments.length > 1
        ) {
          return true;
        }

        current = (current.parent as Rule.Node | undefined) || null;
      }

      return false;
    }

    function isInsideErrorHandlingWrapper(node: Rule.Node): boolean {
      let current = node.parent;

      while (current) {
        // Check if we're inside a call to a known error handling wrapper
        if (current.type === 'CallExpression') {
          const wrapperName = getCalleeName(current);
          if (wrapperName && errorHandlingWrappers.includes(wrapperName)) {
            return true;
          }
        }

        // Check if we're inside an arrow function or function expression
        // that is passed to a known error handling wrapper
        if (
          current.type === 'ArrowFunctionExpression' ||
          current.type === 'FunctionExpression'
        ) {
          const parent = current.parent;
          if (parent?.type === 'CallExpression') {
            const wrapperName = getCalleeName(parent);
            if (wrapperName && errorHandlingWrappers.includes(wrapperName)) {
              return true;
            }
          }
        }

        current = (current.parent as Rule.Node | undefined) || null;
      }

      return false;
    }

    /**
     * Check if the call is inside an async generator function.
     * Async generators propagate errors to the consumer's for-await-of loop,
     * where they can be caught in a try/catch block. This is a valid error
     * handling pattern.
     */
    function isInsideAsyncGenerator(node: Rule.Node): boolean {
      let current = node.parent;

      while (current) {
        // Check for async generator functions (function* or async function*)
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression'
        ) {
          const funcNode = current as {
            async?: boolean;
            generator?: boolean;
          };
          if (funcNode.async && funcNode.generator) {
            return true;
          }
        }

        // Check for async generator method definitions in classes
        if (current.type === 'MethodDefinition') {
          const methodNode = current as {
            value?: {
              async?: boolean;
              generator?: boolean;
            };
          };
          if (methodNode.value?.async && methodNode.value?.generator) {
            return true;
          }
        }

        current = (current.parent as Rule.Node | undefined) || null;
      }

      return false;
    }

    /**
     * Check if the call is wrapped with the "void" operator.
     * Pattern: void sendMessage(msg)
     *
     * When using "void", developers intentionally fire-and-forget,
     * meaning error handling is expected to be inside the called function.
     */
    function isVoidCall(node: Rule.Node): boolean {
      const parent = node.parent;
      if (!parent) return false;

      // Direct void: void sendMessage()
      if (parent.type === 'UnaryExpression') {
        const unary = parent as { operator: string };
        if (unary.operator === 'void') {
          return true;
        }
      }

      // void wrapper(): void wrapperFn() where wrapperFn calls sendMessage
      // Check if we're inside a function that's called with void
      let current: Rule.Node | null = parent;
      while (current) {
        if (
          current.type === 'ArrowFunctionExpression' ||
          current.type === 'FunctionExpression'
        ) {
          const funcParent = (current as { parent?: Rule.Node }).parent;
          if (funcParent?.type === 'CallExpression') {
            const callParent = (funcParent as { parent?: Rule.Node }).parent;
            if (callParent?.type === 'UnaryExpression') {
              const unary = callParent as { operator: string };
              if (unary.operator === 'void') {
                return true;
              }
            }
          }
        }
        current = ((current as { parent?: Rule.Node }).parent as Rule.Node | undefined) ?? null;
      }

      return false;
    }

    /**
     * Check if the API call is inside a caller function that should be ignored.
     * This handles the pattern where a wrapper function (e.g., sendMessage in a hook)
     * has internal error handling, and is called from elsewhere.
     */
    function isInsideIgnoredCaller(node: Rule.Node): boolean {
      if (ignoreCallers.length === 0) return false;

      let current: Rule.Node | null = node.parent ?? null;
      while (current) {
        // Check for function declaration with matching name
        if (current.type === 'FunctionDeclaration') {
          const funcDecl = current as { id?: { name: string } | null };
          if (funcDecl.id && ignoreCallers.includes(funcDecl.id.name)) {
            return true;
          }
        }

        // Check for variable declaration: const sendMessage = async () => { ... }
        if (
          current.type === 'ArrowFunctionExpression' ||
          current.type === 'FunctionExpression'
        ) {
          const funcParent = (current as { parent?: Rule.Node }).parent;
          if (funcParent?.type === 'VariableDeclarator') {
            const varDecl = funcParent as { id?: { name: string } };
            if (varDecl.id && ignoreCallers.includes(varDecl.id.name)) {
              return true;
            }
          }
        }

        current = ((current as { parent?: Rule.Node }).parent as Rule.Node | undefined) ?? null;
      }

      return false;
    }

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (!calleeName || !apiMethods.includes(calleeName)) {
          return;
        }

        // Check if this is an awaited call
        const isAwaited = node.parent?.type === 'AwaitExpression';

        // Check for void operator (fire-and-forget pattern)
        if (ignoreVoidCalls && isVoidCall(node as Rule.Node)) {
          return;
        }

        // Check if inside an ignored caller function
        if (isInsideIgnoredCaller(node as Rule.Node)) {
          return;
        }

        // Check if inside try/catch, has .catch(), inside error handling wrapper,
        // or inside an async generator (which propagates errors to consumer)
        const hasErrorHandling =
          isInsideTryCatch(node as Rule.Node) ||
          isInsideAsyncErrorBoundary(node as Rule.Node) ||
          isInsideErrorHandlingWrapper(node as Rule.Node) ||
          isInsideAsyncGenerator(node as Rule.Node);

        if (!hasErrorHandling) {
          context.report({
            node,
            messageId: isAwaited ? 'awaitWithoutTryCatch' : 'missingErrorHandling',
            data: {
              method: calleeName,
            },
          });
        }
      },
    };
  },
};

export default rule;
