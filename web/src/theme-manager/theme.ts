import { Fs } from "./Fs";

export interface Theme {
  name: string;
  category: string;
  topics: string[];
  style: string;
  description?: string;
  version?: string;
  author?: string;
  files: { [filepath: string]: any };
  fs: Fs;
  getStylePath: ()=>string|null;
  process: (dstFs:Fs)=>Promise<string>;
}

export type PackageJson = {
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
}