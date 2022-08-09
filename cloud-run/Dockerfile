FROM ghcr.io/vivliostyle/cli:5.5.1
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

RUN set -x \
  && apt-get update \
  && apt-get install -y git

WORKDIR /usr/src/app
COPY package.json package*.json ./
RUN npm install
COPY . .

RUN mkdir tmp; exit 0

ARG GH_APPS_ID
ARG GH_APPS_PRIVATEKEY
ENV GH_APPS_ID=$GH_APPS_ID
ENV GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY

RUN npm run build

ENTRYPOINT [ "/bin/sh", "-c" ]
CMD [ "npm start" ]
