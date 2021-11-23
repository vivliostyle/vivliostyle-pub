import { Fs } from "./srcIO";
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
    fs: Fs;
    getStylePath: () => string | null;
}
export declare type PackageJson = {
    name: string;
    description: string;
    version: string;
    author: string;
    vivliostyle: {
        theme: {
            category?: string;
            topics?: string[];
            style?: string;
        };
    };
};
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
    fs: Fs;
    constructor(fs: Fs, packageName: string);
    getStylePath(): string | null;
    /**
     * テーマに含まれるファイルを取得する
     */
    fetch(): Promise<void>;
    static fetch(packageName: string): Promise<Theme | null>;
    /**
     * npm-api.jsの結果からPackageThemeオブジェクトを生成
     * @param packageName
     * @returns PackageThemeオブジェクトまたはundefined
     */
    static fromNpm(packageName: string): Promise<Theme | null>;
    private getPackageJson;
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
    fs: Fs;
    constructor(fs: Fs, packageName: string);
    getStylePath(): string | null;
}
//# sourceMappingURL=theme.d.ts.map