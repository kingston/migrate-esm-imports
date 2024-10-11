import type { TsConfigResult } from 'get-tsconfig';

import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fixImportPath } from './transformer.js';

// Mock fs.existsSync
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

const fsExistsSyncMock = vi.mocked(existsSync);

describe('fixImportPath', () => {
  const tsConfig: TsConfigResult = {
    path: '/root/tsconfig.json',
    config: {
      compilerOptions: {
        baseUrl: './src',
        paths: {
          '@utils/*': ['utils/*'],
        },
      },
    },
  };

  let resolverCache = new Map<string, string>();

  beforeEach(() => {
    resolverCache = new Map<string, string>();
  });

  it('should return undefined for already fixed paths', () => {
    fsExistsSyncMock.mockReturnValue(true);
    const result = fixImportPath(
      '/root/src/file.ts',
      './module.ts',
      resolverCache,
    );
    expect(result).toBeUndefined();
  });

  it('should fix relative paths with valid extensions', () => {
    fsExistsSyncMock.mockImplementation(
      (path) => path === '/root/src/module.ts',
    );
    const result = fixImportPath(
      '/root/src/file.ts',
      './module',
      resolverCache,
    );
    expect(result).toBe('./module.js');
  });

  it('should fix relative paths with index files', () => {
    fsExistsSyncMock.mockImplementation(
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
    fsExistsSyncMock.mockImplementation(
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
    fsExistsSyncMock.mockImplementation(
      (path) => path === '/root/src/helper.ts',
    );
    const result = fixImportPath(
      '/root/src/file.ts',
      'helper',
      resolverCache,
      tsConfig,
    );
    expect(result).toBe('helper.js');
  });

  it('should throw an error for unresolved paths', () => {
    fsExistsSyncMock.mockReturnValue(false);
    expect(() =>
      fixImportPath('/root/src/file.ts', './unknown', resolverCache),
    ).toThrow('Could not find valid extension for ./unknown');
  });
});
