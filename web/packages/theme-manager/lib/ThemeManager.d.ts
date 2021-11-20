import { ThemeIO } from "./srcIO";
export interface Theme {
    name: string;
    category: string;
    topics: string[];
    style: string;
    description?: string;
    version?: string;
    author?: string;
    files: {
        [filepath: string]: any;
    };
}
/**
 * CSSファイル単体のテーマ
 * http
 * local
 * TODO: nodeパッケージはありえないか
 */
export declare class SingleFileTheme implements Theme {
    name: string;
    category: string;
    style: string;
    topics: string[];
    description?: string | undefined;
    version?: string | undefined;
    author?: string | undefined;
    files: {
        [filepath: string]: any;
    };
    constructor(packageName: string);
}
/**
 * nodeパッケージ型のテーマ
 * package.jsonがルートディレクトリに存在する
 */
export declare class PackageTheme implements Theme {
    name: string;
    author: string;
    date: string;
    description: string;
    keywords: string[];
    links: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
    };
    maintainers: {
        username: string;
        email: string;
    }[];
    publisher: {
        username: string;
        email: string;
    };
    scope: string;
    version: string;
    category: string;
    style: string;
    topics: string[];
    files: {
        [filepath: string]: any;
    };
    constructor();
    static fetch(packageName: string): Promise<Theme>;
    /**
     * npm-api.jsの結果からPackageThemeオブジェクトを生成
     * @param packageName
     * @returns PackageThemeオブジェクトまたはundefined
     */
    static fromNpm(packageName: string): Promise<Theme>;
    static getPackageJson(repo_directory: string, io: ThemeIO): Promise<object | null>;
}
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
    constructor(token?: string | null);
    /**
     * NPMで公開されているテーマの一覧を取得
     * @param query
     * @param max 最大取得件数
     * @returns
     */
    searchFromNpm(query?: string, max?: number): Promise<Theme[]>;
    getPackageFromNpm(themeName: string): Promise<Theme>;
    /**
     * テーマを取得する
     * @param themeName テーマ名 または URL
     * @returns themeインターフェースを実装するオブジェクト
     */
    getTheme(themeName: string): Promise<Theme | null>;
}
//# sourceMappingURL=ThemeManager.d.ts.map