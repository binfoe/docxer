# docxer

> docx 模板渲染引擎

## 使用

Cli 使用：

```bash
npm i -g docxer
# 命令：
docxer [inputDocxFile] [inputDataFile] [outputDocxFile]
# 示例：
docxer /var/some_template.docx /var/some_data.json /var/some_output.docx
```

TypeScript 使用（在 Node 和浏览器都可使用）：

```ts
import fs from 'fs';
import { processDocx } from 'docxer';
const buf = fs.readFileSync('some_template.docx');
processDocx({
  docxFileBuf: buf,
  renderData: {
    name: '小静',
    age: 18,
  },
}).then((outputBuf) => {
  fs.writeFileSync('some_output.docx', outputBuf);
});
```

[ClearScript](https://github.com/microsoft/ClearScript) 使用：

```js
import { processDocx } from 'docxer/all';
```

`docxer/all` 导出的产物是把依赖的比如 jszip 等库都一起打包到了产物文件中，以一个完整的独立文件的方式提供给业务使用。

## API

```ts
/** 渲染配置。 */
interface RenderConfig {
  // 渲染结束后，额外删除文档尾部的段落。默认为 0。该参数可用于修正渲染后可能多出来的空段落（空页）。
  dropTailParagraphs?: number;
}
/**
 * 渲染 docx 文件主函数。返回渲染后的 docx 文件的 binary 内容，可直接写入磁盘。
 */
export function processDocx(options: {
  /** 模板 docx 文件，原始 binary 文件内容 */
  docxFileBuf: ArrayBuffer | Buffer;
  /** 渲染数据。必须是 object 对象，且不能有 '$helper' 这个保留单词的属性名。 */
  renderData: { [key: string]: unknown };
  /** 渲染配置。该配置在 docx 模板文件中还可以通过 #prepare 指令指定的代码进行覆写。 */
  renderConfig?: RenderConfig;
}) {
  return buf as Buffer | ArrayBuffer;
}
```

## 正文批注指令

- `#var [expr]` 将批注的内容替换为表达式的返回值。如果批注的内容有不同样式，比如多个颜色，则只会保留第一个字符的样式。
- `#if [expr]` 如果表达式的值为 `false`，则删除批注的内容。
- `#ifp [expr]` 如果表达式的值为 `false`，则删除批注所在的整个段落。
- `#iep [expr]` 删除批注所在段落，并插入表达式返回值数量的空段落。表达式必须返回一个整数。
- `#ig` 删除批注的内容。该指令用于忽略(ignore)指定内容，这些内容可能在模板中用于支撑排版，没有实际意义。
- `#igp` 删除批注所在段落。和 `#ig` 类似用于支撑排版。
- `#for [each] [datasource]` [`TODO`]
- `#forp [each] [datasource]` [`TODO`]

## 表格批注指令

#### `#table [start](-[end]) [each] [datasource]`

标记当前表格使用动态数据渲染，会执行 `datasource` 参数的表达式并返回一个Array，渲染引擎会遍历 Array 循环生成表格数据行。`each` 参数是一个变量名称，在表格行里使用正文批注指令时，可通过该名称访问每次循环的数据。`start` 和 `end` 是要循环渲染的模板行，从`1` 开始计数，如果要跳过表头，则一般指定为 `2`。在模板行中，可以使用任意`正文批注指令`。`end` 可不指定，默认为 `start`。`end` 之后的所有行会被删除。

#### `#dymtable [columns] [datasource]`

标记当前表格完全使用动态渲染。`columns` 参数是一个表达式，返回列的定义数据。`datasource` 是表格数据行。渲染时会将表格的第一行使用 `columns` 数据填充（多余的列会被删除，缺少的列会拿第一列克隆），然后将表格的第二行克隆后使用 `datasource` 填充。受当前代码逻辑所限，`columns` 表达式不能有空格，但 `datasource` 表达式中可以含空格。

`columns` 表达式需要返回结构 `{ width?: number; name: string; key: string }`，其中 name 是表头文字，key 是从 `datasource` 中取数据的属性名，width 是宽度（像素 px 单位，会乘以 20 换算成 dxa 单位写入 docx 文件）。width 为可选字段，不指定则不修改模板中的宽度。

## 图片描述指令

图片不支持批注，但可以添加描述信息，在描述信息中可配置指令。所有指令都针对当前图片生效。

- `#if [expr]` 满足条件时图片才会被保留，否则会被删除。
- `#var [expr]` 替换图片内容为表达式返回的值。如果返回值是 string 类型代表 base64 数据，Buffer/ArrayBuffer 类型代表 binary 数据。
- `#for [each] [datasource]` [`TODO`]

## 文本框描述指令

文本框里的内容不支持批注，但文本框本身和图片一样可以添加描述。为了实现像文本批注那样能针对不同位置的文本内容定义指令，采用以下语法。

`#@ ` 指定用于指定接下来连续的正文批注指令的作用位置，相当于用语法而不是人工操作来指定了批注的位置。该位置指定指令包括：

- `#@ p1 w关键字` 指定段落 `p\[X\]` 的 `关键字` 所在范围。
- `#@ p2 c3 c6` 指定段落 `p\[X\]` 从某开始列到结束列，其中列(Col)和 Word 以及主流文本编辑器含义一致。

注意段落号从 1 开始计数，不是写代码的数组的 0 开始。

在 `#@ ` 之后是至少一条正文批注指令。直到遇到下一个 `#@ ` 指定，则开始下一个位置的批注。

## 配置指令

段落开头识别到 `#docxer-config` 关键字，则从当前段落开始都是配置页。配置页不会被渲染到输出文档中。

渲染页不使用批注指明指令，直接在正文中编写指令。每一条指令都需要独占一个段落。指令的参数在紧接着的下一个段落配置。

### `#prepare` 指令

该指令用于在渲染前执行额外的代码。推荐在 vscode 的 ide 中书写代码，然后整体拷贝到文本框中。将文本框的文字环绕配置为嵌入文本，嵌入到该指令紧邻的下一个段落。如果代码很少没有换行，也可以直接书写在该指定的下一个段落中。

prepare 代码中可使用 `$data` 和 `$config` 两个全局变量。

`$data` 是渲染数据，可任意读取和修改，也可以新增数据。这些数据都可在模板正文中的指令表达式使用。

`$config` 是渲染配置，可任意读取和修改。该配置是文档的 API 章节中写明的 `RenderConfig` 结构，详见上文。

示例：如果渲染之后的文档，因为 `#docxer-config` 指令在尾部产生了多于的空段进而导致出现了空白页，可通过配置 `$config.dropTailParagraphs` 来删除。

```js
$config.dropTailParagraphs = 1;
```
