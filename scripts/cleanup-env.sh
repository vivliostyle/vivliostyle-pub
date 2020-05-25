#!/bin/zsh

NOW_ENV=${1:-production}

echo "Env: ${NOW_ENV}"

for line in $(cat .env | peco)
do
  local ev=("${(@s/=/)line}")
  local key=$ev[1]
  now env rm -y ${key} ${NOW_ENV}
done