import { execCommanad } from './util'

import {createAppAuth} from '@octokit/auth-app';
import {request} from '@octokit/request';

const appId = parseInt(process.env.GH_APPS_ID || "");
const privateKey = process.env.GH_APPS_PRIVATEKEY || "";
const appAuth = createAppAuth({appId, privateKey});

export async function gitClone(owner: string, repo: string, repoDir: string, branch: string) {
  const {token} = await appAuth({type: 'app'});
  const {data} = await request('GET /repos/{owner}/{repo}/installation', {
    owner,
    repo,
    headers: {authorization: `Bearer ${token}`},
  });
  const installationAuth = createAppAuth({
    appId,
    privateKey,
    installationId: data.id,
  });

  const authentication = await installationAuth({type: 'installation'});
  const installationAccessToken = authentication.token;
  const branchParam = branch ? `-b '${branch}'` : '';
  await execCommanad(`git clone ${branchParam} --depth 1 https://x-access-token:${installationAccessToken}@github.com/${owner}/${repo}.git ${repoDir}`)
}
