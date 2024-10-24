import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processDocx } from './process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function test() {
  void processDocx({
    docxFileBuf: readFileSync(path.resolve(__dirname, '../sample/b.docx')),
    renderData: {
      columns: [
        {
          name: '姓名',
          key: 'name',
          width: 90,
        },
        {
          name: '年龄',
          key: 'age',
          width: 40,
        },
        {
          name: '美貌',
          key: 'score',
          width: 40,
        },
      ],
      rows: [
        {
          name: '小张',
          age: 20,
          score: 100,
        },
        {
          name: '小静',
          age: 18,
          score: 100,
        },
      ],
      table: {},
    },
  }).then((res) => {
    writeFileSync(path.resolve(__dirname, '../sample/out.docx'), res as Buffer);
  });
}
test();
