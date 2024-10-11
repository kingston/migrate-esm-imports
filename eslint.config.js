import baseConfig from '@ktam/lint-node/eslint';

export default [
  ...baseConfig,
  {
    ignores: ['tests', '**/__mocks__/**/*'],
  },
];
