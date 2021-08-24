require('dotenv').config({path: '../.env'});

const checkPublicEnv = (envName) => {
  return ['FIREBASE_CONFIG', 'GH_APP_INSTALLATION_URL'].includes(envName);
};
const env = Object.keys(process.env).reduce((acc, key) => {
  if (checkPublicEnv(key)) {
    acc[key] = process.env[key];
  }
  return acc;
}, {});

module.exports = {
  env,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      require('./scripts/setup-viewer');
    }
    return config;
  },
};
