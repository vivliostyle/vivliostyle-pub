import React, { useCallback } from 'react';
import * as UI from './ui';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import { useLogContext } from '@middlewares/useLogContext';

export const BranchSelecter = () => {
  const log = useLogContext();
  const repository = useRepositoryContext();

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    repository.selectBranch(e.target.value);
    log.info('ブランチを変更しました : ' + e.target.value);
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
