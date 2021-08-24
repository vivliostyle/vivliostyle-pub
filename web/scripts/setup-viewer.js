const path = require('path');
const fs = require('fs-extra');

console.log(process.cwd())

const viewerModulePath = path.dirname(require.resolve('@vivliostyle/viewer/package.json'))

console.log(`viewerModulePath : ${viewerModulePath}`)
console.log('child __dirname: ' + __dirname);
console.log('path._makeLong: ' + path._makeLong('./package.json'));
console.log('process.cwd(): ' + process.cwd());

const viewerPath = path.join(viewerModulePath, 'lib')
fs.copySync(viewerPath, 'public/viewer', {
  overwrite: true
})

const { execSync } = require('child_process')
const stdout = execSync('find ../**/vivliostyle-viewer.js')
console.log(`stdout: ${stdout.toString()}`)

const jspath = 'public/viewer/js/vivliostyle-viewer.js'
const jsData = fs.readFileSync(jspath, 'utf8')
const newJsData = jsData.replaceAll('"HEAD"', '"GET" ')
fs.writeFileSync(jspath, newJsData, 'utf8')

const htmlpath = 'public/viewer/index.html'
const htmlData = fs.readFileSync(htmlpath, 'utf8')
const newHtmlData = htmlData
  .replaceAll(/\b(src|href)="(css|resources|js)\b/g, '$1="\/viewer\/$2')
  .replaceAll('<head>', 
    `<head>
    <!-- Hotfix (push back later) -->
    <!-- 
      - Add serviceWorker.js
      - Replace HEAD request with GET
    -->`)
  .replaceAll('</head>',`  <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/worker/serviceWorker.js").then(
            function (registration) {
              // Registration was successful
              console.log(
                "ServiceWorker registration successful with scope: ",
                registration.scope,
              );
            },
            function (err) {
              // registration failed :(
              console.log("ServiceWorker registration failed: ", err);
            },
          );
        });
      }
    </script>
  </head>`)
fs.writeFileSync(htmlpath, newHtmlData, 'utf8')
