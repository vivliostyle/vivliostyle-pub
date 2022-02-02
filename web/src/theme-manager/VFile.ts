// ファイル管理のインターフェース
import {Fs} from "theme-manager";
import upath from "upath";

export type VFileType = "dir" | "file" | "others";

/**
 * 仮想ファイル
 */
export class VFile {
  /**
   * ファイルが存在するファイルシステム
   * ルートディレクトリも保持する
   * Pubの場合はプロジェクトはリポジトリのルート、ApplicationCacheは/vpubfs/をルートとする
   */
  fs: Fs;
  /**
   * fsの保持するルートディレクトリからの相対パスによるディレクトリ
   */
  dirname: string;
  /**
   * 種別 ディレクトリやGitHubのtreeは"dir",ファイルは"file"
   */
  type: VFileType;
  /**
   * ファイル名と拡張子
   */
  name: string;
  /**
   * コンテンツから算出されるハッシュ コンテンツの同一性判断に使用
   * Gitのコミットハッシュをそのまま利用する
   * ファイルの内容を更新したらhashをundefinedに変更すること
   */
  hash?: string;
  /**
   * ファイルの内容(content)を取得済みならtrue
   */
  hasContent: boolean;
  /**
   * ファイルの内容
   */
  content?: any;

  /**
   * コンストラクタ
   * @param props プロパティの初期値
   */
  public constructor(props: {
    fs: Fs;
    dirname: string;
    type: VFileType;
    name: string;
    hash?: string;
    content?: any;
  }) {
    this.fs = props.fs;
    this.dirname = props.dirname;
    this.type = props.type;
    this.name = props.name;
    this.hash = props.hash;
    if (props.content !== undefined) {
      this.hasContent = true;
      this.content = props.content;
    } else {
      this.hasContent = false;
    }
  }

  /**
   * ファイルのコンテンツを取得する
   * @param json JSON形式で取得するならtrue
   */
  public async getContent(json?: boolean) {
    try {
      // console.log('getContent',this.dirname,this.name);
      const filePath = upath.relative("/",upath.join(this.dirname, this.name));
      // TODO: hash値を使って無駄なトラフィックを減らす
      // readFileの引数はfilePathではなく、VFileで良いのでは
      this.content = await this.fs.readFile(filePath, json);
      this.hasContent = true;
    } catch (e) {
      this.hasContent = false;
      throw e;
    }
  }

  /**
   * 所属するFsのルートディレクトリからの相対パスを返す
   * TODO: Memo化
   */
  public get path():string {
    return upath.join(this.dirname, this.name);
  }
}
