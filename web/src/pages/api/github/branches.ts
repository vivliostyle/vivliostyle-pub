import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';
import {Endpoints} from '@octokit/types';

import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';
import { createAppAuth } from '@octokit/auth-app';
import { githubAppPrivateKey } from '@utils/keys';

export type BranchesApiResponse = {
    branches: Endpoints["GET /repos/{owner}/{repo}/branches"]['response']['data'];
    default: string;
}

const branches: NextApiHandler<BranchesApiResponse | null> = async (
  req,
  res,
) => {
  const {owner, repo} = req.query;
  if (req.method !== 'GET' || Array.isArray(owner) || Array.isArray(repo)) {
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
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: +process.env.GH_APP_ID,
      privateKey: githubAppPrivateKey,
      installationId: id,
    },
  });
  try {
    const { data: branches } = await octokit.repos.listBranches({owner, repo});
    const { data: repoInfo } = await octokit.repos.get({owner, repo});
    return res.send({
        branches: branches,
        default: repoInfo.default_branch
    })
  } catch (error) {
    throw error
  }
};

export default branches;
