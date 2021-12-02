import { Fs, Theme } from "theme-manager";
import { AppContext } from "../contexts/useAppContext";
import { Repository } from "../contexts/useRepositoryContext";
import { VivliostyleConfigSchema } from "../vivliostyle.config";
import { WebApiFs } from "../fs/WebApiFS";
import upath from "upath";

/**
 * CSSからアプリケーションキャッシュの対象になるファイルのリストアップ
 * @param text
 * @returns
 */
 export const pickupCSSResources = (text: string): string[] => {
  // TODO: パースして取り出す エラー処理も重要
  // const ast = parse(text);

  const imagePaths = Array.from(
    text.matchAll(/url\("?(.+?)"?\)/g),
    (m) => m[1],
  );
  // console.log('imagePaths', imagePaths);
  return imagePaths;
};

/**
 *  vivliostyle.config.jsのthemeを使用する 
 */
export class CustomTheme implements Theme {
    name: string = 'custom-theme';
    category: string = '';
    topics: string[] = [];
    style: string = 'theme.css';
    description: string = 'Custom theme';
    version: string = '1.0';
    author: string = 'Vivliostyle';
    files: {[filepath: string]: any} = {};
    fs: Fs;
  
    app: AppContext;
    repository: Repository;
  
    /**
     * コンストラクタ
     * @param fs 
     * @param app 
     * @param repository 
     * @param style 
     */
    private constructor(
      fs: Fs,
      app: AppContext,
      repository: Repository,
      style: string,
    ) {
      this.app = app;
      this.repository = repository;
      this.fs = fs;
      this.style = style;
      console.log('new CustomTheme', app.user, repository);
    }
  
    /**
     * テーマを処理してCSSとして出力する
     * TODO: PackageThemeと似ているので集約したい。
     * @returns CSSの相対パス(dstFsのルートディレクトリを基準とする)
     */
    public async process(dstFs:Fs):Promise<string> {
      // console.log('processingThemeString',this,dstFs);
      if( !this.style ) { console.log('empty theme'); return ''; }
      const themePath = `${this.style}`; // ここがPackageThemeと異なる
      const stylesheet = await this.fs.readFile(this.style) as string;
      // console.log('stylesheet',stylesheet);
      if(!stylesheet) {
        return '';
      }
    
      await dstFs!.writeFile(themePath, stylesheet);
      console.log(`updateCache : ${themePath}`);
      
      const imagesOfStyle = pickupCSSResources(stylesheet);
      // console.log('imagesOfStyle',imagesOfStyle);
      await Promise.all(
        imagesOfStyle.map(async(imageOfStyle) => {
          const contentPath = upath.join(upath.dirname(this.style),imageOfStyle);
          // console.log('contentPath',contentPath);
          const content = await this.fs.readFile(contentPath);
          dstFs.writeFile(contentPath, content);
        }),
      ).catch((error) => {
        console.log(error);
        throw error;
      });
    
      return themePath; // ここがPackageThemeと異なる
    }
  
    /**
     * テーマオブジェクトを生成する
     * @param app 
     * @param repository 
     * @returns 
     */
    public static async create(app: AppContext, repository: Repository) {
      console.log('create custom theme', repository.branch);
      if (!(app.user && repository.owner && repository.repo)) {
        return null;
      }
      const props = {
        user: app.user!,
        owner: repository.owner!,
        repo: repository.repo!,
        branch: repository.branch!,
      };
      console.log('props', props);
      const fs = await WebApiFs.open(props);
      // 設定ファイルの読み込み
      const configString = (await fs.readFile('vivliostyle.config.js')) as string;
      // console.log('[create custom theme].config', configString);
      // 設定ファイルからthemeを取得
      // TODO: entry別のテーマ
      const configJsonString = configString
        .replace('module.exports = ', '')
        .replaceAll(/^\s*(.+):/gm, '"$1":')
        .replaceAll(`'`, '"')
        .replaceAll(/,[\s\n]*([\]}])/g, '$1')
        .replaceAll(/};/g, '}');
      const config = JSON.parse(configJsonString) as VivliostyleConfigSchema;
      if (!config || !config.theme) {
        return null;
      }
      const theme = new CustomTheme(fs, app, repository, config.theme);
      return theme;
    }
  
    /**
     * CSSのパス
     * @returns 
     */
    public getStylePath() {
      return this.style;
    }
  }
  