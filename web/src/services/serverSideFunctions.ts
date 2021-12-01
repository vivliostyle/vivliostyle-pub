import { isImageFile } from '@middlewares/frontendFunctions';
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
  data: File, // JavaScript標準のFile
): Promise<Response | null> {
  if (!(user && owner && repo && branch && path)) {
    return null;
  }
  try {
    const content = isImageFile(path) ? (await getBase64(data))?.toString().split(',')[1] : await data.text();
    // console.log('createFile content', content);
    const result = await fetch('/api/github/createOrUpdateFileContents', {
      method: 'POST',
      body: JSON.stringify({
        owner,
        repo,
        branch,
        path: path,
        content , // remove dataURL's prefixr
      }),
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    });
    // console.log('createOrUpdateFileContents response status',result.status);
    return result;
  } catch (error) {
    console.error(error);
  }
  return null;
}
