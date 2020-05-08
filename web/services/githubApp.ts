import { App } from '@octokit/app';

export default new App({
  id: +process.env.GH_APPS_ID,
  privateKey: process.env.GH_APPS_PRIVATEKEY,
});
