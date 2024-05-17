import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processDocx } from './process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function test() {
  void processDocx({
    docxFileBuf: readFileSync(path.resolve(__dirname, '../sample/bb.docx')),
    renderData: {
      基础信息: {
        估价报告编号: '久源房估（2024）字第888号',
      },
      产权人信息: {
        姓名: '小葛',
      },
    },
  }).then((res) => {
    writeFileSync(path.resolve(__dirname, '../sample/out.docx'), res as Buffer);
  });
}
test();
