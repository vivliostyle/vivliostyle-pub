import { Fs, Theme } from "theme-manager";
import { AppContext } from "../contexts/useAppContext";
import { Repository } from "../contexts/useRepositoryContext";
import { VivliostyleConfigSchema } from "../vivliostyle.config";
import { WebApiFs } from "../fs/WebApiFS";

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
     * 
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
     * 
     * @returns 
     */
    public async process(dstFs:Fs):Promise<string> {
      console.log('CustomTheme process', this.style);
      const stylesheet = await this.fs.readFile(this.style);
      await dstFs.writeFile(this.style, stylesheet);
      console.log('setup custom theme');
      return this.style;
    }
  
    /**
     * 
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
     * 
     * @returns 
     */
    public getStylePath() {
      return this.style;
    }
  }
  