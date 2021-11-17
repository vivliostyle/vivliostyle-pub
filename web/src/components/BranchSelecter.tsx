import React, { useCallback } from 'react';
import * as UI from './ui';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';

export const BranchSelecter = () => {
  const repository = useRepositoryContext();

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    repository.selectBranch(e.target.value);
  }, [repository])

  return (
    <UI.Select
      onChange={onChangeBranch} 
      value={repository.currentBranch ?? ""}
    >
        { repository.branches.map(name => <option value={name} key={name}>{name}</option>) }
    </UI.Select>
  );
};
