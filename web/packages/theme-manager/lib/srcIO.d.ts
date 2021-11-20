export interface ThemeIO {
    get(path: string, json?: boolean): any;
    put(path: string, data: any): void;
}
/**
 * テーマの本体がGitHubにある
 */
export declare class GitHubIO implements ThemeIO {
    private token;
    private owner;
    private repo;
    /**
     * コンストラクタ
     * @param token GitHubAccessToken
     */
    constructor(owner: string, repo: string, token?: string | null);
    /**
     *
     * @param path
     * @param data
     */
    put(path: string, data: any): void;
    /**
     * TODO: 全ファイル名の取得
     */
    findAll(): Promise<string[]>;
    static parseURL(url: string): {
        owner: string;
        repo: string;
        path: string;
    };
    /**
     * ファイルを取得
     * @param path 取得するファイルのパス(owner/repo/以下)
     * @param json JSONオブジェクトとして取得するならtrue
     * @returns
     */
    get(path: string, json?: boolean): Promise<any>;
}
export declare class AppCacheIO implements ThemeIO {
    get(path: string): void;
    put(path: string, data: any): void;
}
/**
 * ローカルファイルの入出力
 */
export declare class LocalIO implements ThemeIO {
    get(path: string): void;
    put(path: string, data: any): void;
}
//# sourceMappingURL=srcIO.d.ts.map