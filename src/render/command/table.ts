import type { Table } from 'src/parse/table';
import { $, cloneNode, rmNode } from 'src/node';
import type { RenderContext } from '../context';
import { renderParagraph } from '../paragraph';

class ArgLexer {
  #s: string;
  i: number;
  constructor(argstr: string) {
    this.#s = argstr;
    this.i = 0;
  }
  next() {
    if (this.i >= this.#s.length) {
      return null;
    }
    const i = this.i;
    while (this.i < this.#s.length) {
      const c = this.#s.charCodeAt(this.i);
      if (c === 32) {
        break;
      } else {
        this.i++;
      }
    }
    const word = this.#s.slice(i, this.i);
    // 跳过后续空格，指向下一个非空 word 的开始位置
    while (this.i < this.#s.length) {
      const c = this.#s.charCodeAt(this.i);
      if (c === 32) {
        this.i++;
      } else {
        break;
      }
    }
    return word;
  }
}
export function renderTableCommand({
  argstr,
  context,
  tbl,
}: {
  argstr: string;
  context: RenderContext;
  tbl: Table;
}) {
  const lexer = new ArgLexer(argstr.trim());
  const range = lexer.next();
  if (!range || !/^\d+(-\d+)?$/.test(range)) {
    throw new Error('#table 指令配置错误，需要指定循环渲染的行范围');
  }
  const trrg = range.split('-').map((v) => Number(v));

  const each = lexer.next();
  if (!each || !/[$_a-z][a-z0-9$_]+/.test(each)) {
    throw new Error('#table 指令需要指定循环渲染时的循环数据变量名');
  }
  const datasource = argstr.slice(lexer.i);
  if (!datasource) {
    throw new Error('#table 指令需要指定循环数据源的表达式');
  }
  const vals = context.eval(datasource);
  if (!Array.isArray(vals)) {
    throw new Error('#table 指令的数据源表达式必须返回数组');
  }

  const start = trrg[0];
  const end = trrg.length > 1 ? trrg[1] : start;
  if (start === 0 || end < start || end > tbl.rows.length) {
    throw new Error('#table 指令的循环渲染行范围不合法');
  }

  for (let i = start - 1; i < tbl.rows.length; i++) {
    rmNode(tbl.rows[i].node);
  }
  for (let i = 0; i < vals.length; i++) {
    const val = vals[i];
    context.push(each, val);

    const cloneIdx = start + (i % (end + 1 - start));
    const tr = tbl.rows[cloneIdx - 1];
    tr.paragraphs.forEach((par) => {
      renderParagraph(par, context);
    });
    const cloneTr = cloneNode(tr.node, tbl.node);
    tbl.node[$].children.push(cloneTr);

    context.pop();
  }
}
