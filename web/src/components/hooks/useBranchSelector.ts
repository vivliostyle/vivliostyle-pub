import {useCallback} from 'react';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {FileState} from '@middlewares/frontendFunctions';
import {t} from 'i18next';
export const useBranchSelector = () => {
  const repository = useRepositoryContext();
  const {state} = useCurrentFileContext();

  const onChangeBranch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      console.log('[BranchSelector] onChangeBranch', state);
      if (state.state == FileState.modified || state.state == FileState.saved) {
        if (!confirm(t('ファイルが保存されていません。変更を破棄しますか?'))) {
          return;
        }
      }
      repository.selectBranch(e.target.value);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [repository, state],
  );

  return {
    branch: repository.state.branch,
    branches: repository.state.branches,
    onChangeBranch,
  };
};
