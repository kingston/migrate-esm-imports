import { fs, vol } from 'memfs';
import { beforeEach, expect, test, vi } from 'vitest';

import { migrateEsmImports } from './migrator.js';

vi.mock('fs');
vi.mock('fs/promises');
vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
});

interface TestProject {
  name: string;
  source: Record<string, string>;
  target: Record<string, string>;
}

const simpleImportProject: TestProject = {
  name: 'simple-import',
  source: {
    'src/index.ts': `
import { foo } from './utils/foo';
import * as bar from './utils/bar';

console.log(foo);`,
    'src/utils/foo.ts': `export const foo = 'foo';`,
    'src/utils/bar/index.js': `export default 'bar';`,
  },
  target: {
    'src/index.ts': `
import { foo } from './utils/foo.js';
import * as bar from './utils/bar/index.js';

console.log(foo);`,
  },
};

const importWithPathsIndexProject: TestProject = {
  name: 'import-with-paths-index',
  source: {
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        baseUrl: './src',
        paths: {
          '@src/*': ['*'],
        },
      },
    }),
    'src/index.ts': `
import { foo } from '@src/utils';
import { bar } from '@src/utils/bar';
import test from 'base/test';
import normalImport from 'vitest';

console.log(foo);`,
    'src/utils/index.ts': `export const foo = 'foo';`,
    'src/utils/bar.tsx': `export const bar: string = 'bar';`,
    'src/base/test.ts': `export default 'test';`,
  },
  target: {
    'src/index.ts': `
import { foo } from '@src/utils/index.js';
import { bar } from '@src/utils/bar.js';
import test from 'base/test.js';
import normalImport from 'vitest';

console.log(foo);`,
  },
};

const exportConversionProject: TestProject = {
  name: 'export-conversion',
  source: {
    'src/index.ts': `
export { foo } from './utils/foo';
export * from './utils/dum';
export { default as bar } from './utils/bar';`,
    'src/utils/foo.ts': `export const foo = 'foo';`,
    'src/utils/dum.ts': `export const dum = 'dum';`,
    'src/utils/bar/index.js': `const bar = 'bar'; export default bar;`,
  },
  target: {
    'src/index.ts': `
export { foo } from './utils/foo.js';
export * from './utils/dum.js';
export { default as bar } from './utils/bar/index.js';`,
  },
};

test.for([
  simpleImportProject,
  importWithPathsIndexProject,
  exportConversionProject,
])('works with $name project', async ({ source, target }) => {
  vol.fromJSON(source, '/root');
  const success = await migrateEsmImports(['src'], {
    cwd: '/root',
    fs,
  });
  expect(success).toBe(true);
  const result = vol.toJSON('/root', undefined, true);
  expect(result).toEqual({
    ...source,
    ...target,
  });
});
