import React, { useCallback } from 'react';
import * as UI from './ui';
import { useRepositoryContext } from '@middlewares/contexts/useRepositoryContext';
import { useCurrentFileContext } from '@middlewares/contexts/useCurrentFileContext';
import { FileState } from '@middlewares/frontendFunctions';
import { t } from 'i18next';

export const BranchSelecter = () => {
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('[BranchSelector] onChangeBranch',currentFile.state);
    if(currentFile.state.state == FileState.modified || currentFile.state.state == FileState.saved) {
      if(!confirm(t('ファイルが保存されていません。変更を破棄しますか?'))) {
        return;
      }
    }
    repository.selectBranch(e.target.value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository])

  return (
    <UI.Select
      onChange={onChangeBranch} 
      value={repository.state.branch ?? ""}
    >
        { repository.state.branches.map(name => <option value={name} key={name}>{name}</option>) }
    </UI.Select>
  );
};
