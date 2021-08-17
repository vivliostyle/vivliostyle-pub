import {App} from '@octokit/app';
import {githubAppPrivateKey} from '@utils/keys';

export default new App({
  id: +process.env.GH_APP_ID,
  privateKey: githubAppPrivateKey,
});
