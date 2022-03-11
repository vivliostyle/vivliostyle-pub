import React, {useMemo} from 'react';
import {ExternalLinkIcon} from '@chakra-ui/icons';

import * as UI from './ui';
import {t} from 'i18next';
import {useAppContext} from '@middlewares/contexts/useAppContext';

export const GithubAppsButtonGroup = () => {
  const app = useAppContext();
  const redirectUri = useMemo(() => {
    return `${window.location.origin}/api/github/callback`;
  }, []);

  return (
    <UI.Box display="flex" justifyContent="space-between" width="100%">
      <UI.ButtonGroup spacing={4} width="100%">
        <UI.Button
          leftIcon={<ExternalLinkIcon />}
          onClick={async () => {
            window.open(process.env.GH_APP_INSTALLATION_URL, '_blank');
          }}
        >
          Install GitHub Apps
        </UI.Button>
        <UI.Button
          onClick={async () => {
            window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv1.82f91d6603ec90aa&redirect_uri=${encodeURIComponent(
              redirectUri,
            )}`;
          }}
        >
          Refresh GitHub Access Token
        </UI.Button>
      </UI.ButtonGroup>
      <UI.ButtonGroup float="right">
        <UI.Button
          color="red"
          onClick={() => {
            if (confirm(t('ユーザアカウントを削除します。よろしいですか?'))) {
              app.removeAccount();
            }
          }}
        >
          Delete Account
        </UI.Button>
      </UI.ButtonGroup>
    </UI.Box>
  );
};
