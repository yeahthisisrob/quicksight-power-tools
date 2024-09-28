// src/utils/functionUtils.tsx

import React from "react";
import { functionCategories, getDocLink } from "./functionCategories";

export const wrapFunctionsWithLinks = (
  expression: string,
): React.ReactNode[] => {
  const functionPattern = /\b(\w+)\s*(\()/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = functionPattern.exec(expression)) !== null) {
    const [fullMatch, funcName, parenthesis] = match;
    const index = match.index;

    if (index > lastIndex) {
      parts.push(expression.substring(lastIndex, index));
    }

    const funcKey = funcName.toUpperCase();
    const standardFunction = functionCategories[funcKey]?.standardFunction;

    if (standardFunction) {
      const docLink = getDocLink(standardFunction);
      if (docLink) {
        parts.push(
          <a
            key={index}
            href={docLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0073bb", textDecoration: "none" }}
          >
            {funcName}
          </a>,
        );
      } else {
        parts.push(funcName);
      }
    } else {
      parts.push(funcName);
    }

    parts.push(parenthesis);
    lastIndex = functionPattern.lastIndex;
  }

  if (lastIndex < expression.length) {
    parts.push(expression.substring(lastIndex));
  }

  return parts;
};
