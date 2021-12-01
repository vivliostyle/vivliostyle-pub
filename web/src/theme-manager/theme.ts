import { Fs } from "./srcIO";

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