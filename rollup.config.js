import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.js', // Entry point of your library
  output: [
    {
      file: 'dist/bundle.cjs.js', // CommonJS output
      format: 'cjs', // CommonJS format
      sourcemap: true,
    },
    {
      file: 'dist/bundle.esm.js', // ESM output
      format: 'esm', // ES Module format
      sourcemap: true,
    },
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    json(),
    babel({
      babelHelpers: 'bundled', // Configurar o babelHelpers para 'bundled'
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    }),
  ],
};
