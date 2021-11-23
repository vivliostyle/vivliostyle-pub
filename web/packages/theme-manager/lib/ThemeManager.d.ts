import { Fs } from "./srcIO";
import { Theme } from ".";
export declare type ThemeManagerConfig = {
    GitHubAccessToken?: string | null;
};
/**
 *
 */
export default class ThemeManager {
    themes: Theme[];
    serchQuery: string;
    /**
     * コンストラクタ
     * @param token GitHubAccessToken
     */
    constructor(config?: ThemeManagerConfig | null);
    /**
     * npmのパッケージ名からGitHubへのアクセスオブジェクトを生成する
     * @param packageName
     * @returns
     */
    npmToFs(packageName: string): Promise<Fs | null>;
    /**
     * npmで公開されているテーマの一覧を取得
     * @param query
     * @param max 最大取得件数
     * @returns
     */
    searchFromNpm(query?: string, max?: number): Promise<Theme[]>;
    /**
     *
     * @param themeName
     * @returns
     */
    getPackageFromNpm(themeName: string): Promise<Theme>;
    /**
     * テーマを取得する
     * @param themeName テーマ名 または URL
     * @returns themeインターフェースを実装するオブジェクト
     */
    getTheme(themeName: string): Promise<Theme | null>;
}
//# sourceMappingURL=ThemeManager.d.ts.map