import React from 'react';
import Link from 'next/link';
import * as UI from './ui';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {RepeatIcon, LockIcon, UnlockIcon} from '@chakra-ui/icons';
import {devConsole} from '@middlewares/frontendFunctions';

const {_log, _err} = devConsole('[GithubReposList]');

export const GithubReposList: React.FC<{}> = ({}) => {
  const app = useAppContext();
  _log('rep list', app.state.repositories);

  const reload = () => {
    _log('reload repositories');
    app.reload();
  };

  if (app.state.repositories == null) {
    // リポジトリリスト取得中
    return <UI.Text>Loading</UI.Text>;
  } else if (app.state.repositories.length == 0) {
    // ログイン済み リポジトリリストが0件
    return (
      <UI.Text>
        <UI.Button>
          <RepeatIcon onClick={reload} />
        </UI.Button>
        &nbsp; No repositories
        <br />
        <br />
        1. Push [Install GitHub Apps] for check and edit install status for
        GitHub Apps.
        <br />
        2. Push [Refresh GitHub Access Token] for refresh GitHub Access Token.
        <br />
      </UI.Text>
    );
  } else {
    return (
      <UI.Flex direction="column">
        <UI.Button w="2em">
          <RepeatIcon onClick={reload} />
        </UI.Button>
        <br />
        {app.state.repositories.map((repo) => (
          <UI.Box key={repo.id} mb="3">
            <Link
              href="github/[owner]/[repo]"
              as={`/github/${repo.owner}/${repo.name}`}
            >
              <a>
                <UI.Heading size="sm">
                  {repo.private ? (
                    <LockIcon />
                  ) : (
                    <UnlockIcon color="transparent" />
                  )}
                  &nbsp;{repo.owner}/{repo.name}
                </UI.Heading>
              </a>
            </Link>
          </UI.Box>
        ))}
      </UI.Flex>
    );
  }
};
