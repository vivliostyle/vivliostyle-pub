import * as crypto from 'crypto';

import encryptedKeys from '../../secrets.enc.json';

interface ServiceAccountJson {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export function getDecryptedSecret<T>(encryptedKey: string): T {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    process.env.ENCRYPTION_SECRET,
    process.env.ENCRYPTION_IV,
  );
  let decrypted = decipher.update(encryptedKey, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return (decrypted as unknown) as T;
}

export const firebaseAdminServiceAccount = JSON.parse(
  getDecryptedSecret<string>(encryptedKeys.firebaseServiceAccount),
) as ServiceAccountJson;

export const githubAppPrivateKey = getDecryptedSecret<string>(
  encryptedKeys.githubAppPrivateKey,
);
