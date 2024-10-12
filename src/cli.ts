#!/usr/bin/env node

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';

import type { MigrateEsmImportsOptions } from './types.js';

import { migrateEsmImports } from './index.js';

const packageJson = await readFile(
  new URL('../package.json', import.meta.url),
  'utf8',
);
const { name, description, version } = JSON.parse(packageJson) as Record<
  string,
  string
>;

const program = new Command();
program.name(name).description(description).version(version);

program
  .argument('[inputs...]', 'Input files or directories to process', ['src'])
  // Option to ignore certain directories or files
  .option('-x,--exclude <patterns...>', 'Directories or files to exclude', [
    '.git',
    'node_modules',
    'dist',
  ])
  .option(
    '-c, --concurrency <number>',
    'Number of files to process concurrently (defaults to number of CPUs)',
  )
  // Option for dry run
  .option('-d, --dry-run', 'Perform a dry run without making any changes')
  // Option for verbose output
  .option('-v, --verbose', 'Enable verbose output')
  // Option to specify file extensions
  .option('-e, --extensions <exts...>', 'File extensions to process', [
    'js',
    'jsx',
    'ts',
    'tsx',
    'cjs',
    'mjs',
    'cts',
    'mts',
  ])
  .parse(process.argv);

const options = program.opts<MigrateEsmImportsOptions>();

await migrateEsmImports(program.processedArgs[0] as string[], options);
