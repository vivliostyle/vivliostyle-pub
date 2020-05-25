import * as UI from './ui';

export const InstallGithubAppsButton = () => {
  return (
    <UI.Button
      onClick={async () => {
        window.location.href = process.env.GH_APP_INSTALLATION_URL;
      }}
    >
      Install GitHub Apps
    </UI.Button>
  );
};
