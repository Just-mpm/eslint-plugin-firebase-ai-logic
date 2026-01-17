import type { Rule } from 'eslint';
import type { Node, CallExpression, Literal, Property, Identifier, MemberExpression, ObjectExpression, TemplateLiteral, ArrayExpression, NewExpression } from 'estree';

/**
 * Check if a node is a string literal
 */
export function isStringLiteral(node: Node | null | undefined): node is Literal & { value: string } {
  return node?.type === 'Literal' && typeof (node as Literal).value === 'string';
}

/**
 * Check if a node is a template literal
 */
export function isTemplateLiteral(node: Node | null | undefined): node is TemplateLiteral {
  return node?.type === 'TemplateLiteral';
}

/**
 * Get string value from a literal or template literal
 */
export function getStringValue(node: Node | null | undefined): string | null {
  if (!node) return null;

  if (isStringLiteral(node)) {
    return node.value;
  }

  if (isTemplateLiteral(node) && node.quasis.length === 1 && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? null;
  }

  return null;
}

/**
 * Get number value from a literal node
 */
export function getNumberValue(node: Node | null | undefined): number | null {
  if (!node) return null;

  if (node.type === 'Literal' && typeof (node as Literal).value === 'number') {
    return (node as Literal).value as number;
  }

  // Handle negative numbers (UnaryExpression with '-' operator)
  if (
    node.type === 'UnaryExpression' &&
    (node as { operator: string }).operator === '-' &&
    (node as { argument: Node }).argument.type === 'Literal'
  ) {
    const literal = (node as { argument: Literal }).argument;
    if (typeof literal.value === 'number') {
      return -literal.value;
    }
  }

  return null;
}

/**
 * Check if a node is an identifier with a specific name
 */
export function isIdentifier(node: Node | null | undefined, name?: string): node is Identifier {
  if (node?.type !== 'Identifier') return false;
  if (name !== undefined) return (node as Identifier).name === name;
  return true;
}

/**
 * Check if a node is a call expression
 */
export function isCallExpression(node: Node | null | undefined): node is CallExpression {
  return node?.type === 'CallExpression';
}

/**
 * Check if a node is a new expression
 */
export function isNewExpression(node: Node | null | undefined): node is NewExpression {
  return node?.type === 'NewExpression';
}

/**
 * Check if a node is a member expression
 */
export function isMemberExpression(node: Node | null | undefined): node is MemberExpression {
  return node?.type === 'MemberExpression';
}

/**
 * Check if a node is an object expression
 */
export function isObjectExpression(node: Node | null | undefined): node is ObjectExpression {
  return node?.type === 'ObjectExpression';
}

/**
 * Check if a node is an array expression
 */
export function isArrayExpression(node: Node | null | undefined): node is ArrayExpression {
  return node?.type === 'ArrayExpression';
}

/**
 * Check if a node is a property
 */
export function isProperty(node: Node | null | undefined): node is Property {
  return node?.type === 'Property';
}

/**
 * Get property name from a property node
 */
export function getPropertyName(node: Property): string | null {
  if (isIdentifier(node.key)) {
    return node.key.name;
  }
  if (isStringLiteral(node.key)) {
    return node.key.value;
  }
  return null;
}

/**
 * Find a property by name in an object expression
 */
export function findProperty(
  obj: ObjectExpression,
  name: string
): Property | undefined {
  return obj.properties.find((prop): prop is Property => {
    if (!isProperty(prop)) return false;
    return getPropertyName(prop) === name;
  });
}

/**
 * Find nested property by path (e.g., 'generationConfig.responseSchema')
 */
export function findNestedProperty(
  obj: ObjectExpression,
  path: string
): Property | undefined {
  const parts = path.split('.');
  let current: ObjectExpression | undefined = obj;

  for (let i = 0; i < parts.length; i++) {
    const prop = findProperty(current, parts[i]);
    if (!prop) return undefined;

    if (i === parts.length - 1) {
      return prop;
    }

    if (!isObjectExpression(prop.value)) return undefined;
    current = prop.value;
  }

  return undefined;
}

/**
 * Check if a call expression calls a specific function
 */
export function isCallTo(node: CallExpression, functionName: string): boolean {
  const { callee } = node;

  if (isIdentifier(callee)) {
    return callee.name === functionName;
  }

  if (isMemberExpression(callee) && isIdentifier(callee.property)) {
    return callee.property.name === functionName;
  }

  return false;
}

/**
 * Get the function name from a call expression or new expression
 */
export function getCalleeName(node: CallExpression | NewExpression): string | null {
  const { callee } = node;

  if (isIdentifier(callee)) {
    return callee.name;
  }

  if (isMemberExpression(callee) && isIdentifier(callee.property)) {
    return callee.property.name;
  }

  return null;
}

/**
 * Get the arguments of a call expression as an array
 */
export function getCallArguments(node: CallExpression): Node[] {
  return node.arguments as Node[];
}

/**
 * Check if a variable is imported from a specific module
 */
export function isImportedFrom(
  context: Rule.RuleContext,
  node: Identifier,
  moduleName: string
): boolean {
  const scope = context.sourceCode.getScope(node);
  const variable = scope.variables.find((v) => v.name === node.name);

  if (!variable) return false;

  for (const def of variable.defs) {
    if (
      def.type === 'ImportBinding' &&
      def.parent?.type === 'ImportDeclaration' &&
      isStringLiteral(def.parent.source) &&
      def.parent.source.value === moduleName
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get all property names from an object expression
 */
export function getPropertyNames(obj: ObjectExpression): string[] {
  return obj.properties
    .filter((prop): prop is Property => isProperty(prop))
    .map(getPropertyName)
    .filter((name): name is string => name !== null);
}

/**
 * Check if an object has a specific property
 */
export function hasProperty(obj: ObjectExpression, name: string): boolean {
  return findProperty(obj, name) !== undefined;
}

/**
 * Get all properties with their values from an object expression
 */
export function getPropertiesMap(
  obj: ObjectExpression
): Map<string, Property> {
  const map = new Map<string, Property>();
  for (const prop of obj.properties) {
    if (isProperty(prop)) {
      const name = getPropertyName(prop);
      if (name) {
        map.set(name, prop);
      }
    }
  }
  return map;
}
