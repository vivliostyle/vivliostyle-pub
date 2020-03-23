const express = require('express');
const fs = require('fs');
const Git = require('nodegit');
const app = express();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const REPO_NAME = 'vivliostyle-user-group-vol2';

async function compileFromGit(owner, repo, callback) {
  try {
    console.log(`>> git clone https://github.com/${owner}/${repo}`)
    // Clone a given repository into the `./tmp` folder.
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

    const outputFile = `/tmp/${owner}/${repo}.pdf`;
    if (fs.existsSync(outputFile)) {
      callback(outputFile);
    }
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
    compileFromGit(req.params.owner, req.params.repo, (outputFile) => {
      sendPdfFile(res, outputFile, `${REPO_NAME}.pdf`);
    });
  } catch (error) {
    console.log(error);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('listening on port', port);
});
