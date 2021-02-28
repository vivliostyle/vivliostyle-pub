## setup

```bash
$ yarn
$ firebase functions:config:get > .runtimeconfig.json
```

## run

```bash
## If you want to emulate Pub/Sub, type the following commands.
$ firebase emulators:start --only pubsub
$ PUBSUB_EMULATOR_HOST=localhost:8085 node ../cloud-run/scripts/createTopic.js buildPdf hoge

$ yarn start
firebase > buildPDF({owner: "takanakahiko", repo: "vivliostyle-sample"})
```
