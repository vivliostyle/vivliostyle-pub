import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import fetch from 'isomorphic-unfetch';
import * as UI from './ui';
import { User } from 'firebase/auth';
import { GetRepsitoryList } from '@middlewares/frontendFunctions';



export const GithubReposList: React.FC<{user: User}> = ({user}) => {
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    user
      .getIdToken(true)
      .then(setIdToken)
      .catch(() => setIdToken(null));
  }, [user]);
  const {data, isValidating} = GetRepsitoryList(idToken);
  if (!data) {
    return isValidating ? (
      <UI.Text>Loading</UI.Text>
    ) : (
      <UI.Text>No repositories<br/>
        <br/>
        1. Push [Install GitHub Apps] for check and edit install status for GitHub Apps.<br/>
        2. Push [Refresh GitHub Access Token] for refresh GitHub Access Token.<br/> 
      </UI.Text>
    );
  }
  return (
    <UI.Flex direction="column">
      {data.map((repo) => (
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
    </UI.Flex>
  );
};
