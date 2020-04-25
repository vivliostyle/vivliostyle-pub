require('dotenv').config({ path: '../.env' });

const checkPublicEnv = (envName) => {
  return (
    envName.startsWith('FIREBASE') || envName == 'GITHUB_APP_INSTALLATION_URL'
  );
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
