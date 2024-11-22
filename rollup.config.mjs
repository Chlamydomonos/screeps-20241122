import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import clear from 'rollup-plugin-clear';
import copy from 'rollup-plugin-copy';
import screeps from 'rollup-plugin-screeps';
import secrets from './secrets.json' assert { type: 'json' };

let config;

if (!process.env.DEST) {
    console.log('未指定目标, 代码将被编译但不会上传');
} else if (!(config = secrets[process.env.DEST])) {
    throw new Error('无效目标，请检查 secret.json 中是否包含对应配置');
}

const pluginDeploy =
    config && config.copyPath
        ? copy({
              targets: [
                  {
                      src: 'dist/main.js',
                      dest: config.copyPath,
                  },
                  {
                      src: 'dist/main.js.map',
                      dest: config.copyPath,
                      rename: (name) => name + '.map.js',
                      transform: (contents) => `module.exports = ${contents.toString()};`,
                  },
              ],
              hook: 'writeBundle',
              verbose: true,
          })
        : screeps({ config, dryRun: !config });

/** @type {import('rollup').RollupOptions} */
export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/main.js',
        format: 'commonjs',
        sourcemap: true,
    },
    plugins: [
        clear({
            targets: ['./dist'],
        }),
        resolve(),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
        }),
        pluginDeploy,
    ],
};
