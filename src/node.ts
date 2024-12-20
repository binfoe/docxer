import { arrRm } from './util';
export const $ = Symbol('$');
export interface DocxNode {
  [$]: { tag: string; parent?: DocxNode; children: DocxNode[] };
  ':@': Record<string, string>;
  '#text'?: string;
}

export function createNode(
  tag: string,
  opts?: {
    children?: DocxNode[];
    parent?: DocxNode;
    attrs?: DocxNode[':@'];
  },
) {
  const children = opts?.children ?? [];
  const parent = opts?.parent;
  const node = {
    [$]: {
      tag,
      parent: opts?.parent,
      children,
    },
    ':@': opts?.attrs ?? {},
    [tag]: children,
  } as DocxNode;
  children.forEach((c) => (c[$].parent = node));
  if (parent) parent[$].children.push(node);
  return node;
}

export function createTextNode(text: string, parent?: DocxNode) {
  const node = {
    [$]: {
      tag: '#text',
      parent,
      children: [],
    },
    ':@': {},
    '#text': text,
  } as DocxNode;
  if (parent) parent[$].children.push(node);
  return node;
}

export function findParentNode(node: DocxNode, parentTag: string): DocxNode | null {
  if (node[$].tag === parentTag) return node;
  let p = node[$].parent;
  while (p) {
    if (p[$].tag === parentTag) return p;
    p = p[$].parent;
  }
  return null;
}

export function wrapInner(node: DocxNode, parent?: DocxNode) {
  if (!node[$]) {
    const tag = getXmlTag(node as unknown as Record<string, unknown>)!;
    node[$] = { tag, children: (node as unknown as Record<string, DocxNode[]>)[tag] ?? [], parent };
  }
  return node;
}
export function findByTagPath(node: DocxNode, tagPath: string[]): DocxNode | undefined {
  for (const tag of tagPath) {
    const _ = node[$];
    if (!_.children.length) return undefined;
    if (tag === '*') {
      wrapInner(_.children[0], node);
      node = _.children[0];
    } else {
      node = _.children.find((child) => {
        return wrapInner(child, node)[$].tag === tag;
      })!;
    }
    if (!node) return undefined;
  }
  return node;
}

export function rmNode(node: DocxNode) {
  arrRm(node[$].parent![$].children, node);
}
export function getXmlTag(node: Record<string, unknown>) {
  return Object.keys(node).find((k) => k !== ':@');
}
export function loopStartToEndNodes(
  startNode: DocxNode,
  endNode: DocxNode,
  cb: (n: DocxNode) => void,
) {
  /**
   * 在 callback 函数中，可能会将节点从 parent.children 数组中移除，会影响 parent.children。
   * 因此将 children 先浅拷贝一份后在拷贝数据上迭代。
   */
  const nodes = startNode[$].parent?.[$].children.slice();
  if (!nodes) throw new Error('nodes not found');
  let i = nodes.indexOf(startNode) + 1;
  for (; i < nodes.length; i++) {
    const n = nodes[i];
    if (n === endNode) break;
    cb(n);
  }
}

export function cloneNode(n: DocxNode, parent: DocxNode): DocxNode {
  const _ = n[$];
  if (_.tag === '#text') {
    return {
      ':@': n[':@'],
      [$]: {
        tag: '#text',
        parent,
        children: [],
      },
      '#text': n['#text'],
    };
  }
  const children: DocxNode[] = [];
  const newn: DocxNode = {
    [_.tag]: children,
    ':@': n[':@'],
    [$]: {
      tag: _.tag,
      parent,
      children,
    },
  };
  _.children.forEach((child) => {
    children.push(cloneNode(child, newn));
  });
  return newn;
}
