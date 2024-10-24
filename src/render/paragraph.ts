import type { Paragraph } from 'src/parse/common';
import type { RenderContext } from './context';
import { renderCommand } from './command';
import { renderPicture } from './picture';

export function renderParagraph(par: Paragraph, context: RenderContext) {
  // parse 阶段已经保证段落级 directive 排在前面
  par.directives.forEach((dire) => {
    for (const cmd of dire.commands) {
      const continueNext = renderCommand({
        ...cmd,
        context,
        paragraph: par,
        ...(dire.type === 'paragraph'
          ? {
              pscope: true,
            }
          : {
              pscope: false,
              fromPath: dire.fromXPath!,
              toPath: dire.toXPath!,
            }),
      });
      if (!continueNext) {
        break;
      }
    }
  });
  par.drawings?.forEach((drawing) => {
    if (drawing.type === 'textbox') {
      drawing.paragraphs.forEach((par) => {
        renderParagraph(par, context);
      });
    } else {
      renderPicture(drawing, context);
    }
  });
}
