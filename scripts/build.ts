import { rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Options, build } from 'tsup';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getOption(type: 'cjs' | 'esm', all = false): Options {
  return {
    entryPoints: [path.resolve(__dirname, '../src/index.ts')],
    sourcemap: all ? false : true,
    noExternal: all ? ['fast-xml-parser', 'jszip'] : undefined,
    bundle: true,
    format: type,

    target: all ? 'es2020' : 'esnext',
    platform: type === 'esm' ? 'browser' : 'node',
  };
}

(async () => {
  if (process.env.WATCH) {
    await build({
      ...getOption('cjs'),
      watch: true,
    });
  } else {
    await build(getOption('esm', true));
    await build(getOption('cjs', true));

    // tsup 没有提供指定产出文件的名称的参数？？
    await rename('./dist/index.cjs', './dist/index.all.cjs');
    await rename('./dist/index.js', './dist/index.all.js');

    await build(getOption('esm'));
    await build(getOption('cjs'));
  }
})().catch((ex) => {
  console.error(ex);
});
