import type { Rule } from 'eslint';
import type { Node as ESTreeNode, ReturnStatement, FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, CallExpression } from 'estree';
import { getCalleeName, isCallExpression } from '../utils/ast-helpers.js';

/**
 * Patterns that indicate a function likely returns an AI instance.
 * These are common naming conventions for AI wrapper/factory functions.
 */
const AI_WRAPPER_PATTERNS = [
  /^getAI/i,           // getAI, getAIInstance, getAiClient
  /^createAI/i,        // createAI, createAIInstance
  /^initAI/i,          // initAI, initializeAI
  /^aiInstance$/i,     // aiInstance (variable or function)
  /^aiClient$/i,       // aiClient
  /^firebaseAI$/i,     // firebaseAI
  /AI$/,               // ends with AI (getMyAI, createFirebaseAI)
  /AIInstance$/i,      // ends with AIInstance
];

/**
 * Check if a function name matches common AI wrapper patterns
 */
function matchesAIWrapperPattern(name: string): boolean {
  return AI_WRAPPER_PATTERNS.some(pattern => pattern.test(name));
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require getAI() to be called before getGenerativeModel() in the same scope',
      recommended: true,
      url: 'https://github.com/Just-mpm/eslint-plugin-firebase-ai-logic#require-ai-before-model',
    },
    schema: [],
    messages: {
      missingGetAI:
        "getGenerativeModel() requires an AI instance from getAI(). Make sure to call 'const ai = getAI(app, { backend: new GoogleAIBackend() })' before using getGenerativeModel(ai, config).",
      wrongFirstArg:
        "First argument to getGenerativeModel() should be the AI instance returned by getAI(), not '{{ argType }}'.",
    },
  },

  create(context) {
    // Track getAI calls and their returned variables (by name or pattern)
    const aiVariables = new Set<string>();

    // Track class properties assigned from getAI (e.g., this.ai)
    const classAiProperties = new Set<string>();

    // Track functions that return getAI() result (wrapper functions)
    // e.g., function getAIInstance() { return getAI(app); }
    const aiWrapperFunctions = new Set<string>();

    // Track imported functions that match AI wrapper naming patterns
    // These are assumed to be valid wrappers since we can't analyze external modules
    const importedAIWrappers = new Set<string>();

    /**
     * Get the full name of a variable assignment target
     * Handles: identifier, this.property, and member expressions
     */
    function getAssignmentTargetName(node: Rule.Node): string | null {
      if (node.type === 'Identifier') {
        return node.name;
      }

      // this.ai = getAI(...)
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'ThisExpression' &&
        node.property.type === 'Identifier'
      ) {
        return `this.${node.property.name}`;
      }

      return null;
    }

    /**
     * Get the name pattern used in getGenerativeModel's first argument
     */
    function getFirstArgPattern(node: Rule.Node): string | null {
      // Simple identifier: ai
      if (node.type === 'Identifier') {
        return node.name;
      }

      // this.ai
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'ThisExpression' &&
        node.property.type === 'Identifier'
      ) {
        return `this.${node.property.name}`;
      }

      // ctx.ai or service.ai - we can't track these reliably
      // so we'll be conservative and not report
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.property.type === 'Identifier'
      ) {
        return `${node.object.name}.${node.property.name}`;
      }

      return null;
    }

    /**
     * Check if the first argument is a known AI instance
     */
    function isKnownAiInstance(pattern: string): boolean {
      // Direct match
      if (aiVariables.has(pattern)) return true;
      if (classAiProperties.has(pattern)) return true;

      // If it's a property access like ctx.ai, we can't track it
      // Be conservative and assume it's valid
      if (pattern.includes('.') && !pattern.startsWith('this.')) {
        return true; // Assume external properties are valid
      }

      return false;
    }

    /**
     * Check if a node is a CallExpression calling getAI
     */
    function isGetAICall(node: ESTreeNode): boolean {
      if (!isCallExpression(node)) return false;
      return getCalleeName(node as CallExpression) === 'getAI';
    }

    /**
     * Check if a function body contains a return statement that returns getAI() or a cached AI instance
     * Handles patterns like:
     * - return getAI(app);
     * - if (!aiInstance) { aiInstance = getAI(app); } return aiInstance;
     */
    function functionReturnsAI(body: ESTreeNode): boolean {
      if (body.type !== 'BlockStatement') {
        // Arrow function with expression body: () => getAI(app)
        if (isGetAICall(body)) {
          return true;
        }
        return false;
      }

      // Track variables assigned from getAI within the function
      const localAiVariables = new Set<string>();

      // Check all statements in the block
      for (const statement of body.body) {
        // Track: aiInstance = getAI(app)
        if (statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression') {
          const assignment = statement.expression;
          if (isGetAICall(assignment.right) && assignment.left.type === 'Identifier') {
            localAiVariables.add(assignment.left.name);
          }
        }

        // Track: const ai = getAI(app)
        if (statement.type === 'VariableDeclaration') {
          for (const decl of statement.declarations) {
            if (decl.init && isGetAICall(decl.init) && decl.id.type === 'Identifier') {
              localAiVariables.add(decl.id.name);
            }
          }
        }

        // Check if statements: if (!aiInstance) { aiInstance = getAI(app); }
        if (statement.type === 'IfStatement') {
          const consequent = statement.consequent;
          if (consequent.type === 'BlockStatement') {
            for (const innerStmt of consequent.body) {
              if (innerStmt.type === 'ExpressionStatement' && innerStmt.expression.type === 'AssignmentExpression') {
                const assignment = innerStmt.expression;
                if (isGetAICall(assignment.right) && assignment.left.type === 'Identifier') {
                  localAiVariables.add(assignment.left.name);
                }
              }
            }
          }
        }

        // Check return statements
        if (statement.type === 'ReturnStatement') {
          const returnStmt = statement as ReturnStatement;
          if (returnStmt.argument) {
            // return getAI(app)
            if (isGetAICall(returnStmt.argument)) {
              return true;
            }
            // return aiInstance (where aiInstance was assigned from getAI)
            if (returnStmt.argument.type === 'Identifier' && localAiVariables.has(returnStmt.argument.name)) {
              return true;
            }
          }
        }
      }

      return false;
    }

    /**
     * Check if a CallExpression is calling a known AI wrapper function
     */
    function isAIWrapperCall(calleeName: string | null): boolean {
      if (!calleeName) return false;
      // Check local wrapper functions (defined in this file)
      if (aiWrapperFunctions.has(calleeName)) return true;
      // Check imported functions that match AI wrapper naming patterns
      if (importedAIWrappers.has(calleeName)) return true;
      return false;
    }

    return {
      // Track imports that match AI wrapper naming patterns
      // e.g., import { getAIInstance } from '../ai';
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          // Get the local name (what it's called in this file)
          let localName: string | null = null;

          if (specifier.type === 'ImportSpecifier') {
            // import { getAIInstance } or import { getAIInstance as myAI }
            localName = specifier.local.name;
          } else if (specifier.type === 'ImportDefaultSpecifier') {
            // import getAIInstance from '...'
            localName = specifier.local.name;
          }
          // ImportNamespaceSpecifier (import * as ai) is not tracked as a wrapper

          if (localName && matchesAIWrapperPattern(localName)) {
            importedAIWrappers.add(localName);
          }
        }
      },

      // Track function declarations that return getAI
      FunctionDeclaration(node) {
        const funcNode = node as unknown as FunctionDeclaration;
        if (funcNode.id && funcNode.body && functionReturnsAI(funcNode.body)) {
          aiWrapperFunctions.add(funcNode.id.name);
        }
      },

      // Track variable declarations that call getAI or are arrow functions returning getAI
      VariableDeclarator(node) {
        // const ai = getAI(app)
        if (
          node.init &&
          isCallExpression(node.init) &&
          getCalleeName(node.init) === 'getAI' &&
          node.id.type === 'Identifier'
        ) {
          aiVariables.add(node.id.name);
        }

        // const getAIInstance = () => getAI(app)
        // const getAIInstance = function() { return getAI(app); }
        if (
          node.init &&
          node.id.type === 'Identifier' &&
          (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
        ) {
          const funcExpr = node.init as ArrowFunctionExpression | FunctionExpression;
          if (functionReturnsAI(funcExpr.body as ESTreeNode)) {
            aiWrapperFunctions.add(node.id.name);
          }
        }
      },

      // Track assignments that call getAI
      AssignmentExpression(node) {
        if (isCallExpression(node.right) && getCalleeName(node.right) === 'getAI') {
          const targetName = getAssignmentTargetName(node.left as Rule.Node);
          if (targetName) {
            if (targetName.startsWith('this.')) {
              classAiProperties.add(targetName);
            } else {
              aiVariables.add(targetName);
            }
          }
        }
      },

      // Track class property definitions with getAI
      PropertyDefinition(node) {
        if (
          node.value &&
          isCallExpression(node.value) &&
          getCalleeName(node.value) === 'getAI' &&
          node.key.type === 'Identifier'
        ) {
          classAiProperties.add(`this.${node.key.name}`);
        }
      },

      // Check getGenerativeModel calls
      CallExpression(node) {
        const calleeName = getCalleeName(node);

        if (calleeName !== 'getGenerativeModel') return;

        const args = node.arguments;

        if (args.length === 0) {
          context.report({
            node,
            messageId: 'missingGetAI',
          });
          return;
        }

        const firstArg = args[0];

        // Handle identifiers and member expressions
        if (
          firstArg.type === 'Identifier' ||
          firstArg.type === 'MemberExpression'
        ) {
          const pattern = getFirstArgPattern(firstArg as Rule.Node);

          if (pattern) {
            // Only report if we're sure it's not an AI instance
            // If it's a property access we can't track (like ctx.ai), don't report
            if (!isKnownAiInstance(pattern)) {
              // For simple identifiers not tracked, only report if we have
              // tracked at least one getAI call (meaning the file uses getAI)
              // This avoids false positives when AI is imported from another module
              if (
                aiVariables.size === 0 &&
                classAiProperties.size === 0 &&
                !pattern.startsWith('this.')
              ) {
                // No getAI tracked in this file - AI might be imported
                // Be conservative and don't report
                return;
              }

              context.report({
                node: firstArg,
                messageId: 'wrongFirstArg',
                data: {
                  argType: pattern,
                },
              });
            }
          }
          return;
        }

        // First argument is a literal (string, number, etc.) - definitely wrong
        if (firstArg.type === 'Literal') {
          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: typeof firstArg.value,
            },
          });
          return;
        }

        // First argument is an object - should be AI instance, not config
        if (firstArg.type === 'ObjectExpression') {
          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: 'object',
            },
          });
          return;
        }

        // For CallExpression as first arg (e.g., getGenerativeModel(getAI(...), ...) or getGenerativeModel(getAIInstance(), ...))
        // This is valid if it's a direct getAI call OR a known AI wrapper function
        if (firstArg.type === 'CallExpression') {
          const innerCallee = getCalleeName(firstArg);

          // Valid cases:
          // 1. getGenerativeModel(getAI(app), config) - direct getAI call
          // 2. getGenerativeModel(getAIInstance(), config) - known wrapper function
          if (innerCallee === 'getAI' || isAIWrapperCall(innerCallee)) {
            return; // Valid - don't report
          }

          context.report({
            node: firstArg,
            messageId: 'wrongFirstArg',
            data: {
              argType: innerCallee || 'function call',
            },
          });
        }
      },
    };
  },
};

export default rule;
