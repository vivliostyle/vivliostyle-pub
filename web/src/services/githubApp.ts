import {App} from '@octokit/app';

import {getGithubAppsPrivateKey} from '../utils/encryption';

export default new App({
  id: +process.env.GH_APPS_ID,
  privateKey: getGithubAppsPrivateKey(),
});
