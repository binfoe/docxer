import type { DocxStores } from 'src/store';
import { logger } from 'src/logger';
import type { DocxNode } from '../node';
import { findByTagPath } from '../node';

const PictureCmdSet = new Set(['#var', '#if', '#for']);

export function parsePicture(globalStores: DocxStores, node: DocxNode, texts: string[]) {
  node = findByTagPath(node, ['pic:blipFill', 'a:blip'])!;
  if (!node) {
    logger.error('parsePicture: a:blip not found');
    return null;
  }
  const relId = node[':@']['r:embed'];
  const rel = globalStores.relsStore.get(relId);
  if (rel?.type !== 'image') {
    throw new Error('图片 relationship 未找到');
  }
  const commands = texts.map((txt) => {
    const i = txt.indexOf(' ');
    const name = i > 0 ? txt.slice(0, i) : txt;
    const argstr = i > 0 ? txt.slice(i + 1) : '';
    if (!PictureCmdSet.has(name)) {
      throw new Error(`图片描述中有不支持的指令: ${name}`);
    }
    return { name, argstr };
  });
  return { imgRel: rel, commands };
}
