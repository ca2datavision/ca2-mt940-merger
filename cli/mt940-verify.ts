#!/usr/bin/env node
/**
 * MT940 Merge Verification CLI
 *
 * Verifies that an MT940 file is the correct merge of source files.
 *
 * Usage:
 *   npm run mt940:verify -- --zip sources.zip --merged output.mt940
 *   npm run mt940:verify -- --zip sources.zip --merged output.mt940 --output report.json
 */

import { Command } from 'commander';
import { validateInputFile, writeFileAtomic } from './lib/io.js';

const program = new Command();

program
  .name('mt940-verify')
  .description('Verify that an MT940 file is the correct merge of source files')
  .version('1.0.0')
  .requiredOption('-z, --zip <path>', 'ZIP archive containing source MT940 files')
  .requiredOption('-m, --merged <path>', 'MT940 file to verify (alleged merge result)')
  .option('-o, --output <path>', 'Write JSON report to file')
  .option('--force', 'Overwrite output file if it exists')
  .action(async (options: {
    zip: string;
    merged: string;
    output?: string;
    force?: boolean;
  }) => {
    try {
      validateInputFile(options.zip);
      validateInputFile(options.merged);

      console.log('MT940 Merge Verification');
      console.log(`  Sources: ${options.zip}`);
      console.log(`  Merged:  ${options.merged}`);
      console.log('');
      console.log('Note: Full verification logic is in tools/verify-merge.ts');
      console.log('Run: npx tsx tools/verify-merge.ts --zip <zip> --merged <file>');

      if (options.output) {
        const report = {
          message: 'Use tools/verify-merge.ts for full verification',
          zip: options.zip,
          merged: options.merged,
        };
        writeFileAtomic(options.output, JSON.stringify(report, null, 2), { force: options.force });
        console.log(`\nReport written to: ${options.output}`);
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
