FROM ghcr.io/vivliostyle/cli:latest
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

USER root

RUN set -x \
  && apt-get update \
  && apt-get install -y git

WORKDIR /usr/src/app
COPY package.json package*.json ./
RUN npm install
COPY . .

RUN chown -R node tmp

ARG GH_APPS_ID
ARG GH_APPS_PRIVATEKEY
ENV GH_APPS_ID=$GH_APPS_ID
ENV GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY

RUN npm run build

USER node
ENTRYPOINT [ "/bin/sh", "-c" ]
CMD [ "npm start" ]
