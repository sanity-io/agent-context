import config from '@repo/eslint-config'

export default [
  ...config,
  {
    // Allow console.log in CLI files - it's the primary output mechanism
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
