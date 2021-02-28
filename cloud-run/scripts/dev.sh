
docker build \
  --build-arg "GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY" \
  --build-arg "GH_APPS_ID=$GH_APPS_ID" \
  -t vivliostyle/builder .

docker run \
  --rm -it \
  -v $GOOGLE_APPLICATION_CREDENTIALS:/tmp/gcp_cred.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp_cred.json \
  -p 8080:8080 \
  vivliostyle/builder
