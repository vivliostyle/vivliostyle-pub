import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';

import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';
import { createAppAuth } from '@octokit/auth-app';
import { githubAppPrivateKey } from '@utils/keys';

export interface GithubRequestSessionApiResponse {
  id: string;
}

const requestSession: NextApiHandler<GithubRequestSessionApiResponse | null> = async (
  req,
  res,
) => {
  const {owner, repo, path, branch} = req.body;
  if (req.method !== 'POST' || !owner || !repo) {
    return res.status(400).send(null);
  }
  const idToken = req.headers['x-id-token'];
  if (!idToken) {
    return res.status(401).send(null);
  }

  let idTokenDecoded: firebaseAdmin.auth.DecodedIdToken;
  try {
    const tokenString = Array.isArray(idToken) ? idToken[0] : idToken;
    idTokenDecoded = await firebaseAdmin.auth().verifyIdToken(tokenString);
  } catch (error) {
    return res.status(400).send(null);
  }

  if (!idTokenDecoded?.githubAccessToken) {
    return res.status(405).send(null);
  }
  const decrypted = decrypt(idTokenDecoded.githubAccessToken);

  const [id, installations] = await Promise.all([
    (async () => {
      const appAuthentication = await githubApp({type:"app"});
      const jwt = appAuthentication.token;
      const octokit = new Octokit({
        auth: `Bearer ${jwt}`,
      });
      const {data} = await octokit.apps.getRepoInstallation({owner, repo});
      return data.id;
    })(),
    (async () => {
      const octokit = new Octokit({
        auth: `token ${decrypted}`,
      });
      const {data} = await octokit.apps.listInstallationsForAuthenticatedUser();
      return data.installations.map((i) => i.id);
    })(),
  ]);
  if (!installations.includes(id)) {
    return res.status(405).send(null);
  }

  // Get index.md from repo
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: +process.env.GH_APP_ID,
      privateKey: githubAppPrivateKey,
      installationId: id,
    },
  });
  let content = '';
  try {
    const {data} = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if( Array.isArray(content) || !("content" in data) ) {
      // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
      throw new Error(`Content type is not file`);
    }
    if (!Array.isArray(data) && data.type === 'file' && data.content) {
      content = Buffer.from(data.content, 'base64').toString('utf8');
    }
  } catch (error) {}

  // create session
  const sessionDoc = await firebaseAdmin
    .firestore()
    .collection('users')
    .doc(idTokenDecoded.uid)
    .collection('sessions')
    .add({
      userUpdatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      text: content,
      owner,
      repo,
      path,
    });
  res.send({id: sessionDoc.id});
};

export default requestSession;
