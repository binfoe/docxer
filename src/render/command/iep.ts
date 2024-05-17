import { $, cloneNode } from 'src/node';
import { generateDocxRndId } from 'src/util';
import type { RenderCmdOpts } from './common';
import { walkReplace } from './var';

export function renderIepCommand({ argstr, paragraph, context }: RenderCmdOpts) {
  const count = context.eval(argstr);
  if (typeof count !== 'number' || count < 1) {
    throw new Error('#iep 指令的表达式必须返回正整数');
  }

  const attrs = paragraph.node[':@'];
  if (!attrs['w14:textId'] || !attrs['w14:paraId']) {
    throw new Error('未知的 docx 版本，w14:paraId 未找到');
  }

  const body = paragraph.node[$].parent;
  const parr = body[$].children;
  const pi = parr.indexOf(paragraph.node);
  parr.splice(pi, 1);

  const textId = generateDocxRndId();
  const rsidR = generateDocxRndId();
  walkReplace(paragraph.node, '');
  Object.assign(paragraph.node[':@'], {
    'w14:textId': textId,
    'w:rsidR': rsidR,
    'w:rsidRDefault': rsidR,
  });

  for (let i = 0; i < count; i++) {
    const cloneP = cloneNode(paragraph.node, body);
    cloneP[':@']['w:paraId'] = generateDocxRndId();
    parr.splice(pi, 0, cloneP);
  }
  return false;
}
