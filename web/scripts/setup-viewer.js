const path = require('path');
const fs = require('fs-extra');

fs.removeSync('public/viewer')
const viewerModulePath = path.dirname(require.resolve('@vivliostyle/viewer/package.json'))
const viewerPath = path.join(viewerModulePath, 'lib')
fs.copySync(viewerPath, 'public/viewer', {
  overwrite: true
})

fs.writeFileSync('public/viewer/empty.html','');
fs.copyFileSync('public/worker/serviceWorker.js','public/viewer/serviceWorker.js')

const jspath = 'public/viewer/js/vivliostyle-viewer.js'
const jsData = fs.readFileSync(jspath, 'utf8')
const newJsData = jsData.replace(/"HEAD"/g, '"GET" ')
fs.writeFileSync(jspath, newJsData, 'utf8')

const htmlpath = 'public/viewer/index.html'
const htmlData = fs.readFileSync(htmlpath, 'utf8')
const newHtmlData = htmlData
  .replace(/\b(src|href)="(css|resources|js)\b/g, '$1="\/viewer\/$2')
  .replace(/<head>/g,`<head>
    <!-- Hotfix (push back later) -->
    <!-- 
      - Add serviceWorker.js
      - Replace HEAD request with GET
    -->`)
  .replace(/<\/head>/g,`  <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/viewer/serviceWorker.js").then(
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
