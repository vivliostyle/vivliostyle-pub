FROM ghcr.io/vivliostyle/cli:9.1.0
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .

RUN mkdir tmp; exit 0

ARG GH_APPS_ID
ARG GH_APPS_PRIVATEKEY
ENV GH_APPS_ID=$GH_APPS_ID
ENV GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY

RUN pnpm run build

ENTRYPOINT [ "/bin/sh", "-c" ]
CMD [ "npm start" ]
