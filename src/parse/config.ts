import { getXmlTag } from 'src/node';
import type { DocxStores } from 'src/store';
import { extractXmlNodesText } from 'src/util';

export interface RenderConfig {
  // 渲染结束后，额外删除文档尾部的段落。默认为 0。该参数可用于修正渲染后可能多出来的空段落（空页）。
  dropTailParagraphs?: number;
}
export interface Config {
  prepare?: string;
  renderConfig: RenderConfig;
}

export function doConfigPrepare(renderData: Record<string, unknown>, cfg: Config) {
  if (!cfg.prepare) return;
  const fn = new Function('$data', '$config', cfg.prepare);
  fn(renderData, cfg.renderConfig);
}

export function parseConfig(globalStores: DocxStores, pnodes: Record<string, unknown>[]) {
  // 第 0 个 w:p 是 #docxer-config 标记段落，从 1 开始
  for (let i = 1; i < pnodes.length; i++) {
    const pn = pnodes[i];
    const tag = getXmlTag(pn);
    if (tag !== 'w:p') continue;
    const t = extractXmlNodesText(pn[tag] as Record<string, unknown>[]).trim();
    if (t === '#prepare') {
      i++;
      const pn2 = pnodes[i];
      const tag2 = getXmlTag(pn2);
      const code = extractXmlNodesText(pn2[tag2] as Record<string, unknown>[]).trim();
      if (code) {
        globalStores.cfg.prepare = code;
      }
    } else if (t.startsWith('#')) {
      throw new Error('未知配置指令：' + t);
    }
  }
}
