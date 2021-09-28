import {NextApiHandler} from 'next';
import fetch from 'isomorphic-unfetch';
import {Octokit} from '@octokit/rest';

import firebaseAdmin from '@services/firebaseAdmin';
import {encrypt} from '@utils/encryption';

const installation: NextApiHandler = async (req, res) => {
  const code = req.query['code'];
  if (!code) {
    return res.status(500).send("parameter code not found");
  }

  const { access_token: githubAccessToken } = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      client_id: process.env.GH_APP_CLIENT_ID,
      client_secret: process.env.GH_APP_CLIENT_SECRET,
      code,
    }),
  }).then(r => r.json());
  const octokit = new Octokit({
    auth: `token ${githubAccessToken}`,
  });
  const emails = await octokit.users.listEmailsForAuthenticated();
  const primaryEmail = emails.data.find((entry) => entry.primary)?.email;
  if (!githubAccessToken || !primaryEmail) {
    return res.status(500).send(null);
  }
  try {
    const user = await firebaseAdmin.auth().getUserByEmail(primaryEmail);
    await firebaseAdmin.auth().setCustomUserClaims(user.uid, {
      githubAccessToken: encrypt(githubAccessToken),
    });
  } catch (e) {}
  res.writeHead(302, {Location: '/'});
  return res.end();
};

export default installation;
