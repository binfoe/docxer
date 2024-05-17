import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { processDocx } from './process';

function test() {
  void processDocx({
    docxFileBuf: readFileSync(path.resolve(__dirname, '../sample/sample.docx')),
    renderData: {
      sample: {
        name: 'test',
        code: 'ccccc',
        age: 18,
      },
      exams: [
        {
          name: 'aaa',
          age: 1,
        },
        {
          name: 'bbb',
          age: 2,
        },
      ],
      // name: '郭芙蓉',
      // gender: 1,
      // age: 18,
      // date: '2024-04-12',
      // ocs: 0.103,
      // result: { ca125: 34.56, he4: 3.45, c5a: 1.11 },
      // records: new Array(5).fill(0).map((n, i) => ({
      //   a: `a-${i}`,
      //   b: `b-${i}`,
      // })),
      // someimg: readFileSync(path.resolve(__dirname, '../sample/xx.webp')),
    },
  }).then((res) => {
    writeFileSync(path.resolve(__dirname, '../sample/out.docx'), res as Buffer);
  });
}
test();
