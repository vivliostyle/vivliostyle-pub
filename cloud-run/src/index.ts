import * as express from 'express';
import {NextFunction, Request, Response} from 'express';
import {initializeApp, getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import * as uuid from 'uuid'

import {uploadFile} from './cloud-storage';
import {gitClone} from './git-clone';
import { execCommanad } from './util'

if (!getApps().length) initializeApp();
const firestore = getFirestore();

const app = express();
const allowCrossDomain = function (
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, access_token',
  );

  // intercept OPTIONS method
  if ('OPTIONS' === req.method) {
    res.send(200);
  } else {
    next();
  }
};
app.use(allowCrossDomain);
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// 指定された GitHub のリポジトリ( Vivliostyle のプロジェクト )から PDF をローカルに生成する
// PDF のパスを返却する
async function buildFromGithubRepository(owner: string, repo: string, themeName: string, httpMode: boolean, branch: string) {
  const processID = uuid.v4()
  console.log(`>> Run buildFromGithubRepository( process ID: ${processID} )`)
  try {
    console.log(`>> git clone https://github.com/${owner}/${repo}`);
    const cwd = process.cwd();
    const repoDir = `${cwd}/tmp/repos/${processID}/${owner}/${repo}`;
    await gitClone(owner, repo, repoDir, branch);
    console.log('>> Start compile');
    const outputPdfPath = `${cwd}/tmp/pdfs/${processID}.pdf`
    process.chdir(repoDir);
    let options = ''
    if(themeName && themeName.length > 0) {
      await execCommanad(`npm install ${themeName}`);
      options += ` --theme ${themeName}`;
    }
    if(httpMode) options += ' --http';
    await execCommanad(`vivliostyle build --no-sandbox --timeout 3600 --verbose --output ${outputPdfPath} ${options}`);
    process.chdir(cwd);
    await execCommanad(`rm -rf ${cwd}/tmp/repos/${processID}`);
    return outputPdfPath;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// 指定された GitHub のリポジトリ( Vivliostyle のプロジェクト )から GCS 上に PDF を生成する
// GCS 上の PDF の URL を返却する
const buildAndUpload = async(owner: string, repo: string, themeName: string, httpMode: boolean, branch: string) => {
  try {
    const outputPdfPath = await buildFromGithubRepository(owner, repo, themeName, httpMode, branch);
    const url = await uploadFile(`${owner}-${repo}`, outputPdfPath);
    await execCommanad(`rm ${outputPdfPath}`);
    return url
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// PubSub のハンドラ
// PubSub のメッセージ内容は '{"owner": "takanakahiko", "repo": "vivliostyle-sample"}' の形式とする
// 指定された GitHub のリポジトリ( Vivliostyle のプロジェクト )から GCS 上に PDF を生成する
// PubSub のメッセージ内容に '{"owner": "...", "repo": "...", "id": "hoge" }' ののように id が指定されていたら結果を Firestore に書き込む
app.post('/', async (req, res) => {
  try {
    console.log(Buffer.from(req.body.message.data, 'base64').toString())
    interface BuidRequest {
      owner: string;
      repo: string;
      branch: string;
      themeName: string;
      httpMode: boolean;
      uid: string;
      id: string;
    }
    const buidRequest: BuidRequest = JSON.parse(
      Buffer.from(req.body.message.data, 'base64').toString(),
    );
    const uploadFileResult = await buildAndUpload(buidRequest.owner, buidRequest.repo, buidRequest.themeName, buidRequest.httpMode, buidRequest.branch);
    if (buidRequest.id) {
      await firestore
        .doc(`users/${buidRequest.uid}/builds/${buidRequest.id}`)
        .update(uploadFileResult as {});
    }
    console.log('>> Complete build: ' + uploadFileResult.signedUrl);
    res.status(204).send();
  } catch (error) {
    console.error(`error: ${error}`);
    //400や500番台で返すとリトライを繰り返してしまうため、暫定的に204を返しています
    res.status(204).send(`Bad Request: ${error}`);
  }
});

// 指定された GitHub のリポジトリ( Vivliostyle のプロジェクト )から GCS 上に PDF を生成する
// GCS 上の PDF の URL をレスポンスとして返却する
app.get('/pdf/:owner/:repo', async (req, res) => {
  try {
    const url = await buildAndUpload(req.params.owner, req.params.repo, '', true, '');
    res.send(url);
  } catch (error) {
    console.error(`error: ${error}`);
    res.status(500).send(`Bad Request: ${error}`)
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('listening on port', port);
});
