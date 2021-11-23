import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';
import {stringify} from '@vivliostyle/vfm';

import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';
import {createOrUpdateFileContentsInternal} from './createOrUpdateFileContents';
import { createAppAuth } from '@octokit/auth-app';

const commitSession: NextApiHandler<null> = async (req, res) => {
  const {sessionId, branch} = req.body;
  if (req.method !== 'PUT' || !sessionId) {
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

  const sessionSnapshot = await firebaseAdmin
    .firestore()
    .collection('users')
    .doc(idTokenDecoded.uid)
    .collection('sessions')
    .doc(sessionId)
    .get();
  if (!sessionSnapshot.exists) {
    return res.status(400).send(null);
  }
  const {owner, repo, text, path} = sessionSnapshot.data()!;

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
      privateKey: process.env.GH_APP_PRIVATEKEY,
      installationId: installationId,
    },
  });

  await createOrUpdateFileContentsInternal(octokit, owner, repo, branch, path, Buffer.from(text, 'utf8').toString('base64'));
  if((path as string).endsWith('.md')) {
    await createOrUpdateFileContentsInternal(octokit, owner, repo, branch, path.replace(/\.md$/, '.html'), Buffer.from(stringify(text), 'utf8').toString('base64'));
  }
  res.status(201).send(null);
};

export default commitSession;
