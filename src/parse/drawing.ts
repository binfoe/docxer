import { logger } from 'src/logger';
import type { DocxStores } from 'src/store';
import type { DocxNode } from '../node';
import { $, findByTagPath, wrapInner } from '../node';
import { parsePicture } from './picture';
import type { Drawing } from './common';
import { parseTextbox } from './textbox';

function parseDirectiveTexts(descText?: string) {
  const texts = descText
    ?.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('#'));
  return texts?.length ? texts : undefined;
}
function parseDrawing(
  globalStores: DocxStores,
  node: DocxNode,
  directiveTexts?: string[],
): Drawing | undefined {
  const tag = node[$].tag;
  if (tag === 'wps:wsp') {
    // 如果在上一层的 w:drawing 中未找到批指令，则尝试找 wps:wsp -> wps:cNvPr 节点。这是另一个版本的 office 的结构。
    directiveTexts =
      directiveTexts ?? parseDirectiveTexts(findByTagPath(node, ['wps:cNvPr'])?.[':@']?.descr);
    if (!directiveTexts?.length) return undefined;
    const paragraphs = parseTextbox(globalStores, node, directiveTexts);
    return paragraphs?.length
      ? {
          type: 'textbox',
          node,
          paragraphs,
        }
      : undefined;
  } else if (tag === 'pic:pic') {
    // 如果在上一层的 w:drawing 中未找到批指令，则尝试找 wps:wsp -> pic:nvPicPr -> pic:cNvPr 节点。这是另一个版本的 office 的结构。
    directiveTexts =
      directiveTexts ??
      parseDirectiveTexts(findByTagPath(node, ['pic:nvPicPr', 'pic:cNvPr'])?.[':@']?.descr);
    if (!directiveTexts?.length) return undefined;
    const pic = parsePicture(globalStores, node, directiveTexts);
    return pic
      ? {
          type: 'image',
          node,
          imgRel: pic.imgRel,
          commands: pic.commands,
        }
      : undefined;
  } else {
    logger.debug('unknown drawing');
    return undefined;
  }
}
export function parseXmlDrawing(
  globalStores: DocxStores,
  drawingNode: DocxNode,
): Drawing[] | undefined {
  const found: DocxNode[] = [];
  function walkFind(n: DocxNode) {
    // 页脚
    if (n[$].tag === 'wps:wsp' || n[$].tag === 'pic:pic') {
      found.push(n);
    } else if (n[$].tag !== '#text') {
      for (const child of n[$].children) {
        wrapInner(child, n);
        walkFind(child);
      }
    }
  }
  walkFind(drawingNode);
  if (!found.length) {
    logger.debug('unknown drawing');
    return undefined;
  }
  // 如果 w:drawing -> wp:anchor -> wp:docPr 这个结点存在且有合法的指令批注，则使用该批注。否则说明可能是其它版本 office，尝试在 parseDrawing 函数中找指令批注。
  const directiveTexts = parseDirectiveTexts(
    (findByTagPath(drawingNode, ['wp:anchor', 'wp:docPr']) ??
      findByTagPath(drawingNode, ['wp:inline', 'wp:docPr']))?.[':@']?.descr,
  );
  directiveTexts && logger.debug('meet draing directives:', directiveTexts);
  return found
    .map((node) => {
      return parseDrawing(globalStores, node, directiveTexts);
    })
    .filter((d) => !!d);
}
