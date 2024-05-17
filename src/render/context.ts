import type JSZip from 'jszip';
import { globalConfig } from 'src/config';

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
    try {
      return fn(globalConfig.helperFunctions, ...this.#vals);
    } catch (ex) {
      if (ex.name === 'ReferenceError') {
        const vn = ex.message.slice(0, ex.message.length - 15);
        if (expr.startsWith(vn)) {
          throw new Error('ERROR_MISSING_FORM:' + expr);
        } else {
          throw new Error('ERROR_MISSING_FORM_FIELD:' + expr);
        }
      } else {
        throw ex;
      }
    }
  }
}
