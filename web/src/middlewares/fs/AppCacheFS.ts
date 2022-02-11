import { Fs, VFile } from "theme-manager";
import mime from 'mime-types';
import upath from 'upath';

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
     * キャッシュされているファイルを削除する
     * @param path 
     * @returns 
     */
    public async unlink(path:string):Promise<boolean> {
      return await this.cache.delete(path);
    }

    /**
     * キャッシュを削除する
     * @param cacheName キャッシュ名
     * @returns 
     */
    public async unlinkCache():Promise<boolean> {
      try{
        await caches.delete(this.cacheName);
        this.cache = await caches.open(this.cacheName);
        return true;
      }catch(err:any){
        console.error(err);
        return false;
      }

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
      throw new Error("AppCacheFs::readFile not implemented");
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
      try {
        await caches.open(this.cacheName);
        const filePath = upath.join(this.root, file);
        const contentType = (mime.lookup(filePath) ?? '') as string;
        console.log('appCacheFs.writeFile', filePath, contentType);
        const headers = new Headers();
        headers.append('content-type', contentType);
        console.log('headers', file, contentType);
        await this.cache.delete(filePath);
        await this.cache.put(filePath, new Response(data, {headers}));          
        console.log('appCacheFs.writeFile complete');
      } catch (error) {
        console.error(error);
      }
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
    ): Promise<VFile[]> {
      throw new Error("AppCacheFs::readdir not implemented");
    }
  }
  