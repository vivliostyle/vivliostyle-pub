import {useMemo} from 'react';

export const useGithubAppsButtonGroup = () => {
  const redirectUri = useMemo(() => {
    return `${window.location.origin}/api/github/callback`;
  }, []);

  return {
    redirectUri,
  };
};
