import {NextApiRequest, NextApiResponse} from 'next';
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';
import { User } from 'firebase/auth';

/**
 * 
 */
export type Repositry = {
  owner: string;
  repo: string;
  branch: string;
}

/**
 * 
 */
export type RepositoryPath = {
  user: User | null;
  owner: string | undefined;
  repo: string | undefined;
  branch: string | undefined;
  path: string;
};

/**
 * 
 * @param file 
 * @returns 
 */
const getBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file)
    })
  }

  /**
   * リポジトリにファイルを追加する
   * @param param0 
   * @param data 
   * @returns 
   */
export async function createFile(
  {user, owner, repo, branch, path}: RepositoryPath,
  data: File,
): Promise<Response | null> {
  if (!(user && owner && repo && branch && path)) {
    return null;
  }
  try {
    const result = await fetch('/api/github/createOrUpdateFileContents', {
      method: 'POST',
      body: JSON.stringify({
        owner,
        repo,
        branch,
        path: path,
        content: (await getBase64(data))?.toString().split(',')[1], // remove dataURL's prefixr
      }),
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    });
    console.log(result.status);
    return result;
  } catch (error) {
    console.error(error);
  }
  return null;
}


/**
 * 
 * @param req 
 * @param res 
 * @returns 
 */
// export async function getDecryptedId(req:NextApiRequest,res:NextApiResponse){
//     const idToken = req.headers['x-id-token'];
//     if (!idToken) {
//       return res.status(401).send(null);
//     }
//     let idTokenDecoded: firebaseAdmin.auth.DecodedIdToken;
//     try {
//       const tokenString = Array.isArray(idToken) ? idToken[0] : idToken;
//       idTokenDecoded = await firebaseAdmin.auth().verifyIdToken(tokenString);
//     } catch (error) {
//       return res.status(400).send(null);
//     }
  
//     if (!idTokenDecoded?.githubAccessToken) {
//       return res.status(405).send(null);
//     }
//     const decrypted = decrypt(idTokenDecoded.githubAccessToken);
//     return decrypted;
//   }