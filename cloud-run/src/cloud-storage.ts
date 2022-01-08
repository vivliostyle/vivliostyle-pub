// Imports the Google Cloud client library
import {Storage} from '@google-cloud/storage';
import * as uuid from 'uuid';

const storage = new Storage();

const bucketName = 'vivliostyle-pub-build-pdf';

interface UploadFileResult {
  signedUrl: string
  url: string
}

export async function uploadFile(name: string, path: string): Promise<UploadFileResult> {
  const filename = `${name}-${uuid.v4()}.pdf`;
  const ret = await storage.bucket(bucketName).upload(path, {
    gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
    destination: filename,
  });
  const signedUrl = await ret[0].getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  })
  return {
    signedUrl: signedUrl[0],
    url: `https://storage.cloud.google.com/${bucketName}/${filename}?hl=ja`
  }
}
