import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';
import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';
import { createAppAuth } from '@octokit/auth-app';
import { githubAppPrivateKey } from '@utils/keys';

export const createOrUpdateFileContentsInternal = async(octokit: Octokit, owner: string, repo: string, branch: string, path: string, base64edContent: string) => {
  const contentSha = await (async () => {
    try {
      const {data} = await octokit.repos.getContent({owner, repo, path, ref: branch});
      if (!Array.isArray(data) && data.type === 'file') return data.sha;
    } catch (error) {}
  })();


  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path, branch,
    sha: contentSha,
    content: base64edContent,
    message: contentSha ? `Update ${path}` : `Create ${path}`,
  });
}

const createOrUpdateFileContents: NextApiHandler<null> = async (req, res) => {
  const {owner, repo, path, content, branch} = req.body;
  if (req.method !== 'POST' || !owner || !repo || !path ) {
    console.error('invalid parameters',owner,repo,branch,path,content);
    return res.status(400).send(null);
  }

  // console.log('createOrUpdateFileContents',path,content);

  const idToken = req.headers['x-id-token'];
  if (!idToken) {
    return res.status(401).send(null);
  }

  try {
    const tokenString = Array.isArray(idToken) ? idToken[0] : idToken;
    await firebaseAdmin.auth().verifyIdToken(tokenString);
  } catch (error) {
    console.error('authentication error');
    return res.status(400).send(null);
  }

  // Save index.md
  const installationId = await (async () => {
    const appAuthentication = await githubApp({type:"app"});
    const jwt = appAuthentication.token;
    const octokit = new Octokit({
      auth: `Bearer ${jwt}`,
    });
    const {data} = await octokit.apps.getRepoInstallation({owner, repo});
    return data.id;
  })();
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: +process.env.GH_APP_ID,
      privateKey: githubAppPrivateKey,
      installationId: installationId,
    },
  });
  await createOrUpdateFileContentsInternal(octokit, owner, repo, branch, path, content)
  res.status(201).send(null);
};

export default createOrUpdateFileContents;
