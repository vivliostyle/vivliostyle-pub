import {App} from '@octokit/app';
import {githubAppPrivateKey} from '@utils/keys';

export default new App({
  id: +process.env.GITHUB_APP_ID,
  privateKey: githubAppPrivateKey,
});
