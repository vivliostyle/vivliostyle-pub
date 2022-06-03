# Vivliostyle Pub

## Deploy staging app

```shell
now
```

## Launch local web editor

```shell
brew install node yarn direnv

git clone https://github.com/vivliostyle/vivliostyle-pub

cd vivliostyle-pub
cp .env.placeholder .env
# edit .env

cd web
yarn install
yarn dev
```

## Pupulate .env

### Dev

Pupulating .env variables can be done easily by using [direnv](https://direnv.net/).

## About front-end development

See web/README.md

## Credits

[![Powered By Vercel](https://www.datocms-assets.com/31049/1618983297-powered-by-vercel.svg)](https://vercel.com/?utm_source=vivliostyle&utm_campaign=oss)
