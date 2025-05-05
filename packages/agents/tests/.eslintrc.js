module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: '../tsconfig.test.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 2020
  },
  overrides: [
    {
      files: ['./chatgpt/*.ts'],
      parserOptions: {
        project: '../tsconfig.test.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 2020
      },
    }
  ],
  rules: {
    // Relax some rules for tests
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'jest/expect-expect': 'off',
  },
};
