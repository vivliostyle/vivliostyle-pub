/**
 * i18next-extract によってソースコードから抽出された翻訳辞書と
 * 既存の翻訳辞書を比較して抜け漏れをチェックする
 */

const fs = require('fs');

const extracted = JSON.parse(
  fs.readFileSync(__dirname + '/../src/locales/extract_ja.json', 'utf-8'),
);
const translation = JSON.parse(
  fs.readFileSync(__dirname + '/../src/locales/ja/translation.json', 'utf-8'),
);

for (key of Object.keys(translation)) {
  delete extracted[key];
}

console.log('missing translation keys :', Object.keys(extracted));
