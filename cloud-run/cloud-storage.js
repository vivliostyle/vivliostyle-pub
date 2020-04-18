// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');
const uuid = require('node-uuid');

const storage = new Storage({projectId: 'neko-3a840', keyFilename: 'key.json'});

const bucketName = 'vivliostyle-pub-0001';

async function uploadFile(name, path) {
  const filename = `${name}-${uuid.v4()}.pdf`
  const res = await storage.bucket(bucketName).upload(path, {
  gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
    destination: filename
  });

  return `https://storage.cloud.google.com/vivliostyle-pub-0002/${filename}?hl=ja`
}
