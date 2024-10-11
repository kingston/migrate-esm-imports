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

console.log(foo);`,
    'src/utils/foo.ts': `export const foo = 'foo';`,
  },
  target: {
    'src/index.ts': `
import { foo } from './utils/foo.js';

console.log(foo);`,
    'src/utils/foo.ts': `export const foo = 'foo';`,
  },
};

test.for([simpleImportProject])(
  'works with $name project',
  async ({ source, target }) => {
    vol.fromJSON(source, '/root');
    await migrateEsmImports(['src'], {
      cwd: '/root',
      fs,
    });
    const result = vol.toJSON('/root', undefined, true);
    expect(result).toEqual(target);
  },
);
