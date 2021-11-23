import { Fs } from "theme-manager";
import mime from 'mime-types';
import upath from 'upath';
import { Dirent } from "fs-extra";

const VPUBFS_CACHE_NAME = 'vpubfs';
/**
 * Application Cacheを抽象化して提供するクラス
 */
export class AppCacheFs implements Fs {
    cacheName: string;
    root: string;
    cache: Cache;
  
    /**
     * キャッシュを開いてFsインターフェースを実装したオブジェクトを返す
     * @param cacheName キャッシュ名
     * @returns 
     */
    public static async open(cacheName: string=VPUBFS_CACHE_NAME):Promise<AppCacheFs> {
        // キャッシュを開く
      const cache = await caches.open(cacheName);
      const fs:AppCacheFs = new AppCacheFs(cacheName,cache);
      return fs;
    }
  
    /**
     * キャッシュを削除する
     * @param cacheName キャッシュ名
     * @returns 
     */
    public static async delete(cacheName: string):Promise<boolean> {
        return caches.delete(cacheName);
    }

    /**
     * コンストラクタ
     * インスタンスを生成する際にはopenを使用すること
     * constructor内部ではasync/awaitが使用できないため
     * @param cacheName 
     * @param cache 
     */
    private constructor(cacheName: string,cache:Cache) {
      this.cacheName = cacheName;
      this.root = '/'+cacheName;
      this.cache = cache;
    }
  
    /**
     * ファイルを読み込む
     * Application Cacheの場合は使用しないかも
     * @param path 
     * @param json 
     * @returns 
     */
    public async readFile(
      path: string,
      json?: boolean | undefined,
    ): Promise<string | Buffer> {
      return '';
    }
  
    /**
     * Application Cacheにファイルを保存する
     * @param file filename or file descriptor
     * @param data
     * @param options encoding|mode|flag|signal
     */
    public async writeFile(
      file: string | Buffer | URL,
      data: any,
      options?: any,
    ): Promise<void> {
      const filePath = upath.join(this.root, file);
      const contentType = (mime.lookup(filePath) ?? '') as string;
      const headers = new Headers();
      headers.append('content-type', contentType);
    //   console.log('headers', file, contentType);
      await this.cache.delete(filePath);
      await this.cache.put(filePath, new Response(data, {headers}));
    }
  
    /**
     * ディレクトリに存在するファイルの一覧を取得する
     * @param path 
     * @param options 
     * @param callback 
     */
    public async readdir(
      path: string,
      options?: string | Object,
    ): Promise<Dirent[]> {
        return [];
    }
  }
  