import eslint from '@eslint/js';
import angulareslint from 'angular-eslint';
import rxjsX from 'eslint-plugin-rxjs-x';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'example/**', '.claude/**']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    // the studio page, see .documentation/impl/angular.md
    files: ['studio/**/*.ts'],
    plugins: {
      'rxjs-x': rxjsX
    },
    extends: [...angulareslint.configs.tsRecommended],
    processor: angulareslint.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'studio', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'studio', style: 'camelCase' }],
      '@angular-eslint/no-uncalled-signals': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/reactive-context-must-read-signal': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variable', modifiers: ['const', 'global', 'exported'], format: ['UPPER_CASE'] },
        { selector: 'variable', modifiers: ['const', 'global', 'exported'], types: ['function'], format: ['camelCase'] }
      ],
      'rxjs-x/finnish': [
        'error',
        { functions: true, methods: true, parameters: true, properties: true, strict: false, variables: true }
      ]
    }
  },
  {
    // reusable components, see Placement And Selectors in .documentation/impl/angular.md
    files: ['studio/src/app/ui/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'studio-ui', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'studioUi', style: 'camelCase' }]
    }
  },
  {
    // Angular names the application config and the routes itself
    files: ['studio/src/app/app.config.ts', 'studio/**/*.routes.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 'off'
    }
  },
  {
    files: ['studio/**/*.html'],
    extends: [...angulareslint.configs.templateRecommended, ...angulareslint.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-class-binding': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-style-binding': 'error'
    }
  }
);
