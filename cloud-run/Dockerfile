FROM node:12-slim
LABEL maintainer "Vivliostyle Foundation <mail@vivliostyle.org>"

RUN set -x \
  && apt update \
  && apt install -y --no-install-recommends \
  libasound2-dev libgtk-3-0 libnss3-dev libx11-xcb-dev libxss-dev libxtst-dev \
  ghostscript poppler-utils wget gnupg \
  xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
  libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
  libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
  libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils git \
  && rm -rf /var/lib/apt/lists/*

RUN  \
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt update \
  && apt install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# RUN git clone https://github.com/vivliostyle/vivliostyle-cli.git /opt/vivliostyle-cli/
COPY ./vivliostyle-cli /opt/vivliostyle-cli

RUN set -x \
  && cd /opt/vivliostyle-cli \
  && yarn install \
  && yarn build && yarn link

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package.json package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

ARG APP_ID
ENV APP_ID=$APP_ID
ARG GITHUB_APPS_PRIVATEKEY
ENV GITHUB_APPS_PRIVATEKEY=$GITHUB_APPS_PRIVATEKEY

# Run the web service on container startup.
CMD [ "npm", "start" ]
