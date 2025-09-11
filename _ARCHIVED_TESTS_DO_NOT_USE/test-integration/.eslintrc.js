module.exports = {
  extends: '../../.eslintrc.json',
  rules: {
    // Allow console statements in test files
    'no-console': 'off',
    
    // Be less strict about any types in test files
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Allow unused vars that start with underscore
    '@typescript-eslint/no-unused-vars': 'off'
  }
};