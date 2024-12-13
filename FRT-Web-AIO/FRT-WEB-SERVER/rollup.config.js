import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/server.ts',
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts', '.json'],
      preferBuiltins: true,
      exportConditions: ['node', 'import']
    }),
    typescript({
      tsconfig: 'tsconfig.json',
      tsconfigOverride: {
        compilerOptions: {
          module: "ES2020",
          moduleResolution: "node"
        }
      }
    }),
    commonjs(),
    json()
  ],
  external: [
    'axios', 
    'express', 
    'ws', 
    'cors', 
    'dotenv', 
    'kafkajs', 
    'luxon', 
    'moment', 
    'moment-timezone', 
    'mongodb'
  ]
};