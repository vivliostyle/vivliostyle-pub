import React, { useCallback } from 'react';
import * as UI from './ui';
import { useRepositoryContext } from '@middlewares/contexts/useRepositoryContext';
import { useLogContext } from '@middlewares/contexts/useLogContext';
import { useCurrentFileContext } from '@middlewares/contexts/useCurrentFileContext';
import { FileState } from '@middlewares/frontendFunctions';
import { t } from 'i18next';

export const BranchSelecter = () => {
  const log = useLogContext();
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('onChangeBranch',currentFile.state);
    if(currentFile.state == FileState.modified || currentFile.state == FileState.saved) {
      if(!confirm(t('ファイルが保存されていません。変更を破棄しますか?'))) {
        return;
      }
    }
    repository.selectBranch(e.target.value);
    log.info(t('ブランチを変更しました',{branch: e.target.value}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository])

  return (
    <UI.Select
      onChange={onChangeBranch} 
      value={repository.branch ?? ""}
    >
        { repository.branches.map(name => <option value={name} key={name}>{name}</option>) }
    </UI.Select>
  );
};
