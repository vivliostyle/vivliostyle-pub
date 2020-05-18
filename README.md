# Vivliostyle Pub

## Deploy staging app

```shell
now
```

## Editor `/web`

```shell
cd web
yarn install
yarn dev
```

## Pupulate .env

### Dev

Pupulating .env variables can be done easily by using [direnv](https://direnv.net/).

### Production

```
scripts/populate-env.sh production
```
