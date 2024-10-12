import type { IFs } from 'memfs';

export interface MigrateEsmImportsOptions {
  exclude?: string[]; // Directories or files to exclude, default is ['.git', 'node_modules', 'dist']
  dryRun?: boolean; // Whether to perform a dry run without making any changes
  verbose?: boolean; // Enable verbose output
  extensions?: string[]; // File extensions to process, default is ['js', 'jsx', 'ts', 'tsx
  concurrency?: number; // Number of files to process concurrently, defaults to number of CPUs
  cwd?: string; // The current working directory in which to search, default is process.cwd()
  fs?: IFs; // The file system to use, default is node:fs
}
