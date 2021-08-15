import * as UI from './ui';

export const GithubAppsButtonGroup = () => {
  return (
    <UI.ButtonGroup spacing={4}>
      <UI.Button
        leftIcon="external-link"
        onClick={async () => {
          window.open(process.env.GH_APP_INSTALLATION_URL, '_blank')
        }}
      >
        Install GitHub Apps
      </UI.Button>
      <UI.Button
        onClick={async () => {
          const redirect_uri = encodeURIComponent(`${window.location.origin}/api/github/callback`)
          window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv1.82f91d6603ec90aa&redirect_uri=${redirect_uri}`;
        }}
      >
        Refresh GitHub Access Token
      </UI.Button>
    </UI.ButtonGroup>
  );
};
