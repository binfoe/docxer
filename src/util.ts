/* eslint-disable @typescript-eslint/no-explicit-any */
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type JSZip from 'jszip';
import { getXmlTag } from './node';
export function parseXML(buf: string | ArrayBuffer | Buffer) {
  const parser = new XMLParser({
    trimValues: false,
    preserveOrder: true,
    ignoreAttributes: false,
    parseTagValue: false,
    htmlEntities: true,
    attributeNamePrefix: '',
  });
  return parser.parse(buf as Buffer);
}
export async function readXML(zip: JSZip, filename: string) {
  const buf = await zip.file(filename)?.async('text');
  return buf ? parseXML(buf) : null;
}
export function writeXML(zip: JSZip, filename: string, xml: any) {
  const builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });
  const txt = builder.build(xml);
  zip.file(filename, txt);
}
export function extractXmlNodesText(nodes: Record<string, unknown>[]) {
  const txt: string[] = [];
  function walk(n: Record<string, unknown>) {
    const tag = getXmlTag(n);
    if (tag === 'w:cr') {
      txt.push('\n');
    } else if (tag === '#text') {
      txt.push((n as { '#text': string })[tag]);
    } else if (tag !== 'w:pict' && tag !== 'w:tbl') {
      (n as Record<string, Record<string, unknown>[]>)[tag].forEach((child) => {
        walk(child);
      });
      if (tag === 'w:p') {
        txt.push('\n');
      }
    }
  }
  nodes.forEach((n) => {
    walk(n);
  });
  return txt.join('');
}
export function extractXmlPTextLines(node: Record<string, unknown>) {
  const result: string[] = [];
  const line: string[] = [];
  function walk(n: Record<string, unknown>) {
    const tag = getXmlTag(n);
    if (tag === 'w:cr') {
      line.length && result.push(line.join('').trim());
      line.length = 0;
    } else if (tag === '#text') {
      line.push((n as { '#text': string })[tag]);
    } else if (tag !== 'w:drawing' && tag !== 'w:tbl') {
      (n as Record<string, Record<string, unknown>[]>)[tag].forEach((child) => walk(child));
    }
  }
  walk(node);
  line.length && result.push(line.join('').trim());
  return result;
}

export function arrRm<T>(arr: T[], item: T) {
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1);
}

export function sortedInsert<T extends { sn: number }>(arr: T[], el: T) {
  let high = arr.length;
  if (high === 0 || arr[high - 1].sn <= el.sn) {
    arr.push(el);
    return;
  }
  let low = 0;
  if (arr[low].sn > el.sn) {
    arr.unshift(el);
    return;
  }
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid].sn < el.sn) low = mid + 1;
    else high = mid;
  }
  arr.splice(low, 0, el);
}

const CHARS = (() => {
  const [A, Z, N0, N9] = 'AZ09'.split('').map((c) => c.charCodeAt(0));
  const alphas = new Array(Z - A + 1).fill(0).map((n, i) => String.fromCharCode(A + i));
  const digets = new Array(N9 - N0 + 1).fill(0).map((n, i) => String.fromCharCode(N0 + i));
  return alphas.concat(digets);
})();
export function generateDocxRndId(len = 8) {
  const id: string[] = [];
  for (let i = 0; i < len; i++) {
    id.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
  }
  return id.join('');
}

export function isUndefined(v: unknown): v is undefined {
  return typeof v === 'undefined';
}

export function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
export function isObj<T extends object>(v: unknown): v is T {
  return typeof v === 'object' && v !== null;
}

export function isNum(v: unknown): v is number {
  return typeof v === 'number';
}
