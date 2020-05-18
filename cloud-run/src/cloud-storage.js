// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');
const uuid = require('uuid');

const storage = new Storage();

const bucketName = 'vivliostyle-pub-build-pdf';

async function uploadFile(name, path) {
  const filename = `${name}-${uuid.v4()}.pdf`;
  const res = await storage.bucket(bucketName).upload(path, {
    gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
    destination: filename,
  });

  return `https://storage.cloud.google.com/${bucketName}/${filename}?hl=ja`;
}

module.exports = uploadFile;
