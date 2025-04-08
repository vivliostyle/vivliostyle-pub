FROM ghcr.io/vivliostyle/cli:8.20.0
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .

RUN mkdir tmp; exit 0

ARG GH_APPS_ID
ARG GH_APPS_PRIVATEKEY
ENV GH_APPS_ID=$GH_APPS_ID
ENV GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY

RUN yarn build

ENTRYPOINT [ "/bin/sh", "-c" ]
CMD [ "npm start" ]
