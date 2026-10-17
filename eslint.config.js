// Rules and reasons: docs/code-standards.md
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

/** Lower layers must not reach up (docs/code-standards.md §3). */
const layer = (dir, banned) => ({
  files: [`src/${dir}/**/*.ts`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: banned.map(name => ({ group: [`../${name}/*`, `@/${name}/*`], message: `src/${dir} 不能 import ${name}（下層不依賴上層）` })),
    }],
  },
})

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.claude/**', 'docs/**'] },
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // Style Guide B: full-word names, simple template expressions are checked in review; these are mechanical
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/no-unused-refs': 'error',
      'vue/no-v-html': 'off', // only used for our own trusted door SVG
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  layer('domain', ['render', 'storage', 'export', 'stores', 'composables', 'components']),
  layer('render', ['storage', 'export', 'stores', 'composables', 'components']),
  layer('storage', ['render', 'export', 'stores', 'composables', 'components']),
  layer('export', ['stores', 'composables', 'components']),
)
