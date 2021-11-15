import React, { useEffect, useCallback, useState } from 'react';
import * as UI from './ui';
import firebase from '@services/firebase';
import {BranchesApiResponse} from '../pages/api/github/branches';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';

export const BranchSelecter = ({
  user,
}: {
  user: firebase.User | null;
}) => {
  const repository = useRepositoryContext();
  const [branches, setBranches] = useState<string[]>([]);
  useEffect(() => {
    if(!user) return
    (async () => {
      try {
        const resp = await fetch(`/api/github/branches?${new URLSearchParams({owner:repository.owner!, repo:repository.repo!})}`, {
          method: 'GET',
          headers: {
            'x-id-token': await user.getIdToken(),
          },
        });
        const data = (await resp.json()) as BranchesApiResponse
        console.log(data)
        setBranches(data.branches.map(b => b.name))
        repository.setBranch(data.default);
      } catch (error) {
        console.error(error);
      }
    })()
  }, [user, repository.owner, repository.repo]);

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('change branch : ',e.target.value);
    repository.setBranch(e.target.value);
  }, [repository])

  return (
    <UI.Select
      onChange={onChangeBranch} 
      value={repository.branch ?? ""}
    >
        { branches.map(name => <option value={name} key={name}>{name}</option>) }
    </UI.Select>
  );
};
