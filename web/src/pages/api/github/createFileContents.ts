import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';
import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';

const commitSession: NextApiHandler<null> = async (req, res) => {
  const {owner, repo, path, content} = req.body;
  if (req.method !== 'POST' || !owner || !repo || !path || !content) {
    return res.status(400).send(null);
  }
  const idToken = req.headers['x-id-token'];
  if (!idToken) {
    return res.status(401).send(null);
  }

  req.query.file

  let idTokenDecoded: firebaseAdmin.auth.DecodedIdToken;
  try {
    const tokenString = Array.isArray(idToken) ? idToken[0] : idToken;
    idTokenDecoded = await firebaseAdmin.auth().verifyIdToken(tokenString);
  } catch (error) {
    return res.status(400).send(null);
  }

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
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    content,
    message: `Create ${path}`,
  });
  res.status(201).send(null);
};

export default commitSession;
