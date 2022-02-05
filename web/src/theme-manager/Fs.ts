import { VFile } from './VFile';
/**
 * 読み書きインターフェース
 */
export type Fs = {
  root:string;
  /**
   * ファイルの内容を取得する
   */
  readFile: (path: string, options?: any) => Promise<string | Buffer | any>;
  /**
   * ファイルの内容を書き込む
   */
  writeFile: (
  // node.jsのfsではfileの型にinteger,dataの型にTypedArrayが含まれている
  file: string | Buffer | URL,
    data: string | Buffer | DataView | Object,
    options?: any,
  ) => Promise<void>;
  /**
   * ファイルまたはディレクトリの一覧を取得
   */
  readdir: (path: string, options?: any) => Promise<VFile[]>;
  /**
   * ファイルまたはディレクトリの削除
   */
  unlink: (path: string)=> Promise<boolean>;
};