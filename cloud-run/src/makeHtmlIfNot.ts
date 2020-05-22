import * as unified from 'unified';
import * as markdown from 'remark-parse';
import * as fs from 'fs';

const remark2rehype = require('remark-rehype');
const raw  = require('rehype-raw');
const doc = require('rehype-document');
const stringify = require('rehype-stringify');

import {rubyParser, rubyHandler} from './ruby';

export function makeHtmlIfNot(
  {stylesheet = ''}
){
  try {
    fs.accessSync('index.html');
  } catch (error) {
    console.log('>> index.html was not found, so create index.html from index.md');
    const markdownString = fs.readFileSync("index.md").toString();
    const htmlString = stringifyMarkdown( markdownString, { stylesheet })
    fs.writeFileSync("index.html", htmlString);
  }
}

// copied from https://github.com/vivliostyle/vivliostyle-pub/blob/master/web/src/components/MarkdownPreviewer/index.tsx
function stringifyMarkdown(
  markdownString:string, {stylesheet = ''}
) {
  const processor = unified()
    .use(markdown, {commonmark: true})
    .use(rubyParser)
    .use(remark2rehype, {
      allowDangerousHTML: true,
      handlers: {ruby: rubyHandler},
    })
    .use(raw)
    .use(doc, {language: 'ja', css: stylesheet})
    .use(stringify);
  const generated = String(processor.processSync(markdownString));
  return generated;
}
