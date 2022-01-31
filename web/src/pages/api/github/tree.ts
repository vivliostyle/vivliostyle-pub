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
  const {owner, repo, branch, path} = req.query;
  if (req.method !== 'GET' || Array.isArray(owner) || Array.isArray(repo) || Array.isArray(branch) || Array.isArray(path)) {
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

  const tree_sha = await getTreeSha(octokit,owner, repo, branch, path);

  let sha:string = tree_sha;
  if( sha.length != 40  ) { /* ハッシュ値の桁数でなければルートディレクトリのファイルを取得する */
    try{
      const ret = await octokit.request(`GET /repos/{owner}/{repo}/commits/${branch}`, {owner, repo, per_page: 1});
      sha = ret.data.sha;
    }catch(e:any){
//      console.error(e);
      return res.status(e.status).send(null);
    }
  }
  const tree = await octokit.git.getTree({owner, repo, tree_sha:sha});
  const files = tree.data as unknown as CommitsOfRepositoryApiResponse;
  res.send(files);
};

export default commits;

/**
 * パスを元にshaの値を取得する
 * @param path 
 * @returns 
 */
async function getTreeSha(octokit:Octokit, owner:string, repo:string, branch:string, path:string):Promise<string>{
  let sha = '';
  const array = path.split('/');
  // console.log('getTreeSha array',array);
  for(const name of array) {
    if(name != '') {
      if( sha.length != 40  ) { /* ハッシュ値の桁数でなければルートディレクトリのファイルを取得する */
        const ret = await octokit.request(`GET /repos/{owner}/{repo}/commits/${branch}`, {owner, repo, per_page: 1});
        sha = ret.data.sha;
      }
      // console.log('getTreeSha name',name);      
      const tree = await octokit.git.getTree({owner, repo, tree_sha:sha});
      // console.log('getTreeSha tree',tree);      
      const files = tree.data as unknown as CommitsOfRepositoryApiResponse;
      // console.log('getTreeSha files',files);      
      const file = files.tree.find((f)=>f.type === 'tree' && f.path === name);
      // console.log('getTreeSha file',file);
      if(file && file.sha) {
        sha = file.sha;
      }else{
        break;
      }
    }
  }
  // console.log('getTreeSha result', sha);
  return sha;
}