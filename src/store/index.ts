import type { Config } from 'src/parse/config';
import type { CommentStore } from './comment';
import type { RelsStore } from './relation';

export * from './comment';
export * from './relation';

export interface DocxStores {
  currentDoc: 'main' | 'footer';
  cmtStore: CommentStore;
  relsStore: RelsStore;
  cfg: Config;
}
