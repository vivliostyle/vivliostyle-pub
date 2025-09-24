import Link from 'next/link';
import {RepeatIcon} from '@chakra-ui/icons';
import {Box, Button, Flex, Heading, Text} from '@chakra-ui/react';
import {useGithubReposList} from './hooks';

export const GithubReposList: React.FC<{}> = ({}) => {
  const {isLoading, isEmptyRepositories, repositories, reload} =
    useGithubReposList();

  // リポジトリリスト取得中
  if (isLoading) {
    return <Text>Loading</Text>;
  }

  // ログイン済み リポジトリリストが 0 件
  if (isEmptyRepositories || !repositories) {
    return (
      <Text>
        <Button>
          <RepeatIcon onClick={reload} />
        </Button>
        &nbsp; No repositories
        <br />
        <br />
        1. Push [Install GitHub Apps] for check and edit install status for
        GitHub Apps.
        <br />
        2. Push [Refresh GitHub Access Token] for refresh GitHub Access Token.
        <br />
      </Text>
    );
  }

  return (
    <Flex direction="column">
      <Button w="2em">
        <RepeatIcon onClick={reload} />
      </Button>
      <br />
      {repositories.map((repo) => (
        <Link
          href="github/[owner]/[repo]"
          as={`/github/${repo.full_name}`}
          key={repo.id}
        >
          <a>
            <Box key={repo.node_id}>
              <Heading size="sm">{repo.full_name}</Heading>
              <Text>{repo.private ? 'Private' : 'Public'}</Text>
            </Box>
          </a>
        </Link>
      ))}
    </Flex>
  );
};
