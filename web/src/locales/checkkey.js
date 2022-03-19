const fs = require('fs');

const extracted = JSON.parse(
  fs.readFileSync(__dirname + '/extract_ja.json', 'utf-8'),
);
const translation = JSON.parse(
  fs.readFileSync(__dirname + '/ja/translation.json', 'utf-8'),
);

for (key of Object.keys(translation)) {
  delete extracted[key];
}

console.log('missing translation keys :', Object.keys(extracted));
