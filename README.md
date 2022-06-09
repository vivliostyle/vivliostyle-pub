# Vivliostyle Pub

Vivliostyle is an open source project for a new typesetting system based on web standard technology.

Vivliostyle Pub is a sub-project of Vivliostyle for enabling book writing, co-editing and publishing in web browsers.

## Try the Alpha version

Try Vivliostyle Pub (Alpha version): https://vivliostyle-pub-develop.vercel.app/

**Note:** Currently it is working only in Chrome desktop browser. There are known [issues](https://github.com/vivliostyle/vivliostyle-pub/issues) that it will not work in Safari, Firefox and mobile browsers.

## Development

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

### Pupulate .env

Pupulating .env variables can be done easily by using [direnv](https://direnv.net/).

### About front-end development

See web/README.md

## Credits

[![Powered By Vercel](https://www.datocms-assets.com/31049/1618983297-powered-by-vercel.svg)](https://vercel.com/?utm_source=vivliostyle&utm_campaign=oss)
