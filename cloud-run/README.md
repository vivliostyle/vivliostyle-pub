# Vivliostyle Builder

## Prepare

- Download proper service account credentials from GCP and set credentials path to `$GOOGLE_APPLICATION_CREDENTIALS`
- Set credentials for GitHub Apps to `$GH_APPS_PRIVATEKEY` and `$GH_APPS_ID`

## Operation check locally

### Fire up test server

```shell
GOOGLE_APPLICATION_CREDENTIALS="absolute-path-to-your-credentials.json" scripts/dev.sh
curl -m 900 http://localhost:8080/pdf/takanakahiko/vivliostyle-sample
```

### Debugging Cloud Pub/Sub

```shell
gcloud beta emulators pubsub start
node scripts/createTopic.js test test
node scripts/publishMessage.js test '{"owner": "takanakahiko", "repo": "vivliostyle-sample"}'
```

## Upload built image to Container Registry

```shell
$ gcloud auth configure-docker --quiet
$ docker build . -t gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf \
    --build-arg GH_APPS_PRIVATEKEY="$GH_APPS_PRIVATEKEY" \
    --build-arg GH_APPS_ID="$GH_APPS_ID"
$ docker push gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf
$ gcloud run deploy vivliostyle-pub-build-pdf \
    --image gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf \
    --project vivliostyle-81c48 --region asia-northeast1 \
    --platform managed --timeout 900 --memory 2Gi
```

## Deploy

```shell
gcloud run deploy --timeout 900 --memory 1Gi --image gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf
```

## Build pdf

```shell
curl -m 900 -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://vivliostyle-pub-build-pdf-xm6ya42m7a-an.a.run.app/pdf/takanakahiko/vivliostyle-sample
```
