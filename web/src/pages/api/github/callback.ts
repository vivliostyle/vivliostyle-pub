import { NextApiHandler } from 'next';
import fetch from 'isomorphic-unfetch';
import { Octokit } from '@octokit/rest';
import firebaseAdmin from '../../../services/firebaseAdmin';
import { encrypt } from '../../../utils/encryption';

const installation: NextApiHandler = async (req, res) => {
  const installationId = +req.query['installation_id'];
  const setupAction = req.query['setup_action'];
  const code = req.query['code'];
  if (!(installationId > 0) || !code) {
    res.writeHead(302, {
      Location: process.env.GITHUB_APP_INSTALLATION_URL,
    });
    return res.end();
  }
  if (setupAction !== 'install' && setupAction !== 'update') {
    return res.status(400);
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      code,
    }),
  });
  const json = await response.json();
  const githubAccessToken = json.access_token;
  const octokit = new Octokit({
    auth: `token ${githubAccessToken}`,
  });
  const emails = await octokit.users.listEmails();
  const primaryEmail = emails.data.find((entry) => entry.primary)?.email;
  if (!githubAccessToken || !primaryEmail) {
    return res.status(500);
  }
  const encrypted = encrypt(githubAccessToken);
  try {
    const user = await firebaseAdmin.auth().getUserByEmail(primaryEmail);
    await firebaseAdmin.auth().setCustomUserClaims(user.uid, {
      githubAccessToken: encrypted,
    });
    // Revoke token to renew user claims
    await firebaseAdmin.auth().revokeRefreshTokens(user.uid);
  } catch (e) {}
  res.writeHead(302, { Location: '/' });
  return res.end();
};

export default installation;
