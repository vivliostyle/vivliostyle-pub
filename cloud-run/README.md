## Prepare

    $ git remote add cli https://github.com/vivliostyle/vivliostyle-cli.git

and

- Download credentials for GCP and set credentials path to `$GOOGLE_APPLICATION_CREDENTIALS`
- Set credentials for GitHub Apps to `$GITHUB_APPS_PRIVATEKEY` and `$APP_ID`

## Operation check locally

### Up Server

    $ docker build --build-arg GITHUB_APPS_PRIVATEKEY=$GITHUB_APPS_PRIVATEKEY --build-arg APP_ID=$APP_ID -t pub .
    $ docker run -v $GOOGLE_APPLICATION_CREDENTIALS:/tmp/gcp_cred.json -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp_cred.json -p 8080:8080 pub
    $ curl -m 900 http://localhost:8080/pdf/takanakahiko/viola-project

### Pub/Sub

    $ gcloud beta emulators pubsub start
    $ node scripts/createTopic.js test
    $ node scripts/publishMessage.js test '{"owner": "takanakahiko", "repo": "viola-project", "stylesheet": "https://vivliostyle.github.io/vivliostyle_doc/samples/gingatetsudo/style.css"}'

## Upload image to the Container Registry

    $ gcloud builds submit --tag gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf

c.f. https://cloud.google.com/run/docs/quickstarts/build-and-deploy#containerizing

## Deploy

    $ gcloud run deploy --timeout 900 --memory 1Gi --image gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf


## Build pdf

    $  curl -m 900 -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://vivliostyle-pub-build-pdf-xm6ya42m7a-an.a.run.app/pdf/youchan/viola-project
