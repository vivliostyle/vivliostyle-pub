import * as Git from 'nodegit';

const { App } = require("@octokit/app");
const { request } = require("@octokit/request");
const app = new App({ id: process.env.GH_APPS_ID, privateKey: process.env.GH_APPS_PRIVATEKEY });

export async function gitClone(owner:string, repo:string, repoDir:string) {
  
  const jwt = app.getSignedJsonWebToken();
  const { data } = await request("GET /repos/:owner/:repo/installation", {
    owner,
    repo,
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: "application/vnd.github.machine-man-preview+json",
    },
  });

  const installationId = data.id;
  const installationAccessToken = await app.getInstallationAccessToken({
      installationId,
  });  

  await Git.Clone.clone(`https://x-access-token:${installationAccessToken}@github.com/${owner}/${repo}.git`, repoDir);

}
