import type JSZip from 'jszip';
import { renderHelper } from './helper';

export class RenderContext {
  #keys: string[];
  #vals: unknown[];
  #i = 0;
  #z: JSZip;
  constructor(dataKeys: string[], dataVals: unknown[], zip: JSZip) {
    this.#keys = dataKeys;
    this.#vals = dataVals;
    this.#z = zip;
  }
  get zip() {
    return this.#z;
  }
  push(key: string, val: unknown) {
    this.#i++;
    this.#keys.push(key);
    this.#vals.push(val);
  }
  pop() {
    if (this.#i > 0) {
      this.#keys.pop();
      this.#vals.pop();
      this.#i--;
    }
  }
  eval(expr: string) {
    const fn = new Function('$helper', ...this.#keys, `return ${expr}`);
    return fn(renderHelper, ...this.#vals);
  }
}
