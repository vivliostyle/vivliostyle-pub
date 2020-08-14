import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';
import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';

const commitSession: NextApiHandler<null> = async (req, res) => {
  const {sessionId} = req.body;
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
  const {owner, repo, text} = sessionSnapshot.data()!;

  // Save index.md
  const installationId = await (async () => {
    const jwt = githubApp.getSignedJsonWebToken();
    const octokit = new Octokit({
      auth: `Bearer ${jwt}`,
    });
    const {data} = await octokit.apps.getRepoInstallation({owner, repo});
    return data.id;
  })();
  const token = await githubApp.getInstallationAccessToken({
    installationId,
  });
  const octokit = new Octokit({
    auth: `token ${token}`,
  });
  const contentSha = await (async () => {
    try {
      const {data} = await octokit.repos.getContent({
        owner,
        repo,
        path: 'index.md',
      });
      if (!Array.isArray(data) && data.type === 'file') {
        return data.sha;
      }
    } catch (error) {}
  })();
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'index.md',
    sha: contentSha,
    content: Buffer.from(text, 'utf8').toString('base64'),
    message: 'Update index.md',
  });
  res.status(201).send(null);
};

export default commitSession;
