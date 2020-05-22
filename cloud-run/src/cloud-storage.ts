// Imports the Google Cloud client library
import { Storage } from '@google-cloud/storage';
import * as uuid from 'node-uuid';

const storage = new Storage();

const bucketName = 'vivliostyle-pub-build-pdf';

export async function uploadFile(name:string, path:string) {
  const filename = `${name}-${uuid.v4()}.pdf`
  await storage.bucket(bucketName).upload(path, {
  gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
    destination: filename
  });
  return `https://storage.cloud.google.com/${bucketName}/${filename}?hl=ja`
}
