import * as unified from 'unified';
import * as markdown from 'remark-parse';
import * as remark2rehype from 'remark-rehype';
import * as raw from 'rehype-raw';
import * as doc from 'rehype-document';
import * as stringify from 'rehype-stringify';

import {rubyParser, rubyHandler} from './ruby';

function makeHtmlIfNot(
  {stylesheet = ''}
){
  import * as fs from 'fs';
  try {
    fs.accessSync('index.html');
  } catch (error) {
    console.log('>> index.html was not found, so create index.html from index.md');
    const markdownString = fs.readFileSync("index.md");
    const htmlString = stringifyMarkdown( markdownString, { stylesheet })
    fs.writeFileSync("index.html", htmlString);
  }
}

function stringifyMarkdown(
  markdownString, {stylesheet = ''}
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

module.exports = makeHtmlIfNot
