import { Octokit } from "@octokit/rest";
import { Fs, VFile } from "theme-manager";

/**
 * npmからパッケージを取得するための仮想FileSystem
 */
 export class NpmFs implements Fs {
    private owner: string;
    private repo: string;
    private branch: string;
    public root: string = "";
  
    /**
     * 
     * @param owner 
     * @param repo 
     * @param root
     */
    private constructor(owner: string, repo: string,branch: string, root: string) {
      console.log('constructor:', owner, repo, root);
      this.owner = owner;
      this.repo = repo;
      this.branch = branch;
      this.root = root;
    }
  
    /**
     * リポジトリにアクセスするオブジェクトを作成する
     * @param themeLocation テーマ名
     * @returns テーマの場所がアクセス可能ならFsオブジェクトを返す。アクセスできない場合はfalseを返す
     */
    public static async open(themeLocation: any): Promise<Fs | false> {
      // themeLocationからowner,repoを取得する
      // console.log('npm open:',themeLocation);
      const pkg = themeLocation.package;
      if (!pkg || pkg.scope !== 'vivliostyle' || !pkg.links.repository) {
        console.log("pkg can't open", pkg.scope);
        return false;
      } // GitHubにある公式テーマのみ対応
  
      const name = pkg.name;
      const repoUrl = pkg.links.repository;
      console.log('npm open :', name, repoUrl);
  
      const owner = 'vivliostyle';
      const repo = 'themes';
      const branch = 'master';
      const root = pkg.name;
      const fs = new NpmFs(owner, repo, branch, root);
  
      return fs;
    }
  
    /**
     * 
     * @param path 
     * @param json 
     * @returns 
     */
    public async readFile(
      path: string,
      json?: boolean | undefined,
    ): Promise<string | Buffer> {
      // TODO: GraphQLにしたいけれど、GitHub App以外のトークンが必要っぽい
      // octokit-restはPublic repositoryへのアクセスはトークン不要
      console.log('readFile', path);
      let octokit: Octokit;
      const token = false; //localStorage.getItem('GH_PERSONAL_ACCESS_TOKEN');
      if (token) {
        console.log('use Personal access token');
        octokit = new Octokit({auth: token});
      } else {
        // 1時間あたりのアクセス数制限あり
        console.log('not use Personal access token');
        octokit = new Octokit();
      }
      // TODO: Monorepoではない公式テーマはどうする?
      const repoPath = `packages/${this.root}/${path}`;
      console.log('repoPath', repoPath);
      const content = await octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        path: repoPath,
      });
      if (!('content' in content.data && 'encoding' in content.data)) {
        throw new Error();
      }
      const buffer = Buffer.from(
        content.data.content,
        content.data.encoding as BufferEncoding,
      );
      const data = buffer.toString();
      // console.log('readFile content',data);
      return json ? JSON.parse(data) : data;
    }
  
    /**
     * 
     * @param file 
     * @param data 
     * @param options 
     * @returns 
     */
    public async writeFile(
      file: string | Buffer | URL,
      data: string | Object | Buffer | DataView,
      options?: string | Object | undefined,
    ): Promise<void> {
      throw new Error('NpmFs::writeFile not implemnted');
    }
  
    /**
     * 
     * @param path 
     * @param options 
     * @returns 
     */
    public async readdir(
      path: string,
      options?: string | Object | undefined,
    ): Promise<VFile[]> {
      throw new Error('NpmFs::readdir not implemnted');
    }
  
    /**
     * 
     * @param path 
     */
    public async unlink(path: string):Promise<boolean> {
      throw new Error("NpmFs::unlink not implemented");
    }
  
  }
  