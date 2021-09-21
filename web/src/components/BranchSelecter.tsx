import React, { useEffect, useCallback, useState } from 'react';
import * as UI from './ui';
import useSWR from 'swr';
import firebase from '@services/firebase';
import {BranchesApiResponse} from '../pages/api/github/branches';

const fetcher = (url: string, idToken: string) =>
  fetch(url, {
    headers: {
      'x-id-token': idToken,
    },
  }).then((r) => r.json());

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
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if(!user) return
    user
      .getIdToken(true)
      .then(setIdToken)
      .catch(() => setIdToken(null));
  }, [user]);

  const {data, isValidating} = useSWR<BranchesApiResponse>(
    idToken ? [`/api/github/branches?${new URLSearchParams({owner, repo})}`, idToken] : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if(data) onChange(data.default)
  }, [data]);

  const onChangeBranch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }, [])

  return (
    <UI.Select
      onChange={onChangeBranch} 
      value={(isValidating || !data) ? '' : data.default}
    >
        { (isValidating || !data) ? null : data.branches.map(branch => <option value={branch.name} key={branch.name}>{branch.name}</option>) }
    </UI.Select>
  );
};
