#!/bin/sh

if [[ "$1" == "--help" ]]; then
  cat << EOF
# Usage:
#   ./update-vivliostyle-viewer.sh
# or
#   ./update-vivliostyle-viewer.sh https://vivliostyle.org/viewer/
#   ./update-vivliostyle-viewer.sh https://vivliostyle.vercel.app/
#   ./update-vivliostyle-viewer.sh https://vivliostyle.github.io/viewer/v2.8.1/
# etc. (see https://vivliostyle.github.io/ to find a specific version's URL)
EOF
  exit 0
fi

if [[ "$1" =~ ^https?:.*\/$ ]]; then
  VIVLIOSTYLE_VIEWER_URL=$1
else
  VIVLIOSTYLE_VIEWER_URL=https://vivliostyle.org/viewer/
fi

cd web/public/viewer

for f in index.html js/vivliostyle-viewer.js js/vivliostyle-viewer.js.map css/* resources/*; do
  echo "Downloading ${VIVLIOSTYLE_VIEWER_URL}$f"
  curl ${VIVLIOSTYLE_VIEWER_URL}$f > $f
done

perl -i -pe 's/"HEAD"/"GET" /' js/vivliostyle-viewer.js
perl -i -pe '
  s/\b(src|href)="(css|resources|js)\b/$1="\/viewer\/$2/g;
  s/<head>/<head>
    <!-- Hotfix (push back later) -->
    <!-- 
      - Add serviceWorker.js
      - Replace HEAD request with GET
    -->/;
  s/<\/head>/  <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("\/viewer\/serviceWorker.js").then(
            function (registration) {
              \/\/ Registration was successful
              console.log(
                "ServiceWorker registration successful with scope: ",
                registration.scope,
              );
            },
            function (err) {
              \/\/ registration failed :(
              console.log("ServiceWorker registration failed: ", err);
            },
          );
        });
      }
    <\/script>
  <\/head>/' index.html
