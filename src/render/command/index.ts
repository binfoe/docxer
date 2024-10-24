import type { RenderCmdOpts } from './common';
import { renderVarCommand } from './var';
import { renderIfCommand } from './if';
import { renderIepCommand } from './iep';
import { renderIgCommand } from './ig';

export function renderCommand(options: RenderCmdOpts): boolean {
  switch (options.name) {
    case '#var':
    case '#varp':
      return renderVarCommand(options);
    case '#if':
    case '#ifp':
      return renderIfCommand(options);
    case '#iep':
      return renderIepCommand(options);
    case '#ig':
    case '#igp':
      return renderIgCommand(options);
    default:
      throw new Error(`不支持的指令：${options.name}`);
  }
}
