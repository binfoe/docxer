import { findParentNode, rmNode } from 'src/node';
import type { ImageDrawing } from 'src/parse/common';
import type { RenderContext } from '../context';
import type { RenderCmdOpts } from './common';
import { walkPathReplace } from './var';

export function renderIfCommand({ argstr, paragraph, context, ...scope }: RenderCmdOpts) {
  const val = argstr ? !!context.eval(argstr) : false;
  if (val) {
    return true;
  }
  if (scope.pscope === true) {
    rmNode(paragraph.node);
  } else {
    walkPathReplace(paragraph.node, '', scope.fromPath, scope.toPath);
  }
  return false;
}

export function renderPictureIfCommand(argstr: string, context: RenderContext, pic: ImageDrawing) {
  const val = !!context.eval(argstr);
  if (val) {
    return true;
  }
  const drawingNode = findParentNode(pic.node, 'w:drawing');
  if (!drawingNode) throw new Error('unexpected');
  rmNode(drawingNode);
  return false;
}
