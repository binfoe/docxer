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
  await build(getOption('esm', true));
  await build(getOption('cjs', true));

  // tsup 没有提供指定产出文件的名称的参数？？
  await rename('./dist/index.cjs', './dist/index.all.cjs');
  await rename('./dist/index.js', './dist/index.all.js');

  await build(getOption('esm'));
  await build(getOption('cjs'));
  // if (process.env.WATCH) {
  //   const ctx = await esbuild.context(getOption());
  //   await ctx.watch();
  //   console.log('Watching For dist/index.mjs bundle...');
  // }
})().catch((ex) => {
  console.error(ex);
});
