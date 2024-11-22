import type { Command } from 'src/directive';
import { PCmdSet } from 'src/directive';
import { logger } from 'src/logger';
import type { DocxNode } from 'src/node';
import { $, findByTagPath, wrapInner } from 'src/node';
import type { DocxStores } from 'src/store';
import { extractXmlPTextLines } from 'src/util';
import type { Paragraph } from './common';

interface Loc {
  /** 段落索引，从 1 开始 */
  pidx: number;
  /** 字符开始（左侧） Col 位置，从 1 开始 */
  from?: number;
  /** 字符结束（右侧）Col 位置，从 1 开始 */
  to?: number;
}

function parseLocation(txt: string, pnodes: DocxNode[]) {
  const [p, f, t] = txt
    .trim()
    .split(' ')
    .map((s) => s.trim());
  if (!p || p.charCodeAt(0) !== 112) throw new Error('#@ 必须指定段落，比如 #@ p1');
  const pi = Number(p.slice(1));
  if (!(pi >= 1) || pi > pnodes.length)
    throw new Error(`#@ 指定的段落区间错误，需要 1 到 ${pnodes.length}，实际传入：${pi}`);
  const loc: Loc = {
    pidx: pi,
    from: undefined,
    to: undefined,
  };
  let ptext = '';
  if (f) {
    if (f.length === 1) throw new Error('#@ 开始位置标记参数错误');
    const c = f.charCodeAt(0);
    if (c === 99) {
      loc.from = Number(f.slice(1));
    } else if (c === 119) {
      ptext = extractXmlPTextLines(pnodes[pi - 1] as unknown as Record<string, unknown>).join('\n');
      const idx = ptext.indexOf(f.slice(1));
      if (idx < 0) throw new Error(`#@ 开始位置关键字未找到：${f}`);
      loc.from = idx + 1;
      loc.to = loc.from + f.length - 1;
    } else {
      throw new Error('#@ 位置只支持 i 和 w');
    }
  }
  if (t) {
    if (t.length === 1) throw new Error('#@ 开始位置标记参数错误');
    if (!ptext)
      ptext = extractXmlPTextLines(pnodes[pi - 1] as unknown as Record<string, unknown>).join('\n');

    const c = t.charCodeAt(0);
    if (c === 99) {
      loc.from = Number(t.slice(1));
    } else if (c === 119) {
      const idx = ptext.indexOf(f.slice(1));
      if (idx < 0) throw new Error(`#@ 结束位置关键字未找到：${f}`);
      loc.to = idx + t.length - 1;
    } else {
      throw new Error('#@ 位置只支持 i 和 w');
    }
  } else if (loc.from !== undefined && loc.to === undefined) {
    throw new Error('#@ 位置指定了开始则必须指定结束范围');
  }
  return loc;
}

export function wrapP(currentNode: DocxNode, parentNode: DocxNode) {
  const keys = Object.keys(currentNode);
  if (keys.length > 2) throw new Error('assert failed');
  let tag = keys[0];
  if (tag === ':@') tag = keys[1];

  const children = (currentNode as unknown as Record<string, DocxNode[]>)[tag] ?? [];

  currentNode[$] = {
    tag,
    parent: parentNode,
    children,
  };

  if (tag === 'w:drawing') {
    logger.error('暂不支持文本框中嵌入图片');
    return;
  } else if (tag === 'w:tbl') {
    logger.error('暂不支持文本框中嵌入表格');
    return;
  } else if (tag === 'w:pict' || tag === '#text') {
    return;
  }

  children.forEach((c) => wrapP(c, currentNode));
}

/**
 * 文本框内的文本不支持添加标记，可以通过给文本框添加描述文字来定义指令。
 * 描述文本里，第一行是 #@ 指定范围，类似于批注，但直接使用文本标注，
 *   接下来的 N 行是和批注方式添加指令一致的方式的指令；
 *   再接下来如果遇到 #@ 则开始新的一段指令标注，循环往复。
 *
 * #@ 后首先指定段落 index，从 1 开始计数，且必须指定段落。
 * 然后可以指定开始位置，通过 c[integer] 指定开始 Col 位置，从 1 开始计数，
 * 紧接着通过 c[integer] 指定结束 Col 位置。
 * 也可通过 w[keyword] 直接指定以关键字所在的位置作为开始和结束位置
 *
 * 示例：
 * ```txt
 * #@ p1
 * #ifp a > 10
 * #@ p2 c3 c10
 * #var name
 * #@ p4 w关键字
 * #var age
 * ```
 */
export function parseTextbox(
  globalStores: DocxStores,
  node: DocxNode,
  directiveTexts: string[],
): Paragraph[] | undefined {
  const txc = findByTagPath(node, ['wps:txbx', 'w:txbxContent']);
  if (!txc) {
    logger.error('没有找到 w:txbxContent');
    return undefined;
  }
  const pnodes = txc[$].children.filter((n) => wrapInner(n)[$].tag === 'w:p');
  if (!pnodes.length) {
    logger.error('指令作用在了空文本框');
    return undefined;
  }
  let loc: Loc | null = null;
  const parr: Paragraph[] = pnodes.map((pn) => {
    return {
      node: pn,
      directives: [],
    };
  });
  let commands: Command[] = [];
  directiveTexts.forEach((txt) => {
    const i = txt.indexOf(' ');
    const name = i > 0 ? txt.slice(0, i) : txt;
    txt = i > 0 ? txt.slice(i + 1) : '';
    if (name === '#@') {
      if (loc && !commands.length) throw new Error('不能连续使用 #@ 标记');
      if (loc && commands.length) {
        const p = parr[loc.pidx - 1];
        if (loc.from !== undefined && loc.to !== undefined) {
          p.directives.push({
            type: 'range',
            fromCol: loc.from,
            toCol: loc.to,
            commands,
          });
        } else {
          p.directives.push({
            type: 'paragraph',
            commands,
          });
        }
      }
      loc = parseLocation(txt, pnodes);
      commands = [];
    } else {
      if (!loc) throw new Error('指令的前一行必须使用 #@ 标记目标');
      const isp = PCmdSet.has(name);
      if (loc.from === undefined && !isp) {
        throw new Error('#@ 如果只指定了段落号，则必须使用段落指令');
      }
      commands.push({
        name,
        argstr: txt,
      });
    }
  });

  if (loc && commands.length) {
    loc = loc as Loc;
    const p = parr[loc.pidx - 1];
    if (loc.from !== undefined && loc.to !== undefined) {
      p.directives.push({
        type: 'range',
        fromCol: loc.from,
        toCol: loc.to,
        commands,
      });
    } else {
      p.directives.push({
        type: 'paragraph',
        commands,
      });
    }
  }

  return parr.filter((p) => {
    if (p.directives.length) {
      wrapP(p.node, txc);
      return true;
    } else {
      return false;
    }
  });
}
