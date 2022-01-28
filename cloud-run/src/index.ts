import * as express from 'express';
import {NextFunction, Request, Response} from 'express';
import * as admin from 'firebase-admin';
import * as uuid from 'uuid'

import {uploadFile} from './cloud-storage';
import {gitClone} from './git-clone';
import { execCommanad } from './util'

if (!admin.apps.length) admin.initializeApp();
const firestore = admin.firestore();

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
async function buildFromGithubRepository(owner: string, repo: string) {
  const processID = uuid.v4()
  console.log(`>> Run buildFromGithubRepository( process ID: ${processID} )`)
  try {
    console.log(`>> git clone https://github.com/${owner}/${repo}`);
    const cwd = process.cwd();
    const repoDir = `${cwd}/tmp/repos/${processID}/${owner}/${repo}`;
    await gitClone(owner, repo, repoDir);
    console.log('>> Start compile');
    const outputPdfPath = `${cwd}/tmp/pdfs/${processID}.pdf`
    process.chdir(repoDir);
    await execCommanad(`vivliostyle build --no-sandbox --timeout 3600 --verbose --output ${outputPdfPath}`);
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
const buildAndUpload = async(owner: string, repo: string) => {
  try {
    const outputPdfPath = await buildFromGithubRepository(owner, repo);
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
    const {owner, repo, id } = JSON.parse(
      Buffer.from(req.body.message.data, 'base64').toString(),
    );
    const url = await buildAndUpload(owner, repo);
    if (id) await firestore.collection('builds').doc(id).update(url);
    console.log('>> Complete build: ' + url);
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
    const url = await buildAndUpload(req.params.owner, req.params.repo);
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
