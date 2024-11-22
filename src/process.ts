import { isObj, readXML, writeXML } from './util';
import { parseComments } from './store/comment';
import { parseXmlBody } from './parse';
import { parseRels } from './store/relation';
import type { DocxStores, RelsStore } from './store';
import { prepareDirectives } from './directive';
import { renderDocument } from './render';
import type { Paragraph } from './parse/common';
import { doConfigPrepare } from './parse/config';
import type { DocxNode } from './node';
import { $ } from './node';
import type { RenderConfig } from './config';
import { globalConfig } from './config';

import JSZip from 'jszip';

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
  docxFileBuf: ArrayBuffer | Buffer | Uint8Array;
  /** 渲染数据。必须是 object 对象，且不能有 'ctx' 这个保留单词的属性名。 */
  renderData: Record<string, unknown>;
  renderConfig?: Partial<RenderConfig>;
}) {
  if (!isObj(renderData)) {
    throw new Error('renderData 参数必须传递包含渲染数据的对象');
  }

  const { helperFunctions, ...configs } = renderConfig ?? {};
  Object.assign(globalConfig, configs);
  Object.assign(globalConfig.helperFunctions, helperFunctions);

  const zip = await JSZip.loadAsync(docxFileBuf);
  const { relsStore: mainDocRels } = await processMainDoc(zip, renderData);

  for await (const item of [...mainDocRels.values()]) {
    if (item.type !== 'footer' || !item.target) continue;
    await processFooterDoc(zip, renderData, item.target);
  }

  const buf = await zip.generateAsync({
    type: typeof Buffer === 'undefined' ? 'blob' : 'nodebuffer',
  });
  return buf;
}

/**
 * 处理页脚。office word 的页脚不支持批注，可以采用插入文本框的方式模拟。
 */
async function processFooterDoc(
  zip: JSZip,
  renderData: Record<string, unknown>,
  footerFilename: string,
) {
  const footerDocFilename = `word/${footerFilename}`;
  const relsDocFilename = `word/_rels/${footerFilename}.rels`;
  let relsStore: RelsStore = new Map();
  try {
    const relsDoc = await readXML(zip, relsDocFilename);
    relsStore = await parseRels(relsDoc[1]);
  } catch (ex) {
    console.error(ex);
    //
  }
  const footerDoc = await readXML(zip, footerDocFilename);
  const footerBody = footerDoc[1] as DocxNode;
  const globalStores: DocxStores = {
    currentDoc: 'footer',
    relsStore,
    // 页脚不会有批注，也不会有 #prepare 配置。保留 DocxStores 的统一格式。
    cmtStore: new Map(),
    cfg: {},
  };
  const { paragraphs, tables } = parseXmlBody(footerBody, globalStores);
  paragraphs.forEach((par) => prepareParagraph(par));

  renderDocument({
    tables,
    paragraphs,
    renderData,
    zip,
  });
  writeXML(zip, footerDocFilename, footerDoc);
}

/**
 * 处理主体文档。
 */
async function processMainDoc(zip: JSZip, renderData: Record<string, unknown>) {
  const mainDocFilename = 'word/document.xml';
  const commentsDocFilename = 'word/comments.xml';
  const relsDocFilename = 'word/_rels/document.xml.rels';
  const commentsDoc = await readXML(zip, commentsDocFilename);
  const cmtStore = commentsDoc ? parseComments(commentsDoc[1]) : new Map();

  const relsDoc = await readXML(zip, relsDocFilename);
  const relsStore = await parseRels(relsDoc[1]);

  const globalStores: DocxStores = {
    currentDoc: 'main',
    cmtStore,
    relsStore,
    cfg: {},
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
  if (globalConfig.dropTailParagraphs > 0) {
    const arr = mainBody[$].children;
    let i = 0;
    while (i < globalConfig.dropTailParagraphs) {
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

  return {
    relsStore,
  };
}
