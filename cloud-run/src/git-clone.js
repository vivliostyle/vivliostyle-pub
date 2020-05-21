const Git = require('nodegit');

const { App } = require("@octokit/app");
const { request } = require("@octokit/request");
const app = new App({ id: process.env.GH_APPS_ID, privateKey: process.env.GH_APPS_PRIVATEKEY });

async function gitClone(owner, repo, repoDir) {
  
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

  await Git.Clone(`https://x-access-token:${installationAccessToken}@github.com/${owner}/${repo}.git`, repoDir);

}

module.exports = gitClone
