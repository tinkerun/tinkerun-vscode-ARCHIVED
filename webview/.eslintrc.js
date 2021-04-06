module.exports = {
  extends: [
    'billyct',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: {
      version: '17.0.0',
    },
  },
  globals: {
    vscode: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
}
