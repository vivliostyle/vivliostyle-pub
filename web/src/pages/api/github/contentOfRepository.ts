import {NextApiHandler} from 'next';
import {Octokit} from '@octokit/rest';

import githubApp from '@services/githubApp';
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';
import {createAppAuth} from '@octokit/auth-app';
import {graphql} from '@octokit/graphql';
import {githubAppPrivateKey} from '@utils/keys';

export type ContentOfRepositoryApiResponse = {
  content: string;
  encoding: string;
  oid: string;
};

// pathは先頭に/が無いこと
const contentOfRepository: NextApiHandler<ContentOfRepositoryApiResponse | null> =
  async (req, res) => {
    const {owner, repo, path, branch, oid} = req.query;
    if (
      req.method !== 'GET' ||
      Array.isArray(owner) ||
      Array.isArray(repo) ||
      Array.isArray(path) ||
      Array.isArray(branch)
    ) {
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
      // console.log(error)
      return res.status(400).send(null);
    }

    if (!idTokenDecoded?.githubAccessToken) {
      return res.status(405).send(null);
    }
    const decrypted = decrypt(idTokenDecoded.githubAccessToken);

    const [id, installations] = await Promise.all([
      (async () => {
        const appAuthentication = await githubApp({type: 'app'});
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
        const {data} =
          await octokit.apps.listInstallationsForAuthenticatedUser();
        return data.installations.map((i) => i.id);
      })(),
    ]);

    if (!installations.includes(id)) {
      return res.status(405).send(null);
    }

    try {
      const auth = createAppAuth({
        appId: +process.env.GH_APP_ID,
        privateKey: githubAppPrivateKey,
        installationId: id,
      });
      const graphqlWithAuth = graphql.defaults({
        request: {
          hook: auth.hook,
        },
      });
      const {repository} = await graphqlWithAuth(`
      {
        repository(owner: "${owner}", name: "${repo}") {
          content:object(expression: "${branch}:${path}") {
            ... on Blob {
              abbreviatedOid,
              byteSize,
              commitResourcePath
              commitUrl,
              isBinary,
              isTruncated,
              oid,
              text,
            }
          }
        }
      }
    `);
      if (oid == repository.content.oid) {
      // ハッシュが同じなら取得しない
      res
          .status(200)
          .json({content: '', encoding: '', oid: repository.content.oid});
      } else if (repository.content.isBinary) {
        const octokit = new Octokit({
          auth: `token ${decrypted}`,
        });
        const blob = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: repository.content.oid,
        });
        res
          .status(200)
          .json({
            content: blob.data.content,
            encoding: blob.data.encoding,
            oid: repository.content.oid,
          });
      } else {
        const text = repository.content.text as string;
        res.json({
          content: text,
          encoding: 'utf-8',
          oid: repository.content.oid,
        });
      }
    } catch (error) {
      const e = error as any;
      return res.status(e.status).send(null);
    }
  };

export default contentOfRepository;
