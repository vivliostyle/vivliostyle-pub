import * as express from 'express';
import * as fs from 'fs';
import * as util from 'util';
import * as child_process from 'child_process';
import * as uploadFile from './cloud-storage';
import * as gitClone from './git-clone';
import * as makeHtmlIfNot from './makeHtmlIfNot';
import * as admin from 'firebase-admin';

const exec = util.promisify(child_process.exec);

if (!admin.apps.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();

const app = express();
const allowCrossDomain = function (req, res, next) {
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

async function compileFromGit(owner, repo, stylesheet = '') {
  try {
    console.log(`>> git clone https://github.com/${owner}/${repo}`);
    // Clone a given repository into the `./tmp` folder.
    const currentDir = process.cwd();
    const repoDir = `/tmp/${owner}/${repo}`;
    await gitClone(owner, repo, repoDir);

    process.chdir(repoDir);

    makeHtmlIfNot({stylesheet});

    console.log('>> Start compile');

    const {stdout, stderr} = await exec(
      `vivliostyle build --no-sandbox index.html --book -o ../${repo}.pdf`,
    );

    fs.rmdirSync(repoDir, {recursive: true});

    if (stderr) {
      console.log(`stderr: ${stderr}`);
      res.send(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout: ${stdout}`);

    process.chdir(currentDir);

    return `/tmp/${owner}/${repo}.pdf`;
  } catch (error) {
    console.log(error);
  }
}

app.post('/', async (req, res) => {
  try {
    const pubSubMessage = req.body.message;
    const data = JSON.parse(
      Buffer.from(pubSubMessage.data, 'base64').toString(),
    );
    const {owner, repo, stylesheet} = data.repo;
    const outputFile = await compileFromGit(owner, repo, stylesheet);
    const url = await uploadFile(repo, outputFile);
    if (data.id)
      await firestore.collection('builds').doc(data.id).update({url});
    console.log('>> Complete build: ' + url);
    res.status(204).send();
  } catch (error) {
    console.error(`error: ${error}`);
    //400や500番台で返すとリトライを繰り返してしまうため、暫定的に204を返しています
    //res.status(400).send(`Bad Request: ${msg}`);
    res.status(204).send(`Bad Request: ${error}`);
  }
});

app.get('/pdf/:owner/:repo', async (req, res) => {
  try {
    const outputFile = await compileFromGit(req.params.owner, req.params.repo);
    url = await uploadFile(req.params.repo, outputFile);
    res.send(url);
  } catch (error) {
    console.log(error);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('listening on port', port);
});
