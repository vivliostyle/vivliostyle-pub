import { Fs,Theme } from "theme-manager";

/**
 * CSSファイル単体のテーマ
 * http
 * local
 * TODO: nodeパッケージはありえないか
 */
 export class SingleFileTheme implements Theme {
    name: string = "";
    category: string;
    style: string;
    topics: string[] = [];
    description?: string | undefined;
    version?: string | undefined;
    author?: string | undefined;
    files: { [filepath: string]: any } = {};
    fs:Fs;
  
    constructor(fs:Fs,packageName: string) {
      this.fs = fs;
      // HTTPかローカルか
      if (packageName.match(/^https?:/)) {
        // HTTP
        // this.srcIO = new HttpIO();
      } else {
        // ローカル
        // this.srcIO = new localIO();
      }
      this.name = packageName;
      this.style = packageName;
      // TODO: コメントから取得
      this.category = "";
    }

    public async process(dstFs:Fs):Promise<string> {
      throw new Error("SingleFileTheme::process not implemented");
    }
  
    public getStylePath():string|null{
      return null;
    }
  }