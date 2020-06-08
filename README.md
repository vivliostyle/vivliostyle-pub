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
