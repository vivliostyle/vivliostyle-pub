#!/bin/bash

echo "Source: ${@}"
echo -n $@ | openssl enc -aes-256-cbc -iv "$(echo -n ${ENCRYPTION_IV} | xxd -p | tr -d "\n")" -K "$(echo -n ${ENCRYPTION_SECRET} | xxd -p | tr -d "\n")" -base64