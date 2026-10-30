import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', '.netlify', '.tanstack', 'src/routeTree.gen.ts'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // The splash chunk stays split: a static import of the component (9
    // ?raw glyphs) or its CSS from outside the gate silently re-merges them
    // into the root chunk. The gate's import() is the split; the barrel
    // path ends in 'SplashIntro', so patterns name files explicitly.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/SplashIntro/SplashIntroGate.tsx',
      'src/components/SplashIntro/SplashIntro.tsx',
      // Test modules are never bundled, so the split is not a property of them.
      'src/components/SplashIntro/*.test.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/SplashIntro.tsx', '**/SplashIntro.css'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[source.value=/(^\\.\\/|SplashIntro\\/)SplashIntro(\\.tsx)?$/]',
          message:
            'Import SplashIntroGate, not the code-split SplashIntro component.',
        },
      ],
    },
  },
)
