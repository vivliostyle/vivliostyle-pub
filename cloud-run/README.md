## Prepare

    $ git remote add cli https://github.com/vivliostyle/vivliostyle-cli.git

## Upload image to the Container Registry

    $ gcloud builds submit --tag gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf

c.f. https://cloud.google.com/run/docs/quickstarts/build-and-deploy#containerizing

## Deploy

    $ gcloud builds submit --timeout 900 --tag gcr.io/vivliostyle-81c48/vivliostyle-pub-build-pdf 

Make sure to be configured memory size to 1GB.

## Build pdf

    $  curl -m 900 -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://vivliostyle-pub-build-pdf-xm6ya42m7a-an.a.run.app/pdf/youchan/viola-project
