FROM ghcr.io/vivliostyle/cli:latest
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

USER root

WORKDIR /usr/src/app

COPY package.json package*.json ./
RUN npm install

COPY . .

ARG GH_APPS_ID
ARG GH_APPS_PRIVATEKEY
ENV GH_APPS_ID=$GH_APPS_ID
ENV GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY

RUN npm run build

USER node
ENTRYPOINT [ "/bin/sh", "-c" ]
CMD [ "npm start" ]
