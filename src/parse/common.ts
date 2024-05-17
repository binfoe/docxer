import type { Command, ParagraphDirective, RangeDirective } from 'src/directive';
import type { DocxNode } from 'src/node';
import type { DocxRel } from 'src/store';

export interface Paragraph {
  node: DocxNode;
  drawings?: Drawing[];
  directives: (RangeDirective | ParagraphDirective)[];
}
export type Drawing = ImageDrawing | TextboxDrawing;
export interface ImageDrawing {
  type: 'image';
  node: DocxNode;
  imgRel: DocxRel;
  commands: Command[];
}
export interface TextboxDrawing {
  type: 'textbox';
  node: DocxNode;
  paragraphs: Paragraph[];
}
