import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js', // Entry point of your library
  output: {
    file: 'dist/bundle.js', // Output file
    format: 'cjs', // CommonJS format
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    }),
  ],
};
