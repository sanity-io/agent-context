import config from '@repo/eslint-config'

export default [
  ...config,
  {
    files: ['functions/**'],
    rules: {
      'no-console': 'off',
    },
  },
]
