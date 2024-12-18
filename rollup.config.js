import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.js', // Entry point of your library
  output: {
    file: 'dist/bundle.esm.js', // Saída em formato ES Module
    format: 'esm', // ES Module format
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    json(), // Adicionar o plugin JSON aqui
    babel({
      babelHelpers: 'bundled', // Configurar explicitamente o babelHelpers
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    }),
  ],
};
