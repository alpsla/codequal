module.exports = {
  root: true,
  extends: ['../../.eslintrc.json'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 2020
  },
  ignorePatterns: [
    'dist/**/*', 
    'node_modules/**/*',
    'coverage/**/*',
    'src/multi-agent/__tests__/**/*', 
    'src/multi-agent/evaluation/__tests__/**/*',
    'src/multi-agent/examples/**/*',
    'src/researcher/*.d.ts',
    'src/researcher/*.js',
    'src/**/_archive*/**/*'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off'
  },
  overrides: [
    {
      files: ['tests/**/*.ts', '**/*test*.ts', '**/*Test*.ts', '**/integration-test.ts', '**/standard/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'jest/expect-expect': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'no-empty': 'off'
      }
    }
  ]
}