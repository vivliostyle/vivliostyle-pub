// copy from https://github.com/vivliostyle/vivliostyle-cli/blob/37e588154c7647792c1c05f8144400719872f069/src/schema/vivliostyle.config.d.ts

export type VivliostyleConfigSchema = CoreProps;
export type Entry = string;
export type Output = string;

export interface CoreProps {
  /**
  * Title
  */
  title?: string;
  /**
  * Author
  */
  author?: string;
  /**
  * Theme package path or URL of css file.
  */
  theme?: string;
  entry?: (Entry | EntryObject | ContentsEntryObject)[] | Entry | EntryObject;
  entryContext?: string;
  output?: (Output | OutputObject)[] | Output | OutputObject;
  workspaceDir?: string;
  includeAssets?: Entry[] | Entry;
  size?: string;
  pressReady?: boolean;
  language?: string;
  toc?: boolean | string;
  tocTitle?: string;
  cover?: string;
  timeout?: number;
  vfm?: {
    hardLineBreaks?: boolean;
    disableFormatHtml?: boolean;
  };
  [k: string]: unknown;
}
export interface EntryObject {
  path: string;
  title?: string;
  theme?: string;
  encodingFormat?: string;
  rel?: string | string[];
}
export interface ContentsEntryObject {
  rel: 'contents';
  title?: string;
  theme?: string;
}
export interface OutputObject {
  path: string;
  format?: string;
}