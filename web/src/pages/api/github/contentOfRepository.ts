import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';
import {Endpoints} from '@octokit/types';

import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';

export type ContentOfRepositoryApiResponse = Endpoints["GET /repos/{owner}/{repo}/contents/{path}"]['response']['data']

const contentOfRepository: NextApiHandler<ContentOfRepositoryApiResponse | null> = async (
  req,
  res,
) => {
  const {owner, repo, path, branch} = req.query;
  console.log("contentOfRepository:",path);
  if (req.method !== 'GET' || Array.isArray(owner) || Array.isArray(repo) || Array.isArray(path) || Array.isArray(branch)) {
    console.log("validation error")
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
    console.log(error)
    return res.status(400).send(null);
  }

  if (!idTokenDecoded?.githubAccessToken) {
    return res.status(405).send(null);
  }
  const decrypted = decrypt(idTokenDecoded.githubAccessToken);

  const [id, installations] = await Promise.all([
    (async () => {
      const jwt = githubApp.getSignedJsonWebToken();
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

  const token = await githubApp.getInstallationAccessToken({
    installationId: id,
  });
  const octokit = new Octokit({
    auth: `token ${token}`,
  });
  try {
    const { data } = await octokit.repos.getContent({owner, repo, path, ref: branch});
    const content = Array.isArray(data)? data[0] : data
    return res.send(data)
  } catch (error) {
    throw error
  }
};

export default contentOfRepository;
