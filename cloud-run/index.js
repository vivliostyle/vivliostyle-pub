const express = require('express');
const fs = require('fs');
const Git = require('nodegit');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const uploadFile = require('./cloud-storage');

const app = express();
const allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, access_token'
  )

  // intercept OPTIONS method
  if ('OPTIONS' === req.method) {
    res.send(200)
  } else {
    next()
  }
}
app.use(allowCrossDomain)

const REPO_NAME = 'vivliostyle-user-group-vol2';

async function compileFromGit(owner, repo) {
  try {
    console.log(`>> git clone https://github.com/${owner}/${repo}`)
    // Clone a given repository into the `./tmp` folder.
    const currentDir = process.cwd();
    const repoDir = `/tmp/${owner}/${repo}`;
    await Git.Clone(`https://github.com/${owner}/${repo}`, repoDir);

    process.chdir(repoDir);

    console.log('>> Start compile');

    const { stdout, stderr } = await exec(`vivliostyle build --no-sandbox index.html --book -o ../${repo}.pdf`);

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

function sendPdfFile(res, pdfFile, filename) {
  var file = fs.createReadStream(pdfFile);
  var stat = fs.statSync(pdfFile);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  file.pipe(res);
}

app.get('/', async (req, res) => {
  try {
    compileFromGit('youchan', REPO_NAME, (outputFile) => {
      sendPdfFile(res, outputFile, `${REPO_NAME}.pdf`);
    });
  } catch (error) {
    console.log(error);
  }
});

app.get('/pdf/:owner/:repo', async (req, res) => {
  try {
    const outputFile = await compileFromGit(req.params.owner, req.params.repo)
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
