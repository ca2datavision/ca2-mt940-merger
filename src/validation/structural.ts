import type { ValidationIssue } from '../types/validation';

interface TagLocation {
  tag: string;
  lineNumber: number;
}

interface StatementTags {
  startLine: number;
  endLine: number;
  has20: boolean;
  has25: boolean;
  has28C: boolean;
  has28: boolean;
  has60: boolean;
  has62: boolean;
}

function findTags(content: string): TagLocation[] {
  const tags: TagLocation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^:(\d{2}[A-Z]?|NS):/);
    if (match) {
      tags.push({ tag: match[0], lineNumber: i + 1 });
    }
  }

  return tags;
}

function groupIntoStatements(tags: TagLocation[]): StatementTags[] {
  const statements: StatementTags[] = [];
  let current: StatementTags | null = null;

  for (const { tag, lineNumber } of tags) {
    if (tag === ':20:') {
      if (current) {
        current.endLine = lineNumber - 1;
        statements.push(current);
      }
      current = {
        startLine: lineNumber,
        endLine: lineNumber,
        has20: true,
        has25: false,
        has28C: false,
        has28: false,
        has60: false,
        has62: false,
      };
    } else if (current) {
      current.endLine = lineNumber;
      if (tag === ':25:') current.has25 = true;
      if (tag === ':28C:') current.has28C = true;
      if (tag === ':28:') current.has28 = true;
      if (tag === ':60F:' || tag === ':60M:') current.has60 = true;
      if (tag === ':62F:' || tag === ':62M:') current.has62 = true;
    }
  }

  if (current) {
    statements.push(current);
  }

  return statements;
}

export function validateStructure(
  content: string,
  fileId?: string,
  fileName?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tags = findTags(content);

  if (tags.length === 0) {
    issues.push({
      severity: 'error',
      code: 'STRUCT_NO_TAGS',
      message: 'No MT940 tags found in file',
      fileId,
      fileName,
    });
    return issues;
  }

  const statements = groupIntoStatements(tags);

  if (statements.length === 0) {
    issues.push({
      severity: 'error',
      code: 'STRUCT_NO_STATEMENTS',
      message: 'No valid statements found (missing :20: tags)',
      fileId,
      fileName,
    });
    return issues;
  }

  statements.forEach((stmt, index) => {
    const base = { fileId, fileName, statementIndex: index };

    if (!stmt.has25) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'STRUCT_MISSING_25',
        message: `Statement ${index + 1}: Missing :25: (account identification)`,
        lineNumber: stmt.startLine,
      });
    }

    if (!stmt.has28C && !stmt.has28) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'STRUCT_MISSING_28',
        message: `Statement ${index + 1}: Missing :28C: or :28: (statement number)`,
        lineNumber: stmt.startLine,
      });
    }

    if (!stmt.has60) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'STRUCT_MISSING_60',
        message: `Statement ${index + 1}: Missing :60F: or :60M: (opening balance)`,
        lineNumber: stmt.startLine,
      });
    }

    if (!stmt.has62) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'STRUCT_MISSING_62',
        message: `Statement ${index + 1}: Missing :62F: or :62M: (closing balance)`,
        lineNumber: stmt.startLine,
      });
    }
  });

  return issues;
}
