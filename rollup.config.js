import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const EXTERNALS = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const EXTENSIONS = ['.js', '.ts', '.tsx'];

const DEFAULT_OUTPUT = {
  exports: 'named',
  globals: {
    'hoist-non-react-statics': 'hoistNonReactStatics',
    react: 'React',
    redux: 'Redux',
    'use-sync-external-store': 'useSyncExternalStore',
  },
  name: pkg.name,
  sourcemap: true,
};

const DEFAULT_CONFIG = {
  external: EXTERNALS,
  input: 'src/index.ts',
  output: [
    { ...DEFAULT_OUTPUT, file: pkg.browser, format: 'umd' },
    { ...DEFAULT_OUTPUT, file: pkg.main, format: 'cjs' },
    { ...DEFAULT_OUTPUT, file: pkg.module, format: 'es' },
  ],
  plugins: [
    commonjs({ include: /use-sync-external-store/ }),
    resolve({
      extensions: EXTENSIONS,
      mainFields: ['module', 'jsnext:main', 'main'],
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      extensions: EXTENSIONS,
      include: ['src/**'],
    }),
  ],
};

export default [
  DEFAULT_CONFIG,
  {
    ...DEFAULT_CONFIG,
    output: {
      ...DEFAULT_OUTPUT,
      file: pkg.browser.replace('.js', '.min.js'),
      format: 'umd',
    },
    plugins: [...DEFAULT_CONFIG.plugins, terser()],
  },
];
