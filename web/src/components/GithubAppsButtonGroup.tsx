import React, {useMemo} from 'react';
import { ExternalLinkIcon } from '@chakra-ui/icons'

import * as UI from './ui';

export const GithubAppsButtonGroup = () => {

  const redirectUri = useMemo(() => {
    return `${window.location.origin}/api/github/callback`
  }, [])

  return (
    <UI.ButtonGroup spacing={4}>
      <UI.Button
        leftIcon={<ExternalLinkIcon />}
        onClick={async () => {
          window.open(process.env.GH_APP_INSTALLATION_URL, '_blank')
        }}
      >
        Install GitHub Apps
      </UI.Button>
      <UI.Button
        onClick={async () => {
          window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv1.82f91d6603ec90aa&redirect_uri=${encodeURIComponent(redirectUri)}`;
        }}
      >
        Refresh GitHub Access Token
      </UI.Button>
    </UI.ButtonGroup>
  );
};
