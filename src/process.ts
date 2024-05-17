import JSZip from 'jszip';
import { readXML, writeXML } from './util';
import { parseComments } from './store/comment';
import { parseXmlBody } from './parse';
import { parseRels } from './store/relation';
import type { DocxStores } from './store';
import { prepareDirectives } from './directive';
import { renderDocument } from './render';
import type { Paragraph } from './parse/common';
import { doConfigPrepare, type RenderConfig } from './parse/config';
import type { DocxNode } from './node';
import { $ } from './node';

// 校验和预处理 directives，当前仅处理两层。文本框内如果再嵌入文本框不支持。
function prepareParagraph(par: Paragraph) {
  prepareDirectives(par);
  par.drawings?.forEach((dr) => {
    if (dr.type === 'textbox') {
      dr.paragraphs.forEach((tbpar) => {
        prepareDirectives(tbpar);
      });
    }
  });
}

export async function processDocx({
  docxFileBuf,
  renderData,
  renderConfig,
}: {
  docxFileBuf: ArrayBuffer | Buffer;
  /** 渲染数据。必须是 object 对象，且不能有 'ctx' 这个保留单词的属性名。 */
  renderData: { [key: string]: unknown };
  renderConfig?: RenderConfig;
}) {
  if (typeof renderData !== 'object' || renderData === null) {
    throw new Error('bad renderData');
  }

  renderConfig = {
    dropTailParagraphs: 0,
    ...renderConfig,
  };

  const zip = await JSZip.loadAsync(docxFileBuf);
  const mainDocFilename = 'word/document.xml';
  const commentsDocFilename = 'word/comments.xml';
  const relsDocFilename = 'word/_rels/document.xml.rels';
  const commentsDoc = await readXML(zip, commentsDocFilename);
  const cmtStore = commentsDoc ? parseComments(commentsDoc[1]) : new Map();

  const relsDoc = await readXML(zip, relsDocFilename);
  const relsStore = await parseRels(relsDoc[1]);

  const globalStores: DocxStores = {
    cmtStore,
    relsStore,
    cfg: {
      renderConfig,
    },
  };

  const mainDoc = await readXML(zip, mainDocFilename);
  const mainBody = mainDoc[1]['w:document'][0] as DocxNode;
  const { paragraphs, tables } = parseXmlBody(mainBody, globalStores);

  doConfigPrepare(renderData, globalStores.cfg);

  paragraphs.forEach((par) => prepareParagraph(par));
  tables.forEach((tbl) => {
    tbl.rows.forEach((tr) => {
      tr.paragraphs.forEach((par) => {
        prepareParagraph(par);
      });
    });
  });

  renderDocument({
    tables,
    paragraphs,
    renderData,
    zip,
  });

  /**
   * 渲染完成后，额外删除尾部的 w:p。用于微调渲染结果。
   * dropTailParagraphs 参数可在 #docxer-config 的 #prepare 中配置。
   */
  if (renderConfig.dropTailParagraphs > 0) {
    const arr = mainBody[$].children;
    let i = 0;
    while (i < renderConfig.dropTailParagraphs) {
      let j = arr.length - 1;
      for (; j >= 0; j--) {
        if (arr[j][$].tag === 'w:p') {
          arr.splice(j, 1);
          i++;
          break;
        }
      }
      if (j < 0) {
        break;
      }
    }
  }

  writeXML(zip, mainDocFilename, mainDoc);
  commentsDoc && writeXML(zip, commentsDocFilename, commentsDoc);
  const buf = await zip.generateAsync({ type: typeof Buffer === 'undefined' ? 'blob' : 'nodebuffer' });
  return buf;
}
