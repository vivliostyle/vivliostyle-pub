import {Fs, Theme} from 'theme-manager';
import {AppContext} from '../contexts/useAppContext';
import {RepositoryContext} from '../contexts/useRepositoryContext';
import {VivliostyleConfigSchema} from '../vivliostyle.config';
import {WebApiFs} from '../fs/WebApiFS';
import upath from 'upath';
import {devConsole} from '@middlewares/frontendFunctions';

const {_log, _err} = devConsole('[CustomTheme]');

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
  // _log('imagePaths', imagePaths);
  return imagePaths;
};

/**
 *  vivliostyle.config.jsのthemeを使用する
 */
export class CustomTheme implements Theme {
  name: string = 'vivliostyle-custom-theme';
  category: string = '';
  topics: string[] = [];
  style: string = 'theme.css';
  description: string = 'Custom theme';
  version: string = '1.0';
  author: string = 'Vivliostyle';
  files: {[filepath: string]: any} = {};
  fs: Fs;

  app: AppContext;
  repository: RepositoryContext;

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
    repository: RepositoryContext,
    style: string,
  ) {
    this.app = app;
    this.repository = repository;
    this.fs = fs;
    this.style = style;
    _log('new CustomTheme', app.state.user, repository);
  }

  /**
   * テーマを処理してCSSとして出力する
   * TODO: PackageThemeと似ているので集約したい。
   * @param dstFs 処理後のファイルの書き出し先Fs(画像などもここに書き出す)
   * @returns CSSの相対パス(dstFsのルートディレクトリを基準とする)
   */
  public async process(dstFs: Fs): Promise<string> {
    // _log('processingThemeString',this,dstFs);
    if (!this.style) {
      _log('empty theme');
      return '';
    }
    const themePath = `${this.style}`; // ここがPackageThemeと異なる
    const stylesheet = (await this.fs.readFile(this.style)) as string;
    // _log('stylesheet',stylesheet);
    if (!stylesheet) {
      return '';
    }

    await dstFs!.writeFile(themePath, stylesheet);
    _log('updateCache', themePath);

    const imagesOfStyle = pickupCSSResources(stylesheet);
    // _log('imagesOfStyle',imagesOfStyle);
    await Promise.all(
      imagesOfStyle.map(async (imageOfStyle) => {
        const contentPath = upath.join(upath.dirname(this.style), imageOfStyle);
        try {
          // _log('contentPath',contentPath);
          const content = await this.fs.readFile(contentPath);
          // const buf:Buffer = Buffer.from(content, 'base64');
          // _log("imageOfStyle content",buf);
          dstFs.writeFile(contentPath, content);
          return null;
        } catch (err: any) {
          _err(err);
          return new Error(`${contentPath}`);
        }
      }),
    )
      .then((result) => {
        const errors = result.filter((r) => r);
        if (errors.length > 0) {
          _err('process errors', errors);
          throw new Error(
            `以下のファイルの処理に失敗しました ${errors.join(' , ')}`,
          );
        }
      })
      .catch((error) => {
        _err('process error', error);
        throw error;
      });
    // TODO: 画像取得エラーに失敗していてもテーマ処理を継続する。現在は例外を発生させているため中断してしまう
    return themePath; // ここがPackageThemeと異なる
  }

  /**
   * テーマオブジェクトを生成する
   * @param app
   * @param repository
   * @returns
   */
  public static async create(app: AppContext, repository: RepositoryContext) {
    _log('create custom theme', repository.state.branch);
    if (!(app.state.user && repository.state.owner && repository.state.name)) {
      _log('create custom theme cancel');
      return null;
    }
    const props = {
      user: app.state.user!,
      owner: repository.state.owner!,
      repo: repository.state.name!,
      branch: repository.state.branch!,
    };
    _log('props', props);
    const fs = await WebApiFs.open(props);
    // 設定ファイルの読み込み
    const configString = (await fs.readFile('vivliostyle.config.js')) as string;
    // _log('CustomTheme::create configString', configString);
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
