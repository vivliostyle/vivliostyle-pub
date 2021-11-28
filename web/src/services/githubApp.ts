import {createAppAuth} from '@octokit/auth-app';
import {githubAppPrivateKey} from '@utils/keys';

export default createAppAuth({
  appId: +process.env.GH_APP_ID,
  privateKey: githubAppPrivateKey,
});
