import { logger } from 'src/logger';
import type { DocxStores } from 'src/store';
import type { DocxNode } from '../node';
import { $, findByTagPath, wrapInner } from '../node';
import { parsePicture } from './picture';
import type { Drawing } from './common';
import { parseTextbox } from './textbox';

function getDesc(node: DocxNode, path: string[]) {
  const descr = findByTagPath(node, path);
  if (!descr) return null;
  const texts = descr[':@'].descr
    ?.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('#'));
  return texts?.length ? texts : null;
}
function parseDrawing(globalStores: DocxStores, node: DocxNode): Drawing | undefined {
  const tag = node[$].tag;
  if (tag === 'wps:wsp') {
    const texts = getDesc(node, ['wps:cNvPr']);
    if (!texts) return undefined;
    const paragraphs = parseTextbox(globalStores, node, texts);
    return paragraphs?.length
      ? {
          type: 'textbox',
          node,
          paragraphs,
        }
      : undefined;
  } else if (tag === 'pic:pic') {
    const texts = getDesc(node, ['pic:nvPicPr', 'pic:cNvPr']);
    if (!texts) return undefined;
    const pic = parsePicture(globalStores, node, texts);
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
  return found
    .map((node) => {
      return parseDrawing(globalStores, node);
    })
    .filter((d) => !!d);
}
