import {useAppContext} from '@middlewares/contexts/useAppContext';

export const useGithubReposList = () => {
  const app = useAppContext();
  console.log('rep list', app.state.repositories);

  const reload = () => {
    console.log('reload repositories');
    app.reload();
  };

  return {
    isLoading: app.state.repositories === null,
    isEmptyRepositories:
      app.state.repositories && app.state.repositories.length === 0,
    repositories: app.state.repositories,
    reload,
  };
};
