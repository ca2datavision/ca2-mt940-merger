#!/usr/bin/env node
/**
 * MT940 Explainer CLI
 *
 * Parses an MT940 file and outputs a human-readable explanation
 * of every line, tag, and field.
 *
 * Usage:
 *   npm run mt940:explain -- <file.mt940>
 *   npm run mt940:explain -- <file.mt940> --output report.txt
 *   npm run mt940:explain -- <file.mt940> --output report.json --format json
 */

import { Command } from 'commander';
import { readFile, writeFileAtomic, validateInputFile } from './lib/io.js';

const program = new Command();

program
  .name('mt940-explain')
  .description('Parse an MT940 file and output a human-readable explanation')
  .version('1.0.0')
  .argument('<file>', 'MT940 file to explain')
  .option('-o, --output <path>', 'Write output to file instead of stdout')
  .option('-f, --format <type>', 'Output format: text, json, html', 'text')
  .option('--force', 'Overwrite output file if it exists')
  .option('--no-color', 'Disable colored output')
  .action(async (file: string, options: {
    output?: string;
    format: string;
    force?: boolean;
    color?: boolean;
  }) => {
    try {
      const inputPath = validateInputFile(file);
      const content = readFile(inputPath);

      // Placeholder: actual explanation logic will be in Epic 2
      const explanation = explainMT940(content, {
        format: options.format as 'text' | 'json' | 'html',
        color: options.color !== false,
      });

      if (options.output) {
        writeFileAtomic(options.output, explanation, { force: options.force });
        console.log(`Output written to: ${options.output}`);
      } else {
        console.log(explanation);
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

interface ExplainOptions {
  format: 'text' | 'json' | 'html';
  color: boolean;
}

/**
 * Explain MT940 content (placeholder - full implementation in Epic 2)
 */
function explainMT940(content: string, options: ExplainOptions): string {
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const hasStatements = content.includes(':20:') && content.includes(':60');

  if (options.format === 'json') {
    return JSON.stringify({
      summary: {
        lineCount,
        hasStatements,
        format: 'MT940',
      },
      message: 'Full explanation will be implemented in Epic 2',
    }, null, 2);
  }

  if (options.format === 'html') {
    return `<!DOCTYPE html>
<html>
<head><title>MT940 Explanation</title></head>
<body>
<h1>MT940 File Explanation</h1>
<p>Lines: ${lineCount}</p>
<p>Valid MT940: ${hasStatements ? 'Yes' : 'No'}</p>
<p><em>Full explanation will be implemented in Epic 2</em></p>
</body>
</html>`;
  }

  // Text format
  const output: string[] = [
    '═══════════════════════════════════════════════════════════════════',
    '                    MT940 FILE EXPLANATION',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `File contains ${lineCount} lines`,
    `Valid MT940 structure: ${hasStatements ? 'Yes' : 'No'}`,
    '',
    '(Full line-by-line explanation will be implemented in Epic 2)',
    '',
    '═══════════════════════════════════════════════════════════════════',
  ];

  return output.join('\n');
}

program.parse();
