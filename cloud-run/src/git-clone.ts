import { promisify } from 'util';
import * as child_process from 'child_process'; 
const exec = promisify(child_process.exec);

import { App } from '@octokit/app'
import {request} from '@octokit/request';

const app = new App({
  id: parseInt(process.env.GH_APPS_ID || ""),
  privateKey: process.env.GH_APPS_PRIVATEKEY || "",
});

export async function gitClone(owner: string, repo: string, repoDir: string) {
  const {data} = await request('GET /repos/:owner/:repo/installation', {
    owner,
    repo,
    headers: {
      authorization: `Bearer ${app.getSignedJsonWebToken()}`,
      accept: 'application/vnd.github.machine-man-preview+json',
    },
    mediaType: {
      previews: ["machine-man"],
    },
  });
  const installationAccessToken = await app.getInstallationAccessToken({
    installationId: data.id,
  });

  await exec(`git clone https://x-access-token:${installationAccessToken}@github.com/${owner}/${repo}.git repoDir`)

}
