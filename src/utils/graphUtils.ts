import { CalculatedField } from "../types/CalculatedField";

/**
 * Escapes special regex characters in a string.
 * @param str The string to escape.
 * @returns The escaped string.
 */
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Extracts tokens from an expression, excluding string literals.
 * @param expression The expression string.
 * @returns An array of tokens (words) outside of string literals.
 */
const extractTokens = (expression: string): string[] => {
  const tokens: string[] = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let token = "";

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    // Toggle quote states
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    // If inside quotes, skip characters
    if (inSingleQuote || inDoubleQuote) {
      continue;
    }

    // Build tokens based on word boundaries
    if (/[\w-]/.test(char)) {
      token += char;
    } else {
      if (token.length > 0) {
        tokens.push(token);
        token = "";
      }
    }
  }

  // Push the last token if exists
  if (token.length > 0) {
    tokens.push(token);
  }

  return tokens;
};

export const getDependencyChain = (
  expression: CalculatedField,
  calculatedFields: CalculatedField[],
) => {
  const chain: Array<{
    alias: string;
    expression: string;
    type: string;
    level: number;
  }> = [];

  const visited = new Set<string>();

  // Start with the selected expression
  chain.push({
    alias: expression.name,
    expression: expression.expression,
    type: "calculatedField",
    level: 0,
  });
  visited.add(expression.name);

  // Precompute a map for quick lookup
  const fieldMap = new Map<string, CalculatedField>();
  calculatedFields.forEach((field) => fieldMap.set(field.name, field));

  /**
   * Recursively find dependencies.
   * @param currentField The current calculated field being processed.
   * @param level The current recursion depth level.
   */
  const findDependencies = (currentField: CalculatedField, level: number) => {
    if (level > 20) {
      // Prevent potential infinite recursion
      console.warn(
        `Maximum dependency depth reached at field: ${currentField.name}`,
      );
      return;
    }

    // Extract tokens excluding string literals
    const tokens = extractTokens(currentField.expression);

    tokens.forEach((token) => {
      // Normalize token if necessary (e.g., case sensitivity)
      const normalizedToken = token; // Adjust if your field names are case-insensitive

      // Check if the token corresponds to a calculated field
      if (fieldMap.has(normalizedToken) && !visited.has(normalizedToken)) {
        const dependentField = fieldMap.get(normalizedToken)!;
        chain.push({
          alias: dependentField.name,
          expression: dependentField.expression,
          type: "calculatedField",
          level: level + 1,
        });
        visited.add(dependentField.name);
        findDependencies(dependentField, level + 1);
      }
    });
  };

  findDependencies(expression, 0);

  return chain;
};
