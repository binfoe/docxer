import type { DocxNode } from 'src/node';
import { $ } from 'src/node';
import type { ImageDrawing } from 'src/parse/common';
import { globalConfig } from 'src/config';
import type { RenderContext } from '../context';
import type { RenderCmdOpts } from './common';
import { getMaxCommonPath, getNodeByPath } from './common';

export function walkReplace(node: DocxNode, val: string) {
  let first = true;
  function walknode(n: DocxNode) {
    const { tag, children } = n[$];
    if (tag === 'w:drawing' || tag === 'w:pict') {
      return;
    } else if (tag === 'w:t') {
      const tn = children[0];
      if (!tn) return;
      if (first) {
        first = false;
        tn['#text'] = (val ?? globalConfig.emptyVarText).toString();
      } else {
        tn['#text'] = '';
      }
    } else {
      for (const child of children) {
        walknode(child);
      }
    }
  }
  walknode(node);
}

export function walkPathReplace(
  pnode: DocxNode,
  val: unknown,
  fromPath: number[],
  toPath: number[],
) {
  const mcp = getMaxCommonPath(fromPath, toPath);
  const root = getNodeByPath(pnode, mcp);
  const left = getNodeByPath(pnode, fromPath);
  const right = getNodeByPath(pnode, toPath);
  let begin = false;
  let end = false;
  let first = true;
  function walkpath(n: DocxNode) {
    const { tag, children } = n[$];
    if (tag === 'w:drawing' || tag === 'w:pict') {
      return;
    }
    if (n === left) {
      begin = true;
    } else if (n === right) {
      end = true;
      if (tag === 'w:t' && begin) {
        const tn = children[0];
        if (!tn) return;
        if (first) {
          first = false;
          tn['#text'] = (val ?? globalConfig.emptyVarText).toString();
        } else {
          tn['#text'] = '';
        }
      }
      return;
    }
    if (tag === 'w:t') {
      if (begin) {
        const tn = children[0];
        if (!tn) return;
        if (first) {
          first = false;
          tn['#text'] = (val ?? globalConfig.emptyVarText).toString();
        } else {
          tn['#text'] = '';
        }
      }
    } else {
      for (const child of children) {
        walkpath(child);
        if (end) break;
      }
    }
  }
  walkpath(root);
}
export function renderVarCommand({ argstr, paragraph, context, ...scope }: RenderCmdOpts) {
  const val = context.eval(argstr);

  if (scope.pscope === true) {
    walkReplace(paragraph.node, val);
  } else {
    walkPathReplace(paragraph.node, val, scope.fromPath, scope.toPath);
  }
  return false;
}

export function renderPictureVarCommand(argstr: string, context: RenderContext, pic: ImageDrawing) {
  let val = context.eval(argstr);
  const err = () => {
    throw new Error('图片标注中的 #var 指令必须返回 base64 字符串或 binary 内容');
  };
  if (typeof Buffer !== 'undefined') {
    if (typeof val === 'string') {
      val = Buffer.from(val, 'base64');
    } else if (!(val instanceof Buffer)) {
      err();
    }
  } else {
    if (typeof val === 'string') {
      val = Uint8Array.from(atob(val), (c) => c.charCodeAt(0));
    } else if (!(val instanceof ArrayBuffer)) {
      err();
    }
  }
  let f = pic.imgRel.target;
  if (!f.startsWith('word/')) f = 'word/' + f;
  context.zip.file(f, val, {
    binary: true,
  });
  return false;
}
