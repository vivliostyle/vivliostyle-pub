/// <reference types="node" />
import { Dirent } from 'fs';
/**
 * 読み書きインターフェース
 */
export declare type Fs = {
    readFile: (path: string, json?: boolean) => Promise<string | Buffer>;
    writeFile: (file: string | Buffer | URL, data: string | Buffer | DataView | Object, options?: Object | string) => Promise<void>;
    readdir: (path: string, options?: string | Object) => Promise<Dirent[]>;
};
/**
 * GitHubの特定のリポジトリを読み書きする
 */
export declare class GitHubFs implements Fs {
    owner: string;
    repo: string;
    dir: string;
    token: string;
    /**
     * urlからowner, repo, pathを取り出す
     * @param url
     * @returns
     */
    static parseURL(url: string): {
        owner: string;
        repo: string;
        path: string;
    };
    /**
     * コンストラクタ
     */
    constructor(p: {
        octkitOrToken: string;
        ownerOrUrl?: string;
        repo?: string;
        dir?: string;
    });
    readdir: (path: string, options?: string | Object | undefined) => Promise<Dirent[]>;
    readFile(path: string, json?: boolean): Promise<string | Buffer>;
    writeFile(): Promise<void>;
}
/**
 * テスト用のファイルシステム
 */
export declare class DummyFs implements Fs {
    constructor();
    readdir: (path: string, options?: string | Object | undefined) => Promise<Dirent[]>;
    readFile(path: string): Promise<string | Buffer>;
    writeFile(): Promise<void>;
}
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
/**
 * ローカルファイルの入出力
 */
export declare class LocalIO implements ThemeIO {
    get(path: string): void;
    put(path: string, data: any): void;
}
//# sourceMappingURL=srcIO.d.ts.map