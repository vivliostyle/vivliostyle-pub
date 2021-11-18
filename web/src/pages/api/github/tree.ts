import {NextApiHandler} from 'next';
import {Endpoints} from '@octokit/types';
import {Octokit} from '@octokit/rest';

import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';

export type CommitsOfRepositoryApiResponse =
  Endpoints['GET /repos/{owner}/{repo}/git/trees/{tree_sha}']['response']['data'];

const commits: NextApiHandler<CommitsOfRepositoryApiResponse | null> = async (
  req,
  res,
) => {
  const {owner, repo, branch, tree_sha} = req.query;
  if (req.method !== 'GET' || Array.isArray(owner) || Array.isArray(repo) || Array.isArray(tree_sha)) {
    console.log('validation error');
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

  const octokit = new Octokit({
    auth: `token ${decrypted}`,
  });

  let sha:string = tree_sha;
  if( sha.length != 40  ) { /* ハッシュ値の桁数でなければルートディレクトリのファイルを取得する */
    const ret = await octokit.request(`GET /repos/{owner}/{repo}/commits/${branch}`, {owner, repo, per_page: 1});
    sha = ret.data.sha;
  }
  const tree = await octokit.git.getTree({owner, repo, tree_sha:sha});
  const files = tree.data as unknown as CommitsOfRepositoryApiResponse;
  res.send(files);
};

export default commits;
