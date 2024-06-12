import type { DocxNode } from 'src/node';
import { $, wrapInner } from 'src/node';
import type { DocxStores } from 'src/store';
import type { TableDirective } from 'src/directive';
import type { Paragraph } from './common';
import { parseTableParagraph } from './paragraph';

export interface TRow {
  node: DocxNode;
  paragraphs: Paragraph[];
}

export interface Table {
  node: DocxNode;
  loopDirective: TableDirective | null;
  rows: TRow[];
}
export function parseTable(globalStores: DocxStores, node: DocxNode): Table {
  const trows: TRow[] = [];
  let loopDirective: TableDirective = null;
  function walk(n: DocxNode, parent: DocxNode) {
    const { tag, children } = n[$];
    if (tag === 'w:p') {
      const { paragraph, tableDirective } = parseTableParagraph(globalStores, n, parent);
      if (tableDirective) {
        if (loopDirective) throw new Error('#table 或 #dymtable 指令只能标记一次');
        loopDirective = tableDirective;
      }
      const tr = trows[trows.length - 1];
      if (paragraph.directives?.length || paragraph.drawings?.length) {
        tr.paragraphs.push(paragraph as Paragraph);
      }
    } else {
      if (tag === 'w:tr') {
        trows.push({
          node: n,
          paragraphs: [],
        });
      }
      for (const child of children) {
        wrapInner(child, n);
        walk(child, n);
      }
    }
  }
  node[$].children.forEach((cn) => {
    wrapInner(cn, node);
    walk(cn, node);
  });

  return {
    node,
    loopDirective,
    rows: trows,
  };
}
