import type { TsConfigResult } from 'get-tsconfig';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fixImportPath } from './transformer.js';
import { isFile } from './utils/fs.js';

// Mock fs.existsSync
vi.mock('./utils/fs.js', () => ({
  isFile: vi.fn(),
}));

const isFileMock = vi.mocked(isFile);

describe('fixImportPath', () => {
  const tsConfig: TsConfigResult = {
    path: '/root/tsconfig.json',
    config: {
      compilerOptions: {
        baseUrl: './src',
        paths: {
          '@utils/*': ['./utils/*'],
        },
      },
    },
  };

  let resolverCache = new Map<string, string>();

  beforeEach(() => {
    resolverCache = new Map<string, string>();
  });

  it('should return undefined for already fixed paths', () => {
    isFileMock.mockReturnValue(true);
    const result = fixImportPath(
      '/root/src/file.ts',
      './module.ts',
      resolverCache,
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined for existing paths such as .css', () => {
    isFileMock.mockReturnValue(true);
    const result = fixImportPath(
      '/root/src/file.ts',
      './module.css',
      resolverCache,
    );
    expect(result).toBeUndefined();
  });

  it('should fix relative paths with valid extensions', () => {
    isFileMock.mockImplementation((path) => path === '/root/src/module.ts');
    const result = fixImportPath(
      '/root/src/file.ts',
      './module',
      resolverCache,
    );
    expect(result).toBe('./module.js');
  });

  it('should fix relative paths with index files', () => {
    isFileMock.mockImplementation(
      (path) => path === '/root/src/module/index.ts',
    );
    const result = fixImportPath(
      '/root/src/file.ts',
      './module',
      resolverCache,
    );
    expect(result).toBe('./module/index.js');
  });

  it('should fix paths based on tsconfig paths', () => {
    isFileMock.mockImplementation(
      (path) => path === '/root/src/utils/helper.ts',
    );
    const result = fixImportPath(
      '/root/src/file.ts',
      '@utils/helper',
      resolverCache,
      tsConfig,
    );
    expect(result).toBe('@utils/helper.js');
  });

  it('should fix paths based on tsconfig baseUrl', () => {
    isFileMock.mockImplementation((path) => path === '/root/src/helper.ts');
    const result = fixImportPath(
      '/root/src/file.ts',
      'helper',
      resolverCache,
      tsConfig,
    );
    expect(result).toBe('helper.js');
  });

  it('should throw an error for unresolved paths', () => {
    isFileMock.mockReturnValue(false);
    expect(() =>
      fixImportPath('/root/src/file.ts', './unknown', resolverCache),
    ).toThrow('Could not find valid extension for ./unknown');
  });

  it('should not throw an error for module paths', () => {
    isFileMock.mockReturnValue(false);
    const result = fixImportPath('./root/src/file.ts', 'vitest', resolverCache);
    expect(result).toBeUndefined();
  });

  it('should not throw an error for module paths with tsConfig', () => {
    isFileMock.mockReturnValue(false);
    const result = fixImportPath(
      './root/src/file.ts',
      'vitest',
      resolverCache,
      tsConfig,
    );
    expect(result).toBeUndefined();
  });

  it('should not throw an error for module paths with tsConfig without base URL', () => {
    isFileMock.mockReturnValue(false);
    const result = fixImportPath(
      './root/src/file.ts',
      'vitest',
      resolverCache,
      {
        ...tsConfig,
        config: {
          ...tsConfig.config,
          compilerOptions: {
            ...tsConfig.config.compilerOptions,
            baseUrl: undefined,
          },
        },
      },
    );
    expect(result).toBeUndefined();
  });
});
