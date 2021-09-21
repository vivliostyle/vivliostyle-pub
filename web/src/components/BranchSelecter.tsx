import React, { useEffect, useCallback, useState } from 'react';
import * as UI from './ui';
import firebase from '@services/firebase';
import {BranchesApiResponse} from '../pages/api/github/branches';

export const BranchSelecter = ({
  user,
  owner,
  repo,
  onChange,
}: {
  user: firebase.User | null;
  owner: string;
  repo: string;
  onChange: (branch:string)=>void;
}) => {
  const [branch, setBranch] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  useEffect(() => {
    console.log(`AAAAAA!!!!!!: ${user}`)
    if(!user) return
    (async () => {
      try {
        console.log(`ouuuuuuuuuuuuuuu!!!!!!: ${user}`)
        const idToken = await user.getIdToken();
        const resp = await fetch(`/api/github/branches?${new URLSearchParams({owner, repo})}`, {
          method: 'GET',
          headers: {
            'x-id-token': idToken,
          },
        });
        const data = (await resp.json()) as BranchesApiResponse
        console.log(data)
        setBranches(data.branches.map(b => b.name))
        setBranch(data.default);
      } catch (error) {
        console.error(error);
      }
    })()
  }, [user, owner, repo]);

  useEffect(() => {
    if(branch) onChange(branch)
  }, [branch]);

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setBranch(e.target.value)
  }, [])

  return (
    <UI.Select
      onChange={onChangeBranch} 
      value={branch ? branch : ""}
    >
        { branches.map(name => <option value={name} key={name}>{name}</option>) }
    </UI.Select>
  );
};
