import {FC} from 'react';
import {ExternalLinkIcon} from '@chakra-ui/icons';
import {Button, ButtonGroup} from '@chakra-ui/react';
import {useGithubAppsButtonGroup} from './hooks';

export const GithubAppsButtonGroup: FC = () => {
  const {redirectUri} = useGithubAppsButtonGroup();

  return (
    <ButtonGroup spacing={4}>
      <Button
        leftIcon={<ExternalLinkIcon />}
        onClick={async () => {
          window.open(process.env.GH_APP_INSTALLATION_URL, '_blank');
        }}
      >
        Install GitHub Apps
      </Button>
      <Button
        onClick={async () => {
          window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv1.82f91d6603ec90aa&redirect_uri=${encodeURIComponent(
            redirectUri,
          )}`;
        }}
      >
        Refresh GitHub Access Token
      </Button>
    </ButtonGroup>
  );
};
