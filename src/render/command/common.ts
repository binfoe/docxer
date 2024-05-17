import type { Paragraph } from 'src/parse/common';
import type { DocxNode } from 'src/node';
import { $ } from 'src/node';
import type { RenderContext } from '../context';

export type RenderCmdOpts = {
  name: string;
  argstr?: string;
  paragraph: Paragraph;
  context: RenderContext;
} & (
  | {
      pscope: false;
      fromPath: number[];
      toPath: number[];
    }
  | {
      pscope: true;
    }
);

/**
 * 获取最大公共 xpath
 */
export function getMaxCommonPath(pa: number[], pb: number[]) {
  const cp: number[] = [];
  for (let i = 0; i < pa.length; i++) {
    const a = pa[i];
    const b = pb[i];
    if (a === b) cp.push(a);
    else {
      break;
    }
  }
  return cp;
}

export function getNodeByPath(root: DocxNode, path: number[]) {
  path.forEach((i) => (root = root[$].children[i]));
  return root;
}
