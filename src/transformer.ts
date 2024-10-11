import type { TsConfigResult } from 'get-tsconfig';

import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import jscodeshift from 'jscodeshift';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const POSSIBLE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'];

function findValidExtension(file: string): string | undefined {
  return POSSIBLE_EXTENSIONS.find((ext) => existsSync(`${file}.${ext}`));
}

function findSpecifierSuffix(file: string): string | undefined {
  const simpleExtension = findValidExtension(file);
  if (simpleExtension) return `.js`;

  const extensionWithIndex = findValidExtension(path.join(file, 'index'));
  if (extensionWithIndex) return `/index.js`;
  return undefined;
}

export function fixImportPath(
  filePath: string,
  specifier: string,
  resolverCache: Map<string, string>,
  tsConfig?: TsConfigResult,
): string | undefined {
  // if it's already been fixed we're done :)
  if (POSSIBLE_EXTENSIONS.some((ext) => specifier.endsWith(`.${ext}`))) {
    return;
  }

  const directory = path.dirname(filePath);

  // check if relative path
  if (specifier.startsWith('.')) {
    const resolved = path.resolve(directory, specifier);

    const suffix = findSpecifierSuffix(resolved);
    if (!suffix) {
      throw new Error(`Could not find valid extension for ${specifier}`);
    }
    return `${specifier}${suffix}`;
  }

  // check for tsconfig baseUrl / paths
  if (tsConfig) {
    const resolverCacheKey = `${tsConfig.path}${path.delimiter}${specifier}`;
    if (resolverCache.has(resolverCacheKey)) {
      return resolverCache.get(resolverCacheKey);
    }
    const pathsMatcher = createPathsMatcher(tsConfig);
    const baseUrl = tsConfig.config.compilerOptions?.baseUrl;
    const basePath = baseUrl && path.join(path.dirname(tsConfig.path), baseUrl);

    const possiblePaths = [
      ...(pathsMatcher?.(specifier) ?? []),
      ...(basePath ? path.join(basePath, specifier) : []),
    ];

    const suffix = possiblePaths
      .map((p) => findSpecifierSuffix(p))
      .find((s) => s !== undefined);

    if (!suffix) {
      throw new Error(`Could not find valid extension for ${specifier}`);
    }

    const resolvedSpecifier = `${specifier}${suffix}`;

    resolverCache.set(resolverCacheKey, resolvedSpecifier);

    return resolvedSpecifier;
  }

  // don't need to fix otherwise
  return undefined;
}

interface TransformFileOptions {
  dryRun?: boolean;
  verbose?: boolean;
  tsConfigCache: Map<string, unknown>;
  resolverCache: Map<string, string>;
}

export async function transformFile(
  file: string,
  { dryRun, tsConfigCache, resolverCache, verbose }: TransformFileOptions,
): Promise<boolean> {
  const content = await readFile(file, 'utf8');

  const tsConfig = getTsconfig(file, undefined, tsConfigCache);

  const root = jscodeshift(content);
  let wasModified = false;
  root
    // eslint-disable-next-line unicorn/no-array-callback-reference
    .find(jscodeshift.ImportDeclaration)
    // eslint-disable-next-line unicorn/no-array-for-each
    .forEach((path) => {
      const specifier = path.node.source.value;
      if (typeof specifier !== 'string') {
        return;
      }
      const fixedPath = fixImportPath(
        file,
        specifier,
        resolverCache,
        tsConfig ?? undefined,
      );
      if (!fixedPath) {
        return;
      }
      path.node.source.value = fixedPath;
      wasModified = true;
    });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (wasModified && !dryRun) {
    if (verbose) {
      console.debug(`Writing changes to ${file}`);
    }
    await writeFile(
      file,
      root.toSource({
        quote: 'single',
      }),
    );
    return true;
  }
  return wasModified;
}
