import {NextApiHandler} from 'next';
import {Endpoints} from '@octokit/types';
import {Octokit} from '@octokit/rest';

import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';

export type GithubReposApiResponse = Endpoints['GET /user/installations/:installation_id/repositories']['response']['data']['repositories'];

const repos: NextApiHandler<GithubReposApiResponse | null> = async (
  req,
  res,
) => {
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

  const octokit = new Octokit({
    auth: `token ${decrypted}`,
  });
  const installations = await octokit.apps.listInstallationsForAuthenticatedUser();
  const ret = await Promise.all(
    installations.data.installations.map(async ({id}) => {
      const repos = await octokit.apps.listInstallationReposForAuthenticatedUser(
        {
          installation_id: id,
        },
      );
      return repos.data.repositories;
    }),
  );
  res.send(ret.reduce((acc, v) => [...acc, ...v], []));
};

export default repos;
