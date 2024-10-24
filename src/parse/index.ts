import type { DocxStores } from 'src/store';
import type { DocxNode } from '../node';
import { $, wrapInner } from '../node';
import type { Paragraph } from './common';
import { parseParagraph } from './paragraph';
import type { Table } from './table';
import { parseTable } from './table';
import { parseConfig } from './config';

export function parseXmlBody(xmlBody: DocxNode, globalStores: DocxStores) {
  wrapInner(xmlBody);

  const xmlBodyNodes = xmlBody[$].children;
  const paragraphs: Paragraph[] = [];
  const tables: Table[] = [];
  let cfgIdx = -1;
  for (let i = 0; i < xmlBodyNodes.length; i++) {
    const node = xmlBodyNodes[i];
    const keys = Object.keys(node);
    const tag = keys.find((k) => k !== ':@');
    if (tag === 'w:tbl') {
      wrapInner(node, xmlBody);
      const table = parseTable(globalStores, node);
      if (table?.rows.length) {
        tables.push(table);
      }
    } else if (tag === 'w:p') {
      const [meetConfig, paragraph] = parseParagraph(globalStores, node, xmlBody);
      if (meetConfig) {
        cfgIdx = i;
        break;
      } else {
        paragraphs.push(paragraph as Paragraph);
      }
    }
  }
  if (cfgIdx >= 0) {
    const parr = xmlBodyNodes.splice(cfgIdx, xmlBodyNodes.length - cfgIdx);
    parseConfig(globalStores, parr as unknown as Record<string, unknown>[]);
  }
  return {
    tables: tables.filter((tbl) => !!tbl.rows.length),
    paragraphs: paragraphs.filter((par) => !!par.directives.length || !!par.drawings?.length),
  };
}
