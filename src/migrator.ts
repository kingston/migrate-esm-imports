import { globbyStream } from 'globby';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pLimit from 'p-limit';

import type { MigrateEsmImportsOptions } from './types.js';

import { transformFile } from './transformer.js';

export async function migrateEsmImports(
  inputs: string[],
  options: MigrateEsmImportsOptions,
): Promise<boolean> {
  const concurrency = options.concurrency ?? os.cpus().length;

  const limit = pLimit(concurrency);
  const promises: Promise<void>[] = [];

  console.info(
    `Migrating ESM imports for files in ${inputs.join(',')} (${concurrency.toString()} threads)...`,
  );

  let filesSucceeded = 0;
  let filesFailed = 0;

  const resolverCache = new Map<string, string | undefined>();
  const tsConfigCache = new Map<string, unknown>();

  const resolvedInputs = inputs.map((input) => {
    const resolvedPath = path.resolve(options.cwd ?? process.cwd(), input);
    if (options.verbose) {
      console.info(`Processing ${resolvedPath}`);
    }
    if (existsSync(resolvedPath)) {
      return `${resolvedPath}/**/*`;
    }
    return input;
  });

  const validExtensions = options.extensions ?? [
    'js',
    'jsx',
    'ts',
    'tsx',
    'cjs',
    'mjs',
    'cts',
    'mts',
  ];

  for await (const filePath of globbyStream(resolvedInputs, {
    cwd: options.cwd ?? process.cwd(),
    onlyFiles: true,
    ignore: options.exclude,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    fs: options.fs as any,
  })) {
    if (typeof filePath !== 'string') {
      console.error(`Invalid path type: ${typeof path}`);
      filesFailed += 1;
      continue;
    }
    if (!validExtensions.includes(path.extname(filePath).slice(1))) {
      continue;
    }
    promises.push(
      limit(async () => {
        try {
          const result = await transformFile(filePath, {
            dryRun: options.dryRun,
            resolverCache,
            tsConfigCache,
            verbose: options.verbose,
          });
          if (result) {
            filesSucceeded += 1;
          }
        } catch (error) {
          console.error(
            `Failed to migrate ESM imports for ${filePath}: ${String(error)}`,
          );
          filesFailed += 1;
        }
      }),
    );
  }

  await Promise.allSettled(promises);

  console.info(
    `Successfully migrated ESM imports for ${filesSucceeded.toString()} files. (${filesFailed.toString()} failed)`,
  );

  return filesFailed === 0;
}
