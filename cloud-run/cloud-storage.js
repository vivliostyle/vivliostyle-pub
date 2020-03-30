// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');
const uuid = require('node-uuid');

// Creates a client
// const storage = new Storage();
// Creates a client from a Google service account key.
const storage = new Storage({projectId: 'neko-3a840', keyFilename: 'key.json'});

/**
 * TODO(developer): Uncomment these variables before running the sample.
 */
const bucketName = 'vivliostyle-pub-0001';
const filename = 'vivliostyle-user-group-vol2.pdf'

async function uploadFile() {
  const res = await storage.bucket(bucketName).upload(filename, {
    // Support for HTTP requests made with `Accept-Encoding: gzip`
    gzip: true,
    // By setting the option `destination`, you can change the name of the
    // object you are uploading to a bucket.
    metadata: {
      // Enable long-lived HTTP caching headers
      // Use only if the contents of the file will never change
      // (If the contents will change, use cacheControl: 'no-cache')
      cacheControl: 'public, max-age=31536000',
    },
    destination: `vivliostyle-user-group-vol2-${uuid.v4()}.pdf`
  });
  console.log(res);
}

uploadFile().catch(console.error);
