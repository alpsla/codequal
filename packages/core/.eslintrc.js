module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script'
  },
  rules: {
    // Allow console.log statements for debugging
    'no-console': 'off',
    // Allow require() in CommonJS files
    'no-undef': 'off',
    // Allow unused variables in type definitions
    'no-unused-vars': 'off',
    // Allow TypeScript require statements
    '@typescript-eslint/no-var-requires': 'off'
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      files: ['**/*.d.ts'],
      rules: {
        // Type definition files often have unused parameters
        'no-unused-vars': 'off'
      }
    }
  ]
};