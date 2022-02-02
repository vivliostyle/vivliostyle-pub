import React from 'react';
import Link from 'next/link';
import * as UI from './ui';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import { RepeatIcon } from '@chakra-ui/icons';

export const GithubReposList: React.FC<{}> = ({}) => {
  const app = useAppContext();
  console.log('rep list', app.state.repositories);

  const reload = ()=>{
    console.log('reload repositories');
    app.reload();
  }

  if (app.state.repositories == null) { // リポジトリリスト取得中
    return <UI.Text>Loading</UI.Text>;
  } else if (app.state.repositories.length == 0) { // ログイン済み リポジトリリストが0件
    return (
    <UI.Text>
      <UI.Button>
          <RepeatIcon onClick={reload} />
      </UI.Button>
      &nbsp; No repositories
      <br />
      <br />
      1. Push [Install GitHub Apps] for check and edit install status for GitHub
      Apps.
      <br />
      2. Push [Refresh GitHub Access Token] for refresh GitHub Access Token.
      <br />
    </UI.Text>);
  } else {
    return (<UI.Flex direction="column">
      <UI.Button w="2em">
        <RepeatIcon onClick={reload} />
      </UI.Button><br />
      {app.state.repositories.map((repo) => (
        <Link
          href="github/[owner]/[repo]"
          as={`/github/${repo.full_name}`}
          key={repo.id}
        >
          <a>
            <UI.Box key={repo.node_id}>
              <UI.Heading size="sm">{repo.full_name}</UI.Heading>
              <UI.Text>{repo.private ? 'Private' : 'Public'}</UI.Text>
            </UI.Box>
          </a>
        </Link>
      ))}
    </UI.Flex>);
  }
};
