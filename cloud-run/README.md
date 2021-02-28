# Vivliostyle Builder

## Prepare

- Download proper service account credentials from GCP and set credentials path to `$GOOGLE_APPLICATION_CREDENTIALS`
- Set credentials for GitHub Apps to `$GH_APP_PRIVATEKEY` and `$GH_APP_ID`

## Operation check locally

### Fire up test server

```shell
GOOGLE_APPLICATION_CREDENTIALS="absolute-path-to-your-credentials.json" scripts/dev.sh
curl -m 900 http://localhost:8080/pdf/takanakahiko/viola-project
```

### Debugging Cloud Pub/Sub

```shell
gcloud beta emulators pubsub start
node scripts/createTopic.js test test
node scripts/publishMessage.js test '{"owner": "takanakahiko", "repo": "vivliostyle-sample"}'
```

## Upload built image to Container Registry

```shell
gcloud builds submit --tag gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf
```

c.f. https://cloud.google.com/run/docs/quickstarts/build-and-deploy#containerizing

## Deploy

```shell
gcloud run deploy --timeout 900 --memory 1Gi --image gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf
```

## Build pdf

```shell
curl -m 900 -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://vivliostyle-pub-build-pdf-xm6ya42m7a-an.a.run.app/pdf/youchan/viola-project
```
