import type { DocxNode } from 'src/node';
import { extractXmlPTextLines } from '../util';

export interface DocxComment {
  id: string;
  texts: string[];
}
export type CommentStore = Map<string, DocxComment>;

interface XMLComment {
  'w:comment': DocxNode[];
  ':@': {
    'w:id': string;
  };
}
export function extractCommentTexts(node: XMLComment) {
  const texts: string[] = [];
  node['w:comment'].forEach((pnode) => {
    texts.push(...extractXmlPTextLines(pnode as unknown as Record<string, unknown>));
  });
  return texts;
}
export function parseComments(commentsXml: { 'w:comments': XMLComment[] }) {
  const commentStore = new Map<string, DocxComment>();
  commentsXml['w:comments'].forEach((xml: XMLComment) => {
    const cmt = {
      id: xml[':@']['w:id'],
      texts: extractCommentTexts(xml).filter((t) => t.startsWith('#')),
    };
    if (!cmt.texts.length) {
      throw new Error('批注不能为空，必须有至少一条 # 打头的指令');
    }
    commentStore.set(cmt.id, cmt);
  });
  // commentsXml['w:comments'].length = 0;
  return commentStore;
}
