import baseConfig from '@ktam/lint-node/eslint';

export default [
  ...baseConfig,
  {
    ignores: ['**/__mocks__/**/*'],
  },
];
