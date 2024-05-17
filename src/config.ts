import { renderHelpers } from './render/helper';

export interface RenderConfig {
  /* 渲染结束后，额外删除文档尾部的段落。默认为 0。该参数可用于修正渲染后可能多出来的空段落（空页）。*/
  dropTailParagraphs: number;
  /** 表单数据项如果是空值，需要渲染的文根本。默认为空，可配置为比如"数据缺失" */
  emptyVarText: string;
  /** 业务传递有额外辅助函数。模板中可通过 $helper 访问所有函数。 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  helperFunctions: Record<string, (...args: any[]) => string>;
}

export const globalConfig: RenderConfig = {
  dropTailParagraphs: 0,
  emptyVarText: '',
  helperFunctions: {
    ...renderHelpers,
  },
};
