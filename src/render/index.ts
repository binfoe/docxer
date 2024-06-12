import type { Table } from 'src/parse/table';
import type JSZip from 'jszip';
import type { Paragraph } from '../parse/common';
import { RenderContext } from './context';
import { renderDymTableCommand, renderTableCommand } from './command/table';
import { renderParagraph } from './paragraph';

export function renderTable(tbl: Table, context: RenderContext) {
  if (tbl.loopDirective) {
    const cmd = tbl.loopDirective.commands[0];
    if (cmd.name !== '#table' && cmd.name !== '#dymtable') throw new Error('unexpect');
    if (cmd.name === '#table') {
      renderTableCommand({
        argstr: cmd.argstr,
        context,
        tbl: tbl,
      });
    } else if (cmd.name === '#dymtable') {
      renderDymTableCommand({
        argstr: cmd.argstr,
        context,
        tbl: tbl,
      });
    }
  } else {
    tbl.rows.forEach((tr) => {
      tr.paragraphs.forEach((par) => {
        renderParagraph(par, context);
      });
    });
  }
}
export function renderDocument({
  tables,
  paragraphs,
  renderData,
  zip,
}: {
  tables: Table[];
  paragraphs: Paragraph[];
  renderData: Record<string, unknown>;
  zip: JSZip;
}) {
  const dataKeys = Object.keys(renderData);
  if (dataKeys.includes('$helper')) throw new Error('renderData 参数的属性不能有保留单词 $helper');

  const context = new RenderContext(
    dataKeys,
    dataKeys.map((p) => renderData[p]),
    zip,
  );
  paragraphs.forEach((par) => {
    renderParagraph(par, context);
  });
  tables.forEach((tbl) => {
    renderTable(tbl, context);
  });
}
