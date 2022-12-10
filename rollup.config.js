import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import localTypescript from 'typescript';
import pkg from './package.json';

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];
const globals = external.reduce((globals, external) => {
  globals[external] = external;

  return globals;
}, {});

export default [
  {
    external,
    input: 'src/index.ts',
    output: {
      exports: 'named',
      globals,
      name: pkg.name,
      sourcemap: true,
      file: './dist/minified/index.js',
      format: 'umd',
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true,
      }),
      resolve({
        extensions: ['.js', '.ts', '.tsx'],
        mainFields: ['module', 'jsnext:main', 'main'],
      }),
      commonjs({ include: /use-sync-external-store/ }),
      typescript({
        tsconfig: './tsconfig.minified.json',
        typescript: localTypescript,
      }),
      terser(),
    ],
  },
];
