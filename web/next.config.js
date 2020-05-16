require('dotenv').config({path: '../.env'});

const checkPublicEnv = (envName) => {
  return [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'GITHUB_APP_INSTALLATION_URL',
  ].includes(envName);
};
const env = Object.keys(process.env).reduce((acc, key) => {
  if (checkPublicEnv(key)) {
    acc[key] = process.env[key];
  }
  return acc;
}, {});

module.exports = {
  env,
};
