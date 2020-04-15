require('dotenv').config({ path: '../.env' });

const checkPublicEnv = (envName) => {
  return envName.startsWith('FIREBASE');
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
