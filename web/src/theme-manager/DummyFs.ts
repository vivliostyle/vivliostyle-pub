import {Fs, VFile} from 'theme-manager';

/**
 * テスト用のファイルシステム
 */
export class DummyFs implements Fs {
  public root:string = "";
  
  public static open() {
    return new DummyFs();
  }

  private constructor() {}
  public async unlink(path: string): Promise<boolean> {
    throw new Error('DummyFs::unlink not implemented');
  }

  public readdir = async (
    path: string,
    options?: string | Object,
  ): Promise<VFile[]> => {
    return [];
  };

  public async readFile(path: string): Promise<string | Buffer> {
    return path;
  }

  public async writeFile(): Promise<void> {}
}
