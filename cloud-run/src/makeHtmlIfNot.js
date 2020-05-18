const unified = require('unified');
const markdown = require('remark-parse');
const remark2rehype = require('remark-rehype');
const raw = require('rehype-raw');
const doc = require('rehype-document');
const stringify = require('rehype-stringify');

const {rubyParser, rubyHandler} = require('./ruby');

function makeHtmlIfNot({stylesheet = ''}) {
  const fs = require('fs');
  try {
    fs.accessSync('index.html');
  } catch (error) {
    console.log(
      '>> index.html was not found, so create index.html from index.md',
    );
    const markdownString = fs.readFileSync('index.md');
    const htmlString = stringifyMarkdown(markdownString, {stylesheet});
    fs.writeFileSync('index.html', htmlString);
  }
}

function stringifyMarkdown(markdownString, {stylesheet = ''}) {
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

module.exports = makeHtmlIfNot;
