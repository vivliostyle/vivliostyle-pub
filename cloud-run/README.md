## Prepare

    $ git remote add cli https://github.com/vivliostyle/vivliostyle-cli.git

## Upload image to the Container Registry

    $ gcloud builds submit --tag gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf

c.f. https://cloud.google.com/run/docs/quickstarts/build-and-deploy#containerizing

## Deploy

    $ gcloud run deploy --timeout 900 --memory 1Gi --image gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf


## Build pdf

    $  curl -m 900 -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://vivliostyle-pub-build-pdf-xm6ya42m7a-an.a.run.app/pdf/youchan/viola-project
