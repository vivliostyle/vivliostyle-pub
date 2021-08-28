FROM node:16-slim
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

# Set up for @vivliostyle/cli
RUN set -x \
  && apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    # dependencies for puppeteer
    google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    # dependencies for press-ready
    ghostscript poppler-utils \
  && rm -rf /var/lib/apt/lists/*

# Set up for nodegit
RUN set -x \
  && apt update \
  && apt install -y --no-install-recommends \
   python build-essential libssl-dev libkrb5-dev libc++-dev \
  && rm -rf /var/lib/apt/lists/*

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
#   A wildcard is used to ensure both package.json AND package-lock.json are copied.
#   Copying this separately prevents re-running npm install on every code change.
COPY package.json package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Setup credentials
ARG GH_APPS_ID
ARG GH_APPS_PRIVATEKEY
ENV GH_APPS_ID=$GH_APPS_ID
ENV GH_APPS_PRIVATEKEY=$GH_APPS_PRIVATEKEY

# Install production dependencies.
RUN npm run build

# Run the web service on container startup.
CMD [ "npm", "start" ]
