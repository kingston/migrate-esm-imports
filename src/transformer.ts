import type { TsConfigResult } from 'get-tsconfig';
import type {
  ASTPath,
  ExportAllDeclaration,
  ExportDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
} from 'jscodeshift';

import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import jscodeshift from 'jscodeshift';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { isFile } from './utils/fs.js';

const POSSIBLE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'];

function findValidExtension(file: string): string | undefined {
  return POSSIBLE_EXTENSIONS.find((ext) => isFile(`${file}.${ext}`));
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
  resolverCache: Map<string, string | undefined>,
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

    // if the file exists, we're done
    if (isFile(resolved)) {
      return;
    }

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
    const matchingPaths = pathsMatcher?.(specifier) ?? [];

    const suffix = matchingPaths
      .map((p) => findSpecifierSuffix(p))
      .find((s) => s !== undefined);

    const hasNonBaseUrlMatch =
      matchingPaths.length === 1 &&
      !matchingPaths[0]?.endsWith(`/${specifier}`);

    if (
      !suffix &&
      matchingPaths.length > 0 &&
      // catch scenario where we default to baseUrl which could be a normal module
      hasNonBaseUrlMatch
    ) {
      throw new Error(`Could not find valid extension for ${specifier}`);
    }

    if (suffix) {
      const resolvedSpecifier = `${specifier}${suffix}`;

      resolverCache.set(resolverCacheKey, resolvedSpecifier);

      return resolvedSpecifier;
    } else {
      resolverCache.set(resolverCacheKey, undefined);
    }
  }

  // don't need to fix otherwise
  return undefined;
}

interface TransformFileOptions {
  dryRun?: boolean;
  verbose?: boolean;
  tsConfigCache: Map<string, unknown>;
  resolverCache: Map<string, string | undefined>;
}

export async function transformFile(
  file: string,
  { dryRun, tsConfigCache, resolverCache, verbose }: TransformFileOptions,
): Promise<boolean> {
  const content = await readFile(file, 'utf8');

  const tsConfig = getTsconfig(file, undefined, tsConfigCache);

  const root = jscodeshift.withParser('tsx')(content);
  let wasModified = false as boolean;

  const fixDeclaration = (
    path: ASTPath<
      | ExportDeclaration
      | ExportNamedDeclaration
      | ExportAllDeclaration
      | ImportDeclaration
    >,
  ): void => {
    const specifier = path.node.source?.value;
    if (!path.node.source) return;
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
  };

  // eslint-disable-next-line unicorn/no-array-for-each
  root.find(jscodeshift.ExportDeclaration).forEach(fixDeclaration);

  // eslint-disable-next-line unicorn/no-array-for-each
  root.find(jscodeshift.ExportNamedDeclaration).forEach(fixDeclaration);

  // eslint-disable-next-line unicorn/no-array-for-each
  root.find(jscodeshift.ExportAllDeclaration).forEach(fixDeclaration);

  // eslint-disable-next-line unicorn/no-array-for-each
  root.find(jscodeshift.ImportDeclaration).forEach(fixDeclaration);

  if (wasModified && !dryRun) {
    if (verbose) {
      console.debug(`Writing changes to ${file}...`);
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
