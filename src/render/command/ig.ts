import { rmNode } from 'src/node';
import type { RenderCmdOpts } from './common';
import { walkPathReplace } from './var';

export function renderIgCommand({ paragraph, ...scope }: RenderCmdOpts) {
  if (scope.pscope === true) {
    rmNode(paragraph.node);
  } else {
    walkPathReplace(paragraph.node, '', scope.fromPath, scope.toPath);
  }
  return false;
}
