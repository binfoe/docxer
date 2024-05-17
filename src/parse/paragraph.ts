import type { DocxStores } from 'src/store';
import type { Command, Directive, TableDirective } from 'src/directive';
import { PCmdSet } from 'src/directive';
import type { DocxNode } from '../node';
import { $, getXmlTag, rmNode } from '../node';
import { parseXmlDrawing } from './drawing';
import type { Paragraph } from './common';

interface WalkPCtx {
  tidx: number;
  meetConfig: boolean;
  globalStores: DocxStores;
  cmtNodes: DocxNode[];
  diStack: Directive[];
  tableDirective?: TableDirective;
}
function walkP(paragraph: Paragraph, ctx: WalkPCtx, currentNode: DocxNode, parentNode: DocxNode) {
  if (ctx.meetConfig) return;

  const tag = getXmlTag(currentNode);
  const children = (currentNode as unknown as Record<string, DocxNode[]>)[tag] ?? [];

  currentNode[$] = {
    tag,
    parent: parentNode,
    children,
  };

  if (tag === '#text') {
    const t = currentNode[tag];
    if (t === '#docxer-config') {
      ctx.meetConfig = true;
      return;
    }
    ctx.tidx += t.length;
  } else if (tag === 'w:pict') {
    // ignore
  } else if (tag === 'w:commentRangeStart') {
    ctx.cmtNodes.push(currentNode);
    const id = currentNode[':@']['w:id'];
    const cmt = ctx.globalStores.cmtStore.get(id);
    const commands: Command[] = [];
    let isp = false;
    let istbl = false;
    cmt.texts.forEach((txt, ti) => {
      const i = txt.indexOf(' ');
      const cmd = i > 0 ? txt.slice(0, i) : txt;
      const argstr = i > 0 ? txt.slice(i + 1) : '';
      if (ti === 0) {
        istbl = cmd === '#table';
        isp = PCmdSet.has(cmd);
      } else if (istbl) {
        throw new Error('#table 指令不能和其它指混用');
      } else if (isp !== PCmdSet.has(cmd)) {
        throw new Error('段落级指令和局部指令不能混用');
      }
      commands.push({
        name: cmd,
        argstr,
      });
    });
    ctx.diStack.push(
      istbl
        ? { type: 'table', commands }
        : isp
          ? { type: 'paragraph', commands }
          : {
              type: 'range',
              fromCol: ctx.tidx + 1,
              toCol: -1,
              commands,
            },
    );
  } else if (tag === 'w:commentRangeEnd') {
    ctx.cmtNodes.push(currentNode);
    const di = ctx.diStack.pop();
    if (!di) throw new Error('批注不能跨段落');
    if (di.type === 'range') {
      di.toCol = ctx.tidx + 1;
      if (di.fromCol === di.toCol) throw new Error('批注不能标记在空位置');
    }
    if (di.type === 'table') {
      if (ctx.tableDirective) {
        throw new Error('#table 指令只能标记一次');
      }
      ctx.tableDirective = di;
    } else {
      paragraph.directives.push(di);
    }
  } else if (tag === 'w:commentReference') {
    ctx.cmtNodes.push(currentNode);
  } else if (tag === 'w:drawing') {
    const darr = parseXmlDrawing(ctx.globalStores, currentNode);
    if (darr?.length) {
      paragraph.drawings.push(...darr);
    }
  } else if (tag === 'w:tbl') {
    throw new Error('段落里不应该出现 w:tbl');
  } else if (children?.length) {
    for (const child of children) {
      walkP(paragraph, ctx, child, currentNode);
      if (ctx.meetConfig) {
        return;
      }
    }
  }
}
export function parseTableParagraph(globalStores: DocxStores, pnode: DocxNode, parent?: DocxNode) {
  const paragraph: Paragraph = {
    node: pnode,
    drawings: [],
    directives: [],
  };
  const ctx: WalkPCtx = {
    tidx: 0,
    meetConfig: false,
    globalStores,
    diStack: [],
    cmtNodes: [],
    tableDirective: null,
  };
  walkP(paragraph, ctx, pnode, parent);

  ctx.cmtNodes.forEach((cmt) => {
    rmNode(cmt);
  });

  return {
    paragraph,
    tableDirective: ctx.tableDirective,
  };
}
export function parseParagraph(
  globalStores: DocxStores,
  pnode: DocxNode,
  parent?: DocxNode,
): [true] | [false, Paragraph] {
  const paragraph: Paragraph = {
    node: pnode,
    drawings: [],
    directives: [],
  };
  const ctx: WalkPCtx = {
    tidx: 0,
    meetConfig: false,
    globalStores,
    diStack: [],
    cmtNodes: [],
    tableDirective: null,
  };
  walkP(paragraph, ctx, pnode, parent);
  if (ctx.tableDirective) {
    throw new Error('#table 指令只能在表格中标记');
  }
  if (ctx.meetConfig) {
    return [true];
  }

  ctx.cmtNodes.forEach((cmt) => {
    rmNode(cmt);
  });

  return [false, paragraph];
}
