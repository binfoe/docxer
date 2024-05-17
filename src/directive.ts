import type { DocxNode } from './node';
import { $, cloneNode } from './node';
import type { Paragraph } from './parse/common';

export const PCmdSet = new Set(['#varp', '#ifp', '#igp', '#forp', '#iep']);

export interface Command {
  name: string;
  argstr?: string;
}
export interface ParagraphDirective {
  type: 'paragraph';
  commands: Command[];
}
export interface TableDirective {
  type: 'table';
  commands: Command[];
}

export interface RangeDirective {
  type: 'range';
  /** 字符开始（左侧） Col 位置，从 1 开始 */
  fromCol: number;
  /** 字符结束（右侧）Col 位置，从 1 开始 */
  toCol: number;
  fromXPath?: number[];
  toXPath?: number[];
  commands: Command[];
}

export type Directive = RangeDirective | ParagraphDirective | TableDirective;

function calcXPath(pnode: DocxNode, d: RangeDirective) {
  const xpath: number[] = [];
  let col = 1;
  const fromCol = d.fromCol;
  const toCol = d.toCol;
  let fpath: number[] = null;
  let tpath: number[] = null;
  function walk(n: DocxNode) {
    if (n[$].tag === 'w:t') {
      if (!n[$].children.length) {
        return;
      }
      const tnode = n[$].children[0];
      const txt = tnode['#text'];
      const tlen = txt.length;
      const newcol = col + tlen;
      let tpathsi = 0;
      if (!fpath) {
        if (col === fromCol) {
          fpath = xpath.slice();
        } else if (newcol > fromCol) {
          const wr = n[$].parent;
          if (wr?.[$].tag !== 'w:r') throw new Error('未知文档格式');
          const wr2 = cloneNode(wr, wr[$].parent);
          tpathsi = fromCol - col;
          const tl = txt.slice(0, tpathsi);
          const tnode2 = wr2[$].children.find((c) => c[$].tag === 'w:t')[$].children[0];
          tnode2['#text'] = tl;

          const tr = txt.slice(tpathsi);
          tnode['#text'] = tr;

          const parr = wr[$].parent[$].children;
          const i = parr.indexOf(wr);
          parr.splice(i, 0, wr2);
          xpath[xpath.length - 2]++; // 倒数第二个 w:r 元素的左侧插入元素后，该元素的 xpath 的索引 +1

          fpath = xpath.slice(); // fpath 和 xpath 相同。
        }
      }
      if (fpath) {
        if (newcol === toCol) {
          tpath = xpath.slice();
        } else if (newcol > toCol) {
          const wr = n[$].parent;
          if (wr?.[$].tag !== 'w:r') throw new Error('未知文档格式');
          const wr2 = cloneNode(wr, wr[$].parent);
          const tl = txt.slice(tpathsi, toCol - 1);
          tnode['#text'] = tl;
          const tr = txt.slice(toCol - 1);
          const tnode2 = wr2[$].children.find((c) => c[$].tag === 'w:t')[$].children[0];
          tnode2['#text'] = tr;

          const parr = wr[$].parent[$].children;
          const i = parr.indexOf(wr);
          parr.splice(i + 1, 0, wr2);
          tpath = xpath.slice(); // xpath.slice 必须先调用

          xpath[xpath.length - 2]++; // xpath[xpath.length - 2]++ 在 xpath.slice 之后调用。用于增加外层 for 递归循环的 i 索引。
        }
      }
      col += tlen;
    } else {
      const children = n[$].children;
      for (let i = 0; i < children.length; i++) {
        const { tag } = children[i][$];
        if (tag === 'w:drawing' || tag === 'w:pict') {
          continue;
        }
        xpath.push(i);
        walk(children[i]);
        i = xpath.pop();
        if (fpath && tpath) break;
      }
    }
  }
  walk(pnode);
  d.fromXPath = fpath;
  d.toXPath = tpath;
}

export function prepareDirectives(paragraph: Paragraph) {
  const directives = paragraph.directives;
  if (directives.length > 1) {
    directives.sort((da, db) => {
      const wa = da.type === 'range' ? da.fromCol : 0;
      const wb = db.type === 'range' ? db.fromCol : 0;
      return wa > wb ? 1 : wa < wb ? -1 : 0;
    });
  }

  const ri = directives.findIndex((d) => d.type === 'range');
  if (ri > 1 || (ri < 0 && directives.length > 1))
    throw new Error('段落级标记只能标记一次，请将指令合并到同一标记中');
  if (ri < 0) {
    // 全部是段落级标记，没有 range 标记
    return;
  }
  if (ri === directives.length - 1) {
    // 只有一个 range 标记，不需要校验和排序。
    calcXPath(paragraph.node, directives[ri] as RangeDirective);
    return;
  }
  for (let i = ri; i < directives.length; i++) {
    const da = directives[i] as RangeDirective;
    for (let j = i + 1; j < directives.length; j++) {
      const db = directives[j] as RangeDirective;
      if (db.fromCol === da.fromCol && db.toCol === da.toCol) {
        throw new Error('相同标记范围只能标记一次，请将多条指令合并');
      }
      if (db.fromCol < da.toCol && db.fromCol > da.fromCol && db.toCol > da.toCol) {
        throw new Error('指令的标记范围不能有交叉');
      }
    }
  }
  /**
   * 将 Range 指令按宽度从大到小排列，宽度大的优先级更高。
   * 前面的逻辑保证了 range 指令不会有交叉，只会有包含。并且 fromCol 一定是从小到到排列。
   * 因此指令已经有按 fromCol 分组。将每一组的宽度从大到小排列。
   * */
  const sorted: RangeDirective[] = [];
  let i = ri;
  out: while (i < directives.length) {
    const da = directives[i] as RangeDirective;
    let j = i + 1;
    for (; j < directives.length; j++) {
      const db = directives[j] as RangeDirective;
      if (db.fromCol >= da.toCol) {
        sorted.push(
          ...(directives as RangeDirective[]).slice(i, j).sort((da, db) => {
            const wa = db.toCol - db.fromCol;
            const wb = da.toCol - da.fromCol;
            return wa > wb ? 1 : wa < wb ? -1 : 0;
          }),
        );
        i = j;
        continue out;
      }
    }
    if (j - i > 0) {
      sorted.push(
        ...(directives as RangeDirective[]).slice(i, j).sort((da, db) => {
          const wa = db.toCol - db.fromCol;
          const wb = da.toCol - da.fromCol;
          return wa > wb ? 1 : wa < wb ? -1 : 0;
        }),
      );
    }
    break;
  }

  sorted.forEach((directive) => {
    calcXPath(paragraph.node, directive);
  });

  directives.splice(ri, sorted.length, ...sorted);
}
