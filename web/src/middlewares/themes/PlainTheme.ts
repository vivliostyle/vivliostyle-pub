import { Fs, Theme } from "theme-manager"

const fs = {} as Fs;

/**
 * Viewerのデフォルトスタイルを使用するテーマ
 */
export class PlainTheme implements Theme {
    name = 'plain-theme';
    category = '';
    topics = [];
    style = '';
    description = 'Plain theme';
    version = '1.0';
    author = 'Vivliostyle';
    files = {};
    fs = fs;
    
    public getStylePath() {
      return null;
    }

    public async process(dstFs:Fs){
      return '';
    }
}