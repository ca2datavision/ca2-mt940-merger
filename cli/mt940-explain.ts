#!/usr/bin/env node
/**
 * MT940 Explainer CLI
 *
 * Parses an MT940 file and outputs a human-readable explanation
 * of every line, tag, and field.
 *
 * Usage:
 *   npm run mt940:explain -- <file.mt940>
 *   npm run mt940:explain -- <file.mt940> --output report.html
 *   npm run mt940:explain -- <file.mt940> --format json
 */

import { Command } from 'commander';
import { basename } from 'path';
import { readFile, writeFileAtomic, validateInputFile } from './lib/io.js';
import { parseLines } from './lib/decoder.js';
import {
  formatWithSummary,
  createSummary,
  detectFormatFromPath,
  type OutputFormat,
} from './lib/formatters/index.js';

const program = new Command();

program
  .name('mt940-explain')
  .description('Parse an MT940 file and output a human-readable explanation')
  .version('1.0.0')
  .argument('<file>', 'MT940 file to explain')
  .option('-o, --output <path>', 'Write output to file instead of stdout')
  .option('-f, --format <type>', 'Output format: terminal, json, html (auto-detected from --output extension)')
  .option('--force', 'Overwrite output file if it exists')
  .option('--no-color', 'Disable colored output')
  .option('--no-raw', 'Hide raw lines in output')
  .action(async (file: string, options: {
    output?: string;
    format?: string;
    force?: boolean;
    color?: boolean;
    raw?: boolean;
  }) => {
    try {
      const inputPath = validateInputFile(file);
      const content = readFile(inputPath);
      const fileName = basename(inputPath);

      const parsedLines = parseLines(content);
      const summary = createSummary(parsedLines, fileName);

      let outputFormat: OutputFormat = 'terminal';
      if (options.format) {
        const fmt = options.format.toLowerCase();
        if (fmt === 'text' || fmt === 'terminal') {
          outputFormat = 'terminal';
        } else if (fmt === 'html') {
          outputFormat = 'html';
        } else if (fmt === 'json') {
          outputFormat = 'json';
        } else {
          throw new Error(`Unknown format: ${options.format}. Use terminal, json, or html.`);
        }
      } else if (options.output) {
        outputFormat = detectFormatFromPath(options.output);
      }

      const explanation = formatWithSummary(parsedLines, summary, outputFormat, {
        color: options.color !== false && outputFormat === 'terminal',
        showRawLines: options.raw !== false,
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

program.parse();
