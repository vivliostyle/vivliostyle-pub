import {NextApiHandler} from 'next';
import {stringify} from '@vivliostyle/vfm';

import firebaseAdmin from '@services/firebaseAdmin';
import {graphql} from '@octokit/graphql';
import {decrypt} from '@utils/encryption';

const commitSession: NextApiHandler<null> = async (req, res) => {
  const {sessionId, branch, style} = req.body;
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

  if (!idTokenDecoded?.githubAccessToken) {
    return res.status(405).send(null);
  }
  const decryptedToken = decrypt(idTokenDecoded.githubAccessToken);

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

  console.log(text);

  const pathWithBranch = `${branch}:${path}`;
  // ブランチのOIDを取得する
  // TODO: OIDはフロント側で管理する 他者によってコミットが進んでいたらどうするか。
  const branchObj = (await graphql(
    `
      query getBranchOid(
        $owner: String!
        $repo: String!
        $qualifiedName: String!
        $pathWithBranch: String!
      ) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $qualifiedName) {
            target {
              ... on Commit {
                oid
              }
            }
          }
          existsFile: object(expression: $pathWithBranch) {
            ... on Blob {
              oid
            }
          }
        }
      }
    `,
    {
      owner,
      repo,
      qualifiedName: `refs/heads/${branch}`,
      pathWithBranch,
      headers: {
        authorization: `token ${decryptedToken}`,
      },
    },
  )) as any;
  // 最新のコミットのObjectID
  const headOid = branchObj.repository.ref.target.oid;
  console.log('branch obj', JSON.stringify(branchObj));

  const additions = [];
  additions.push({
    path: path,
    contents: Buffer.from(text, 'utf8').toString('base64'),
  });

  if ((path as string).endsWith('.md')) {
    const stringified = stringify(text, {style});
    const encoded = Buffer.from(stringified, 'utf8').toString('base64');
    additions.push({
      path: path.replace(/\.md$/, '.html'),
      contents: encoded,
    });
  }
  // TODO: commitSessionはSaveDocumentsボタンが押されたときにだけ使用されるのでたぶんCreateになることはない
  const message = branchObj.repository.existsFile
    ? `Update ${path}`
    : `Create ${path}`;
  try {
    const result = await graphql(
      `
        mutation commitContents(
          $repositoryNameWithOwner: String!
          $branch: String!
          $message: String!
          $additions: [FileAddition!]
          $headOid: GitObjectID!
        ) {
          createCommitOnBranch(
            input: {
              branch: {
                repositoryNameWithOwner: $repositoryNameWithOwner
                branchName: $branch
              }
              message: {headline: $message}
              fileChanges: {additions: $additions}
              expectedHeadOid: $headOid
            }
          ) {
            # TODO: 対象ブランチ、ディレクトリのファイルリストを返せるようにする
            commit {
              # return values
              oid # The Git object ID. 次のコミットにはこの値が必要
            }
          }
        }
      `,
      {
        repositoryNameWithOwner: `${owner}/${repo}`,
        branch,
        message,
        additions,
        headOid,
        headers: {
          authorization: `token ${decryptedToken}`,
        },
      },
    );
    console.log('commitSession result', result);

    res.status(201).send(null);
  } catch (e: any) {
    console.error('commitSession error', e.message);
    res.status(400).send(null);
  }
};

export default commitSession;
