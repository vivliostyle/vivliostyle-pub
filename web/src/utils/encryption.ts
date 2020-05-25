import crypto from 'crypto';

import {firebasePrivateKey, githubAppsPrivateKey} from '../../keys.enc';

const key = crypto.scryptSync(process.env.APP_SECRET, 'salt', 32);

export const encrypt = (data: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString('base64')}.${iv.toString('base64')}`;
};

export const decrypt = (data: string): string => {
  const [encrypted, iv64] = data.split('.');
  const iv = Buffer.from(iv64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
};

export function getDecryptedSecret(encryptedKey: string) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    process.env.ENCRYPTION_SECRET,
    process.env.ENCRYPTION_IV,
  );
  let decrypted = decipher.update(encryptedKey, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const getFirebasePrivateKey = () =>
  getDecryptedSecret(firebasePrivateKey);
export const getGithubAppsPrivateKey = () =>
  getDecryptedSecret(githubAppsPrivateKey);
