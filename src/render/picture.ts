import type { ImageDrawing } from 'src/parse/common';
import type { Command } from 'src/directive';
import type { RenderContext } from './context';
import { renderPictureIfCommand } from './command/if';
import { renderPictureVarCommand } from './command/var';

function renderPictureCmd(cmd: Command, context: RenderContext, pic: ImageDrawing) {
  switch (cmd.name) {
    case '#if':
      return renderPictureIfCommand(cmd.argstr, context, pic);
    case '#var':
      return renderPictureVarCommand(cmd.argstr, context, pic);
    default:
      throw new Error('图片描述标注中有不支持的指令：' + cmd.name);
  }
}
export function renderPicture(drawing: ImageDrawing, context: RenderContext) {
  for (const cmd of drawing.commands) {
    if (!renderPictureCmd(cmd, context, drawing)) {
      break;
    }
  }
}
