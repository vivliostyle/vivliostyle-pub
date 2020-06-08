import * as crypto from 'crypto';

const appSecret = crypto.scryptSync(process.env.APP_SECRET, 'salt', 32);

export const encrypt = (data: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', appSecret, iv);
  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString('base64')}.${iv.toString('base64')}`;
};

export const decrypt = (data: string): string => {
  const [encrypted, iv64] = data.split('.');
  const iv = Buffer.from(iv64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', appSecret, iv);
  let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
};
